"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpRight, CheckCircle2, CircleAlert, Copy, LoaderCircle, RefreshCw, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import { WalletModal } from "@/components/WalletModal";
import { loadWallet, type StoredWallet } from "@/lib/wallets";
import { readPrivateSolBalance, shieldSol, transferPrivateSol, withdrawSol, type SyncedSolNote } from "@/lib/helius-spr-browser";

type Tab = "shield" | "send" | "withdraw" | "vault";

const panelStyle = { background: "#fff", border: "1px solid var(--color-border, #e7e5e4)", borderRadius: 16, padding: 24 } as const;
const inputStyle = { width: "100%", border: "1px solid var(--color-border, #e7e5e4)", borderRadius: 10, padding: "12px 14px", font: "inherit", boxSizing: "border-box" as const };

function parseLamports(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,9})?$/.test(normalized)) throw new Error("Enter a valid SOL amount with up to 9 decimal places.");
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, "0"));
}

function formatLamports(value: bigint): string {
  const whole = value / 1_000_000_000n;
  const fraction = (value % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function shortAddress(value: string): string {
  return `${value.slice(0, 5)}…${value.slice(-5)}`;
}

function Workstation() {
  const search = useSearchParams();
  const router = useRouter();
  const rawTab = search.get("tab");
  const initialTab: Tab = rawTab === "swap" ? "send" : rawTab === "shield" || rawTab === "withdraw" || rawTab === "vault" ? rawTab : "shield";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [wallet, setWallet] = useState<StoredWallet | null>(null);
  const [walletModal, setWalletModal] = useState(false);
  const [notes, setNotes] = useState<SyncedSolNote[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  useEffect(() => setWallet(loadWallet()), []);
  useEffect(() => {
    const next: Tab = rawTab === "swap" ? "send" : rawTab === "shield" || rawTab === "withdraw" || rawTab === "vault" ? rawTab : "shield";
    setTab(next);
  }, [rawTab]);

  const balance = useMemo(() => notes.reduce((sum, note) => note.spent ? sum : sum + parseLamports(note.amount), 0n), [notes]);
  const balanceSol = formatLamports(balance);
  const activeNotes = notes.filter((note) => !note.spent);

  const selectTab = (next: Tab) => {
    setTab(next);
    router.replace(`/app?tab=${next === "send" ? "swap" : next}`, { scroll: false });
    setError(null);
    setSignature(null);
  };

  const sync = async () => {
    setError(null);
    setIsSyncing(true);
    try {
      if (!wallet) throw new Error("Connect a Solana wallet first.");
      const result = await readPrivateSolBalance(wallet);
      setNotes(result.notes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setIsSyncing(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSignature(null);
    setBusy(true);
    try {
      if (!wallet) throw new Error("Connect a Solana wallet first.");
      const amountLamports = parseLamports(amount);
      if (amountLamports <= 0n) throw new Error("Enter a positive SOL amount.");
      let result: { signature: string; notes: SyncedSolNote[] };
      if (tab === "shield") result = await shieldSol(wallet, amountLamports);
      else if (tab === "send") result = await transferPrivateSol(wallet, recipient, amountLamports);
      else result = await withdrawSol(wallet, recipient, amountLamports);
      setNotes(result.notes);
      setSignature(result.signature);
      setAmount("");
      if (tab !== "shield") setRecipient("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const isBalanceAction = tab === "send" || tab === "withdraw";

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 72px", color: "var(--color-text, #1c1917)" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "monospace", letterSpacing: ".08em", textTransform: "uppercase", color: "#64748b" }}><ShieldCheck size={15} /> Zolius · Solana Devnet</div>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", lineHeight: 1.1, margin: "10px 0 8px", fontWeight: 600 }}>Privacy Ring</h1>
          <p style={{ color: "#64748b", margin: 0, maxWidth: 640, lineHeight: 1.6 }}>Shield SOL, send privately to a registered Ring wallet, or withdraw back to a public Solana address.</p>
        </div>
        <button type="button" onClick={() => setWalletModal(true)} className="lp-btn lp-btn--outline" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "11px 14px" }}>
          <WalletIcon size={16} /> {wallet ? shortAddress(wallet.address) : "Connect wallet"}
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 20, alignItems: "start" }}>
        <section style={{ ...panelStyle, minWidth: 0 }}>
          <nav aria-label="Privacy Ring actions" style={{ display: "flex", gap: 6, overflowX: "auto", borderBottom: "1px solid #e7e5e4", margin: "-4px 0 24px", paddingBottom: 14 }}>
            {([ ["shield", "Shield", ArrowDownToLine], ["send", "Private send", ArrowLeftRight], ["withdraw", "Withdraw", ArrowUpRight], ["vault", "Notes", WalletIcon] ] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => selectTab(id)} aria-current={tab === id ? "page" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", border: tab === id ? "1px solid #cbd5e1" : "1px solid transparent", background: tab === id ? "#f8fafc" : "transparent", color: tab === id ? "#0f172a" : "#64748b", borderRadius: 9, padding: "9px 12px", cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: tab === id ? 650 : 500 }}><Icon size={15} />{label}</button>
            ))}
          </nav>

          {tab === "vault" ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap", marginBottom: 20 }}>
                <div><h2 style={{ margin: "0 0 6px", fontSize: 20 }}>Private notes</h2><p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Notes are loaded from the Privacy Ring indexer after you sync.</p></div>
                <button type="button" onClick={sync} disabled={isSyncing || !wallet} className="lp-btn lp-btn--outline" style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "9px 12px" }}>{isSyncing ? <LoaderCircle size={15} /> : <RefreshCw size={15} />}{isSyncing ? "Syncing…" : "Sync notes"}</button>
              </div>
              {activeNotes.length ? <div style={{ display: "grid", gap: 10 }}>{activeNotes.map((note) => <article key={note.id} style={{ border: "1px solid #e7e5e4", borderRadius: 11, padding: 15, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong style={{ fontFamily: "monospace", fontSize: 16 }}>{note.amount} SOL</strong><div style={{ color: "#64748b", fontSize: 12, marginTop: 5 }}>Leaf {note.leafIndex}</div></div><code style={{ color: "#64748b", fontSize: 11, overflowWrap: "anywhere" }}>{note.commitmentHash}</code></article>)}</div> : <div style={{ padding: 24, border: "1px dashed #cbd5e1", borderRadius: 12, color: "#64748b", fontSize: 13, textAlign: "center" }}>{wallet ? "No private SOL notes loaded. Sync the wallet to check the indexer." : "Connect a Solana wallet to view private notes."}</div>}
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
              <div><h2 style={{ margin: "0 0 6px", fontSize: 20 }}>{tab === "shield" ? "Deposit public SOL" : tab === "send" ? "Send SOL privately" : "Withdraw private SOL"}</h2><p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>{tab === "shield" ? "Deposit amount and sender are public on Solana. Your resulting Ring balance is private." : tab === "send" ? "The transfer amount is hidden. The recipient address must already be registered with Helius Privacy Rings." : "Withdrawal amount and destination are public on Solana."}</p></div>
              <label style={{ display: "grid", gap: 7, color: "#475569", fontSize: 13, fontWeight: 600 }}>Amount (SOL)<input required type="number" min="0.000000001" step="0.000000001" max={tab === "shield" ? undefined : balanceSol} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={tab === "shield" ? "0.1" : `Available: ${balanceSol}`} style={inputStyle} /></label>
              {isBalanceAction && <label style={{ display: "grid", gap: 7, color: "#475569", fontSize: 13, fontWeight: 600 }}>{tab === "send" ? "Registered recipient address" : "Public withdrawal address"}<input required type="text" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Solana base58 address" style={{ ...inputStyle, fontFamily: "monospace" }} /></label>}
              {tab === "send" && <p style={{ margin: "-8px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.55 }}>A recipient without a Privacy Ring registration cannot receive a shielded transfer. Use Withdraw when sending to an unregistered address.</p>}
              <button type="submit" disabled={busy || !wallet || !amount || (isBalanceAction && !recipient)} className="lp-btn lp-btn--filled" style={{ minHeight: 46, display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8 }}>{busy ? <><LoaderCircle size={16} /> Waiting for wallet…</> : tab === "shield" ? "Register if needed, then shield" : tab === "send" ? "Prove & send privately" : "Prove & withdraw"}</button>
              {!wallet && <p style={{ margin: 0, color: "#b45309", fontSize: 12 }}>Connect your Solana wallet to continue.</p>}
            </form>
          )}

          {error && <div role="alert" style={{ marginTop: 18, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 10, padding: 13, display: "flex", gap: 9, fontSize: 13 }}><CircleAlert size={16} style={{ flexShrink: 0 }} />{error}</div>}
          {signature && <div role="status" style={{ marginTop: 18, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, padding: 13, display: "flex", gap: 9, alignItems: "center", fontSize: 13 }}><CheckCircle2 size={16} style={{ flexShrink: 0 }} /><span>Transaction confirmed: <a href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>{shortAddress(signature)}</a></span><button type="button" aria-label="Copy transaction signature" onClick={() => navigator.clipboard.writeText(signature)} style={{ marginLeft: "auto", border: 0, background: "transparent", color: "inherit", cursor: "pointer" }}><Copy size={15} /></button></div>}
        </section>

        <aside style={{ display: "grid", gap: 16 }}>
          <section style={panelStyle}>
            <div style={{ color: "#64748b", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>Private SOL balance</div>
            <div style={{ margin: "12px 0 18px", fontFamily: "monospace", fontSize: 25, fontWeight: 700 }}>{balanceSol} <span style={{ fontSize: 13 }}>SOL</span></div>
            <div style={{ color: "#64748b", fontSize: 12 }}>{activeNotes.length} active notes loaded</div>
            <button type="button" onClick={sync} disabled={isSyncing || !wallet} className="lp-btn lp-btn--outline" style={{ width: "100%", marginTop: 18, display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8 }}>{isSyncing ? <LoaderCircle size={15} /> : <RefreshCw size={15} />}{isSyncing ? "Syncing…" : "Sync balance"}</button>
          </section>
          <section style={{ ...panelStyle, fontSize: 12, color: "#64748b", lineHeight: 1.65 }}><strong style={{ display: "block", color: "#0f172a", marginBottom: 8, fontSize: 13 }}>Privacy facts</strong><p style={{ margin: "0 0 8px" }}>Default Ring transfers hide the asset and amount. Sender and recipient addresses remain public.</p><p style={{ margin: 0 }}>Deposits and withdrawals are public transactions. This app currently supports native SOL.</p></section>
        </aside>
      </div>

      <WalletModal open={walletModal} onClose={() => setWalletModal(false)} onPick={() => { setWallet(loadWallet()); setNotes([]); setSignature(null); }} />
    </main>
  );
}

export default function AppMainPage() {
  return <Suspense fallback={<main style={{ maxWidth: 1180, margin: "0 auto", padding: 40, color: "#64748b" }}>Loading Privacy Ring…</main>}><Workstation /></Suspense>;
}
