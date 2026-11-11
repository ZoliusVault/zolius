"use client";

import React, { useRef, useState, useEffect } from "react";
import { formatEther } from "viem";
import { Lock } from "lucide-react";
import { EthLogo, VeilLogoMark } from "../TokenLogos";
import { MAINNET_BOW_V3_VEIL_TOKEN, TESTNET_BOW_V3_VEIL_TOKEN, TESTNET_CHAIN_ID } from "../../lib/privacy-pools";

export type BowDepositAsset = "ETH" | "VEIL";

export interface BuyAndShieldPanelProps {
  chainId: number;
  depositAsset: BowDepositAsset;
  onSelectDepositAsset: (asset: BowDepositAsset) => void;
  depositAmount: string;
  onDepositAmount: (v: string) => void;
  ethDenomination: bigint;
  veilMinimum: bigint | null;
  veilBalance: string | null;
  ethBalance: string;
  connectedAddress: string | null;
  isExecuting: boolean;
  amountValid: boolean;
  executeDisabled: boolean;
  onExecute: () => void;
}

/** Buy & Shield tab: 0xbow-only shield surface (native ETH + ERC20 VEIL).
 * Fixed 0.001 denomination is enforced by on-chain privacy pool contracts
 * to guarantee zero-knowledge anonymity and unlinkability. */
