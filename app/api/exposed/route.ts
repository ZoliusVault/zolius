import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cache = new Map<string, { expires: number; data: unknown }>();
const limits = new Map<string, { start: number; count: number }>();
const TTL = 5 * 60_000;
const WINDOW = 60_000;
const MAX_PER_MINUTE = 5;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private" } });
}

async function rpc(calls: unknown[], signal: AbortSignal) {
  const rpcUrl = process.env.SOLANA_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com";
  const res = await fetch(rpcUrl, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(calls), cache: "no-store", signal,
  });
  if (!res.ok) throw new Error(`Solana Mainnet data service returned HTTP ${res.status}.`);
  return res.json();
}

function transferInfo(instructions: any[], addresses: Set<string>, counterpartyCounts: Map<string, number>) {
  for (const instruction of instructions) {
    const info = instruction?.parsed?.info;
    if (!info || typeof info !== "object") continue;
    const participants = [info.source, info.destination, info.authority, info.owner].filter((item): item is string => typeof item === "string");
    const relevant = participants.filter((item) => !addresses.has(item));
    for (const address of new Set(relevant)) counterpartyCounts.set(address, (counterpartyCounts.get(address) || 0) + 1);
  }
}

function shortScore(txCount: number, balanceUsd: number, counterparties: number) {
  const activity = Math.min(40, Math.log10(txCount + 1) * 10);
  const value = Math.min(30, Math.log10(balanceUsd + 1) * 7);
  const graph = Math.min(30, counterparties * 1.5);
  return Math.round(activity + value + graph);
}

