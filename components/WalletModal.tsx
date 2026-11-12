"use client";

import React, { useEffect, useState } from "react";
import { X, ExternalLink, Check, AlertCircle } from "lucide-react";
import { ModalWrapper } from "./ModalWrapper";
import {
  SOLANA_WALLETS,
  connectSolana,
  detectSolana,
  walletLabel,
  onWalletsChanged,
  type SolanaWalletId,
} from "@/lib/wallets";

export function WalletModal({
  open,
  onClose,
  onPick,
  ariaLabel = "Connect a Solana wallet",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: SolanaWalletId, address: string) => void;
  ariaLabel?: string;
}) {
  const [detected, setDetected] = useState<SolanaWalletId[]>([]);
  const [pending, setPending] = useState<SolanaWalletId | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr("");
    setPending(null);

    const refresh = () => {
      setDetected(
        (SOLANA_WALLETS.map((w) => w.id) as SolanaWalletId[]).filter((id) => detectSolana(id) !== null)
      );
    };

    refresh();
    const unsub = onWalletsChanged(refresh);
    const t1 = setTimeout(refresh, 80);
    const t2 = setTimeout(refresh, 300);

    return () => {
      unsub();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open]);

  async function pick(id: SolanaWalletId) {
    setErr("");
    setPending(id);
    try {
      const { address } = await connectSolana(id);
      onPick(id, address);
      onClose();
    } catch (e: unknown) {
      setErr(walletLabel(e));
    } finally {
      setPending(null);
    }
  }

  return (
    <ModalWrapper
      isOpen={open}
      onClose={onClose}
      maxWidth="540px"
      ariaLabel={ariaLabel}
      contentStyle={{
        padding: "24px 28px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        backgroundColor: "#ffffff",
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontFamily: "var(--font-headline)",
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            Connect Solana Wallet
          </h2>
          <span
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              color: "var(--color-accent-ink)",
              backgroundColor: "rgba(255, 140, 0, 0.1)",
              border: "1px solid rgba(255, 140, 0, 0.25)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
            }}
          >
            Solana Mainnet
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="lp-btn lp-btn--outline"
          style={{
            padding: "6px",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={15} />
        </button>
      </div>

      <p
        style={{
          fontSize: "13px",
          color: "var(--color-muted)",
          margin: 0,
          lineHeight: "1.5",
        }}
      >
        Connect a Solana wallet to register its Privacy Ring identity, shield SOL, send private payments, and withdraw funds.
      </p>

      {/* Wallet Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
        {SOLANA_WALLETS.map((w) => {
          const installed = detected.includes(w.id);
          const busy = pending === w.id;

          return (
            <button
              key={w.id}
              type="button"
              onClick={() => pick(w.id)}
              disabled={busy}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px",
                borderRadius: "var(--radius-md)",
                border: installed ? "1px solid var(--color-border-strong)" : "1px solid var(--color-border)",
                backgroundColor: installed ? "#ffffff" : "rgba(26, 26, 26, 0.02)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all var(--duration-fast)",
                boxShadow: installed ? "0 2px 6px rgba(26, 26, 26, 0.04)" : "none",
              }}
              className="hover:border-[#FF8C00] hover:bg-white"
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--color-border)",
                }}
              >
                <img
                  src={w.icon}
                  alt={w.name}
                  style={{ width: "28px", height: "28px", objectFit: "contain" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily: "var(--font-headline)",
                      color: "var(--color-text)",
                    }}
                  >
                    {w.name}
                  </span>
                  {installed && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: "4px",
                        backgroundColor: "rgba(16, 185, 129, 0.12)",
                        color: "#059669",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                      }}
                    >
                      Detected
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--color-muted)",
                    marginTop: "2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {installed ? "Ready to connect" : "Install extension"}
                </div>
              </div>

              {busy ? (
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid var(--color-accent)",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              ) : !installed ? (
                <ExternalLink size={14} style={{ color: "var(--color-faint)", flexShrink: 0 }} />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Error Notice */}
      {err && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "var(--color-danger-ink)",
            fontSize: "12px",
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{err}</span>
        </div>
      )}

      {/* Security note */}
      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          paddingTop: "12px",
          fontSize: "11px",
          color: "var(--color-muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span>Hardware wallets (Ledger via Solflare / Phantom) supported.</span>
        <a
          href="https://solana.com/wallets"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--color-accent-ink)", textDecoration: "none", fontWeight: 600 }}
        >
          Solana Wallet Guide →
        </a>
      </div>
    </ModalWrapper>
  );
}
