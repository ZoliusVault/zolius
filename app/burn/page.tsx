"use client";

import { useEffect, useState, useMemo } from "react";
import { formatEther, parseAbiItem, type Address } from "viem";
import { publicClient } from "@/lib/balances";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, TREASURY_DEPLOYMENT_BLOCK } from "@/lib/contracts";
import { appChain, APP_CHAIN_ID } from "@/lib/chains";
import { Copy, Check, ExternalLink, Flame, Coins, Percent, ArrowUpRight, Shield, Layers } from "lucide-react";

const TREASURY_ADDRESS = (CONTRACT_ADDRESSES.treasury ||
  "0xb68c3d25e5e9902363e8e10d5c0a471e65be8152") as Address;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EXPLORER = appChain.blockExplorers.default.url;

// Event names verified in lib/veil-artifact.ts VEIL_TREASURY_ABI — never invented.
const TOKENS_BURNED_EVENT = parseAbiItem(
  "event TokensBurned(uint256 amount, uint256 totalBurnedCumulative)"
);
const FEE_RECEIVED_EVENT = parseAbiItem(
  "event FeeReceived(address indexed token, uint256 amount)"
);

interface BurnRow {
  txHash: string;
  blockNumber: bigint;
  amount: string;
  source: "Treasury burn" | "Protocol fee received";
}

function formatVeil(raw: bigint): string {
  const n = Number(formatEther(raw));
  // Dust-scale burns must not render as "0 VEIL".
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 6 })} VEIL`;
}

function formatEth(raw: bigint): string {
  const n = Number(formatEther(raw));
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH`;
}

