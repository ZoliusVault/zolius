"use client";

import React from "react";
import { Shield, KeyRound, Zap } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { RevealBox } from "./RevealBox";

export const FlywheelBurnSection: React.FC = () => {
  return (
    <section id="flywheel" style={{ padding: "var(--section-y) var(--page-gutter)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <SectionHeader
          kicker="Quantum Vault Architecture"
          title="Hybrid post-quantum protection for your viewing keys."
          sub="On-chain Privacy Rings encrypt your balances using Groth16. Quantum Vault secures the viewing keys that unlock your data off-chain using hybrid X25519 + ML-KEM-768 (X-Wing)."
          titleMaxW="26ch"
          kickerColor="#FF8C00"
        />

        <RevealBox y={24}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {/* Feature 1 */}
            <div
              style={{
                padding: "24px",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-panel)",
                boxShadow: "0 6px 20px -4px rgba(26, 26, 26, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(255, 140, 0, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-accent)",
                    flexShrink: 0,
                  }}
                >
                  <Shield size={18} strokeWidth={1.75} />
                </div>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-headline)" }}>
                  Encrypted Vault Backups
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.06em",
                    padding: "3px 8px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(255, 140, 0, 0.12)",
                    color: "var(--color-accent)",
                    border: "1px solid rgba(255, 140, 0, 0.25)",
                    fontWeight: 700,
                  }}
                >
                  LIVE
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: 1.6, fontFamily: "var(--font-body)" }}>
                Account metadata and viewing keys are encrypted to your deterministic Vault key (<code style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>ZOLIUS/vault/v1</code>) and stored locally or backed up to IPFS.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              style={{
                padding: "24px",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-panel)",
                boxShadow: "0 6px 20px -4px rgba(26, 26, 26, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(255, 140, 0, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-accent)",
                    flexShrink: 0,
                  }}
                >
                  <KeyRound size={18} strokeWidth={1.75} />
                </div>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-headline)" }}>
                  Selective Auditor Sharing
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.06em",
                    padding: "3px 8px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(255, 140, 0, 0.12)",
                    color: "var(--color-accent)",
                    fontWeight: 700,
                  }}
                >
                  BUILDING
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: 1.6, fontFamily: "var(--font-body)" }}>
                Share read-only transaction history with your accountant or auditor. Viewing keys are encapsulated to the recipient’s X-Wing public key with expiration and revocation controls.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              style={{
                padding: "24px",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-panel)",
                boxShadow: "0 6px 20px -4px rgba(26, 26, 26, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(255, 140, 0, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-accent)",
                    flexShrink: 0,
                  }}
                >
                  <Zap size={18} strokeWidth={1.75} />
                </div>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", fontFamily: "var(--font-headline)" }}>
                  $ZOLIUS Fee &amp; Burn Engine
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.06em",
                    padding: "3px 8px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(255, 140, 0, 0.12)",
                    color: "var(--color-accent)",
                    fontWeight: 700,
                  }}
                >
                  PLANNED
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: 1.6, fontFamily: "var(--font-body)" }}>
                Protocol fees from confidential swaps and timelocks flow into a multisig treasury (Squads), supporting autonomous buybacks and burns of the $ZOLIUS SPL token on Solana.
              </p>
            </div>
          </div>
        </RevealBox>

        {/* Cryptographic Standard Callout */}
        <RevealBox y={20}>
          <div
            style={{
              padding: "20px",
              borderRadius: "14px",
              border: "1px solid var(--color-border)",
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 16px rgba(26, 26, 26, 0.04)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>
                Cryptographic Standard: IETF draft X-Wing KEM
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-faint)", marginTop: "4px" }}>
                Combines classical X25519 (ECDH) with NIST-standardized ML-KEM-768 (Kyber) via noble-post-quantum.
              </div>
            </div>
            <a
              href="/quantum"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--color-accent)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              Explore Quantum Roadmap ↗
            </a>
          </div>
        </RevealBox>
      </div>
    </section>
  );
};
