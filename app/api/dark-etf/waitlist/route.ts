import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import postgres from "postgres";
import {
  validateWaitlist,
  newConfirmToken,
} from "@/lib/dark-etf-waitlist";

const SUCCESS_MESSAGE = "You're on the list.";
const SITE_ORIGIN = "https://www.zoliusvault.tech";

// In-memory per-IP bucket (hash only, never persisted): 5 submits / minute.
const buckets = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = (buckets.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (cur.length >= 5) {
    buckets.set(ip, cur);
    return true;
  }
  cur.push(now);
  buckets.set(ip, cur);
  if (buckets.size > 5000) buckets.clear();
  return false;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const raw = (fwd ? fwd.split(",")[0] : "unknown").trim();
  return createHash("sha256").update(raw).digest("hex");
}

function db() {
  const url = (process.env.WAITLIST_DATABASE_URL || "").trim();
  if (!url) throw new Error("waitlist store not configured");
  return postgres(url, { max: 1, connect_timeout: 10 });
}

function mailer() {
  const host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || "465");
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const from = (process.env.SMTP_FROM || user).trim();
  if (!host || !user || !pass) throw new Error("mail sender not configured");
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return { transport, from };
}

async function sendConfirmEmail(to: string, token: string): Promise<void> {
  const { transport, from } = mailer();
  const url = `${SITE_ORIGIN}/dark-etf?confirm=${token}`;
  await transport.sendMail({
    from,
    to,
    subject: "Confirm your Zolius Dark ETF waitlist spot",
    text:
      `You're one click from the Dark ETF waitlist.\n\n` +
      `Confirm here (single use):\n${url}\n\n` +
      `If you didn't ask for this, ignore this email.\n` +
      `Zolius Protocol — https://www.zoliusvault.tech`,
  });
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Bad request." }, { status: 400 });
    }
    // Honeypot: bots fill it; humans never see it. Always succeed silently.
    if (typeof body.website === "string" && body.website.trim().length > 0) {
      return NextResponse.json({ success: true, message: SUCCESS_MESSAGE });
    }
    if (rateLimited(clientIp(req))) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Wait a minute and try again." },
        { status: 429 }
      );
    }
    const v = validateWaitlist(body);
    if (!v.ok) {
      return NextResponse.json({ success: false, error: v.error }, { status: 400 });
    }
    const sql = db();
    try {
      const existing =
        await sql`SELECT confirm_token AS "confirmToken", status FROM veil_waitlist WHERE email = ${v.value.email} LIMIT 1`;
      let token: string;
      if (existing.length > 0) {
        // Duplicate: identical success (never reveal registration), refresh
        // the confirmation mail quietly so real owners aren't stranded.
        token = existing[0].confirmToken as string;
      } else {
        token = newConfirmToken();
        await sql`INSERT INTO veil_waitlist (email, x_handle, wallet, status, confirm_token, source)
                  VALUES (${v.value.email}, ${v.value.xHandle}, ${v.value.wallet}, 'pending', ${token}, ${v.value.source})`;
      }
      try {
        await sendConfirmEmail(v.value.email, token);
      } catch {
        // Mail outage must not lose the signup: row stays pending.
      }
      return NextResponse.json({ success: true, message: SUCCESS_MESSAGE });
    } finally {
      await sql.end();
    }
  } catch (e: any) {
    const msg = String(e?.message || "failed");
    if (/not configured|store/i.test(msg)) {
      return NextResponse.json({ success: false, error: "Waitlist is temporarily unavailable. Try again later." }, { status: 503 });
    }
    return NextResponse.json({ success: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get("token") || "";
    if (!/^[0-9a-f]{64}$/.test(token)) {
      return NextResponse.json({ success: false, error: "This confirmation link is invalid." }, { status: 400 });
    }
    const sql = db();
    try {
      const rows =
        await sql`UPDATE veil_waitlist SET status = 'confirmed', confirmed_at = now()
                   WHERE confirm_token = ${token} AND status = 'pending'
                   RETURNING email`;
      if (rows.length === 0) {
        const seen = await sql`SELECT 1 FROM veil_waitlist WHERE confirm_token = ${token} LIMIT 1`;
        if (seen.length > 0) {
          return NextResponse.json({ success: true, message: "Already confirmed. You're on the list." });
        }
        return NextResponse.json({ success: false, error: "This confirmation link is invalid or expired." }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: SUCCESS_MESSAGE });
    } finally {
      await sql.end();
    }
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}
