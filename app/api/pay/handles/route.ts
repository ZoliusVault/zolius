import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { normalizePayHandle, verifyHandleRegistration } from "@/lib/pay";
import { ensurePaySchema, openPayStore } from "@/lib/pay-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const requests = new Map<string, { start: number; count: number }>();

function rateLimited(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const key = createHash("sha256").update(ip).digest("hex");
  const now = Date.now();
  const current = requests.get(key);
  if (current && now - current.start < 60_000 && current.count >= 5) return true;
  requests.set(key, !current || now - current.start >= 60_000 ? { start: now, count: 1 } : { ...current, count: current.count + 1 });
  if (requests.size > 5000) for (const [candidate, item] of requests) if (now - item.start >= 60_000) requests.delete(candidate);
  return false;
}

export async function POST(request: NextRequest) {
  if (rateLimited(request)) return NextResponse.json({ error: "Handle registration is rate limited. Try again shortly." }, { status: 429 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 5000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  let handle: string;
  let address: string;
  try {
    handle = normalizePayHandle(body.handle);
    if (typeof body.address !== "string") throw new Error();
    address = new PublicKey(body.address).toBase58();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid wallet address." }, { status: 400 });
  }
  const vaultPublicKey = typeof body.vaultPublicKey === "string" ? body.vaultPublicKey : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  if (!verifyHandleRegistration({ handle, address, vaultPublicKey, signature })) {
    return NextResponse.json({ error: "Wallet signature could not be verified for this handle." }, { status: 401 });
  }

  const sql = (() => { try { return openPayStore(); } catch { return null; } })();
  if (!sql) return NextResponse.json({ error: "Payment handle storage is not configured." }, { status: 503 });
  try {
    await ensurePaySchema(sql);
    const inserted = await sql`
      INSERT INTO zolius_pay_handles (handle, owner_address, vault_public_key)
      VALUES (${handle}, ${address}, ${vaultPublicKey})
      ON CONFLICT DO NOTHING
      RETURNING handle, owner_address AS address, vault_public_key AS "vaultPublicKey"
    `;
    if (inserted[0]) return NextResponse.json(inserted[0], { status: 201 });
    const existing = await sql`SELECT handle, owner_address AS address, vault_public_key AS "vaultPublicKey" FROM zolius_pay_handles WHERE owner_address = ${address} OR handle = ${handle} LIMIT 1`;
    if (existing[0]?.handle === handle && existing[0]?.address === address) return NextResponse.json(existing[0]);
    return NextResponse.json({ error: existing[0]?.address === address ? "This wallet already owns a different handle." : "That handle is already taken." }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "Handle could not be saved." }, { status: 503 });
  } finally { await sql.end({ timeout: 1 }); }
}

export async function GET(request: NextRequest) {
  const handleInput = new URL(request.url).searchParams.get("handle");
  let handle: string;
  try { handle = normalizePayHandle(handleInput); }
  catch { return NextResponse.json({ error: "Handle not found." }, { status: 404 }); }
  const sql = (() => { try { return openPayStore(); } catch { return null; } })();
  if (!sql) return NextResponse.json({ error: "Payment handle storage is not configured." }, { status: 503 });
  try {
    await ensurePaySchema(sql);
    const rows = await sql`SELECT handle, owner_address AS address, vault_public_key AS "vaultPublicKey" FROM zolius_pay_handles WHERE handle = ${handle}`;
    return rows[0] ? NextResponse.json(rows[0]) : NextResponse.json({ error: "Handle not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Handle lookup failed." }, { status: 503 }); }
  finally { await sql.end({ timeout: 1 }); }
}
