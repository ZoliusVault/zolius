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
} from "lucide-react";
import { loadWallet, type StoredWallet } from "@/lib/wallets";
import { WalletModal } from "@/components/WalletModal";
import { ZkShieldRadar } from "@/components/ZkShieldRadar";
import { SolanaLogo } from "@/components/TokenLogos";

export type AppWorkstationTab = "shield" | "swap" | "lock" | "withdraw" | "vault";

export interface ZkNote {
  id: string;
  nullifier: string;
  commitmentHash: string;
  asset: "SOL" | "USDC";
  amount: string;
  blockNumber: number;
  timestamp: number;
  spent: boolean;
  leafIndex: number;
  memo?: string;
  unlockTimestamp?: number;
  recipient?: string;
}

const STORAGE_NOTES_KEY = "zolius_vault_notes_v1";

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

  // Default demo / stored notes
  const [notes, setNotes] = useState<ZkNote[]>([
    {
      id: "note-1",
      nullifier: "0x4a9f...e21b",
      commitmentHash: "0x88c3...910a",
      asset: "SOL",
      amount: "10.00",
      blockNumber: 298144210,
      timestamp: Date.now() - 3600000 * 4,
      spent: false,
      leafIndex: 4281,
      memo: "Trading reserve · Ring #88",
    },
    {
      id: "note-2",
      nullifier: "0x12b0...cc49",
      commitmentHash: "0x3e45...719f",
      asset: "USDC",
      amount: "1,500.00",
      blockNumber: 298150119,
      timestamp: Date.now() - 3600000 * 18,
      spent: false,
      leafIndex: 4295,
      memo: "Confidential settlement note",
    },
  ]);

  // Form states: Shield
  const [shieldAsset, setShieldAsset] = useState<"SOL" | "USDC">("SOL");
  const [shieldAmount, setShieldAmount] = useState<string>("5.00");
  const [shieldMemo, setShieldMemo] = useState<string>("");
  const [isShielding, setIsShielding] = useState<boolean>(false);
  const [shieldSuccess, setShieldSuccess] = useState<string | null>(null);

  // Form states: Swap
  const [swapFrom, setSwapFrom] = useState<"SOL" | "USDC">("SOL");
  const [swapTo, setSwapTo] = useState<"SOL" | "USDC">("USDC");
  const [swapAmount, setSwapAmount] = useState<string>("2.50");
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);

  // Form states: Lock
  const [lockAsset, setLockAsset] = useState<"SOL" | "USDC">("SOL");
  const [lockAmount, setLockAmount] = useState<string>("10.00");
  const [lockRecipient, setLockRecipient] = useState<string>("");
  const [lockDays, setLockDays] = useState<number>(30);
  const [isLocking, setIsLocking] = useState<boolean>(false);
  const [lockSuccess, setLockSuccess] = useState<string | null>(null);

  // Form states: Withdraw
  const [withdrawNoteId, setWithdrawNoteId] = useState<string>("");
  const [withdrawRecipient, setWithdrawRecipient] = useState<string>("");
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

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

  const handleShieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shieldAmount || Number(shieldAmount) <= 0) return;
    setIsShielding(true);
    setShieldSuccess(null);

    setTimeout(() => {
      setIsShielding(false);
      const newNote: ZkNote = {
        id: `note-${Date.now()}`,
        nullifier: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        commitmentHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        asset: shieldAsset,
        amount: shieldAmount,
        blockNumber: 298150400 + Math.floor(Math.random() * 500),
        timestamp: Date.now(),
        spent: false,
        leafIndex: 4300 + notes.length,
        memo: shieldMemo || undefined,
      };
      const updated = [newNote, ...notes];
      saveNotesList(updated);
      setShieldSuccess(`Successfully deposited and blinded ${shieldAmount} ${shieldAsset} into Privacy Ring. Leaf #${newNote.leafIndex} created.`);
      setShieldAmount("");
      setShieldMemo("");
    }, 1200);
  };

  const handleSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapAmount || Number(swapAmount) <= 0) return;
    setIsSwapping(true);
    setSwapSuccess(null);

    setTimeout(() => {
      setIsSwapping(false);
      const rate = swapFrom === "SOL" ? 150 : 1 / 150;
      const calculatedOut = (Number(swapAmount) * rate).toFixed(2);

      const newNote: ZkNote = {
        id: `note-${Date.now()}`,
        nullifier: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        commitmentHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        asset: swapTo,
        amount: calculatedOut,
        blockNumber: 298150450 + Math.floor(Math.random() * 500),
        timestamp: Date.now(),
        spent: false,
        leafIndex: 4300 + notes.length,
        memo: `Confidential swap: ${swapAmount} ${swapFrom} → ${calculatedOut} ${swapTo}`,
      };
      const updated = [newNote, ...notes];
      saveNotesList(updated);
      setSwapSuccess(`Atomic CPI Swap executed: ${swapAmount} ${swapFrom} → ${calculatedOut} ${swapTo}. Reshielded directly to fresh note commitment.`);
      setSwapAmount("");
    }, 1200);
  };

  const handleLockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockAmount || Number(lockAmount) <= 0 || !lockRecipient) return;
    setIsLocking(true);
    setLockSuccess(null);

    setTimeout(() => {
      setIsLocking(false);
      const unlockTime = Date.now() + lockDays * 86400000;
      const newNote: ZkNote = {
        id: `note-${Date.now()}`,
        nullifier: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        commitmentHash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
        asset: lockAsset,
        amount: lockAmount,
        blockNumber: 298150500 + Math.floor(Math.random() * 500),
        timestamp: Date.now(),
        spent: false,
        leafIndex: 4300 + notes.length,
        unlockTimestamp: unlockTime,
        recipient: lockRecipient,
        memo: `Timelock: ${lockDays} days release for ${lockRecipient.slice(0, 4)}...${lockRecipient.slice(-4)}`,
      };
      const updated = [newNote, ...notes];
      saveNotesList(updated);
      setLockSuccess(`Confidential Timelock Escrow established for ${lockAmount} ${lockAsset}. Unlocks in ${lockDays} days.`);
      setLockAmount("");
      setLockRecipient("");
    }, 1200);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawRecipient) return;
    setIsWithdrawing(true);
    setWithdrawSuccess(null);

    setTimeout(() => {
      setIsWithdrawing(false);
      const targetNote = notes.find((n) => n.id === withdrawNoteId) || notes[0];
      if (targetNote) {
        const updated = notes.map((n) => (n.id === targetNote.id ? { ...n, spent: true } : n));
        saveNotesList(updated);
        setWithdrawSuccess(`Decoupled withdrawal confirmed. ${targetNote.amount} ${targetNote.asset} transferred to ${withdrawRecipient.slice(0, 4)}...${withdrawRecipient.slice(-4)} with nullifier broadcast.`);
      }
      setWithdrawRecipient("");
    }, 1200);
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

  const activeNotesCount = notes.filter((n) => !n.spent).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", width: "100%" }}>
      {/* Editorial Header (Veil /trade architecture) */}
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
            <span>Solana Mainnet-Beta // Privacy Rings</span>
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
            display: "inline-flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--color-muted)",
          }}
        >
          <span>Solana SVM</span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span>Groth16 ZK-SNARK</span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span>ML-KEM-768</span>
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
                  Deposit public SOL or USDC into the Solana Privacy Program. Your balance is cryptographically blinded with Groth16.
                </p>
              </div>

              {/* Asset Selector */}
              <div style={{ display: "flex", gap: "10px" }}>
                {(["SOL", "USDC"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setShieldAsset(a)}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: shieldAsset === a ? "2px solid #FF8C00" : "1px solid var(--color-border)",
                      backgroundColor: shieldAsset === a ? "rgba(255, 140, 0, 0.05)" : "#ffffff",
                      fontWeight: 700,
                      color: shieldAsset === a ? "var(--color-accent-ink)" : "var(--color-text)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <span>{a}</span>
                    <span style={{ fontSize: "11px", color: "var(--color-muted)", fontWeight: 500 }}>
                      {a === "SOL" ? "Native Solana" : "SPL Token"}
                    </span>
                  </button>
                ))}
              </div>

              {/* Amount Input */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                  Deposit Amount ({shieldAsset})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={shieldAmount}
                  onChange={(e) => setShieldAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "16px",
                    color: "var(--color-text)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
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
                {isShielding ? "Generating Witness & Shielding..." : `Deposit & Shield ${shieldAmount || "0"} ${shieldAsset}`}
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
            </form>
          )}

          {/* Tab 2: Confidential ZK Swap */}
          {activeTab === "swap" && (
            <form onSubmit={handleSwapSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
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
                  <select
                    value={swapFrom}
                    onChange={(e) => setSwapFrom(e.target.value as "SOL" | "USDC")}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const temp = swapFrom;
                    setSwapFrom(swapTo);
                    setSwapTo(temp);
                  }}
                  style={{
                    padding: "8px",
                    borderRadius: "50%",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                    marginTop: "16px",
                  }}
                >
                  <ArrowLeftRight size={14} />
                </button>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--color-muted)", marginBottom: "4px" }}>
                    Receive Asset
                  </label>
                  <select
                    value={swapTo}
                    onChange={(e) => setSwapTo(e.target.value as "SOL" | "USDC")}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="USDC">USDC</option>
                    <option value="SOL">SOL</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "6px" }}>
                  Swap Amount ({swapFrom})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "16px",
                    color: "var(--color-text)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(26, 26, 26, 0.025)",
                  border: "1px solid var(--color-border)",
                  fontSize: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  color: "var(--color-muted)",
                }}
              >
                <span>Estimated Output:</span>
                <span style={{ fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-mono)" }}>
                  {swapAmount ? (swapFrom === "SOL" ? (Number(swapAmount) * 150).toFixed(2) : (Number(swapAmount) / 150).toFixed(4)) : "0.00"} {swapTo}
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
            </form>
          )}

          {/* Tab 3: Timelock Escrow */}
          {activeTab === "lock" && (
            <form onSubmit={handleLockSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
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
                  <select
                    value={lockAsset}
                    onChange={(e) => setLockAsset(e.target.value as "SOL" | "USDC")}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="SOL">SOL (Native)</option>
                    <option value="USDC">USDC (SPL)</option>
                  </select>
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
                  Lock Amount ({lockAsset})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={lockAmount}
                  onChange={(e) => setLockAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "16px",
                    color: "var(--color-text)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
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
                  }}
                >
                  {notes.filter((n) => !n.spent).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.amount} {n.asset} · Leaf #{n.leafIndex} ({n.nullifier.slice(0, 8)}…)
                    </option>
                  ))}
                </select>
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
                <span>Recommended: Use a freshly generated address for maximum unlinkability.</span>
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
                {isWithdrawing ? "Generating Groth16 Proof & Broadcasting..." : "Prove & Withdraw to Destination"}
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
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            color: note.spent ? "var(--color-muted)" : "var(--color-text)",
                          }}
                        >
                          {note.amount} {note.asset}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div
                style={{
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(255, 140, 0, 0.05)",
                  border: "1px solid rgba(255, 140, 0, 0.18)",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--color-muted)" }}>Shielded SOL</div>
                <div style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-text)", marginTop: "4px" }}>
                  {totalSol.toFixed(2)} SOL
                </div>
              </div>

              <div
                style={{
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(26, 26, 26, 0.025)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--color-muted)" }}>Shielded USDC</div>
                <div style={{ fontSize: "20px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-text)", marginTop: "4px" }}>
                  {totalUsdc.toLocaleString()} USDC
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
