"use client";

import React, { useEffect, useState } from "react";
import { isAddress } from "viem";
import { Check, ChevronDown, ChevronUp, Lock, AlertTriangle, Clipboard, X } from "lucide-react";
import { APP_CHAIN_ID } from "../../lib/chains";
import { TESTNET_CHAIN_ID } from "../../lib/privacy-pools";
import { isBowNote, type AnyShieldedNote } from "../../lib/note";
import { formatNoteAmount, getNoteAssetSymbol } from "../../lib/note-format";
import { TokenIcon } from "../TokenLogos";

export interface WithdrawPanelProps {
  connectedAddress?: string | null;
  notes: AnyShieldedNote[];
  activeNote: AnyShieldedNote | undefined;
  isNoteDropdownOpen: boolean;
  onToggleNoteDropdown: () => void;
  onSelectNote: (nullifier: string) => void;
  cleanRecipient: string;
  onRecipientChange: (value: string) => void;
  isExecuting: boolean;
  onWithdraw: () => void;
  noteBackedUp: boolean;
  onBackupNow: () => void;
  // Optional way out of the zero-notes dead end.
  onGoShield?: () => void;
}

/** Withdraw tab: note picker, clean recipient, unlinkable-withdraw CTA. */
export const WithdrawPanel: React.FC<WithdrawPanelProps> = ({
  connectedAddress,
  notes,
  activeNote,
  isNoteDropdownOpen,
  onToggleNoteDropdown,
  onSelectNote,
  cleanRecipient,
  onRecipientChange,
  isExecuting,
  onWithdraw,
  noteBackedUp,
  onBackupNow,
  onGoShield,
}) => {
  const recipientInvalid = cleanRecipient.length > 0 && !isAddress(cleanRecipient);
  // Explicit ack when the note has no recorded backup: withdrawing without
  // one risks permanent loss if anything goes wrong downstream.
  const [ackNoBackup, setAckNoBackup] = useState(false);
  const activeKey = activeNote ? activeNote.nullifier : "none";
  useEffect(() => {
    setAckNoBackup(false);
  }, [activeKey]);
  const needsBackupAck = !noteBackedUp;
  const ctaDisabled =
    isExecuting || !cleanRecipient || !isAddress(cleanRecipient) || notes.length === 0 ||
    (needsBackupAck && !ackNoBackup);

  const isSelfDoxxing = Boolean(
    connectedAddress &&
    cleanRecipient &&
    isAddress(cleanRecipient) &&
    cleanRecipient.toLowerCase() === connectedAddress.toLowerCase()
  );

  const handlePasteRecipient = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onRecipientChange(text.trim());
      }
    } catch {
      // clipboard access denied or unsupported in context
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Note Selection Surface */}
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
          <label
            htmlFor="withdraw-note-select"
            style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--color-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Select Shielded Note to Withdraw
          </label>
          <span style={{ fontSize: "11px", color: "var(--color-accent-ink)", fontFamily: "monospace", fontWeight: 600 }}>
            {notes.length} Available
          </span>
        </div>

        {notes.length === 0 || !activeNote ? (
          <div
            style={{
              padding: "var(--space-5)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(255, 140, 0, 0.06)",
              border: "1px dashed rgba(255, 140, 0, 0.35)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <Lock className="w-5 h-5 text-[#FF8C00]" aria-hidden="true" />
            <div style={{ color: "var(--color-text)", fontWeight: 600, fontSize: "var(--text-body-sm)" }}>
              No Shielded Notes to Withdraw
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", fontSize: "var(--text-caption)" }}>
              You have no active notes in encrypted local storage.
            </p>
            {onGoShield && (
              <button
                type="button"
                onClick={onGoShield}
                className="lp-btn lp-btn--outline"
                style={{
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
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              id="withdraw-note-select"
              onClick={onToggleNoteDropdown}
              aria-haspopup="true"
              aria-expanded={isNoteDropdownOpen}
              aria-label="Selected shielded note, change note"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "#ffffff",
                border: isNoteDropdownOpen ? "1px solid var(--color-accent)" : "1px solid var(--color-border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                textAlign: "left",
                transition: "all var(--duration-fast)",
                boxSizing: "border-box",
                boxShadow: "0 2px 6px rgba(26, 26, 26, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(26, 26, 26, 0.04)",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-muted)",
                    flexShrink: 0,
                  }}
                >
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "var(--text-body-sm)" }}>
                      Note #{notes.findIndex((n) => n.nullifier === activeNote.nullifier) + 1}
                    </span>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "rgba(26, 26, 26, 0.04)",
                        border: "1px solid var(--color-border)",
                        fontSize: "10px",
                        fontFamily: "monospace",
                        color: "var(--color-muted)",
                        fontWeight: 500,
                      }}
                    >
                      0xbow v1.2.1 · Groth16
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--color-muted)", fontFamily: "monospace", marginTop: "2px" }}>
                    Nullifier: {activeNote.nullifier.slice(0, 12)}...{activeNote.nullifier.slice(-6)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <TokenIcon symbol={getNoteAssetSymbol(activeNote.asset)} size={16} />
                  <span style={{ fontFamily: "monospace", fontSize: "var(--text-body)", color: "var(--color-accent-ink)", fontWeight: 700 }}>
                    {formatNoteAmount(activeNote.denomination, activeNote.asset)}
                  </span>
                </div>
                {isNoteDropdownOpen ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                )}
              </div>
            </button>

            {/* Dropdown Popover */}
            {isNoteDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 30,
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--color-border-strong)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 16px 36px rgba(26, 26, 26, 0.15)",
                  maxHeight: "220px",
                  overflowY: "auto",
                  padding: "4px",
                }}
              >
                {notes.map((n, idx) => {
                  const isCurrent = n.nullifier === activeNote.nullifier;
                  return (
                    <button
                      key={n.nullifier}
                      type="button"
                      onClick={() => onSelectNote(n.nullifier)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: isCurrent ? "rgba(26, 26, 26, 0.05)" : "transparent",
                        border: isCurrent ? "1px solid var(--color-border-strong)" : "1px solid transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        textAlign: "left",
                        marginBottom: "2px",
                        transition: "all var(--duration-fast)",
                        boxSizing: "border-box",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "12px" }}>
                            Note #{idx + 1}
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--color-muted)", fontFamily: "monospace" }}>
                            {n.nullifier.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <TokenIcon symbol={getNoteAssetSymbol(n.asset)} size={13} />
                        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--color-text)", fontWeight: 600 }}>
                          {formatNoteAmount(n.denomination, n.asset)}
                        </span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-[#FF8C00]" aria-hidden="true" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Note Switcher Presets */}
            {notes.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}>
                    Quick Note Selector ({notes.length} available)
                  </span>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-accent-ink)", fontWeight: 600 }}>
                    Active: #{notes.findIndex((n) => n.nullifier === activeNote.nullifier) + 1}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px", overflowX: "auto", padding: "6px 2px", scrollbarWidth: "none" }}>
                  {notes.map((n, idx) => {
                    const isCurrent = n.nullifier === activeNote.nullifier;
                    return (
                      <button
                        key={n.nullifier}
                        type="button"
                        onClick={() => onSelectNote(n.nullifier)}
                        className={isCurrent ? "lp-btn lp-btn--filled" : "lp-btn lp-btn--outline"}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11.5px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: isCurrent ? 700 : 500,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        <TokenIcon symbol={getNoteAssetSymbol(n.asset)} size={12} />
                        <span>#{idx + 1}</span>
                        <span>({formatNoteAmount(n.denomination, n.asset)})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recipient Address Surface */}
      <div
        style={{
          padding: "var(--space-4)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "rgba(26, 26, 26, 0.025)",
          border: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
          <label
            htmlFor="clean-recipient"
            style={{ fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--color-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Destination Recipient Address (Decoupled)
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {cleanRecipient && (
              <button
                type="button"
                onClick={() => onRecipientChange("")}
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
            <button
              type="button"
              onClick={handlePasteRecipient}
              className="lp-btn lp-btn--outline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 8px",
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
          id="clean-recipient"
          type="text"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={recipientInvalid}
          aria-describedby={recipientInvalid ? "clean-recipient-error" : "clean-recipient-help"}
          placeholder="0x... (fresh or unlinked wallet address)"
          value={cleanRecipient}
          onChange={(e) => onRecipientChange(e.target.value)}
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#ffffff",
            border: recipientInvalid
              ? "1px solid var(--color-danger-border)"
              : isSelfDoxxing
              ? "1px solid rgba(255, 140, 0, 0.6)"
              : "1px solid var(--color-border-strong)",
            color: "var(--color-text)",
            fontSize: "15px",
            fontFamily: "monospace",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color var(--duration-fast)",
          }}
        />

        {recipientInvalid && (
          <span id="clean-recipient-error" role="status" style={{ fontSize: "11px", color: "var(--color-danger-ink)" }}>
            Not a valid address — expected 0x followed by 40 hexadecimal characters.
          </span>
        )}

        {isSelfDoxxing && (
          <div
            role="alert"
            style={{
              padding: "9px 12px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(255, 140, 0, 0.08)",
              border: "1px solid rgba(255, 140, 0, 0.35)",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              marginTop: "2px",
            }}
          >
            <AlertTriangle className="w-4 h-4 text-[#FF8C00] shrink-0 mt-0.5" aria-hidden="true" />
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text)" }}>
                Self-Doxxing Privacy Risk
              </span>
              <span style={{ fontSize: "11px", color: "var(--color-muted)", lineHeight: 1.45 }}>
                This matches your connected depositor wallet. Withdrawing to the same address breaks on-chain anonymity. For full unlinkability, withdraw to a fresh or unlinked recipient address.
              </span>
            </div>
          </div>
        )}

        <span id="clean-recipient-help" style={{ fontSize: "11px", color: "var(--color-muted)", lineHeight: 1.45 }}>
          {APP_CHAIN_ID === TESTNET_CHAIN_ID
            ? "The withdraw call carries no depositor address. Unlinkable withdrawal with client-side Groth16 ZK-SNARK verification."
            : "The withdraw call carries no depositor address. Provisional verifier for old notes only — Groth16 on 0xbow paths."}
        </span>
      </div>

      {needsBackupAck && notes.length > 0 && (
        <div
          role="alert"
          style={{
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(180, 35, 24, 0.06)",
            border: "1px solid rgba(180, 35, 24, 0.3)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "12px", color: "#b42318", fontWeight: 600, lineHeight: 1.5 }}>
            This note has no recorded backup. Withdrawing without one risks permanent loss.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onBackupNow}
              className="lp-btn lp-btn--outline"
              style={{
                padding: "6px 12px",
                minHeight: "28px",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back up now
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--color-text)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={ackNoBackup}
                onChange={(e) => setAckNoBackup(e.target.checked)}
              />
              I backed it up elsewhere, proceed
            </label>
          </div>
        </div>
      )}

      <button
        onClick={onWithdraw}
        disabled={ctaDisabled}
        className={ctaDisabled ? "opacity-45 cursor-not-allowed" : "lp-btn lp-btn--accent"}
        style={{
          width: "100%",
          minHeight: "3.25rem",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--text-body)",
          fontWeight: 700,
          cursor: ctaDisabled ? "not-allowed" : "pointer",
          ...(ctaDisabled ? {
            backgroundColor: "rgba(255, 140, 0, 0.2)",
            color: "var(--color-muted)",
            border: "1px solid var(--color-border)",
            boxShadow: "none",
          } : {}),
        }}
      >
        <span>{isExecuting ? "Synthesizing Proof & Broadcasting..." : "Prove & Withdraw via Self-Relay"}</span>
      </button>
    </div>
  );
};

export default WithdrawPanel;
