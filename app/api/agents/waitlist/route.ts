import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ensurePaySchema, openPayStore } from "@/lib/pay-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const hits = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const key = createHash("sha256").update(ip).digest("hex");
  const recent = (hits.get(key) || []).filter(time => now - time < 60 * 60 * 1000);
  if (recent.length >= 5) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  recent.push(now); hits.set(key, recent);

  if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let input: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 4096) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    input = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const body = input as Record<string, unknown>;
  if (typeof body.website === "string" && body.website.length) return NextResponse.json({ ok: true });
  if (process.env.TURNSTILE_SECRET_KEY) {
    const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
    if (!token || token.length > 2048) return NextResponse.json({ error: "Complete the bot check before joining." }, { status: 400 });
    try {
      const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token }),
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      }).then(response => response.json() as Promise<{ success?: boolean }>);
      if (!verification.success) return NextResponse.json({ error: "Bot check failed. Please try again." }, { status: 403 });
    } catch { return NextResponse.json({ error: "Bot check is temporarily unavailable." }, { status: 503 }); }
  }
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  const kind = body.kind === "building" || body.kind === "use" ? body.kind : null;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const validHandle = /^@?[A-Za-z0-9_]{1,15}$/.test(contact);
  if (contact.length > 160 || (!validEmail && !validHandle) || /[\r\n<>]/.test(contact) || !kind) return NextResponse.json({ error: "Enter a valid email or X handle and choose an option." }, { status: 400 });
  const sql = (() => { try { return openPayStore(); } catch { return null; } })();
  if (!sql) return NextResponse.json({ error: "Waitlist storage is not configured yet. Please try again later." }, { status: 503 });
  try {
    await ensurePaySchema(sql);
    await sql`INSERT INTO zolius_agent_waitlist (contact, interest) VALUES (${contact}, ${kind}) ON CONFLICT (contact) DO UPDATE SET interest = EXCLUDED.interest`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Waitlist could not save this entry. Try again later." }, { status: 503 });
  } finally { await sql.end({ timeout: 1 }); }
}
