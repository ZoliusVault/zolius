"use client";

import React from "react";
import {
  GATED_EXPLORER_ADDRESS_BASE,
  GATED_EXPLORER_TX_BASE,
  GATED_HOOK_ADDRESS,
  GATED_POOL_ID,
  GATED_REGISTRY_ADDRESS,
  isGatedExecuteDisabled,
  PROVEN_GATED_VEIL_AMOUNT_IN,
  type AttestationStatus,
  type GatingConfig,
} from "../../lib/gated-attest";
import { appChain, APP_CHAIN_ID } from "../../lib/chains";

export interface AttestPanelProps {
  connectedAddress: string | null;
  attestation: AttestationStatus | null;
  gating: GatingConfig | null;
  isAttestLoading: boolean;
  isAttesting: boolean;
  onSelfAttest: () => void;
  onRefresh: () => void;
  attestNote: string | null;
  attestTxHash: string | null;
  gatedAmountIn: string;
  onGatedAmountIn: (v: string) => void;
  gatedValid: boolean;
  isSimulatingGated: boolean;
  isGatedSwapping: boolean;
  onSimulate: () => void;
  onGatedSwap: () => void;
  gatedSimNote: string | null;
  gatedTxHash: string | null;
  // Chain-aware display overrides (mainnet suite). Defaults keep every
  // existing testnet caller unchanged.
  registryAddress?: string;
  hookAddress?: string;
  explorerAddressBase?: string;
  explorerTxBase?: string;
  poolIdText?: string;
  isMainnet?: boolean;
}