export const BuyAndShieldPanel: React.FC<BuyAndShieldPanelProps> = ({
  chainId,
  depositAsset,
  onSelectDepositAsset,
  depositAmount,
  onDepositAmount,
  ethDenomination,
  veilMinimum,
  veilBalance,
  ethBalance,
  connectedAddress,
  isExecuting,
  amountValid,
  executeDisabled,
  onExecute,
}) => {
  const assetNavRef = useRef<HTMLDivElement>(null);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [assetIndicatorStyle, setAssetIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    const updateIndicator = () => {
      const container = assetNavRef.current;
      if (!container) return;
      const activeEl = container.querySelector<HTMLElement>(`[data-asset="${depositAsset}"]`);
      if (activeEl) {
        setAssetIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1,
        });
      }
    };

    updateIndicator();
    const t = setTimeout(updateIndicator, 40);
    window.addEventListener("resize", updateIndicator);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [depositAsset]);

  const isEth = depositAsset === "ETH";
  const isMainnet = chainId !== TESTNET_CHAIN_ID;
  const veilTokenShown = isMainnet ? MAINNET_BOW_V3_VEIL_TOKEN : TESTNET_BOW_V3_VEIL_TOKEN;
  const denomLabel = isEth
    ? `${formatEther(ethDenomination)} ETH`
    : veilMinimum !== null
    ? `${formatEther(veilMinimum)} VEIL`
    : "0.001 VEIL";
  const balanceLabel = isEth ? `${ethBalance} ETH` : `${veilBalance ?? "…"} VEIL`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Pay / Deposit Surface */}
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
            You Deposit (Public Wallet)
          </span>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)", fontFamily: "monospace" }}>
            Bal: {balanceLabel}
          </span>
        </div>

        {/* Fixed Amount Display & Asset Selector Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "clamp(1.75rem, 2.5vw, 2.35rem)",
                fontFamily: "var(--font-headline)",
                fontWeight: 600,
                color: "var(--color-text)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {isEth ? formatEther(ethDenomination) : "0.001"}
            </span>
            <span
              style={{
                fontSize: "clamp(1.1rem, 1.6vw, 1.3rem)",
                color: "var(--color-muted)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              {isEth ? <EthLogo size={16} /> : <VeilLogoMark size={16} />}
              <span>{depositAsset}</span>
            </span>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "var(--color-muted)",
                backgroundColor: "rgba(26, 26, 26, 0.06)",
                padding: "3px 7px",
                borderRadius: "var(--radius-sm)",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontWeight: 600,
              }}
              title="Fixed denomination enforced by 0xbow privacy pool contracts for anonymity unlinkability"
            >
              <Lock size={10} style={{ opacity: 0.6 }} />
              Fixed
            </span>
          </div>

          {/* Shield-asset toggle: native ETH or VEIL */}
          <div
            ref={assetNavRef}
            role="group"
            aria-label={isMainnet ? "Shield asset: ETH or VEIL" : "Shield asset: test ETH or test VEIL"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(26, 26, 26, 0.04)",
              border: "1px solid var(--color-border)",
              position: "relative",
            }}
          >
            {/* Sliding Pill Indicator */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "4px",
                bottom: "4px",
                left: `${assetIndicatorStyle.left}px`,
                width: `${assetIndicatorStyle.width}px`,
                backgroundColor: "#ffffff",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border-strong)",
                boxShadow: "0 1px 3px rgba(26, 26, 26, 0.06)",
                pointerEvents: "none",
                opacity: assetIndicatorStyle.opacity,
                transition: "left 240ms cubic-bezier(0.22, 1, 0.36, 1), width 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease",
                zIndex: 1,
              }}
            />

            {(["ETH", "VEIL"] as const).map((sym) => {
              const active = depositAsset === sym;
              return (
                <button
                  key={sym}
                  data-asset={sym}
                  type="button"
                  aria-pressed={active}
                  aria-label={isMainnet ? `Shield ${sym}` : `Shield test ${sym}`}
                  onClick={() => {
                    onSelectDepositAsset(sym);
                    onDepositAmount(sym === "ETH" ? formatEther(ethDenomination) : "0.001");
                  }}
                  style={{
                    position: "relative",
                    zIndex: 2,
                    padding: "6px 12px",
                    minHeight: "28px",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-body-sm)",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    border: "1px solid transparent",
                    backgroundColor: "transparent",
                    color: active ? "var(--color-text)" : "var(--color-muted)",
                    boxShadow: "none",
                    transition: "color 180ms ease, opacity 180ms ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {sym === "ETH" ? <EthLogo size={13} /> : <VeilLogoMark size={13} />}
                  <span>{sym}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Note Multiplier Presets */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", fontWeight: 500 }}>
              Note Multiplier Presets
            </span>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: multiplier > 1 ? "var(--color-accent-ink)" : "var(--color-text)", fontWeight: 600 }}>
              {multiplier === 1 ? `1 Note (${denomLabel})` : `${multiplier} Notes (${(0.001 * multiplier).toFixed(3)} ${depositAsset})`}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
            {[
              { mult: 1, label: "1x Note", val: "0.001" },
              { mult: 2, label: "2x Notes", val: "0.002" },
              { mult: 5, label: "5x Notes", val: "0.005" },
              { mult: 10, label: "10x Notes", val: "0.010" },
            ].map((preset) => {
              const isSelected = multiplier === preset.mult;
              return (
                <button
                  key={preset.mult}
                  type="button"
                  onClick={() => {
                    setMultiplier(preset.mult);
                    onDepositAmount(isEth ? formatEther(ethDenomination) : "0.001");
                  }}
                  className={isSelected ? "lp-btn lp-btn--filled" : "lp-btn lp-btn--outline"}
                  style={{
                    padding: "6px 8px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: isSelected ? 700 : 500, color: isSelected ? "#ffffff" : "var(--color-text)" }}>{preset.label}</span>
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: isSelected ? "rgba(255, 255, 255, 0.85)" : "var(--color-muted)" }}>
                    {preset.val} {depositAsset}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Why Fixed Helper Strip */}
        <div
          style={{
            fontSize: "11px",
            color: "var(--color-muted)",
            fontFamily: "var(--font-mono)",
            lineHeight: 1.45,
            paddingTop: "6px",
            borderTop: "1px solid var(--color-hairline)",
          }}
        >
          {multiplier === 1 ? (
            <span>Each deposit mints 1 private note of exactly {denomLabel} to keep all commitments identical and unlinkable onchain.</span>
          ) : (
            <span>Targeting {multiplier} notes ({(0.001 * multiplier).toFixed(3)} {depositAsset}). The privacy pool mints 0.001 per transaction to ensure maximum anonymity set cardinality. Mint sequential notes to fulfill this target.</span>
          )}
        </div>
      </div>

      {/* Receive / Shield Output Surface */}
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
            You Receive (Private Vault)
          </span>
          <span style={{ fontSize: "11px", color: "var(--color-muted)", fontFamily: "monospace" }}>
            1 Encrypted Note
          </span>
        </div>

        <div
          style={{
            fontSize: "clamp(1.75rem, 2.5vw, 2.35rem)",
            fontFamily: "var(--font-headline)",
            fontWeight: 600,
            color: "var(--color-text)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {denomLabel === "…" ? "Loading live VEIL minimum…" : denomLabel}
        </div>
        {!isEth && veilMinimum === null && (
          <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>
            Reading the live VEIL minimum from chain — the Shield button unlocks when it loads.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--text-caption)", color: "var(--color-muted)", fontFamily: "monospace" }}>
          <span>
            {isEth
              ? "Entrypoint.deposit — native ETH to 0xbow ETH note"
              : "Entrypoint.deposit(asset, value, precommitment) — VEIL to 0xbow VEIL note"}
          </span>
          <span style={{ color: "var(--color-muted)", fontSize: "11px" }}>
            Groth16 Proof Payload
          </span>
        </div>
      </div>

      {/* Asset guidance */}
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
        <span style={{ color: "var(--color-muted)", fontFamily: "var(--font-body)", lineHeight: 1.5, overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>
          {isEth
            ? isMainnet
              ? "You need SOL for transaction fees plus the shield deposit amount."
              : "Fund devnet SOL via Solana faucet — transaction fees plus shield deposit both need it."
            : isMainnet
            ? `Needs VEIL already in your wallet — there is no onchain faucet. VEIL: ${veilTokenShown}. VEIL deposits approve the entrypoint first; the app sends the approval in the same flow when allowance is short.`
            : `Needs test VEIL already in your wallet — there is no onchain faucet. Test VEIL: ${veilTokenShown}. VEIL deposits approve the entrypoint first; the app sends the approval in the same flow when allowance is short.`}
        </span>
      </div>

      {/* Main Action Button */}
      <button
        onClick={onExecute}
        disabled={executeDisabled}
        className={executeDisabled ? "opacity-60 cursor-not-allowed" : "lp-btn lp-btn--accent"}
        style={{
          width: "100%",
          padding: "16px 24px",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--text-body)",
          fontWeight: 700,
          cursor: executeDisabled ? "not-allowed" : "pointer",
          ...(executeDisabled ? {
            backgroundColor: "rgba(26, 26, 26, 0.05)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            boxShadow: "none",
          } : {}),
        }}
      >
        <span>
          {isExecuting
            ? "Shielding Deposit…"
            : !connectedAddress
            ? "Connect Wallet to Shield"
            : `Shield ${denomLabel}`}
        </span>
      </button>
    </div>
  );
};

export default BuyAndShieldPanel;
