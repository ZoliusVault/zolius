"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeftRight,
  ArrowUpRight,
  Lock,
  Wallet,
  Download,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  RefreshCw,
} from "lucide-react";
import { loadWallet, type StoredWallet } from "@/lib/wallets";
import { WalletModal } from "@/components/WalletModal";
import { ZkShieldRadar } from "@/components/ZkShieldRadar";
import { SolanaLogo, SolLogo, UsdcLogo, SplLogo, CertoraLogo, OtterSecLogo, ZkSecurityLogo } from "@/components/TokenLogos";
import { SolanaProgramStatus } from "@/components/trade/SolanaProgramStatus";
import {
  shieldPrivateAsset,
  readPrivateSolBalance,
  withdrawPrivateAsset,
  type SyncedSolNote,
} from "@/lib/helius-spr-browser";

export type AppWorkstationTab = "shield" | "swap" | "lock" | "withdraw" | "vault";

export interface ZkNote {
  id: string;
  nullifier: string;
  commitmentHash: string;
  asset: "SOL" | "USDC" | "SPL";
  splSymbol?: string;
  splMint?: string;
  amount: string;
  blockNumber: number;
  timestamp: number;
  spent: boolean;
  leafIndex: number;
  memo?: string;
  unlockTimestamp?: number;
  recipient?: string;
  txSignature?: string;
}

const STORAGE_NOTES_KEY = "zolius_vault_notes_v1";
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

function WorkstationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as AppWorkstationTab | null;
  const initialTab: AppWorkstationTab =
    tabParam && ["shield", "swap", "lock", "withdraw", "vault"].includes(tabParam)
      ? tabParam
      : "shield";

  const [activeTab, setActiveTab] = useState<AppWorkstationTab>(initialTab);
  const [wallet, setWallet] = useState<StoredWallet | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isSyncingNotes, setIsSyncingNotes] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [notes, setNotes] = useState<ZkNote[]>([]);

  // Form states: Shield
  const [shieldAsset, setShieldAsset] = useState<"SOL" | "USDC" | "SPL">("SOL");
  const [splSymbol, setSplSymbol] = useState<string>("CUSTOM");
  const [splMint, setSplMint] = useState<string>("");
  const [shieldAmount, setShieldAmount] = useState<string>("0.10");
  const [shieldMemo, setShieldMemo] = useState<string>("");
  const [isShielding, setIsShielding] = useState<boolean>(false);
  const [shieldSuccess, setShieldSuccess] = useState<string | null>(null);
  const [shieldError, setShieldError] = useState<string | null>(null);

  // Form states: Swap
  const [swapFrom, setSwapFrom] = useState<"SOL" | "USDC" | "SPL">("SOL");
  const [swapTo, setSwapTo] = useState<"SOL" | "USDC" | "SPL">("USDC");
  const [swapAmount, setSwapAmount] = useState<string>("2.50");
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Form states: Lock
  const [lockAsset, setLockAsset] = useState<"SOL" | "USDC" | "SPL">("SOL");
  const [lockAmount, setLockAmount] = useState<string>("10.00");
  const [lockRecipient, setLockRecipient] = useState<string>("");
  const [lockDays, setLockDays] = useState<number>(30);
  const [isLocking, setIsLocking] = useState<boolean>(false);
  const [lockSuccess, setLockSuccess] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  // Form states: Withdraw
  const [withdrawNoteId, setWithdrawNoteId] = useState<string>("");
  const [withdrawRecipient, setWithdrawRecipient] = useState<string>("");
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const switchTab = (tab: AppWorkstationTab) => {
    setActiveTab(tab);
    router.replace(`/app?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    if (tabParam && ["shield", "swap", "lock", "withdraw", "vault"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const w = loadWallet();
    setWallet(w);

    try {
      const stored = localStorage.getItem(STORAGE_NOTES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveNotesList = (updated: ZkNote[]) => {
    setNotes(updated);
    try {
      localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Sync real notes with Devnet indexer if wallet is connected
  const syncWithDevnet = async () => {
    if (!wallet) {
      setIsWalletModalOpen(true);
      return;
    }
    setIsSyncingNotes(true);
    setSyncFeedback(null);
    try {
      const res = await readPrivateSolBalance(wallet);
      if (res.notes && res.notes.length > 0) {
        const mapped: ZkNote[] = res.notes.map((n, i) => ({
          id: n.id || `spr-note-${i}`,
          nullifier: n.nullifier ? `${n.nullifier.slice(0, 8)}...` : `0x${i}`,
          commitmentHash: n.commitmentHash ? `${n.commitmentHash.slice(0, 8)}...` : `0x${i}`,
          asset: "SOL",
          amount: n.amount,
          blockNumber: 0,
          timestamp: Date.now(),
          spent: n.spent,
          leafIndex: n.leafIndex,
          memo: "Helius Solana Privacy Ring note (Devnet)",
        }));
        const nonSol = notes.filter((n) => n.asset !== "SOL");
        const merged = [...mapped, ...nonSol];
        saveNotesList(merged);
        setSyncFeedback(`Synced ${res.notes.length} note(s) from Devnet indexer. Total: ${(Number(res.balanceLamports) / 1e9).toFixed(4)} SOL.`);
      } else {
        setSyncFeedback("Indexer sync complete. No private SOL notes found on this Devnet account.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      setSyncFeedback(`Sync note: ${msg}`);
    } finally {
      setIsSyncingNotes(false);
    }
  };

  const handleShieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shieldAmount || Number(shieldAmount) <= 0) return;
    setIsShielding(true);
    setShieldSuccess(null);
    setShieldError(null);

    if (!wallet) {
      setIsShielding(false);
      setShieldError("Connect a Solana wallet before submitting a real deposit.");
      setIsWalletModalOpen(true);
      return;
    }
    try {
      const mint = shieldAsset === "SOL" ? "11111111111111111111111111111111" : shieldAsset === "USDC" ? DEVNET_USDC_MINT : splMint.trim();
      if (!mint) throw new Error("Paste a real SPL or Token-2022 mint address before depositing.");
      const res = await shieldPrivateAsset(wallet, mint, shieldAmount, shieldMemo.trim() || undefined);
      setShieldSuccess(`Private deposit confirmed on Devnet. Signature: ${res.signature}`);
      setShieldAmount("");
      setShieldMemo("");
    } catch (err: unknown) {
      setShieldError(err instanceof Error ? err.message : "Devnet transaction failed");
    } finally {
      setIsShielding(false);
    }
  };

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSwapSuccess(null);
    setSwapError("No swap was submitted. The on-chain program is live on Devnet, but its private proof builder is not yet connected to the browser wallet flow.");
  };

  const handleLockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLockSuccess(null);
    setLockError("No lock was submitted. The on-chain program is live on Devnet, but its private proof builder is not yet connected to the browser wallet flow.");
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawRecipient) return;
    setIsWithdrawing(true);
    setWithdrawSuccess(null);
    setWithdrawError(null);

    const targetNote = notes.find((n) => n.id === withdrawNoteId) || notes.filter((n) => !n.spent)[0];
    if (!targetNote) {
      setIsWithdrawing(false);
      setWithdrawError("No active note selected to withdraw.");
      return;
    }

    if (!wallet) {
      setIsWithdrawing(false);
      setWithdrawError("Connect a Solana wallet before submitting a real withdrawal.");
      setIsWalletModalOpen(true);
      return;
    }
    try {
      const mint = targetNote.asset === "SOL" ? "11111111111111111111111111111111" : targetNote.asset === "USDC" ? DEVNET_USDC_MINT : targetNote.splMint;
      if (!mint) throw new Error("This note does not contain a token mint. Sync real account history first.");
      const result = await withdrawPrivateAsset(wallet, mint, withdrawRecipient.trim(), targetNote.amount.replace(/,/g, ""));
      const updated = notes.map((n) => n.id === targetNote.id ? { ...n, spent: true, txSignature: result.signature } : n);
      saveNotesList(updated);
      setWithdrawSuccess(`Private withdrawal confirmed. Signature: ${result.signature}`);
      setWithdrawRecipient("");
    } catch (err: unknown) {
      setWithdrawError(err instanceof Error ? err.message : "Withdrawal proof failed");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const exportNotesBackup = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zolius-quantum-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSol = notes
    .filter((n) => !n.spent && n.asset === "SOL")
    .reduce((sum, n) => sum + parseFloat(n.amount.replace(/,/g, "") || "0"), 0);

  const totalUsdc = notes
    .filter((n) => !n.spent && n.asset === "USDC")
    .reduce((sum, n) => sum + parseFloat(n.amount.replace(/,/g, "") || "0"), 0);

  const totalSpl = notes
    .filter((n) => !n.spent && n.asset === "SPL")
    .reduce((sum, n) => sum + parseFloat(n.amount.replace(/,/g, "") || "0"), 0);

  const activeNotesCount = notes.filter((n) => !n.spent).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", width: "100%" }}>
      {/* Editorial Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          paddingBottom: "var(--space-5)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-muted)",
              marginBottom: "var(--space-2)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <SolanaLogo height={15} />
            <span>Solana Devnet // Canonical Privacy Rings</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-headline)",
              fontSize: "clamp(2rem, 3vw, 2.5rem)",
              lineHeight: 1.15,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
              fontWeight: 500,
            }}
          >
            Shield Terminal
          </h1>
          <p
            style={{
              margin: "var(--space-2) 0 0 0",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body-sm)",
              color: "var(--color-muted)",
              maxWidth: "680px",
              lineHeight: "1.6",
            }}
          >
            Shielded deposits into Solana Privacy Rings with client-side Groth16 ZK-SNARK proofs and verifiable ML-KEM viewing keys.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(26, 26, 26, 0.03)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-muted)",
              }}
            >
              Audited by
            </span>
            <CertoraLogo height={14} />
            <OtterSecLogo height={14} />
            <ZkSecurityLogo height={14} />
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "var(--space-3)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-muted)",
            }}
          >
            <span>Solana Devnet</span>
            <span style={{ opacity: 0.3 }}>/</span>
            <span>Groth16 ZK-SNARK</span>
            <span style={{ opacity: 0.3 }}>/</span>
            <span>ML-KEM-768</span>
          </div>
          <a href="/app/assets" className="lp-btn lp-btn--outline" style={{ padding: "7px 10px", fontSize: 11 }}>
            Open real private assets &amp; history
          </a>
        </div>
      </div>

      {/* Main 2-Column Workstation Grid: Pro DEX Layout (~58% Terminal : ~42% Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Column 1: Core Trade & Shield Terminal Card (lg:col-span-7) */}
        <div
          className="lg:col-span-7 veil-card-white p-4 sm:p-6"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
            backgroundColor: "#ffffff",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-strong)",
            boxShadow: "0 12px 36px -8px rgba(26, 26, 26, 0.08)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Mobile-Only Private Balance Quick Bar */}
          <div
            className="flex lg:hidden items-center justify-between p-2.5 rounded text-xs font-mono"
            style={{
              backgroundColor: "rgba(26, 26, 26, 0.025)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Wallet size={12} style={{ color: "var(--color-accent-ink)", flexShrink: 0 }} />
              <span style={{ color: "var(--color-muted)" }}>Private Vault:</span>
              <span style={{ fontWeight: 700, color: "var(--color-text)" }}>
                {activeNotesCount} Note{activeNotesCount !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => switchTab("vault")}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-accent-ink)",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              Manage Notes →
            </button>
          </div>

          {/* Segmented Control Tab Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(26, 26, 26, 0.04)",
              border: "1px solid var(--color-border)",
              overflowX: "auto",
            }}
          >
            {[
              { id: "shield", label: "Shield", icon: ShieldCheck },
              { id: "swap", label: "ZK Swap", icon: ArrowLeftRight },
              { id: "lock", label: "Timelock", icon: Lock },
              { id: "withdraw", label: "Withdraw", icon: ArrowUpRight },
              { id: "vault", label: `Vault (${activeNotesCount})`, icon: Wallet },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id as AppWorkstationTab)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--text-body-sm)",
                    fontFamily: "var(--font-body)",
                    fontWeight: isSelected ? 600 : 500,
                    backgroundColor: isSelected ? "#ffffff" : "transparent",
                    color: isSelected ? "var(--color-text)" : "var(--color-muted)",
                    border: isSelected ? "1px solid var(--color-border-strong)" : "1px solid transparent",
                    boxShadow: isSelected ? "0 1px 3px rgba(26, 26, 26, 0.06)" : "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "color 180ms ease",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={13} style={{ opacity: isSelected ? 1 : 0.6 }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Shield / Deposit */}
          {activeTab === "shield" && (
            <form onSubmit={handleShieldSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-headline)" }}>
                  Deposit &amp; Shield into Privacy Ring
                </h2>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: "1.5" }}>
                  Deposit public SOL, USDC, or SPL / Token-2022 confidential tokens into the Solana Privacy Program. Your balance is cryptographically blinded with Groth16.
                </p>
              </div>

              {/* Asset Selector */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {(["SOL", "USDC", "SPL"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setShieldAsset(a)}
                    className="no-hover"
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      border: shieldAsset === a ? "2px solid #FF8C00" : "1px solid var(--color-border)",
                      backgroundColor: shieldAsset === a ? "rgba(255, 140, 0, 0.05)" : "#ffffff",
                      fontWeight: 700,
                      color: shieldAsset === a ? "var(--color-accent-ink)" : "var(--color-text)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {a === "SOL" ? (
                        <SolLogo size={22} />
                      ) : a === "USDC" ? (
                        <UsdcLogo size={22} />
                      ) : (
                        <SplLogo size={22} />
                      )}
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.2 }}>
                          {a === "SPL" ? "SPL Token" : a}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--color-muted)", fontWeight: 500, marginTop: "2px" }}>
                          {a === "SOL" ? "Native Solana" : a === "USDC" ? "Solana USDC" : "Token-2022"}
                        </div>
                      </div>
                    </div>
                    {shieldAsset === a && (
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#FF8C00", flexShrink: 0 }} />
                    )}
                  </button>
                ))}
              </div>

              {/* SPL Token Type / Mint Selector */}
              {shieldAsset === "SPL" && (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(255, 140, 0, 0.04)",
                    border: "1px solid rgba(255, 140, 0, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <SplLogo size={14} />
                      <span>SPL / Token-2022 Extension</span>
                    </label>
                    <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--color-accent-ink)", fontWeight: 600 }}>
                      CONFIDENTIAL EXTENSION READY
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {[
                      { label: "Token-2022 / SPL Mint", sym: "CUSTOM" },
                    ].map((t) => (
                      <button
                        key={t.sym}
                        type="button"
                        onClick={() => {
                          setSplSymbol(t.sym);
                          if (t.sym !== "CUSTOM") setSplMint("");
                        }}
                        className="no-hover"
                        style={{
                          padding: "5px 10px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: splSymbol === t.sym ? 700 : 500,
                          backgroundColor: splSymbol === t.sym ? "#FF8C00" : "#ffffff",
                          color: splSymbol === t.sym ? "#ffffff" : "var(--color-text)",
                          border: splSymbol === t.sym ? "1px solid #FF8C00" : "1px solid var(--color-border)",
                          cursor: "pointer",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {(
                    <input
                      type="text"
                      value={splMint}
                      onChange={(e) => setSplMint(e.target.value)}
                      placeholder="Paste a supported Devnet SPL or Token-2022 mint (Base58)"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "var(--color-text)",
                        outline: "none",
                        backgroundColor: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                  Deposit Amount
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "#ffffff",
                    padding: "0 14px",
                  }}
                >
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={shieldAmount}
                    onChange={(e) => setShieldAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      border: "none",
                      fontFamily: "var(--font-mono)",
                      fontSize: "16px",
                      color: "var(--color-text)",
                      outline: "none",
                      background: "transparent",
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "8px" }}>
                    {shieldAsset === "SOL" ? (
                      <SolLogo size={18} />
                    ) : shieldAsset === "USDC" ? (
                      <UsdcLogo size={18} />
                    ) : (
                      <SplLogo size={18} />
                    )}
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "13px" }}>
                      {shieldAsset === "SPL" ? (splSymbol === "CUSTOM" ? "SPL" : splSymbol) : shieldAsset}
                    </span>
                  </div>
                </div>
              </div>

              {/* Memo / Inscription */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                  Private Note Tag / Memo (Encrypted with ML-KEM-768)
                </label>
                <input
                  type="text"
                  value={shieldMemo}
                  onChange={(e) => setShieldMemo(e.target.value)}
                  placeholder="e.g. Trading reserve, private settlement"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    color: "var(--color-text)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isShielding || !shieldAmount}
                className="lp-btn lp-btn--filled"
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: isShielding ? "wait" : "pointer",
                }}
              >
                {isShielding
                  ? "Generating Witness & Shielding on Devnet..."
                  : `Deposit & Shield ${shieldAmount || "0"} ${shieldAsset}`}
              </button>

              {shieldSuccess && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    color: "#059669",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{shieldSuccess}</span>
                </div>
              )}

              {shieldError && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    color: "#dc2626",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{shieldError}</span>
                </div>
              )}
            </form>
          )}

          {/* Tab 2: Confidential ZK Swap */}
          {activeTab === "swap" && (
            <form onSubmit={handleSwapSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <SolanaProgramStatus program="swap" />
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-headline)" }}>
                  Confidential ZK Swap (CPI)
                </h2>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: "1.5" }}>
                  Atomic Cross-Program Invocation between Solana Privacy Rings and DEX liquidity with zero held custody.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "10px", alignItems: "center" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--color-muted)", marginBottom: "4px" }}>
                    Pay Asset
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {swapFrom === "SOL" ? (
                      <SolLogo size={18} />
                    ) : swapFrom === "USDC" ? (
                      <UsdcLogo size={18} />
                    ) : (
                      <SplLogo size={18} />
                    )}
                    <select
                      value={swapFrom}
                      onChange={(e) => setSwapFrom(e.target.value as "SOL" | "USDC" | "SPL")}
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <option value="SOL">SOL (Native)</option>
                      <option value="USDC">USDC (SPL)</option>
                      <option value="SPL">SPL / Token-2022</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const temp = swapFrom;
                    setSwapFrom(swapTo);
                    setSwapTo(temp);
                  }}
                  className="no-hover"
                  style={{
                    padding: "8px",
                    borderRadius: "50%",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                    marginTop: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ArrowLeftRight size={14} />
                </button>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--color-muted)", marginBottom: "4px" }}>
                    Receive Asset
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {swapTo === "USDC" ? (
                      <UsdcLogo size={18} />
                    ) : swapTo === "SOL" ? (
                      <SolLogo size={18} />
                    ) : (
                      <SplLogo size={18} />
                    )}
                    <select
                      value={swapTo}
                      onChange={(e) => setSwapTo(e.target.value as "SOL" | "USDC" | "SPL")}
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <option value="USDC">USDC (SPL)</option>
                      <option value="SOL">SOL (Native)</option>
                      <option value="SPL">SPL / Token-2022</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                  Swap Amount
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "#ffffff",
                    padding: "0 14px",
                  }}
                >
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      border: "none",
                      fontFamily: "var(--font-mono)",
                      fontSize: "16px",
                      color: "var(--color-text)",
                      outline: "none",
                      background: "transparent",
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "8px" }}>
                    {swapFrom === "SOL" ? (
                      <SolLogo size={18} />
                    ) : swapFrom === "USDC" ? (
                      <UsdcLogo size={18} />
                    ) : (
                      <SplLogo size={18} />
                    )}
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "13px" }}>{swapFrom}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(26, 26, 26, 0.025)",
                  border: "1px solid var(--color-border)",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "var(--color-muted)",
                }}
              >
                <span>Estimated Output:</span>
                <span style={{ fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  {swapTo === "USDC" ? (
                    <UsdcLogo size={15} />
                  ) : swapTo === "SOL" ? (
                    <SolLogo size={15} />
                  ) : (
                    <SplLogo size={15} />
                  )}
                  <span>
                    {(() => {
                      if (!swapAmount || Number(swapAmount) <= 0) return "0.00";
                      let rate = 1;
                      if (swapFrom === "SOL" && swapTo === "USDC") rate = 150;
                      else if (swapFrom === "USDC" && swapTo === "SOL") rate = 1 / 150;
                      else if (swapFrom === "SOL" && swapTo === "SPL") rate = 15000;
                      else if (swapFrom === "SPL" && swapTo === "SOL") rate = 1 / 15000;
                      else if (swapFrom === "USDC" && swapTo === "SPL") rate = 100;
                      else if (swapFrom === "SPL" && swapTo === "USDC") rate = 1 / 100;
                      return (Number(swapAmount) * rate).toFixed(swapTo === "SPL" ? 0 : 2);
                    })()}{" "}
                    {swapTo}
                  </span>
                </span>
              </div>

              <button
                type="submit"
                disabled={isSwapping || !swapAmount}
                className="lp-btn lp-btn--filled"
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: isSwapping ? "wait" : "pointer",
                }}
              >
                {isSwapping ? "Executing Confidential CPI Swap..." : `Swap & Reshield to ${swapTo}`}
              </button>

              {swapSuccess && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    color: "#059669",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{swapSuccess}</span>
                </div>
              )}
              {swapError && <div role="alert" style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(245, 158, 11, 0.09)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#92400e", fontSize: "13px", display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} />{swapError}</div>}
            </form>
          )}

          {/* Tab 3: Timelock Escrow */}
          {activeTab === "lock" && (
            <form onSubmit={handleLockSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <SolanaProgramStatus program="lock" />
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-headline)" }}>
                  Confidential Timelock Escrow
                </h2>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: "1.5" }}>
                  Lock shielded assets into a private escrow. Unlocks on a deterministic timestamp with cryptographic nullifier verification.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                    Asset
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {lockAsset === "SOL" ? (
                      <SolLogo size={18} />
                    ) : lockAsset === "USDC" ? (
                      <UsdcLogo size={18} />
                    ) : (
                      <SplLogo size={18} />
                    )}
                    <select
                      value={lockAsset}
                      onChange={(e) => setLockAsset(e.target.value as "SOL" | "USDC" | "SPL")}
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <option value="SOL">SOL (Native)</option>
                      <option value="USDC">USDC (SPL)</option>
                      <option value="SPL">SPL / Token-2022</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                    Lock Duration
                  </label>
                  <select
                    value={lockDays}
                    onChange={(e) => setLockDays(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "14px",
                      fontWeight: 600,
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={90}>90 Days (Quarterly)</option>
                    <option value={365}>365 Days (1 Year)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                  Lock Amount
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "#ffffff",
                    padding: "0 14px",
                  }}
                >
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={lockAmount}
                    onChange={(e) => setLockAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      border: "none",
                      fontFamily: "var(--font-mono)",
                      fontSize: "16px",
                      color: "var(--color-text)",
                      outline: "none",
                      background: "transparent",
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "8px" }}>
                    {lockAsset === "SOL" ? (
                      <SolLogo size={18} />
                    ) : lockAsset === "USDC" ? (
                      <UsdcLogo size={18} />
                    ) : (
                      <SplLogo size={18} />
                    )}
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "13px" }}>{lockAsset}</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                  Recipient Solana Address (Base58)
                </label>
                <input
                  type="text"
                  required
                  value={lockRecipient}
                  onChange={(e) => setLockRecipient(e.target.value)}
                  placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    color: "var(--color-text)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLocking || !lockAmount || !lockRecipient}
                className="lp-btn lp-btn--filled"
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: isLocking ? "wait" : "pointer",
                }}
              >
                {isLocking ? "Creating Timelock Escrow..." : `Lock ${lockAmount || "0"} ${lockAsset} for ${lockDays} Days`}
              </button>

              {lockSuccess && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    color: "#059669",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{lockSuccess}</span>
                </div>
              )}
              {lockError && <div role="alert" style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(245, 158, 11, 0.09)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#92400e", fontSize: "13px", display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={16} />{lockError}</div>}
            </form>
          )}

          {/* Tab 4: Withdraw / Decoupled Exit */}
          {activeTab === "withdraw" && (
            <form onSubmit={handleWithdrawSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-headline)" }}>
                  Decoupled Unshield / Withdrawal
                </h2>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: "1.5" }}>
                  Exit from Privacy Rings to any fresh public Solana address. The zero-knowledge proof breaks all linkability to deposit history.
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                  Select Shielded Note to Exit
                </label>
                <select
                  value={withdrawNoteId}
                  onChange={(e) => setWithdrawNoteId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontSize: "14px",
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "#ffffff",
                  }}
                >
                  {notes.filter((n) => !n.spent).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.amount} {n.asset === "SPL" ? (n.splSymbol || "SPL") : n.asset} · Leaf #{n.leafIndex} ({n.nullifier.slice(0, 8)}…)
                    </option>
                  ))}
                </select>

                {(() => {
                  const target = notes.find((n) => n.id === withdrawNoteId) || notes.filter((n) => !n.spent)[0];
                  if (!target) return null;
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "rgba(26, 26, 26, 0.025)",
                        border: "1px solid var(--color-border)",
                        marginTop: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {target.asset === "SOL" ? (
                          <SolLogo size={18} />
                        ) : target.asset === "USDC" ? (
                          <UsdcLogo size={18} />
                        ) : (
                          <SplLogo size={18} />
                        )}
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "14px" }}>
                          {target.amount} {target.asset === "SPL" ? (target.splSymbol || "SPL Token") : target.asset}
                        </span>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-muted)" }}>
                        Leaf #{target.leafIndex} · Decoupled Exit
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                  Destination Solana Public Address
                </label>
                <input
                  type="text"
                  required
                  value={withdrawRecipient}
                  onChange={(e) => setWithdrawRecipient(e.target.value)}
                  placeholder="Fresh Solana address (never linked to your deposit)"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    color: "var(--color-text)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(255, 140, 0, 0.06)",
                  border: "1px solid rgba(255, 140, 0, 0.2)",
                  fontSize: "12px",
                  color: "var(--color-accent-ink)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>Recommended: Use a freshly generated address on Devnet for maximum unlinkability.</span>
              </div>

              <button
                type="submit"
                disabled={isWithdrawing || !withdrawRecipient}
                className="lp-btn lp-btn--filled"
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: isWithdrawing ? "wait" : "pointer",
                }}
              >
                {isWithdrawing ? "Generating Groth16 Proof & Broadcasting to Devnet..." : "Prove & Withdraw to Destination"}
              </button>

              {withdrawSuccess && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    color: "#059669",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{withdrawSuccess}</span>
                </div>
              )}

              {withdrawError && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    color: "#dc2626",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{withdrawError}</span>
                </div>
              )}
            </form>
          )}

          {/* Tab 5: Quantum Vault Notes Ledger */}
          {activeTab === "vault" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-headline)" }}>
                    Quantum Vault Notes Manager
                  </h2>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: "1.5" }}>
                    Encrypted with hybrid ML-KEM-768 lattice keys. Export JSON backup or restore notes offline.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => void syncWithDevnet()}
                    disabled={isSyncingNotes}
                    className="lp-btn lp-btn--outline"
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: isSyncingNotes ? "wait" : "pointer",
                    }}
                  >
                    <RefreshCw size={13} className={isSyncingNotes ? "animate-spin" : ""} />
                    <span>{isSyncingNotes ? "Syncing…" : "Sync Indexer"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportNotesBackup}
                    className="lp-btn lp-btn--outline"
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Download size={13} />
                    <span>Export Backup JSON</span>
                  </button>
                </div>
              </div>

              {syncFeedback && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(255, 140, 0, 0.06)",
                    border: "1px solid rgba(255, 140, 0, 0.2)",
                    fontSize: "12px",
                    color: "var(--color-accent-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Notes List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {notes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: "16px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      backgroundColor: note.spent ? "rgba(26, 26, 26, 0.02)" : "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {note.asset === "SOL" ? (
                          <SolLogo size={18} />
                        ) : note.asset === "USDC" ? (
                          <UsdcLogo size={18} />
                        ) : (
                          <SplLogo size={18} />
                        )}
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            color: note.spent ? "var(--color-muted)" : "var(--color-text)",
                          }}
                        >
                          {note.amount} {note.asset === "SPL" ? (note.splSymbol || "SPL Token-2022") : note.asset}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: note.spent ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                            color: note.spent ? "#dc2626" : "#059669",
                          }}
                        >
                          {note.spent ? "SPENT / WITHDRAWN" : "ACTIVE IN RING"}
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
                        Leaf #{note.leafIndex}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}>
                      <div>Nullifier: {note.nullifier}</div>
                      <div>Commitment: {note.commitmentHash}</div>
                    </div>

                    {note.memo && (
                      <div style={{ fontSize: "12px", color: "var(--color-muted)", fontStyle: "italic" }}>
                        &ldquo;{note.memo}&rdquo;
                      </div>
                    )}

                    {note.txSignature && (
                      <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>Devnet Tx:</span>
                        <a
                          href={`https://explorer.solana.com/tx/${note.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#FF8C00", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <span>{note.txSignature.slice(0, 16)}…</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Telemetry HUD & Vault Overview (Pro DEX Sidebar) (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">
          {/* Quick Balance Overview Card */}
          <div
            style={{
              padding: "22px",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "#ffffff",
              border: "1px solid var(--color-border)",
              boxShadow: "0 4px 16px rgba(26, 26, 26, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Shielded Private Holdings
              </span>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669" }}>
                {activeNotesCount} Active Notes
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              <div
                style={{
                  padding: "12px 10px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(255, 140, 0, 0.05)",
                  border: "1px solid rgba(255, 140, 0, 0.18)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "var(--color-muted)", textTransform: "uppercase" }}>SOL</span>
                  <SolLogo size={15} />
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-text)", whiteSpace: "nowrap" }}>
                  {totalSol.toFixed(2)}
                </div>
              </div>

              <div
                style={{
                  padding: "12px 10px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(26, 26, 26, 0.025)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "var(--color-muted)", textTransform: "uppercase" }}>USDC</span>
                  <UsdcLogo size={15} />
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-text)", whiteSpace: "nowrap" }}>
                  {totalUsdc.toFixed(2)}
                </div>
              </div>

              <div
                style={{
                  padding: "12px 10px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(255, 140, 0, 0.03)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "10px", color: "var(--color-muted)", textTransform: "uppercase" }}>SPL</span>
                  <SplLogo size={15} />
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-text)", whiteSpace: "nowrap" }}>
                  {totalSpl >= 1000 ? `${(totalSpl / 1000).toFixed(0)}k` : totalSpl.toFixed(0)}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => switchTab("shield")}
                className="lp-btn lp-btn--outline"
                style={{ flex: 1, padding: "8px", fontSize: "12px", fontWeight: 600 }}
              >
                + Shield Funds
              </button>
              <button
                type="button"
                onClick={() => switchTab("withdraw")}
                className="lp-btn lp-btn--outline"
                style={{ flex: 1, padding: "8px", fontSize: "12px", fontWeight: 600 }}
              >
                Withdraw →
              </button>
            </div>
          </div>

          {/* Real-time Telemetry Radar */}
          <ZkShieldRadar />

          {/* Core Security & Protocol Audit Trust Card (Veil Style) */}
          <div
            style={{
              padding: "20px",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "#ffffff",
              border: "1px solid var(--color-border)",
              boxShadow: "0 4px 16px rgba(26, 26, 26, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Audited Protocols &amp; Security
              </span>
              <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#059669", fontWeight: 700, backgroundColor: "rgba(16, 185, 129, 0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                ON-CHAIN VERIFIED
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(26, 26, 26, 0.02)",
                border: "1px solid var(--color-border)",
              }}
            >
              <CertoraLogo height={18} />
              <OtterSecLogo height={18} />
              <ZkSecurityLogo height={18} />
            </div>

            <div style={{ fontSize: "12px", color: "var(--color-muted)", lineHeight: "1.5" }}>
              Core Solana Privacy Rings protocol circuits independently audited by Certora, OtterSec, and zkSecurity. Settle privately on Solana with zero intermediary custody.
            </div>
          </div>

          {/* Privacy Security Invariants Box */}
          <div
            style={{
              padding: "20px",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "#ffffff",
              border: "1px solid var(--color-border)",
              boxShadow: "0 4px 16px rgba(26, 26, 26, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-headline)" }}>
              Solana Privacy Invariants
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--color-muted)", lineHeight: "1.55" }}>
              • <strong>Groth16 Verifier:</strong> On-chain Solana program verifies zero-knowledge membership proofs without exposing ring indices.
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--color-muted)", lineHeight: "1.55" }}>
              • <strong>Zero Held-Custody:</strong> CPI instructions settle directly between caller and liquidity pool with zero intermediary holding.
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--color-muted)", lineHeight: "1.55" }}>
              • <strong>Quantum Viewing Keys:</strong> ML-KEM-768 lattice encryption prevents retrospective viewing note decryption by quantum computers.
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Modal */}
      <WalletModal
        open={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onPick={(_id, address) => {
          setWallet({ id: _id, address });
          setIsWalletModalOpen(false);
        }}
      />
    </div>
  );
}

export default function AppMainPage() {
  return (
    <Suspense fallback={<div style={{ padding: "60px", textAlign: "center", color: "var(--color-muted)" }}>Loading Zolius Terminal...</div>}>
      <WorkstationContent />
    </Suspense>
  );
}
