"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Activity } from "lucide-react";
import { parseAbi, formatEther, toHex, type Address } from "viem";
import { publicClient } from "@/lib/balances";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "@/lib/contracts";
import { APP_CHAIN_ID } from "@/lib/chains";

// Live Solana Mainnet-Beta deployments via the shared address source.
// Literals below are fallbacks only and match lib/contracts.ts defaults.
const POOL_ADDRESS = (CONTRACT_ADDRESSES.poolEth ||
  "0x10c17b7538e13c63b890fea52708846e88bb1932") as Address;
const TREASURY_ADDRESS = (CONTRACT_ADDRESSES.treasury ||
  "0xb68c3d25e5e9902363e8e10d5c0a471e65be8152") as Address;
const HOOK_ADDRESS = (CONTRACT_ADDRESSES.hook ||
  "0xf95f041462ee34c2ea7b953a879838133ef820c4") as Address;

const EMPTY_ROOT = ("0x" + "00".repeat(32)) as `0x${string}`;

const BOW_POOL_ABI = parseAbi([
  "function currentTreeSize() view returns (uint256)",
  "function currentTreeDepth() view returns (uint256)",
  "function currentRoot() view returns (uint256)",
  "function DEPOSIT_DENOMINATION() view returns (uint256)",
]);

const POOL_ABI = parseAbi([
  "function nextIndex() view returns (uint32)",
  "function totalDeposits() view returns (uint256)",
  "function denomination() view returns (uint256)",
  "function poolCap() view returns (uint256)",
  "function rootHistory(uint256 index) view returns (bytes32)",
  "function guardian() view returns (address)",
  "function depositsPaused() view returns (bool)",
  "function TREE_DEPTH() view returns (uint8)",
]);

const TREASURY_ABI = parseAbi([
  "function buybackShareBps() view returns (uint256)",
]);

