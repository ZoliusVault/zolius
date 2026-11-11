"use client";

import { useEffect, useState } from "react";
import { formatEther, parseAbi, parseAbiItem, toHex, type Address } from "viem";
import { publicClient } from "@/lib/balances";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, POOL_DEPLOYMENT_BLOCK } from "@/lib/contracts";
import { appChain, APP_CHAIN_ID } from "@/lib/chains";
import { BOW_DEPOSITED_EVENT, BOW_WITHDRAWN_EVENT } from "@/lib/0xbow-client";
import { Copy, Check, ExternalLink, ShieldCheck, Database, RefreshCw, Lock, ArrowUpRight } from "lucide-react";

const POOL_ADDRESS = (CONTRACT_ADDRESSES.poolEth ||
  "0x10c17b7538e13c63b890fea52708846e88bb1932") as Address;

const EXPLORER = appChain.blockExplorers.default.url;

const BOW_POOL_ABI = parseAbi([
  "function currentTreeSize() view returns (uint256)",
  "function DEPOSIT_DENOMINATION() view returns (uint256)",
  "function LIFETIME_DEPOSIT_CAP() view returns (uint256)",
  "function guardian() view returns (address)",
  "function depositsPaused() view returns (bool)",
  "function currentRoot() view returns (uint256)",
]);

const DEPOSIT_EVENT = parseAbiItem(
  "event Deposit(uint32 indexed index, bytes32 indexed commitment, uint256 leafIndex, uint256 timestamp)"
);
const WITHDRAW_EVENT = parseAbiItem(
  "event Withdraw(bytes32 indexed nullifierHash, address indexed recipient, address indexed relayer, uint256 fee)"
);

interface DepositRow {
  txHash: string;
  blockNumber: bigint;
  index: string;
  commitment: string;
}

interface WithdrawRow {
  txHash: string;
  blockNumber: bigint;
  nullifierHash: string;
  recipient: string;
}

