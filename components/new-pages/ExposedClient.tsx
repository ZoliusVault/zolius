"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, ExternalLink, Search, Share2 } from "lucide-react";
import { loadWallet, subscribeWalletChange } from "@/lib/wallets";
import { Panel } from "./Shared";

type Exposure = {
  address: string; network: string; solUsd: number; balance: { sol: number; lamports: number; usd: number; tokens: { mint: string; symbol: string; amount: number; decimals: number; usd: number }[] };
  history: { count: number; countLabel: string; oldestScannedAt: number | null; recent: { signature: string; slot: number; blockTime: number | null; failed: boolean; counterparties: string[]; transfers: string[] }[] };
  counterparties: { address: string; count: number }[]; activity: { busiestHourUtc: number; busiestDayUtc: number; sampleSize: number }; score: number; scoreFormula: string; estimatedCredits: number;
};

const short = (value: string) => `${value.slice(0, 5)}…${value.slice(-5)}`;
const dollars = (value: number) => value > 0 ? `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "Price unavailable";
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ExposedClient() {
  const [address, setAddress] = useState("");
  const [wallet, setWallet] = useState("");
  const [data, setData] = useState<Exposure | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { const sync = () => setWallet(loadWallet()?.address || ""); sync(); return subscribeWalletChange(sync); }, []);

  const search = async (candidate = address) => {
    setLoading(true); setError(""); setData(null); setAddress(candidate);
    try {
      const response = await fetch("/api/exposed", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: candidate }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Wallet scan failed.");
      setData(result);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Wallet scan failed."); }
    finally { setLoading(false); }
  };

  const isOwn = Boolean(wallet && data?.address === wallet);
  const copyShare = async () => {
    if (!data || !isOwn) return;
    const shareText = `Wallet Exposure Score: ${data.score}/100 · ${data.history.countLabel} public transactions scanned · Check yours at https://www.zoliusvault.tech/exposed`;
    if (navigator.share) await navigator.share({ title: "Wallet Exposure Check", text: shareText });
    else { await navigator.clipboard.writeText(shareText); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
  };

  return <div className="np-grid">
    <Panel eyebrow="Read-only chain scan" title="What can anyone see?">
      <div className="np-field"><label htmlFor="exposed-address">SOLANA ADDRESS</label><div className="np-input-row"><input id="exposed-address" className="np-input" autoComplete="off" spellCheck={false} placeholder="Paste a Solana public address" value={address} onChange={(event) => setAddress(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void search()} /><button className="np-button" onClick={() => void search()} disabled={loading || !address.trim()}><Search size={15} />{loading ? "Scanning" : "Scan address"}</button></div></div>
      <div className="np-actions"><button className="np-button-secondary" onClick={() => wallet && void search(wallet)} disabled={!wallet || loading}>Use my connected wallet</button><span className="np-small">Public chain data only · search inputs are not saved</span></div>
      {error && <p className="np-error np-muted" role="alert">{error}</p>}
    </Panel>

    {data && <>
      <div className="np-grid np-grid--3">
        <div className="np-stat"><div className="np-stat-label">Exposure score</div><div className="np-stat-value">{data.score}<span className="np-muted"> / 100</span></div><div className="np-stat-note">Transparent estimate from visible activity and holdings</div></div>
        <div className="np-stat"><div className="np-stat-label">Visible balance</div><div className="np-stat-value">{data.balance.sol.toLocaleString("en-US", { maximumFractionDigits: 4 })} SOL</div><div className="np-stat-note">{dollars(data.balance.usd)} estimated · SOL {dollars(data.solUsd)}</div></div>
        <div className="np-stat"><div className="np-stat-label">Public transactions</div><div className="np-stat-value">{data.history.countLabel}</div><div className="np-stat-note">Oldest in scanned sample {data.history.oldestScannedAt ? new Date(data.history.oldestScannedAt * 1000).toLocaleDateString() : "not available"}</div></div>
      </div>
      <div className="np-grid np-grid--2">
        <Panel eyebrow="SPL + Token-2022" title="Visible token holdings">
          {data.balance.tokens.length ? <ul className="np-list">{data.balance.tokens.map((token) => <li key={token.mint}><span><strong>{token.symbol}</strong><br /><span className="np-small">{short(token.mint)}</span></span><span>{token.amount.toLocaleString("en-US", { maximumFractionDigits: 6 })}<br /><span className="np-small">{dollars(token.usd)}</span></span></li>)}</ul> : <p className="np-muted">No fungible token accounts returned for this address.</p>}
        </Panel>
        <Panel eyebrow="Accounts in public instructions" title="Most frequent linked accounts">
          {data.counterparties.length ? <ul className="np-list">{data.counterparties.map((item) => <li key={item.address}><a className="np-address" href={`https://explorer.solana.com/address/${item.address}?cluster=devnet`} target="_blank" rel="noreferrer">{short(item.address)}</a><span>{item.count} interactions</span></li>)}</ul> : <p className="np-muted">Counterparties could not be parsed from the scanned transfer instructions.</p>}
          <p className="np-small">These may be token accounts or program-related accounts, not verified people or wallet owners. Time pattern sample: {data.activity.sampleSize} newest parsed transactions · busiest {data.activity.busiestHourUtc}:00 UTC · {weekdays[data.activity.busiestDayUtc]}</p>
        </Panel>
      </div>
      <Panel eyebrow="Recent public activity" title="Latest signatures">
        {data.history.recent.length ? <div className="np-table-wrap"><table className="np-table"><thead><tr><th>Signature</th><th>Time (UTC)</th><th>Visible amounts</th><th>Slot</th><th>Status</th></tr></thead><tbody>{data.history.recent.map((tx) => <tr key={tx.signature}><td><a className="np-external" href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`} target="_blank" rel="noreferrer">{short(tx.signature)}<ExternalLink size={12} /></a></td><td>{tx.blockTime ? new Date(tx.blockTime * 1000).toISOString().replace("T", " ").slice(0, 19) : "—"}</td><td>{tx.transfers.length ? tx.transfers.join(" · ") : "Not parsed"}</td><td>{tx.slot}</td><td>{tx.failed ? "Failed" : "Confirmed"}</td></tr>)}</tbody></table></div> : <p className="np-muted">No confirmed transaction history found.</p>}
        {isOwn && <div className="np-actions"><button className="np-button-secondary" onClick={() => void copyShare()}><Share2 size={14} />{copied ? "Copied" : "Share my score"}</button><span className="np-small">Share text excludes your full address.</span></div>}
      </Panel>
      <Panel eyebrow="Method + limits" title="How this score works"><p className="np-muted">{data.scoreFormula}</p><p className="np-small">Read-only Devnet scan, up to 1,000 signatures. Cached in memory for five minutes. Estimated Helius cost for this scan: about {data.estimatedCredits} credits (DAS holdings plus RPC reads); actual provider usage may differ.</p><p className="np-muted"><strong>This is what anyone can see. Forever.</strong></p><div className="np-actions"><Link className="np-button" href="/app">Seal your next transfer<ArrowRight size={14} /></Link></div></Panel>
    </>}
  </div>;
}