export default function BurnPage() {
  const [totalBurned, setTotalBurned] = useState<bigint | null>(null);
  const [totalFees, setTotalFees] = useState<bigint | null>(null);
  const [veilToken, setVeilToken] = useState<string | null>(null);
  const [buybackBps, setBuybackBps] = useState<bigint | null>(null);
  const [history, setHistory] = useState<BurnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rpcError, setRpcError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "burns" | "fees">("all");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [burned, fees, token, bps, burnLogs, feeLogs] = await Promise.all([
          publicClient.readContract({
            address: TREASURY_ADDRESS,
            abi: CONTRACT_ABIS.VeilTreasury,
            functionName: "totalBurned",
          }),
          publicClient.readContract({
            address: TREASURY_ADDRESS,
            abi: CONTRACT_ABIS.VeilTreasury,
            functionName: "totalFeeReceived",
          }),
          publicClient.readContract({
            address: TREASURY_ADDRESS,
            abi: CONTRACT_ABIS.VeilTreasury,
            functionName: "veilToken",
          }),
          publicClient.readContract({
            address: TREASURY_ADDRESS,
            abi: CONTRACT_ABIS.VeilTreasury,
            functionName: "buybackShareBps",
          }),
          publicClient.getLogs({
            address: TREASURY_ADDRESS,
            event: TOKENS_BURNED_EVENT,
            fromBlock: TREASURY_DEPLOYMENT_BLOCK,
          }),
          publicClient.getLogs({
            address: TREASURY_ADDRESS,
            event: FEE_RECEIVED_EVENT,
            fromBlock: TREASURY_DEPLOYMENT_BLOCK,
          }),
        ]);

        const rows: BurnRow[] = [
          ...burnLogs.map((l) => ({
            txHash: l.transactionHash ?? "",
            blockNumber: l.blockNumber ?? 0n,
            amount: formatVeil(l.args.amount ?? 0n),
            source: "Treasury burn" as const,
          })),
          ...feeLogs.map((l) => ({
            txHash: l.transactionHash ?? "",
            blockNumber: l.blockNumber ?? 0n,
            amount: formatEth(l.args.amount ?? 0n),
            source: "Protocol fee received" as const,
          })),
        ].sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));

        if (mounted) {
          setTotalBurned(burned);
          setTotalFees(fees);
          setVeilToken(token);
          setBuybackBps(bps);
          setHistory(rows);
          setLoading(false);
          setRpcError(false);
        }
      } catch (e) {
        console.warn("Burn page read failed:", e);
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

  const filteredHistory = useMemo(() => {
    if (activeTab === "burns") {
      return history.filter((r) => r.source === "Treasury burn");
    }
    if (activeTab === "fees") {
      return history.filter((r) => r.source === "Protocol fee received");
    }
    return history;
  }, [activeTab, history]);

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
            <span>// Zolius Treasury Engine</span>
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
            Protocol Burn Ledger
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
            Live protocol fee accruals and autonomous token burns executed on-chain by the Zolius Treasury contract.
            30 BPS hook swap fees accumulate directly into VeilTreasury for deflationary burns and reserves.
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
            <Percent size={13} style={{ color: "var(--color-accent)" }} />
            30 BPS Hook Fee
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Coins size={13} />
            70% Burn Target
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Flame size={13} style={{ color: "var(--color-accent)" }} />
            Permanent Removal
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
          Loading live state from Zolius Treasury contract…
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
          }}
        >
          RPC connection error, retrying…
        </div>
      )}

      {!loading && !rpcError && (
        <>
          {/* Key Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
              gap: "var(--space-4)",
            }}
          >
            <div
              className="zolius-card-white"
              style={{
                padding: "var(--space-6)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Total VEIL Burned
                </span>
                <Flame size={15} style={{ color: "var(--color-accent)" }} />
              </div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "clamp(1.75rem, 2.5vw, 2.3rem)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                {totalBurned === null ? "—" : formatVeil(totalBurned)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                Permanently burned via ERC20 burn()
              </div>
            </div>

            <div
              className="zolius-card-white"
              style={{
                padding: "var(--space-6)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Cumulative Fees Accrued
                </span>
                <Coins size={15} style={{ color: "var(--color-muted)" }} />
              </div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "clamp(1.75rem, 2.5vw, 2.3rem)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                {totalFees === null ? "—" : formatEth(totalFees)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                Route fees collected via afterSwap hook
              </div>
            </div>

            <div
              className="zolius-card-white"
              style={{
                padding: "var(--space-6)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Buyback Allocation Share
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--color-accent)", fontWeight: 600 }}>
                  ACTIVE
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: "clamp(1.75rem, 2.5vw, 2.3rem)", fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
                {buybackBps === null ? "—" : `${Number(buybackBps) / 100}%`}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                Protocol parameter target (7,000 BPS)
              </div>
            </div>
          </div>

          {/* Treasury Details & Architecture Overview */}
          <div
            className="zolius-card-white"
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)" }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "var(--text-h3)", color: "var(--color-text)" }}>
                  Zolius Treasury Architecture
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "var(--text-body-sm)", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                  Autonomously collects protocol fees from Solana Privacy Rings and executes continuous supply reduction.
                </p>
              </div>

              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <a
                  href={`${EXPLORER}/address/${TREASURY_ADDRESS}`}
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
                  <span>Treasury Contract</span>
                  <ExternalLink size={12} />
                </a>

                {veilToken && veilToken.toLowerCase() !== ZERO_ADDRESS && (
                  <a
                    href={`${EXPLORER}/address/${veilToken}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "rgba(255, 140, 0, 0.08)",
                      border: "1px solid rgba(255, 140, 0, 0.25)",
                      color: "var(--color-accent)",
                      fontSize: "12px",
                      fontFamily: "var(--font-body)",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <span>VEIL Token</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Treasury Address Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(26, 26, 26, 0.02)",
                border: "1px solid var(--color-border)",
                gap: "var(--space-3)",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase" }}>
                  Contract:
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text)", fontWeight: 500, overflowWrap: "anywhere" }}>
                  {TREASURY_ADDRESS}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(TREASURY_ADDRESS, "treasury")}
                className="lp-btn lp-btn--outline"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  color: copiedId === "treasury" ? "var(--color-accent)" : "var(--color-text)",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                }}
              >
                {copiedId === "treasury" ? <Check size={12} /> : <Copy size={12} />}
                {copiedId === "treasury" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Burn History Section */}
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
                  Onchain Burn &amp; Accrual History
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "var(--text-body-sm)", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
                  Verified on-chain events emitted by the Zolius Treasury contract from deployment block {TREASURY_DEPLOYMENT_BLOCK}.
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
                  All ({history.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("burns")}
                  className={activeTab === "burns" ? "lp-btn lp-btn--filled" : "lp-btn lp-btn--outline"}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Burns ({history.filter((r) => r.source === "Treasury burn").length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("fees")}
                  className={activeTab === "fees" ? "lp-btn lp-btn--filled" : "lp-btn lp-btn--outline"}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Fees ({history.filter((r) => r.source === "Protocol fee received").length})
                </button>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
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
                  gap: "6px",
                }}
              >
                <span>
                  {totalBurned !== null && totalBurned > 0n
                    ? "No burn events indexed in this range — total above reads live."
                    : "No burns yet recorded in this range. Burns trigger automatically when protocol fees accumulate."}
                </span>
                <span style={{ fontSize: "11px", opacity: 0.8 }}>
                  Indexed from VeilTreasury block {TREASURY_DEPLOYMENT_BLOCK}.
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: "480px", overflowY: "auto" }}>
                {filteredHistory.map((row) => (
                  <div
                    key={`${row.txHash}-${row.blockNumber.toString()}-${row.source}`}
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "rgba(26, 26, 26, 0.015)",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "var(--space-3)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "10px",
                          fontWeight: 700,
                          backgroundColor: row.source === "Treasury burn" ? "rgba(255, 140, 0, 0.12)" : "rgba(26, 26, 26, 0.06)",
                          color: row.source === "Treasury burn" ? "var(--color-accent-ink)" : "var(--color-text)",
                        }}
                      >
                        {row.source === "Treasury burn" ? "BURN" : "FEE RECEIVED"}
                      </span>
                      <span style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "13px" }}>
                        {row.amount}
                      </span>
                      <a
                        href={`${EXPLORER}/block/${row.blockNumber.toString()}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "11px", color: "var(--color-muted)", textDecoration: "none" }}
                      >
                        Block #{row.blockNumber.toString()} ↗
                      </a>
                    </div>
                    {row.txHash && (
                      <a
                        href={`${EXPLORER}/tx/${row.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "none", fontSize: "11px" }}
                      >
                        {row.txHash.slice(0, 10)}...{row.txHash.slice(-8)} ↗
                      </a>
                    )}
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
