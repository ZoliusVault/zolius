import { NextRequest, NextResponse } from "next/server";
import { resolveHeliusPrivacyUrl } from "@/lib/helius-proxy";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 12_000_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 90;
const windows = new Map<string, { start: number; count: number }>();

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

async function forwardPrivacyRequest(
  request: NextRequest,
  context: RouteContext<"/api/solana/privacy/[[...path]]">,
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "cross-origin privacy requests are not allowed" }, { status: 403 });
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!consumeRateLimit(clientIp)) {
    return NextResponse.json({ error: "rate limited; retry shortly" }, { status: 429 });
  }

  const { path = [] } = await context.params;
  let upstreamUrl: URL;
  try {
    const configuredEndpoint = process.env.SOLANA_DEVNET_RPC_URL;
    if (!configuredEndpoint) throw new Error("missing Helius Devnet endpoint");
    upstreamUrl = resolveHeliusPrivacyUrl(configuredEndpoint, path);
  } catch {
    return NextResponse.json({ error: "Helius Privacy Rings Devnet endpoint is misconfigured" }, { status: 503 });
  }

  const incomingUrl = new URL(request.url);
  for (const [name, value] of incomingUrl.searchParams) {
    if (name.toLowerCase() !== "api-key") upstreamUrl.searchParams.append(name, value);
  }

  let body: string | undefined;
  if (request.method === "POST") {
    body = await request.text();
    if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "request too large" }, { status: 413 });
    }
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: request.method === "POST" ? { "content-type": "application/json" } : undefined,
      ...(body === undefined ? {} : { body }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(55_000),
    });
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Helius Privacy Rings service unavailable" }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/solana/privacy/[[...path]]">,
) {
  return forwardPrivacyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/solana/privacy/[[...path]]">,
) {
  return forwardPrivacyRequest(request, context);
}
