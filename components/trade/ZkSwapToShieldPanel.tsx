"use client";

import React from "react";

export interface ZkSwapToShieldPanelProps {
  connectedAddress: string | null;
  sourceLabel: string;
  routeLabel: string;
  routerAddress: string;
  quotedOut: string | null;
  minSwapOut: string | null;
  isQuoting: boolean;
  isExecuting: boolean;
  quoteDisabled: boolean;
  executeDisabled: boolean;
  quoteNote: string | null;
  txHash: string | null;
  onQuote: () => void;
  onExecute: () => void;
}

/** Full-ZK Swap-to-Shield tab: atomic relay -> swap -> deposit via VeilZkRouter. */
export const ZkSwapToShieldPanel: React.FC<ZkSwapToShieldPanelProps> = ({
  connectedAddress,
  sourceLabel,
  routeLabel,
  routerAddress,
  quotedOut,
  minSwapOut,
  isQuoting,
  isExecuting,
  quoteDisabled,
  executeDisabled,
  quoteNote,
  txHash,
  onQuote,
  onExecute,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div
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
          <span style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--color-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            You Spend (Shielded Note)
          </span>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)", fontFamily: "monospace" }}>
            Groth16 relay-in-tx
          </span>
        </div>
        <div
          style={{
            fontSize: "clamp(1.4rem, 2vw, 1.8rem)",
            fontFamily: "var(--font-headline)",
            fontWeight: 600,
            color: "var(--color-text)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {sourceLabel}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--text-caption)", color: "var(--color-muted)", fontFamily: "monospace" }}>
          <span>{routeLabel}</span>
          <span>Atomic, one tx</span>
        </div>
      </div>

      <div
        role="status"
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "rgba(26, 26, 26, 0.025)",
          border: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          fontSize: "var(--text-caption)",
          fontFamily: "monospace",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-muted)" }}>Live swap quote:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
            {isQuoting ? "Simulating live output…" : quotedOut ?? "Not quoted yet"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-muted)" }}>Slippage-bound minSwapOut:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
            {minSwapOut ?? "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-muted)" }}>Router:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 600, overflowWrap: "anywhere" }}>
            {routerAddress}
          </span>
        </div>
        <span style={{ color: "var(--color-muted)", fontFamily: "var(--font-body)", lineHeight: 1.5, overflowWrap: "anywhere", minWidth: 0 }}>
          {quoteNote ??
            "Quote runs free exact-calldata simulations (no transaction), then bounds the live output by your Execution Settings slippage. Execution re-simulates immediately before sending and fails closed on any revert."}
        </span>
        {txHash && (
          <span style={{ color: "var(--color-muted)", overflowWrap: "anywhere" }}>
            Full-ZK tx: {txHash}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          type="button"
          onClick={onQuote}
          disabled={quoteDisabled}
          className={quoteDisabled ? "opacity-45 cursor-not-allowed" : "lp-btn lp-btn--outline"}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-body-sm)",
            fontWeight: 600,
            minHeight: "3rem",
            borderRadius: "var(--radius-md)",
            cursor: quoteDisabled ? "not-allowed" : "pointer",
            ...(quoteDisabled ? {
              backgroundColor: "#ffffff",
              color: "var(--color-muted)",
              border: "1px solid var(--color-border-strong)",
            } : {}),
          }}
        >
          <span>{isQuoting ? "Quoting…" : "Refresh Live Quote"}</span>
        </button>
        <button
          type="button"
          onClick={onExecute}
          disabled={executeDisabled}
          className={executeDisabled ? "opacity-45 cursor-not-allowed" : "lp-btn lp-btn--accent"}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-body-sm)",
            fontWeight: 700,
            minHeight: "3rem",
            borderRadius: "var(--radius-md)",
            cursor: executeDisabled ? "not-allowed" : "pointer",
            ...(executeDisabled ? {
              backgroundColor: "rgba(255, 140, 0, 0.2)",
              color: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              boxShadow: "none",
            } : {}),
          }}
        >
          <span>
            {isExecuting
              ? "Executing Full-ZK…"
              : !connectedAddress
              ? "Connect Wallet to Trade"
              : "Execute Full-ZK Flow"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ZkSwapToShieldPanel;