export default function StatusPage() {
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [totalDeposits, setTotalDeposits] = useState<string | null>(null);
  const [denomination, setDenomination] = useState<string | null>(null);
  const [poolCap, setPoolCap] = useState<string | null>(null);
  const [guardian, setGuardian] = useState<string | null>(null);
  const [depositsPaused, setDepositsPaused] = useState<boolean | null>(null);
  const [latestRoot, setLatestRoot] = useState<string | null>(null);
  const [rootKnown, setRootKnown] = useState<boolean | null>(null);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rpcError, setRpcError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "deposits" | "withdrawals">("all");
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        let idxNum = 0;
        let totalStr = "0";
        let denomStr = "0.001";
        let capStr = "10.0";
        let guardStr = "";
        let pausedBool = false;
        let rootStr: `0x${string}` | null = null;
        let isKnown: boolean | null = true;
        let depRows: DepositRow[] = [];
        let wdRows: WithdrawRow[] = [];

        try {
          // Primary: 0xbow Privacy Pool
          const [treeSize, denom, cap, guard, paused, rootRaw] = await Promise.all([
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: BOW_POOL_ABI,
              functionName: "currentTreeSize",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: BOW_POOL_ABI,
              functionName: "DEPOSIT_DENOMINATION",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: BOW_POOL_ABI,
              functionName: "LIFETIME_DEPOSIT_CAP",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: BOW_POOL_ABI,
              functionName: "guardian",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: BOW_POOL_ABI,
              functionName: "depositsPaused",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: BOW_POOL_ABI,
              functionName: "currentRoot",
            }),
          ]);

          idxNum = Number(treeSize);
          totalStr = formatEther(treeSize * denom);
          denomStr = formatEther(denom);
          capStr = formatEther(cap);
          guardStr = guard;
          pausedBool = paused;
          rootStr = toHex(rootRaw, { size: 32 });
          isKnown = idxNum > 0;

          const [bowDeps, bowWds] = await Promise.all([
            publicClient.getLogs({
              address: POOL_ADDRESS,
              event: BOW_DEPOSITED_EVENT,
              fromBlock: POOL_DEPLOYMENT_BLOCK,
            }),
            publicClient.getLogs({
              address: POOL_ADDRESS,
              event: BOW_WITHDRAWN_EVENT,
              fromBlock: POOL_DEPLOYMENT_BLOCK,
            }),
          ]);

          depRows = bowDeps.map((l, i) => ({
            txHash: l.transactionHash ?? "",
            blockNumber: l.blockNumber ?? 0n,
            index: String(i),
            commitment: l.args._commitment ? toHex(BigInt(l.args._commitment), { size: 32 }) : "",
          }));

          wdRows = bowWds.map((l) => ({
            txHash: l.transactionHash ?? "",
            blockNumber: l.blockNumber ?? 0n,
            nullifierHash: l.args._spentNullifier ? toHex(BigInt(l.args._spentNullifier), { size: 32 }) : "",
            recipient: String(l.args._processooor ?? ""),
          }));
        } catch {
          // Fallback: legacy ShieldedPool
          const [idx, total, denom, cap, guard, paused] = await Promise.all([
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: CONTRACT_ABIS.ShieldedPool,
              functionName: "nextIndex",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: CONTRACT_ABIS.ShieldedPool,
              functionName: "totalDeposits",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: CONTRACT_ABIS.ShieldedPool,
              functionName: "denomination",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: CONTRACT_ABIS.ShieldedPool,
              functionName: "poolCap",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: CONTRACT_ABIS.ShieldedPool,
              functionName: "guardian",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: CONTRACT_ABIS.ShieldedPool,
              functionName: "depositsPaused",
            }),
          ]);

          idxNum = Number(idx);
          totalStr = formatEther(total);
          denomStr = formatEther(denom);
          capStr = formatEther(cap);
          guardStr = guard;
          pausedBool = paused;

          const [legacyDeps, legacyWds] = await Promise.all([
            publicClient.getLogs({
              address: POOL_ADDRESS,
              event: DEPOSIT_EVENT,
              fromBlock: POOL_DEPLOYMENT_BLOCK,
            }),
            publicClient.getLogs({
              address: POOL_ADDRESS,
              event: WITHDRAW_EVENT,
              fromBlock: POOL_DEPLOYMENT_BLOCK,
            }),
          ]);

          depRows = legacyDeps.map((l) => ({
            txHash: l.transactionHash ?? "",
            blockNumber: l.blockNumber ?? 0n,
            index: String(l.args.index ?? ""),
            commitment: String(l.args.commitment ?? ""),
          }));

          wdRows = legacyWds.map((l) => ({
            txHash: l.transactionHash ?? "",
            blockNumber: l.blockNumber ?? 0n,
            nullifierHash: String(l.args.nullifierHash ?? ""),
            recipient: String(l.args.recipient ?? ""),
          }));
        }

        if (mounted) {
          setNextIndex(idxNum);
          setTotalDeposits(totalStr);
          setDenomination(denomStr);
          setPoolCap(capStr);
          setGuardian(guardStr);
          setDepositsPaused(pausedBool);
          setLatestRoot(rootStr);
          setRootKnown(isKnown);
          setDeposits(depRows);
          setWithdrawals(wdRows);
          setLoading(false);
          setRpcError(false);
          setLastRefreshed(new Date().toLocaleTimeString());
        }
      } catch (e) {
        console.warn("Status page read failed:", e);
        if (mounted) {
          setLoading(false);
          setRpcError(true);
        }
      }
    }
    load();
    const timer = setInterval(load, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

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
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-muted)",
              marginBottom: "var(--space-2)",
            }}
          >
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(26, 26, 26, 0.05)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                fontWeight: 600,
              }}
            >
              SOLANA MAINNET-BETA
            </span>
            <span>// Cryptographic Telemetry</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-headline)",
              fontSize: "clamp(2rem, 3.2vw, 2.6rem)",
              lineHeight: 1.15,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
              fontWeight: 600,
            }}
          >
            Chain &amp; Pool Health
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
            Live cryptographic state, Privacy Rings history, and operational parameters on Solana Mainnet-Beta.
            Telemetry synchronizes automatically every 15 seconds.
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Database size={13} style={{ color: "var(--color-accent)" }} />
            LeanIMT Depth 20
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={12} />
            {lastRefreshed ? `Synced ${lastRefreshed}` : "Auto-Sync"}
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={13} style={{ color: "var(--color-accent)" }} />
            Non-Blocking Exits
          </span>
        </div>
      </div>

      {loading && (
        <div
          className="zolius-card-white"
          style={{
            padding: "var(--space-10)",
            textAlign: "center",
            color: "var(--color-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-body-sm)",
          }}
        >
          Loading live metrics from Solana RPC…
        </div>
      )}

      {rpcError && (
        <div
          style={{
            padding: "var(--space-4) var(--space-5)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(180, 83, 9, 0.08)",
            border: "1px solid rgba(180, 83, 9, 0.25)",
            color: "#b45309",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-body-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>RPC connection experiencing latency, retrying in 15s…</span>
          <span style={{ fontSize: "11px", opacity: 0.8 }}>HTTP 429/Timeout Handling Active</span>
        </div>
      )}

      {!loading && !rpcError && (
        <>
          {/* Key Invariant Hero Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
              gap: "var(--space-4)",
            }}
          >
            <div
              className="zolius-card-white"
              style={{
                padding: "var(--space-5)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Total Shielded Volume
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-accent)", fontWeight: 600 }}>
                  ETH
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "clamp(1.75rem, 2.4vw, 2.2rem)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                {totalDeposits === null ? "—" : `${totalDeposits} ETH`}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                Verified on-chain in 0xbow pool
              </div>
            </div>

            <div
              className="zolius-card-white"
              style={{
                padding: "var(--space-5)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Active Tree Commitments
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-muted)" }}>
                  LEAVES
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "clamp(1.75rem, 2.4vw, 2.2rem)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                {nextIndex === null ? "—" : nextIndex}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                of 1,048,576 leaf capacity (Depth 20)
              </div>
            </div>

            <div
              className="zolius-card-white"
              style={{
                padding: "var(--space-5)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Fixed Denomination
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-muted)" }}>
                  FIXED R1
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "clamp(1.75rem, 2.4vw, 2.2rem)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                {denomination === null ? "—" : `${denomination} ETH`}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                Uniform note size for maximum entropy
              </div>
            </div>

            <div
              className="zolius-card-white"
              style={{
                padding: "var(--space-5)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Pool Lifetime Cap
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-muted)" }}>
                  SECURITY
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "clamp(1.75rem, 2.4vw, 2.2rem)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                {poolCap === null ? "—" : `${poolCap} ETH`}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                Strict contract invariant deposit limit
              </div>
            </div>
          </div>

          {/* Cryptographic Parameters & Invariants Detail Card */}
          <div
            className="zolius-card-white"
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-2)" }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "var(--text-h3)", color: "var(--color-text)" }}>
                  Cryptographic Parameters &amp; Security Controls
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "var(--text-body-sm)", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                  Immutable smart contract boundaries guarding anonymity sets and non-blocking withdrawals.
                </p>
              </div>
              <a
                href={`${EXPLORER}/address/${POOL_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(26, 26, 26, 0.04)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  fontSize: "12px",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <span>View Pool on Explorer</span>
                <ArrowUpRight size={13} />
              </a>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
                gap: "var(--space-3)",
                marginTop: "var(--space-2)",
              }}
            >
              {/* Item: Latest Root */}
              <div
                style={{
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(26, 26, 26, 0.02)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Current Merkle Root
                  </span>
                  {latestRoot && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(latestRoot, "root")}
                      className="hover:text-[#FF8C00] transition-colors p-1 rounded hover:bg-orange-50/50"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        color: copiedId === "root" ? "var(--color-accent)" : "var(--color-muted)",
                      }}
                    >
                      {copiedId === "root" ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === "root" ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, color: "var(--color-text)", overflowWrap: "anywhere", wordBreak: "break-all" }}>
                  {latestRoot ?? "0x0000000000000000000000000000000000000000000000000000000000000000"}
                </div>
              </div>

              {/* Item: Guardian Address */}
              <div
                style={{
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(26, 26, 26, 0.02)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Guardian Controller
                  </span>
                  {guardian && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(guardian, "guardian")}
                      className="hover:text-[#FF8C00] transition-colors p-1 rounded hover:bg-orange-50/50"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        color: copiedId === "guardian" ? "var(--color-accent)" : "var(--color-muted)",
                      }}
                    >
                      {copiedId === "guardian" ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === "guardian" ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, color: "var(--color-text)", overflowWrap: "anywhere", wordBreak: "break-all" }}>
                  {guardian ?? "—"}
                </div>
              </div>

              {/* Item: Deposit Gating */}
              <div
                style={{
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(26, 26, 26, 0.02)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Deposits Invariant
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: depositsPaused ? "rgba(180, 83, 9, 0.1)" : "rgba(26, 26, 26, 0.06)",
                      color: depositsPaused ? "#b45309" : "var(--color-text)",
                    }}
                  >
                    {depositsPaused ? "PAUSED" : "ACTIVE & OPEN"}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                    Non-custodial LeanIMT
                  </span>
                </div>
              </div>

              {/* Item: Withdrawal Freedom */}
              <div
                style={{
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(26, 26, 26, 0.02)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Withdrawal Execution
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: "rgba(255, 140, 0, 0.1)",
                      color: "var(--color-accent-ink)",
                    }}
                  >
                    NON-BLOCKING (§4.1)
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                    Cannot be paused or censored
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Log Event Inspection Section */}
          <div
            className="zolius-card-white"
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "var(--text-h3)", color: "var(--color-text)" }}>
                  On-Chain Event Ledger
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "var(--text-body-sm)", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                  Raw Merkle leaf commitments and spent nullifiers recorded directly from smart contract events.
                </p>
              </div>

              {/* Filter Tabs */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 5px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(26, 26, 26, 0.05)",
                  border: "1px solid var(--color-border)",
                  gap: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={activeTab === "all" ? "lp-btn lp-btn--filled" : "lp-btn lp-btn--outline"}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  All Events ({deposits.length + withdrawals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("deposits")}
                  className={activeTab === "deposits" ? "lp-btn lp-btn--filled" : "lp-btn lp-btn--outline"}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Deposits ({deposits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("withdrawals")}
                  className={activeTab === "withdrawals" ? "lp-btn lp-btn--filled" : "lp-btn lp-btn--outline"}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Withdrawals ({withdrawals.length})
                </button>
              </div>
            </div>

            {/* Event List */}
            {deposits.length === 0 && withdrawals.length === 0 ? (
              <div
                style={{
                  padding: "var(--space-10)",
                  textAlign: "center",
                  color: "var(--color-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  backgroundColor: "rgba(26, 26, 26, 0.02)",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>No deposit or withdrawal events indexed in this range.</span>
                <span style={{ fontSize: "11px", color: "var(--color-muted)", opacity: 0.8 }}>
                  Events stream automatically from deployment block {POOL_DEPLOYMENT_BLOCK}.
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: "540px", overflowY: "auto" }}>
                {/* Render deposits when tab is 'all' or 'deposits' */}
                {(activeTab === "all" || activeTab === "deposits") &&
                  deposits.map((d, i) => (
                    <div
                      key={`dep-${d.txHash}-${i}`}
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "rgba(26, 26, 26, 0.015)",
                        border: "1px solid var(--color-border)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "10px",
                              fontWeight: 700,
                              backgroundColor: "rgba(255, 140, 0, 0.12)",
                              color: "var(--color-accent-ink)",
                            }}
                          >
                            DEPOSIT
                          </span>
                          <span style={{ color: "var(--color-text)", fontWeight: 600 }}>Leaf #{d.index}</span>
                          <a
                            href={`${EXPLORER}/block/${d.blockNumber.toString()}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--color-muted)", textDecoration: "none", fontSize: "11px" }}
                          >
                            Block #{d.blockNumber.toString()} ↗
                          </a>
                        </div>
                        {d.txHash && (
                          <a
                            href={`${EXPLORER}/tx/${d.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--color-accent)", textDecoration: "none", fontSize: "11px", fontWeight: 600 }}
                          >
                            {d.txHash.slice(0, 8)}...{d.txHash.slice(-6)} ↗
                          </a>
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", flexWrap: "wrap", gap: "6px" }}>
                        <span style={{ color: "var(--color-muted)", fontSize: "11px", flexShrink: 0 }}>Commitment:</span>
                        <span style={{ color: "var(--color-text)", fontWeight: 500, overflowWrap: "anywhere", wordBreak: "break-all", minWidth: 0, flex: 1 }}>
                          {d.commitment}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(d.commitment, `c-${i}`)}
                          className="hover:text-[#FF8C00] transition-colors p-1 rounded hover:bg-orange-50/50"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: copiedId === `c-${i}` ? "var(--color-accent)" : "var(--color-muted)",
                            marginLeft: "8px",
                          }}
                        >
                          {copiedId === `c-${i}` ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  ))}

                {/* Render withdrawals when tab is 'all' or 'withdrawals' */}
                {(activeTab === "all" || activeTab === "withdrawals") &&
                  withdrawals.map((w, i) => (
                    <div
                      key={`wd-${w.txHash}-${i}`}
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "rgba(26, 26, 26, 0.015)",
                        border: "1px solid var(--color-border)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "10px",
                              fontWeight: 700,
                              backgroundColor: "rgba(26, 26, 26, 0.06)",
                              color: "var(--color-text)",
                            }}
                          >
                            WITHDRAW
                          </span>
                          <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
                            To {w.recipient.slice(0, 6)}...{w.recipient.slice(-4)}
                          </span>
                          <a
                            href={`${EXPLORER}/block/${w.blockNumber.toString()}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--color-muted)", textDecoration: "none", fontSize: "11px" }}
                          >
                            Block #{w.blockNumber.toString()} ↗
                          </a>
                        </div>
                        {w.txHash && (
                          <a
                            href={`${EXPLORER}/tx/${w.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--color-accent)", textDecoration: "none", fontSize: "11px", fontWeight: 600 }}
                          >
                            {w.txHash.slice(0, 8)}...{w.txHash.slice(-6)} ↗
                          </a>
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", flexWrap: "wrap", gap: "6px" }}>
                        <span style={{ color: "var(--color-muted)", fontSize: "11px", flexShrink: 0 }}>Nullifier:</span>
                        <span style={{ color: "var(--color-text)", fontWeight: 500, overflowWrap: "anywhere", wordBreak: "break-all", minWidth: 0, flex: 1 }}>
                          {w.nullifierHash}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(w.nullifierHash, `n-${i}`)}
                          className="hover:text-[#FF8C00] transition-colors p-1 rounded hover:bg-orange-50/50"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: copiedId === `n-${i}` ? "var(--color-accent)" : "var(--color-muted)",
                            marginLeft: "8px",
                          }}
                        >
                          {copiedId === `n-${i}` ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
