import { NextRequest, NextResponse } from "next/server";
import { verifyWalletSignature } from "@/lib/pay";
import { ensurePaySchema, openPayStore } from "@/lib/pay-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: RouteContext<"/api/pay/invoices/[id]">) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const sql = (() => { try { return openPayStore(); } catch { return null; } })();
  if (!sql) return NextResponse.json({ error: "Payment invoice storage is not configured." }, { status: 503 });
  try {
    await ensurePaySchema(sql);
    const rows = await sql`
      SELECT i.id, i.handle, h.owner_address AS recipient, i.envelope,
        i.expires_at AS "expiresAt", (i.consumed_at IS NOT NULL) AS consumed
      FROM zolius_pay_invoices i JOIN zolius_pay_handles h USING (handle)
      WHERE i.id = ${id}::uuid
    `;
    if (!rows[0]) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (new Date(rows[0].expiresAt).getTime() <= Date.now()) return NextResponse.json({ error: "This invoice has expired." }, { status: 410 });
    return NextResponse.json(rows[0], { headers: { "Cache-Control": "no-store, private" } });
  } catch { return NextResponse.json({ error: "Invoice lookup failed." }, { status: 503 }); }
  finally { await sql.end({ timeout: 1 }); }
}

export async function POST(request: NextRequest, context: RouteContext<"/api/pay/invoices/[id]">) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 2048) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.address !== "string" || typeof body.signature !== "string" ||
      !verifyWalletSignature(body.address, new TextEncoder().encode(`ZOLIUS/pay/invoice-paid/v1\n${id}\n${body.address}`), body.signature)) {
    return NextResponse.json({ error: "Recipient wallet signature could not be verified." }, { status: 401 });
  }
  const sql = (() => { try { return openPayStore(); } catch { return null; } })();
  if (!sql) return NextResponse.json({ error: "Payment invoice storage is not configured." }, { status: 503 });
  try {
    await ensurePaySchema(sql);
    const rows = await sql`
      UPDATE zolius_pay_invoices i SET consumed_at = NOW()
      FROM zolius_pay_handles h
      WHERE i.handle = h.handle AND i.id = ${id}::uuid AND h.owner_address = ${body.address}
        AND i.consumed_at IS NULL AND i.expires_at > NOW()
      RETURNING i.id
    `;
    if (!rows[0]) return NextResponse.json({ error: "Invoice is missing, expired, already marked paid, or owned by another wallet." }, { status: 409 });
    return NextResponse.json({ id, paid: true });
  } catch { return NextResponse.json({ error: "Payment status could not be saved." }, { status: 503 }); }
  finally { await sql.end({ timeout: 1 }); }
}