/** Self-attestation + gated-pool region inside the Buy & Shield tab. */
export const AttestPanel: React.FC<AttestPanelProps> = ({
  connectedAddress,
  attestation,
  gating,
  isAttestLoading,
  isAttesting,
  onSelfAttest,
  onRefresh,
  attestNote,
  attestTxHash,
  gatedAmountIn,
  onGatedAmountIn,
  gatedValid,
  isSimulatingGated,
  isGatedSwapping,
  onSimulate,
  onGatedSwap,
  gatedSimNote,
  gatedTxHash,
  registryAddress = GATED_REGISTRY_ADDRESS,
  hookAddress = GATED_HOOK_ADDRESS,
  explorerAddressBase = GATED_EXPLORER_ADDRESS_BASE,
  explorerTxBase = GATED_EXPLORER_TX_BASE,
  poolIdText = GATED_POOL_ID,
  isMainnet = false,
}) => {
  const gatedDisabled = isGatedExecuteDisabled({
    isSwapping: isGatedSwapping,
    connected: Boolean(connectedAddress),
    veilInValid: gatedValid,
    attested: attestation?.attested ?? null,
    isSimulating: isSimulatingGated,
  });
  const attestedDone = Boolean(connectedAddress) && attestation?.attested === true;

  return (
    <div
      role="region"
      aria-label="Self-attestation and gated pool"
      style={{
        padding: "var(--space-4)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "rgba(26, 26, 26, 0.025)",
        border: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "var(--text-caption)", fontWeight: 700, color: "var(--color-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Self-Attestation &amp; Gated Pool
        </span>
        <span style={{ fontSize: "11px", color: "var(--color-accent-ink)", fontFamily: "monospace", fontWeight: 600 }}>
          {appChain.name} {APP_CHAIN_ID}
        </span>
      </div>
      <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "var(--text-caption)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
        Self-attestation is permissionless: anyone can attest, with no eligibility
        conditions (
        <a href="/docs/decisions" style={{ color: "var(--color-accent-ink)" }}>
          Owner Decisions
        </a>
        ; association-set policy:{" "}
        <a href="/docs/asp-policy" style={{ color: "var(--color-accent-ink)" }}>
          Association Set Policy
        </a>
        ).
        Pool gating is an anti-bot speedbump plus launch windows only — nothing
        claimed here beyond what the hook reports onchain below.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "var(--text-caption)", fontFamily: "monospace" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ color: "var(--color-muted)" }}>Registry:</span>
          <a href={`${explorerAddressBase}${registryAddress}`} target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-ink)", overflowWrap: "anywhere" }}>
            {`${registryAddress.slice(0, 6)}…${registryAddress.slice(-4)}`}
          </a>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ color: "var(--color-muted)" }}>Hook:</span>
          <a href={`${explorerAddressBase}${hookAddress}`} target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-ink)", overflowWrap: "anywhere" }}>
            {`${hookAddress.slice(0, 6)}…${hookAddress.slice(-4)}`}
          </a>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ color: "var(--color-muted)" }}>Your attestation:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 600, textAlign: "right" }}>
            {!connectedAddress
              ? "Connect a wallet to read status"
              : isAttestLoading && attestation === null
              ? "Reading from chain…"
              : attestation?.attested
              ? "Attested — gated pool unlocked"
              : "Not attested — self-attest below"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ color: "var(--color-muted)" }}>Pool gating:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 600, textAlign: "right" }}>
            {!gating
              ? "Reading from chain…"
              : !gating.gated
              ? "Not gated — any address can swap"
              : gating.active
              ? `Active — temporary ${isMainnet ? "gating" : "test"} window, ends ${gating.windowEndsAt !== null ? new Date(Number(gating.windowEndsAt) * 1000).toUTCString() : "never (permanent)"}`
              : "Window elapsed — pool currently accepts any address"}
          </span>
        </div>
        {gating?.gated && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
            <span style={{ color: "var(--color-muted)" }}>Gated pool:</span>
            <span style={{ color: "var(--color-muted)", textAlign: "right" }}>
              {`ETH/VEIL 0.3% · id ${poolIdText.slice(0, 10)}… · window ${(Number(gating.duration) / 86400).toFixed(1)} days`}
            </span>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onSelfAttest}
          disabled={isAttesting || attestedDone}
          aria-label="Self-attest the connected address onchain"
          className={isAttesting || attestedDone ? "opacity-50 cursor-not-allowed" : "lp-btn lp-btn--accent"}
          style={{
            flex: 1,
            minHeight: "44px",
            padding: "8px 14px",
            borderRadius: "var(--radius-sm)",
            fontWeight: 700,
            fontSize: "var(--text-body-sm)",
            cursor: isAttesting || attestedDone ? "not-allowed" : "pointer",
            ...(isAttesting || attestedDone ? {
              backgroundColor: "rgba(255, 140, 0, 0.2)",
              color: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              boxShadow: "none",
            } : {}),
          }}
        >
          {!connectedAddress
            ? "Connect Wallet to Attest"
            : isAttesting
            ? "Attesting…"
            : attestation?.attested
            ? "Already Attested"
            : "Self-Attest (1 Transaction)"}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isAttestLoading || !connectedAddress}
          aria-label="Refresh attestation and gating status from chain"
          className={isAttestLoading || !connectedAddress ? "opacity-50 cursor-not-allowed" : "lp-btn lp-btn--outline"}
          style={{
            minHeight: "44px",
            padding: "8px 14px",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text)",
            fontWeight: 600,
            fontSize: "var(--text-body-sm)",
            cursor: isAttestLoading || !connectedAddress ? "not-allowed" : "pointer",
            ...(isAttestLoading || !connectedAddress ? {
              border: "1px solid var(--color-border)",
            } : {}),
          }}
        >
          Refresh
        </button>
      </div>
      {attestNote && (
        <span role="status" style={{ color: "var(--color-accent-ink)", fontFamily: "var(--font-body)", fontSize: "var(--text-caption)", lineHeight: 1.5, overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>
          {attestNote}
        </span>
      )}
      {attestTxHash && (
        <span style={{ fontSize: "var(--text-caption)", fontFamily: "monospace", overflowWrap: "anywhere" }}>
          <span style={{ color: "var(--color-muted)" }}>Attestation tx: </span>
          <a href={`${explorerTxBase}${attestTxHash}`} target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-ink)" }}>
            {attestTxHash}
          </a>
        </span>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
        <label htmlFor="gated-veil-amount" style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--color-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Gated Swap Amount (VEIL in, ETH out)
        </label>
        <input
          id="gated-veil-amount"
          type="text"
          inputMode="decimal"
          value={gatedAmountIn}
          onChange={(e) => onGatedAmountIn(e.target.value)}
          placeholder={PROVEN_GATED_VEIL_AMOUNT_IN}
          aria-describedby="gated-swap-hint"
          style={{
            minHeight: "44px",
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text)",
            fontFamily: "monospace",
            fontSize: "16px",
          }}
        />
        <span id="gated-swap-hint" style={{ color: "var(--color-muted)", fontFamily: "var(--font-body)", fontSize: "var(--text-caption)", lineHeight: 1.5 }}>
          Minimum accepted derives from a fresh gas-free simulation × your slippage
          setting (Execution Settings). {isMainnet ? "Needs VEIL already in your wallet;" : "Needs test VEIL already in your wallet;"}
          there is no onchain faucet.
        </span>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onSimulate}
            disabled={isSimulatingGated}
            aria-label="Simulate the gated swap gas-free via eth_call"
            className={isSimulatingGated ? "opacity-50 cursor-not-allowed" : "lp-btn lp-btn--outline"}
            style={{
              flex: 1,
              minHeight: "44px",
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text)",
              fontWeight: 600,
              fontSize: "var(--text-body-sm)",
              cursor: isSimulatingGated ? "not-allowed" : "pointer",
              ...(isSimulatingGated ? {
                border: "1px solid var(--color-border)",
              } : {}),
            }}
          >
            {isSimulatingGated ? "Simulating…" : "Simulate Gated Swap (Gas-Free)"}
          </button>
          <button
            type="button"
            onClick={onGatedSwap}
            disabled={gatedDisabled}
            aria-label="Execute the gated pool swap"
            className={gatedDisabled ? "opacity-50 cursor-not-allowed" : "lp-btn lp-btn--accent"}
            style={{
              flex: 1,
              minHeight: "44px",
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
              fontSize: "var(--text-body-sm)",
              cursor: gatedDisabled ? "not-allowed" : "pointer",
              ...(gatedDisabled ? {
                backgroundColor: "rgba(255, 140, 0, 0.2)",
                color: "var(--color-muted)",
                border: "1px solid var(--color-border)",
                boxShadow: "none",
              } : {}),
            }}
          >
            {!connectedAddress
              ? "Connect Wallet to Trade"
              : !gatedValid
              ? "Enter VEIL Amount"
              : attestation?.attested !== true
              ? "Attest First to Unlock"
              : isGatedSwapping
              ? "Swapping Through Gated Pool…"
              : "Execute Gated Swap"}
          </button>
        </div>
        {gatedSimNote && (
          <span role="status" style={{ color: "var(--color-accent-ink)", fontFamily: "var(--font-body)", fontSize: "var(--text-caption)", lineHeight: 1.5, overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>
            {gatedSimNote}
          </span>
        )}
        {gatedTxHash && (
          <span style={{ fontSize: "var(--text-caption)", fontFamily: "monospace", overflowWrap: "anywhere" }}>
            <span style={{ color: "var(--color-muted)" }}>Gated swap tx: </span>
            <a href={`${explorerTxBase}${gatedTxHash}`} target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-ink)" }}>
              {gatedTxHash}
            </a>
          </span>
        )}
      </div>
    </div>
  );
};

export default AttestPanel;
