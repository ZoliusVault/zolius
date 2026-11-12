import { createHash } from "node:crypto";
import postgres from "postgres";
import { NextRequest, NextResponse } from "next/server";

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
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  const kind = body.kind === "building" || body.kind === "use" ? body.kind : null;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const validHandle = /^@?[A-Za-z0-9_]{1,15}$/.test(contact);
  if (contact.length > 160 || (!validEmail && !validHandle) || /[\r\n<>]/.test(contact) || !kind) return NextResponse.json({ error: "Enter a valid email or X handle and choose an option." }, { status: 400 });
  const databaseUrl = process.env.WAITLIST_DATABASE_URL;
  if (!databaseUrl) return NextResponse.json({ error: "Waitlist storage is not configured yet. Please try again later." }, { status: 503 });

  const sql = postgres(databaseUrl, { max: 1, connect_timeout: 5, idle_timeout: 5, prepare: false });
  try {
    await sql`CREATE TABLE IF NOT EXISTS zolius_agent_waitlist (id BIGSERIAL PRIMARY KEY, contact TEXT NOT NULL UNIQUE, interest TEXT NOT NULL CHECK (interest IN ('building','use')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await sql`INSERT INTO zolius_agent_waitlist (contact, interest) VALUES (${contact}, ${kind}) ON CONFLICT (contact) DO UPDATE SET interest = EXCLUDED.interest`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Waitlist could not save this entry. Try again later." }, { status: 503 });
  } finally { await sql.end({ timeout: 1 }); }
}
