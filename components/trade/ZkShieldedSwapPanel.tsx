"use client";

import React from "react";
import { ArrowDown, ArrowLeftRight, Check, Clipboard, Loader2, Sparkles, User, X } from "lucide-react";
import { TokenIcon } from "../TokenLogos";

export interface ZkShieldedSwapNoteOption {
  nullifier: string;
  label: string;
  assetSymbol: "ETH" | "VEIL";
}

export interface ZkShieldedSwapPanelProps {
  connectedAddress: string | null;
  notes: ZkShieldedSwapNoteOption[];
  selectedNullifier: string;
  onSelectNote: (nullifier: string) => void;
  sourceLabel: string;
  destinationLabel: string;
  routeLabel: string;
  routerAddress: string;
  multiRouterAddress: string;
  quotedOut: string | null;
  minSwapOut: string | null;
  flowKind: "single" | "multi" | "direct" | null;
  isQuoting: boolean;
  isExecuting: boolean;
  quoteDisabled: boolean;
  executeDisabled: boolean;
  quoteNote: string | null;
  txHash: string | null;
  onQuote: () => void;
  onExecute: () => void;
  payoutAddress: string;
  onPayoutAddressChange: (value: string) => void;
  // Optional way out of the zero-notes dead end + honesty when spending a
  // note with no recorded backup (warning only — execution stays enabled).
  onGoShield?: () => void;
  noteBackedUp?: boolean | null;
}

