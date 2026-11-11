"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, ArrowLeftRight, RefreshCw } from "lucide-react";
import { detectSolana, type StoredWallet } from "@/lib/wallets";
import { SolLogo, SplLogo, UsdcLogo } from "@/components/TokenLogos";
import { parseVaultPayload } from "@/lib/quantum-vault";
import {
  formatTokenAmount,
  readPrivatePortfolio,
  shieldPrivateAsset,
  transferPrivateAsset,
  withdrawPrivateAsset,
  type PrivateHistoryEntry,
  type PrivatePortfolio,
} from "@/lib/helius-spr-browser";

const SOL_MINT = "11111111111111111111111111111111";
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--color-border-strong)",
  borderRadius: "var(--radius-sm)",
  background: "#fff",
  padding: "11px 12px",
  color: "var(--color-text)",
  font: "inherit",
};

function short(value: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-7)}` : value;
}

function assetName(mint: string): string {
  if (mint === SOL_MINT) return "SOL";
  if (mint === DEVNET_USDC_MINT) return "USDC";
  return "SPL Token";
}

function AssetLogo({ mint, size = 18 }: { mint: string; size?: number }) {
  if (mint === SOL_MINT) return <SolLogo size={size} />;
  if (mint === DEVNET_USDC_MINT) return <UsdcLogo size={size} />;
  return <SplLogo size={size} />;
}

function HistoryRow({ row }: { row: PrivateHistoryEntry }) {
  const signed = row.direction === "outbound" ? "−" : "+";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 12, alignItems: "center", borderTop: "1px solid var(--color-border)", padding: "12px 0", fontSize: 12 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, textTransform: "capitalize" }}><AssetLogo mint={row.mint} size={17} />{assetName(row.mint)} · {row.kind.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</span>
      <strong style={{ fontFamily: "var(--font-mono)" }}>{signed}{formatTokenAmount(row.amount, row.decimals)}</strong>
      <a href={`https://explorer.solana.com/tx/${row.signature}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-ink)", fontFamily: "var(--font-mono)" }}>{short(row.signature)}</a>
    </div>
  );
}

