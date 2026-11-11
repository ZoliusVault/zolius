"use client";

import React, { useState } from "react";
import {
  Wallet,
  ArrowRight,
  ArrowLeftRight,
  ArrowUpRight,
  Copy,
  Check,
  Shield,
  ExternalLink,
} from "lucide-react";
import { type AnyShieldedNote, isBowNote } from "../../lib/note";
import { formatNoteAmount, getNoteAssetSymbol } from "../../lib/note-format";
import { TokenIcon } from "../TokenLogos";

export interface VaultSidebarWidgetProps {
  notes: AnyShieldedNote[];
  selectedNullifier?: string | null;
  onSelectForSwap: (nullifier: string) => void;
  onSelectForWithdraw: (nullifier: string) => void;
  onViewFullVault: () => void;
  onBackupNote: (nullifier: string) => void;
  onGoToShield: () => void;
}

export const VaultSidebarWidget: React.FC<VaultSidebarWidgetProps> = ({
  notes,
  selectedNullifier,
  onSelectForSwap,
  onSelectForWithdraw,
  onViewFullVault,
  onBackupNote,
  onGoToShield,
}) => {
  const [copiedNullifier, setCopiedNullifier] = useState<string | null>(null);

  const handleCopy = (nullifier: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(nullifier);
    setCopiedNullifier(nullifier);
    setTimeout(() => setCopiedNullifier(null), 1800);
  };

  // Group balances by asset
  const balancesByAsset = notes.reduce<Record<string, { total: bigint; count: number }>>((acc, note) => {
    const asset = note.asset || "0x0000000000000000000000000000000000000000";
    const key = asset.toLowerCase();
    if (!acc[key]) {
      acc[key] = { total: 0n, count: 0 };
    }
    acc[key].total += note.denomination;
    acc[key].count += 1;
    return acc;
  }, {});

  const assetEntries = Object.entries(balancesByAsset);

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
      {/* Header */}
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
            <Wallet size={14} style={{ color: "var(--color-accent-ink)" }} />
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
              Private Vault
            </div>
            <div style={{ fontSize: "11px", color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
              {notes.length} Active Commitment{notes.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewFullVault}
          className="lp-btn lp-btn--outline"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--color-muted)",
            cursor: "pointer",
            borderRadius: "var(--radius-sm)",
          }}
          title="Open full Note Vault tab"
        >
          <span>Full Vault</span>
          <ArrowRight size={11} />
        </button>
      </div>

      {/* Balances Summary */}
      {notes.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: assetEntries.length > 1 ? "repeat(2, 1fr)" : "1fr",
            gap: "8px",
          }}
        >
          {assetEntries.map(([assetKey, data]) => {
            const sym = getNoteAssetSymbol(assetKey);
            const amtStr = formatNoteAmount(data.total, assetKey);
            return (
              <div
                key={assetKey}
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(26, 26, 26, 0.02)",
                  border: "1px solid var(--color-border)",
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
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <TokenIcon symbol={sym} size={12} />
                  <span>Shielded {sym}</span>
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--color-text)",
                    fontFamily: "var(--font-mono)",
                    marginTop: "2px",
                  }}
                >
                  {amtStr}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--color-muted)",
                    marginTop: "2px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {data.count} note{data.count !== 1 ? "s" : ""}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: "18px 14px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(26, 26, 26, 0.02)",
            border: "1px dashed var(--color-border-strong)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--color-muted)", lineHeight: 1.45 }}>
            No encrypted commitments found. Shield ETH to begin trading privately.
          </div>
          <button
            type="button"
            onClick={onGoToShield}
            className="lp-btn lp-btn--filled"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Shield size={12} />
            <span>Deposit in Shield</span>
          </button>
        </div>
      )}

      {/* Note List (Up to 4 recent notes with quick actions) */}
      {notes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-faint)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Active Commitments (Ready for Swap / Exit)
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "260px",
              overflowY: "auto",
              paddingRight: "2px",
            }}
          >
            {notes.map((note) => {
              const formattedAmt = formatNoteAmount(note.denomination, note.asset);
              const isSelected = selectedNullifier === note.nullifier;
              const isCopied = copiedNullifier === note.nullifier;
              const shortNullifier = `${note.nullifier.slice(0, 8)}...${note.nullifier.slice(-6)}`;
              const is0xbow = isBowNote(note);

              return (
                <div
                  key={note.nullifier}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: isSelected ? "rgba(255, 140, 0, 0.05)" : "#ffffff",
                    border: isSelected
                      ? "1px solid var(--color-accent)"
                      : "1px solid var(--color-border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    transition: "all var(--duration-fast)",
                  }}
                >
                  {/* Top: Amount + Type */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <TokenIcon symbol={getNoteAssetSymbol(note.asset)} size={13} />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "var(--color-text)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {formattedAmt}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: "9px",
                            fontFamily: "var(--font-mono)",
                            padding: "1px 5px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "rgba(255, 140, 0, 0.15)",
                            color: "var(--color-accent-ink)",
                            fontWeight: 700,
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "9px",
                        fontFamily: "var(--font-mono)",
                        padding: "1px 5px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: is0xbow ? "rgba(26, 26, 26, 0.06)" : "rgba(255, 140, 0, 0.1)",
                        color: is0xbow ? "var(--color-muted)" : "var(--color-accent-ink)",
                        fontWeight: 600,
                      }}
                    >
                      {is0xbow ? "Groth16" : "Legacy"}
                    </span>
                  </div>

                  {/* Middle: Nullifier + Copy */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-muted)",
                    }}
                  >
                    <span>{shortNullifier}</span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(note.nullifier, e)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: "2px 4px",
                        cursor: "pointer",
                        color: "var(--color-muted)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                      title="Copy nullifier"
                    >
                      {isCopied ? (
                        <>
                          <Check size={10} style={{ color: "var(--color-text)" }} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={10} /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Actions Row: Quick Swap & Quick Withdraw */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      paddingTop: "4px",
                      borderTop: "1px solid var(--color-hairline)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectForSwap(note.nullifier)}
                      className="lp-btn lp-btn--outline"
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        padding: "4px 8px",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--color-text)",
                        fontSize: "10px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                      }}
                      title="Use this note in shielded swap"
                    >
                      <ArrowLeftRight size={10} />
                      <span>Swap</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectForWithdraw(note.nullifier)}
                      className="lp-btn lp-btn--outline"
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        padding: "4px 8px",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--color-text)",
                        fontSize: "10px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                      }}
                      title="Withdraw this note to a fresh address"
                    >
                      <ArrowUpRight size={10} />
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultSidebarWidget;
