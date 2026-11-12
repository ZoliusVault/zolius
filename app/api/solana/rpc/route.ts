import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1_500_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 90;
const ALLOWED_METHODS = new Set([
  "getAccountInfo",
  "getAssetsByOwner",
  "getBalance",
  "getBlockHeight",
  "getEpochInfo",
  "getFeeForMessage",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getRecentPrioritizationFees",
  "getSignatureStatuses",
  "getSignaturesForAddress",
  "getSlot",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getTransaction",
  "isBlockhashValid",
  "sendTransaction",
  "simulateTransaction",
]);

const windows = new Map<string, { start: number; count: number }>();

function errorResponse(id: unknown, code: number, message: string, status = 200) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function callsFrom(payload: unknown): Record<string, unknown>[] | null {
  const calls = Array.isArray(payload) ? payload : [payload];
  if (!calls.length || calls.length > 32) return null;
  if (
    calls.some(
      (call) =>
        typeof call !== "object" ||
        call === null ||
        typeof (call as Record<string, unknown>).method !== "string" ||
        !ALLOWED_METHODS.has((call as Record<string, unknown>).method as string),
    )
  ) {
    return null;
  }
  return calls as Record<string, unknown>[];
}

function consumeRateLimit(key: string): boolean {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.start >= WINDOW_MS) {
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  if (windows.size > 10_000) {
    for (const [candidate, window] of windows) {
      if (now - window.start >= WINDOW_MS) windows.delete(candidate);
    }
  }
  return true;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "cross-origin RPC requests are not allowed" }, { status: 403 });
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!consumeRateLimit(clientIp)) {
    return NextResponse.json({ error: "rate limited; retry shortly" }, { status: 429 });
  }

  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "request too large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return errorResponse(null, -32700, "Parse error");
  }
  if (!callsFrom(payload)) {
    return errorResponse(null, -32601, "RPC request is invalid or method is not allowed");
  }

  const upstreamUrl = process.env.SOLANA_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com";
  let parsedUpstream: URL;
  try {
    parsedUpstream = new URL(upstreamUrl);
  } catch {
    return NextResponse.json({ error: "Solana RPC is misconfigured" }, { status: 500 });
  }
  if (parsedUpstream.protocol !== "https:" || parsedUpstream.hostname === "localhost") {
    return NextResponse.json({ error: "Solana RPC must use a secure HTTPS endpoint" }, { status: 500 });
  }

  try {
    const upstream = await fetch(parsedUpstream, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Solana RPC upstream unavailable" }, { status: 502 });
  }
}
