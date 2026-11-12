import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isInvoiceEnvelope, normalizePayHandle } from "@/lib/pay";
import { ensurePaySchema, openPayStore } from "@/lib/pay-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const requests = new Map<string, { start: number; count: number }>();
const MAX_INVOICE_MS = 7 * 24 * 60 * 60 * 1000;

function rateLimited(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const key = createHash("sha256").update(ip).digest("hex");
  const now = Date.now();
  const current = requests.get(key);
  if (current && now - current.start < 60_000 && current.count >= 12) return true;
  requests.set(key, !current || now - current.start >= 60_000 ? { start: now, count: 1 } : { ...current, count: current.count + 1 });
  if (requests.size > 5000) for (const [candidate, item] of requests) if (now - item.start >= 60_000) requests.delete(candidate);
  return false;
}

export async function POST(request: NextRequest) {
  if (rateLimited(request)) return NextResponse.json({ error: "Invoice creation is rate limited. Try again shortly." }, { status: 429 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 20_000) return NextResponse.json({ error: "Encrypted invoice is too large." }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  let handle: string;
  try { handle = normalizePayHandle(body.handle); }
  catch { return NextResponse.json({ error: "A valid payment handle is required." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) || !isInvoiceEnvelope(body.envelope)) {
    return NextResponse.json({ error: "Invoice ID or encrypted invoice data is invalid." }, { status: 400 });
  }
  const now = Date.now();
  if (body.envelope.owner !== body.envelope.recipient || body.envelope.expiresAt <= now || body.envelope.expiresAt > now + MAX_INVOICE_MS) {
    return NextResponse.json({ error: "Invoice recipient or expiration is invalid." }, { status: 400 });
  }

  const sql = (() => { try { return openPayStore(); } catch { return null; } })();
  if (!sql) return NextResponse.json({ error: "Payment invoice storage is not configured." }, { status: 503 });
  try {
    await ensurePaySchema(sql);
    const handleRow = await sql`SELECT owner_address AS address FROM zolius_pay_handles WHERE handle = ${handle}`;
    if (!handleRow[0] || handleRow[0].address !== body.envelope.recipient) return NextResponse.json({ error: "The encrypted invoice does not belong to this handle." }, { status: 400 });
    const rows = await sql`
      INSERT INTO zolius_pay_invoices (id, handle, envelope, expires_at)
      VALUES (${id}::uuid, ${handle}, ${sql.json(body.envelope as never)}, ${new Date(body.envelope.expiresAt)})
      ON CONFLICT DO NOTHING
      RETURNING id
    `;
    if (!rows[0]) return NextResponse.json({ error: "That invoice ID already exists." }, { status: 409 });
    return NextResponse.json({ id, handle, created: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Encrypted invoice could not be saved." }, { status: 503 });
  } finally { await sql.end({ timeout: 1 }); }
}