function formatNumber(val: number): string {
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

type HookPermissions = Record<string, boolean>;

export const ZkShieldRadar: React.FC = () => {
  const [nextIndex, setNextIndex] = useState<number>(0);
  const [totalDepositsEth, setTotalDepositsEth] = useState<string>("0");
  const [treeDepth, setTreeDepth] = useState<number | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<`0x${string}`>(EMPTY_ROOT);
  const [buybackBps, setBuybackBps] = useState<bigint | null>(null);
  const [hookPermissions, setHookPermissions] = useState<HookPermissions | null>(null);
  const [copiedRoot, setCopiedRoot] = useState(false);
  const [isLiveLoaded, setIsLiveLoaded] = useState(false);
  const [rpcError, setRpcError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTelemetry() {
      try {
        const [bps, perms] = await Promise.all([
          publicClient.readContract({
            address: TREASURY_ADDRESS,
            abi: TREASURY_ABI,
            functionName: "buybackShareBps",
          }),
          publicClient.readContract({
            address: HOOK_ADDRESS,
            abi: CONTRACT_ABIS.VeilHook,
            functionName: "getHookPermissions",
          }),
        ]);

        let nextIdx = 0;
        let totalEth = "0";
        let depth = 32;
        let root: `0x${string}` = EMPTY_ROOT;

        try {
          // Primary: 0xbow live privacy pool
          const [treeSize, treeDepthRaw, rootRaw, denom] = await Promise.all([
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: BOW_POOL_ABI,
              functionName: "currentTreeSize",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: BOW_POOL_ABI,
              functionName: "currentTreeDepth",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: BOW_POOL_ABI,
              functionName: "currentRoot",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: BOW_POOL_ABI,
              functionName: "DEPOSIT_DENOMINATION",
            }),
          ]);

          nextIdx = Number(treeSize);
          depth = Number(treeDepthRaw) || 32;
          totalEth = Number(formatEther(treeSize * denom)).toFixed(3);
          root = toHex(rootRaw, { size: 32 });
        } catch {
          // Fallback: legacy pool ABI
          const [legacyIdx, legacyTotal, legacyDepth] = await Promise.all([
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: POOL_ABI,
              functionName: "nextIndex",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: POOL_ABI,
              functionName: "totalDeposits",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: POOL_ABI,
              functionName: "TREE_DEPTH",
            }),
          ]);
          nextIdx = Number(legacyIdx);
          totalEth = Number(formatEther(legacyTotal)).toFixed(3);
          depth = Number(legacyDepth);
          if (nextIdx > 0) {
            root = await publicClient.readContract({
              address: POOL_ADDRESS,
              abi: POOL_ABI,
              functionName: "rootHistory",
              args: [BigInt(nextIdx - 1)],
            });
          }
        }

        if (isMounted) {
          setNextIndex(nextIdx);
          setTotalDepositsEth(totalEth);
          setTreeDepth(depth);
          setBuybackBps(bps);
          setHookPermissions({ ...(perms as unknown as HookPermissions) });
          setMerkleRoot(root);
          setIsLiveLoaded(true);
          setRpcError(false);
        }
      } catch (e) {
        console.warn("Telemetry read failed, retrying:", e);
        if (isMounted) setRpcError(true);
      }
    }

    loadTelemetry();
    const timer = setInterval(loadTelemetry, 15000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  function handleCopyRoot() {
    navigator.clipboard.writeText(merkleRoot);
    setCopiedRoot(true);
    setTimeout(() => setCopiedRoot(false), 2000);
  }

  const enabledFlags = hookPermissions
    ? Object.entries(hookPermissions).filter(([, v]) => v === true).map(([k]) => k)
    : [];
  const burnShareLabel = buybackBps === null ? "—" : `${Number(buybackBps) / 100}% Burn`;
  const capacityLabel = treeDepth === null ? "—" : formatNumber(2 ** treeDepth);
  const depthLabel = treeDepth === null ? "—" : `${treeDepth} Levels`;
  const statusLabel = rpcError
    ? isLiveLoaded
      ? "Reconnecting…"
      : "RPC unreachable"
    : isLiveLoaded
    ? "Hook active"
    : "Syncing…";

  return (
    <div
      className="veil-card-white p-4 sm:p-5"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        backgroundColor: "#ffffff",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-strong)",
        boxShadow: "0 12px 36px -8px rgba(26, 26, 26, 0.08)",
        boxSizing: "border-box",
      }}
    >
      {/* Telemetry Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(255, 140, 0, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Activity size={14} style={{ color: "var(--color-accent-ink)" }} />
          </div>
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--color-text)",
                fontFamily: "var(--font-headline)",
                letterSpacing: "0.02em",
                lineHeight: 1.2,
              }}
            >
              Cryptographic Telemetry
            </div>
            <div style={{ fontSize: "11px", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
              LeanIMT Merkle Tree &amp; Hook Validation
            </div>
          </div>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 8px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(26, 26, 26, 0.04)",
            border: "1px solid var(--color-border)",
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            color: "var(--color-muted)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* 2x2 Telemetry Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "8px",
        }}
      >
        {/* Metric 1: Merkle Tree */}
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(26, 26, 26, 0.02)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            LeanIMT Tree
          </div>
          <div
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--color-text)",
              lineHeight: 1.2,
            }}
          >
            {depthLabel}
          </div>
          <div
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-faint)",
              lineHeight: 1.3,
            }}
          >
            Cap: {capacityLabel}
          </div>
        </div>

        {/* Metric 2: Shielded Notes / Deposits */}
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(26, 26, 26, 0.02)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Shielded Notes
          </div>
          <div
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--color-text)",
              lineHeight: 1.2,
            }}
          >
            {formatNumber(nextIndex)} Notes
          </div>
          <div
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-faint)",
              lineHeight: 1.3,
            }}
          >
            {totalDepositsEth} ETH Pooled
          </div>
        </div>

        {/* Metric 3: Hook Permissions */}
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(26, 26, 26, 0.02)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            v4 Hook Gating
          </div>
          <div
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--color-text)",
              lineHeight: 1.2,
            }}
          >
            {hookPermissions ? `${enabledFlags.length} Enabled` : "—"}
          </div>
          <div
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-faint)",
              lineHeight: 1.3,
            }}
          >
            beforeSwap · afterSwap
          </div>
        </div>

        {/* Metric 4: Fee Burn Allocation */}
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(26, 26, 26, 0.02)",
            border: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Fee Buyback
          </div>
          <div
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--color-text)",
              lineHeight: 1.2,
            }}
          >
            {burnShareLabel}
          </div>
          <div
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-faint)",
              lineHeight: 1.3,
            }}
          >
            VeilTreasury Engine
          </div>
        </div>
      </div>

      {/* Active Hook Permission Badges */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "8px 10px",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "rgba(26, 26, 26, 0.02)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 600,
            }}
          >
            Active Hook Permissions
          </span>
          <span
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-faint)",
            }}
          >
            CREATE2 0x20c4
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {enabledFlags.length > 0 ? (
            enabledFlags.map((flag) => (
              <span
                key={flag}
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  padding: "3px 8px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(26, 26, 26, 0.04)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                  display: "inline-flex",
                  alignItems: "center",
                  fontWeight: 500,
                }}
              >
                {flag}
              </span>
            ))
          ) : (
            <span style={{ fontSize: "11px", color: "var(--color-faint)", fontFamily: "var(--font-mono)" }}>
              {isLiveLoaded ? "No hook flags active" : "Reading hook permissions…"}
            </span>
          )}
        </div>
      </div>

      {/* Merkle Root Surface */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 600,
            }}
          >
            Merkle State Root
          </span>
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--color-accent-ink)", fontWeight: 600 }}>
            {isLiveLoaded ? "Verified Onchain" : "Syncing…"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(26, 26, 26, 0.02)",
            padding: "6px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={merkleRoot}
          >
            {!isLiveLoaded
              ? "Reading state tree…"
              : nextIndex === 0
              ? "Empty tree — 0x00...00"
              : `${merkleRoot.slice(0, 10)}...${merkleRoot.slice(-8)}`}
          </span>

          <button
            type="button"
            onClick={handleCopyRoot}
            disabled={!isLiveLoaded || nextIndex === 0}
            title="Copy Full Merkle Root"
            aria-label="Copy full Merkle root hash"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 8px",
              minHeight: "22px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "#ffffff",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: "0 1px 2px rgba(26, 26, 26, 0.04)",
            }}
            className="hover:border-[#FF8C00] transition-colors"
          >
            {copiedRoot ? (
              <>
                <Check className="w-3 h-3" style={{ color: "var(--color-accent-ink)" }} aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-neutral-400" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