export function PrivacyAssetsPanel({ wallet, onConnect }: { wallet: StoredWallet | null; onConnect: () => void }) {
  const [mintMode, setMintMode] = useState("SOL");
  const [customMint, setCustomMint] = useState("");
  const [operation, setOperation] = useState<"deposit" | "send" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [portfolio, setPortfolio] = useState<PrivatePortfolio | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (wallet) {
      try {
        const restored = parseVaultPayload(localStorage.getItem(`zolius:vault:restore:${wallet.address}`) || "null") as { portfolio?: PrivatePortfolio } | null;
        if (restored?.portfolio) setPortfolio(restored.portfolio);
      } catch {
        // A malformed local restore is ignored; a fresh indexer sync remains available.
      }
    }
  }, [wallet]);

  const mint = mintMode === "SOL" ? SOL_MINT : mintMode === "USDC" ? DEVNET_USDC_MINT : customMint.trim();
  const selectedBalance = useMemo(
    () => portfolio?.balances.find((balance) => balance.mint === mint),
    [portfolio, mint],
  );

  async function sync() {
    if (!wallet) {
      onConnect();
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const provider = detectSolana(wallet.id);
      if (provider?.publicKey?.toBase58() !== wallet.address) throw new Error("Reconnect the selected Solana wallet.");
      setPortfolio(await readPrivatePortfolio(wallet));
      setStatus("Private balances and history synced from the Privacy Rings indexer.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!wallet) {
      onConnect();
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      if (!mint) throw new Error("Enter the token mint address.");
      if (!amount.trim()) throw new Error("Enter an amount.");
      if (operation !== "deposit" && !recipient.trim()) throw new Error("Enter the destination wallet address.");
      const result = operation === "deposit"
        ? await shieldPrivateAsset(wallet, mint, amount)
        : operation === "send"
          ? await transferPrivateAsset(wallet, mint, recipient, amount)
          : await withdrawPrivateAsset(wallet, mint, recipient, amount);
      setPortfolio(result.portfolio);
      setStatus(`${operation === "deposit" ? "Private deposit" : operation === "send" ? "Private transfer" : "Private withdrawal"} confirmed: ${result.signature}`);
      setAmount("");
      setRecipient("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  const actionLabel = operation === "deposit" ? "Deposit & shield" : operation === "send" ? "Send privately" : "Withdraw";

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "end", justifyContent: "space-between", gap: 20, borderBottom: "1px solid var(--color-border)", paddingBottom: 22 }}>
        <div><div style={{ color: "var(--color-accent-ink)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>Privacy Rings // Solana Devnet</div><h1 style={{ margin: "8px 0 4px", fontFamily: "var(--font-headline)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 500 }}>Private assets &amp; history</h1><p style={{ margin: 0, color: "var(--color-muted)" }}>Real deposit, private transfer, withdrawal, balance sync, and indexed history.</p></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-muted)" }}>{wallet ? short(wallet.address) : "Wallet not connected"}</span>
          <button type="button" className="lp-btn lp-btn--outline" onClick={onConnect}>{wallet ? "Change wallet" : "Connect wallet"}</button>
          <button type="button" className="lp-btn lp-btn--outline" onClick={() => void sync()} disabled={busy}><RefreshCw size={14} /> Sync</button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(390px, 100%), 1fr))", gap: 20, alignItems: "start" }}>
        <form onSubmit={submit} style={{ display: "grid", gap: 14, padding: 24, background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ margin: 0 }}>Privacy Ring action</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {(["deposit", "send", "withdraw"] as const).map((value) => <button key={value} type="button" className={operation === value ? "lp-btn lp-btn--filled" : "lp-btn lp-btn--outline"} onClick={() => setOperation(value)}>{value === "deposit" ? <ArrowDownToLine size={14} /> : value === "send" ? <ArrowLeftRight size={14} /> : <ArrowUpRight size={14} />} {value}</button>)}
          </div>
          <fieldset style={{ display: "grid", gap: 8, padding: 0, border: 0, margin: 0 }}>
            <legend style={{ fontSize: 13, marginBottom: 8 }}>Asset</legend>
            <div role="group" aria-label="Choose a private asset" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {([
                { id: "SOL", title: "SOL", detail: "Native Solana", Logo: SolLogo },
                { id: "USDC", title: "USDC", detail: "Devnet USDC", Logo: UsdcLogo },
                { id: "CUSTOM", title: "SPL", detail: "Token-2022", Logo: SplLogo },
              ] as const).map(({ id, title, detail, Logo }) => {
                const selected = mintMode === id;
                return <button key={id} type="button" aria-pressed={selected} onClick={() => setMintMode(id)} style={{ minWidth: 0, minHeight: 70, display: "flex", alignItems: "center", gap: 9, padding: "10px 11px", textAlign: "left", borderRadius: "var(--radius-md)", border: selected ? "2px solid #ff8c00" : "1px solid var(--color-border)", background: selected ? "rgba(255,140,0,.045)" : "#fff", color: "var(--color-text)", cursor: "pointer" }}>
                  <Logo size={22} />
                  <span style={{ display: "grid", gap: 3, minWidth: 0 }}><strong style={{ fontSize: 12 }}>{title}</strong><small style={{ color: "var(--color-muted)", fontSize: 10, lineHeight: 1.25 }}>{detail}</small></span>
                </button>;
              })}
            </div>
          </fieldset>
          {mintMode === "CUSTOM" && <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Token mint<input style={fieldStyle} value={customMint} onChange={(event) => setCustomMint(event.target.value)} placeholder="Token-2022 or SPL mint address" /></label>}
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Amount<input style={fieldStyle} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={selectedBalance ? `Available: ${formatTokenAmount(selectedBalance.amount, selectedBalance.decimals)}` : "0.00"} /></label>
          {operation !== "deposit" && <label style={{ display: "grid", gap: 6, fontSize: 13 }}>{operation === "send" ? "Recipient Solana wallet" : "Public withdrawal destination"}<input style={fieldStyle} value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Base58 address" /></label>}
          <button className="lp-btn lp-btn--filled" disabled={busy || (mintMode === "CUSTOM" && !mint)}>{busy ? "Building proof & confirming…" : actionLabel}</button>
          <small style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
            Token mint and decimals are resolved against Solana Devnet. Deposits and withdrawals reveal the asset, amount, and public destination on-chain. Private sends encrypt the asset and amount; the sender and recipient addresses remain public. The transaction proof is produced by Helius&apos; attested Devnet prover.
          </small>
        </form>

        <section style={{ padding: 24, background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ margin: "0 0 8px" }}>Private balances</h2>
          {!portfolio?.balances.length ? <p style={{ color: "var(--color-muted)" }}>Connect and sync to load private asset balances.</p> : portfolio.balances.map((balance) => <div key={balance.mint} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--color-border)", padding: "12px 0", fontSize: 13 }}><span title={balance.mint} style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}><AssetLogo mint={balance.mint} /><span><strong>{assetName(balance.mint)}</strong><small style={{ display: "block", color: "var(--color-muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}>{short(balance.mint)}</small></span></span><strong style={{ fontFamily: "var(--font-mono)" }}>{formatTokenAmount(balance.amount, balance.decimals)}</strong></div>)}
          <button type="button" className="lp-btn lp-btn--outline" onClick={() => void sync()} disabled={busy}><RefreshCw size={14} /> Refresh balances &amp; history</button>
        </section>
      </div>

      <section style={{ padding: 24, background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
        <h2 style={{ margin: "0 0 10px" }}>Private transaction history</h2>
        {portfolio?.history.length ? portfolio.history.map((row, index) => <HistoryRow key={`${row.signature}-${row.slot}-${index}`} row={row} />) : <p style={{ margin: 0, color: "var(--color-muted)" }}>Sync to recover this wallet’s history from the Privacy Rings indexer. The same wallet can restore history on another device.</p>}
      </section>

      {(error || status) && <div role={error ? "alert" : "status"} style={{ padding: 14, borderRadius: "var(--radius-sm)", background: error ? "var(--color-danger-bg)" : "rgba(16, 185, 129, .08)", color: error ? "var(--color-danger-ink)" : "var(--color-text)", overflowWrap: "anywhere" }}>{error || status}</div>}
    </section>
  );
}