export async function POST(req: NextRequest) {
  let payload: { address?: unknown };
  try {
    if (Number(req.headers.get("content-length") || 0) > 1024) return response({ error: "Request is too large." }, 413);
    payload = await req.json();
  } catch { return response({ error: "Enter a valid Solana address." }, 400); }
  let owner: string;
  try {
    if (typeof payload.address !== "string") throw new Error();
    owner = new PublicKey(payload.address.trim()).toBase58();
  } catch { return response({ error: "That is not a valid Solana address." }, 400); }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const rateKey = createHash("sha256").update(ip).digest("hex");
  const now = Date.now();
  const bucket = limits.get(rateKey);
  if (bucket && now - bucket.start < WINDOW && bucket.count >= MAX_PER_MINUTE) return response({ error: "Search limit reached. Try again in a minute." }, 429);
  limits.set(rateKey, !bucket || now - bucket.start >= WINDOW ? { start: now, count: 1 } : { ...bucket, count: bucket.count + 1 });
  const cached = cache.get(owner);
  if (cached && cached.expires > now) return response({ ...(cached.data as Record<string, unknown>), providerMethodCalls: 0, cacheHit: true });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_500);
    try {
      const [balanceRow, signatureRow, assetRow] = await rpc([
        { jsonrpc: "2.0", id: "balance", method: "getBalance", params: [owner, { commitment: "confirmed" }] },
        { jsonrpc: "2.0", id: "signatures", method: "getSignaturesForAddress", params: [owner, { limit: 1000, commitment: "confirmed" }] },
        { jsonrpc: "2.0", id: "assets", method: "getAssetsByOwner", params: { ownerAddress: owner, page: 1, limit: 1000, displayOptions: { showFungible: true } } },
      ], controller.signal).then((rows: any[]) => {
        const list = Array.isArray(rows) ? rows : [rows];
        return [list.find((row) => row.id === "balance"), list.find((row) => row.id === "signatures"), list.find((row) => row.id === "assets")];
      });
      if (balanceRow?.error || signatureRow?.error || assetRow?.error) throw new Error("Helius Mainnet could not return all wallet data. Retry shortly.");
      const signatures: any[] = signatureRow?.result || [];
      const recent = signatures.slice(0, 20);
      const txRows: any[] = recent.length ? await rpc(recent.map((row, index) => ({
        jsonrpc: "2.0", id: `tx-${index}`, method: "getTransaction", params: [row.signature, { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 1 }],
      })), controller.signal) : [];
      const [moreRow, priceJson] = await Promise.all([
        signatures.length === 1000 ? rpc([{ jsonrpc: "2.0", id: "more", method: "getSignaturesForAddress", params: [owner, { before: signatures.at(-1)?.signature, limit: 1, commitment: "confirmed" }] }], controller.signal) : Promise.resolve([]),
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { cache: "no-store", signal: AbortSignal.timeout(1200) }).then((res) => res.ok ? res.json() : null).catch(() => null),
      ]);
      const txList = Array.isArray(txRows) ? txRows : [txRows];
      const txById = new Map(txList.map((row) => [row.id, row.result]));
      const partnerCounts = new Map<string, number>();
      const hours = new Array<number>(24).fill(0);
      const days = new Array<number>(7).fill(0);
      const history = recent.map((item, index) => {
        const tx: any = txById.get(`tx-${index}`);
        const blockTime = tx?.blockTime || item.blockTime || null;
        if (blockTime) { const date = new Date(blockTime * 1000); hours[date.getUTCHours()] += 1; days[date.getUTCDay()] += 1; }
        const instructions = [...(tx?.transaction?.message?.instructions || []), ...(tx?.meta?.innerInstructions || []).flatMap((group: any) => group.instructions || [])];
        transferInfo(instructions, new Set([owner]), partnerCounts);
        const visibleTransfers = instructions.flatMap((instruction: any) => {
          const info = instruction?.parsed?.info;
          if (!info) return [];
          if (typeof info.lamports === "number") return [`${(info.lamports / 1e9).toLocaleString("en-US", { maximumFractionDigits: 9 })} SOL`];
          if (info.tokenAmount?.uiAmountString) return [`${info.tokenAmount.uiAmountString} ${info.mint || "SPL"}`];
          if (typeof info.amount === "string" && info.mint) return [`${info.amount} raw units · ${info.mint}`];
          return [];
        }).slice(0, 3);
        const keys = (tx?.transaction?.message?.accountKeys || []).map((key: any) => typeof key === "string" ? key : key.pubkey).filter((key: string) => key && key !== owner);
        return { signature: item.signature, slot: item.slot, blockTime, failed: Boolean(item.err), counterparties: [...new Set(keys.filter((key: string) => partnerCounts.has(key)))].slice(0, 4), transfers: visibleTransfers };
      });
      const assets = (assetRow?.result?.items || []).filter((asset: any) => asset.interface === "FungibleToken" || asset.interface === "FungibleAsset" || asset.token_info).slice(0, 24).map((asset: any) => {
        const info = asset.token_info || {};
        const decimals = Number(info.decimals || 0);
        const amount = Number(info.balance || 0) / (10 ** decimals);
        const price = Number(info.price_info?.price_per_token || 0);
        return { mint: asset.id, symbol: info.symbol || asset.content?.metadata?.symbol || "SPL", amount, decimals, usd: amount * price };
      });
      const balanceLamports = Number(balanceRow?.result?.value || 0);
      const solUsd = Number(priceJson?.solana?.usd || process.env.SOL_PRICE_USD || 0);
      const balanceUsd = balanceLamports / 1e9 * solUsd + assets.reduce((sum: number, item: any) => sum + item.usd, 0);
      const txCount = signatures.length;
      const moreRows = Array.isArray(moreRow) ? moreRow : [moreRow];
      const hasMore = txCount === 1000 && Boolean(moreRows[0]?.result?.length);
      const maxBucket = (items: number[]) => items.indexOf(Math.max(...items));
      const result = {
        address: owner, network: "Solana Mainnet", solUsd, balance: { sol: balanceLamports / 1e9, lamports: balanceLamports, usd: balanceUsd, tokens: assets },
        history: { count: txCount, countLabel: hasMore ? "1,000+" : String(txCount), oldestScannedAt: signatures.at(-1)?.blockTime || null, recent: history },
        counterparties: [...partnerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([address, count]) => ({ address, count })),
        activity: { busiestHourUtc: maxBucket(hours), busiestDayUtc: maxBucket(days), sampleSize: recent.length },
        score: shortScore(txCount, balanceUsd, partnerCounts.size),
        scoreFormula: "Activity 0–40 (log₁₀ of scanned transactions) + visible portfolio value 0–30 (log₁₀ USD) + distinct counterparties 0–30 (1.5 points each). Max scan: 1,000 signatures; activity patterns use the 20 newest parsed transactions.",
        providerMethodCalls: 3 + recent.length + (signatures.length === 1000 ? 1 : 0),
        providerEstimateNote: "This RPC does not return a per-request billed-credit meter.",
        cacheHit: false,
        cached: false,
      };
      cache.set(owner, { expires: now + TTL, data: result });
      if (cache.size > 500) { for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key); }
      if (limits.size > 10_000) limits.clear();
      return response(result);
    } finally { clearTimeout(timeout); }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "This wallet scan took too long. Try a wallet with a shorter history." : error instanceof Error ? error.message : "Wallet scan failed.";
    return response({ error: message }, 502);
  }
}