/** Shielded Swap tab: atomic relay -> swap -> deposit via the ZK routers. */
export const ZkShieldedSwapPanel: React.FC<ZkShieldedSwapPanelProps> = ({
  connectedAddress,
  notes,
  selectedNullifier,
  onSelectNote,
  sourceLabel,
  destinationLabel,
  routeLabel,
  routerAddress,
  multiRouterAddress,
  quotedOut,
  minSwapOut,
  flowKind,
  isQuoting,
  isExecuting,
  quoteDisabled,
  executeDisabled,
  quoteNote,
  txHash,
  onQuote,
  onExecute,
  payoutAddress,
  onPayoutAddressChange,
  onGoShield,
  noteBackedUp = null,
}) => {
  const handlePastePayout = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onPayoutAddressChange(text.trim());
      }
    } catch {
      // clipboard access unsupported or denied
    }
  };

  const handleUseConnectedWallet = () => {
    if (connectedAddress) {
      onPayoutAddressChange(connectedAddress);
    }
  };

  const activeOption = notes.find((n) => n.nullifier === selectedNullifier);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* 1. Spend Note Surface */}
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
          <span style={{ fontSize: "11px", color: "var(--color-muted)", fontFamily: "monospace" }}>
            Groth16 relay-in-tx
          </span>
        </div>

        <label
          htmlFor="zk-shielded-swap-note"
          style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}
        >
          Source note picker (0xbow ETH or VEIL notes from your vault)
        </label>

        <select
          id="zk-shielded-swap-note"
          aria-label="Select source shielded note"
          value={selectedNullifier}
          onChange={(e) => onSelectNote(e.target.value)}
          disabled={notes.length === 0 || isQuoting || isExecuting}
          style={{
            minHeight: "2.75rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border-strong)",
            backgroundColor: "#ffffff",
            color: "var(--color-text)",
            fontFamily: "monospace",
            fontSize: "var(--text-caption)",
            padding: "0 var(--space-3)",
            cursor: notes.length === 0 ? "not-allowed" : "pointer",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {notes.length === 0 && <option value="">No 0xbow notes in vault</option>}
          {notes.map((n) => (
            <option key={n.nullifier} value={n.nullifier}>
              {n.label}
            </option>
          ))}
        </select>
        {notes.length === 0 && onGoShield && (
          <button
            type="button"
            onClick={onGoShield}
            className="lp-btn lp-btn--outline"
            style={{
              alignSelf: "flex-start",
              padding: "6px 12px",
              minHeight: "28px",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to Shield →
          </button>
        )}
        {notes.length > 0 && noteBackedUp === false && (
          <div role="status" style={{ fontSize: "12px", color: "#b42318", lineHeight: 1.5 }}>
            This note has no recorded backup. A failed spend without one risks permanent loss — back it up in the Vault tab first.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div
            style={{
              fontSize: "clamp(1.4rem, 2vw, 1.8rem)",
              fontFamily: "var(--font-headline)",
              fontWeight: 600,
              color: "var(--color-text)",
              fontVariantNumeric: "tabular-nums",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {activeOption && <TokenIcon symbol={activeOption.assetSymbol} size={20} />}
            <span>{sourceLabel}</span>
          </div>
          {activeOption && (
            <span
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(255, 140, 0, 0.1)",
                color: "var(--color-accent-ink)",
                border: "1px solid rgba(255, 140, 0, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <TokenIcon symbol={activeOption.assetSymbol} size={12} />
              <span>{activeOption.assetSymbol} Shielded</span>
            </span>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--text-caption)", color: "var(--color-muted)", fontFamily: "monospace" }}>
          <span>{routeLabel}</span>
          <span>Atomic, one tx</span>
        </div>
      </div>

      {/* Visual Direction Divider */}
      <div style={{ display: "flex", justifyContent: "center", margin: "-8px 0", position: "relative", zIndex: 1 }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            border: "1px solid var(--color-border-strong)",
            boxShadow: "0 2px 8px rgba(26, 26, 26, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-accent-ink)",
          }}
        >
          <ArrowDown size={14} aria-hidden="true" />
        </div>
      </div>

      {/* 2. Receive Destination Surface */}
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
            You Receive (Fixed Destination)
          </span>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(26, 26, 26, 0.05)",
              color: "var(--color-muted)",
              fontWeight: 600,
            }}
          >
            Solana Ring Relayed
          </span>
        </div>

        <div
          style={{
            fontSize: "clamp(1.4rem, 2vw, 1.8rem)",
            fontFamily: "var(--font-headline)",
            fontWeight: 600,
            color: "var(--color-text)",
            fontVariantNumeric: "tabular-nums",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {destinationLabel.includes("ETH") ? (
            <TokenIcon symbol="ETH" size={20} />
          ) : destinationLabel.includes("VEIL") ? (
            <TokenIcon symbol="VEIL" size={20} />
          ) : null}
          <span>{destinationLabel}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "var(--text-caption)",
            color: "var(--color-muted)",
            fontFamily: "monospace",
          }}
        >
          <span>Settlement Mode:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
            {flowKind === "direct" ? "Direct Wallet Payout" : "Fresh Shielded Note"}
          </span>
        </div>
      </div>

      {/* 3. Live Simulation & Quote Details */}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--color-muted)" }}>Live swap quote:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "5px" }}>
            {isQuoting && <Loader2 size={12} className="animate-spin text-[#FF8C00]" aria-hidden="true" />}
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
          <span style={{ color: "var(--color-muted)" }}>Flow:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 600 }}>
            {flowKind === "multi" ? "Batched (multi-note — needs funding)" : flowKind === "single" ? "Single note" : flowKind === "direct" ? "Direct payout (visible onchain)" : "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-muted)" }}>Router:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 600, overflowWrap: "anywhere" }}>
            {flowKind === "multi" ? multiRouterAddress : routerAddress}
          </span>
        </div>
        <span style={{ color: "var(--color-muted)", fontFamily: "var(--font-body)", lineHeight: 1.5, overflowWrap: "anywhere", minWidth: 0, fontSize: "11px", marginTop: "2px" }}>
            {quoteNote ??
              "Quote runs free exact-calldata simulations (no transaction), then bounds the live output by your Execution Settings slippage. One note funds the destination when possible, otherwise a same-asset batch is quoted (single-note live; multi-note batch requires funding). Execution re-simulates immediately before sending and fails closed on any revert."}
        </span>
        {txHash && (
          <span style={{ color: "var(--color-muted)", overflowWrap: "anywhere", fontSize: "11px" }}>
            Full-ZK tx: {txHash}
          </span>
        )}
      </div>

      {/* 4. Direct Payout Address Helper */}
      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "rgba(26, 26, 26, 0.025)",
          border: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
          <label
            htmlFor="direct-payout-address"
            style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--color-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Payout address (receives swap output directly)
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {payoutAddress && (
              <button
                type="button"
                onClick={() => onPayoutAddressChange("")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "11px",
                  color: "var(--color-muted)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                <X size={11} aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
            {connectedAddress && payoutAddress.toLowerCase() !== connectedAddress.toLowerCase() && (
              <button
                type="button"
                onClick={handleUseConnectedWallet}
                className="lp-btn lp-btn--outline"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11px",
                  color: "var(--color-accent-ink)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <User size={11} aria-hidden="true" />
                <span>Use Connected</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePastePayout}
              className="lp-btn lp-btn--outline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                fontSize: "11px",
                color: "var(--color-accent-ink)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Clipboard size={11} aria-hidden="true" />
              <span>Paste</span>
            </button>
          </div>
        </div>

        <input
          id="direct-payout-address"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="0x... (clean recipient address)"
          value={payoutAddress}
          onChange={(e) => onPayoutAddressChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#ffffff",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text)",
            fontSize: "15px",
            fontFamily: "monospace",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <span style={{ fontSize: "11px", color: "var(--color-muted)", lineHeight: 1.4 }}>
          Optional — only used for Direct payout. Empty means your connected wallet.
        </span>
      </div>

      {/* 5. Execution Buttons */}
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onQuote}
          disabled={quoteDisabled}
          className={quoteDisabled ? "opacity-45 cursor-not-allowed" : "lp-btn lp-btn--outline"}
          style={{
            flex: 1,
            minWidth: "140px",
            fontSize: "var(--text-body-sm)",
            fontWeight: 600,
            minHeight: "3rem",
            cursor: quoteDisabled ? "not-allowed" : "pointer",
            ...(quoteDisabled ? {
              backgroundColor: "#ffffff",
              color: "var(--color-muted)",
              border: "1px solid var(--color-border-strong)",
            } : {}),
          }}
        >
          {isQuoting && <Loader2 size={14} className="animate-spin text-[#FF8C00]" aria-hidden="true" />}
          <span>{isQuoting ? "Quoting…" : "Refresh Live Quote"}</span>
        </button>
        <button
          type="button"
          onClick={onExecute}
          disabled={executeDisabled}
          className={executeDisabled ? "opacity-45 cursor-not-allowed" : "lp-btn lp-btn--accent"}
          style={{
            flex: 1,
            minWidth: "160px",
            fontSize: "var(--text-body-sm)",
            fontWeight: 700,
            minHeight: "3rem",
            cursor: executeDisabled ? "not-allowed" : "pointer",
            ...(executeDisabled ? {
              backgroundColor: "rgba(255, 140, 0, 0.2)",
              color: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              boxShadow: "none",
            } : {}),
          }}
        >
          {isExecuting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
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

export default ZkShieldedSwapPanel;

