"use client";

import React from "react";
import { SectionHeader } from "./SectionHeader";
import { RevealBox } from "./RevealBox";

export const HowItWorksSection: React.FC = () => {
  return (
    <section
      id="how"
      style={{
        padding: "var(--section-y) var(--page-gutter)",
        overflow: "hidden",
      }}
    >
      <SectionHeader
        kicker="Architecture"
        title="Private execution for Solana."
        titleMaxW="22ch"
        kickerColor="#FF8C00"
      />

      <RevealBox
        y={24}
        stagger={100}
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}
      >
        {/* Step 1 */}
        <div>
          <div style={{ minWidth: 0 }}>
            <div
              aria-hidden="true"
              style={{
                width: "24%",
                marginLeft: "0%",
                height: "var(--space-3)",
                background: "#FF80E2",
                borderRadius: "var(--radius-full)",
              }}
            />
            <div
              style={{
                marginLeft: "0%",
                marginTop: "10px",
                fontFamily: "var(--font-headline)",
                fontSize: "var(--text-h3)",
                lineHeight: 1.1,
              }}
            >
              <span style={{ fontFamily: "var(--font-body)", color: "#FF80E2" }}>
                Phase 1:{" "}
              </span>
              <span>Deposit &amp; Blind</span>
            </div>
            <p
              style={{
                marginLeft: "0%",
                marginTop: "8px",
                marginRight: 0,
                marginBottom: 0,
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                lineHeight: "var(--leading-body)",
                color: "var(--color-muted)",
                maxWidth: "40ch",
              }}
            >
              Deposit native SOL from your connected wallet. The deposit and amount are public; the resulting Ring balance is private.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div>
          <div style={{ minWidth: 0 }}>
            <div
              aria-hidden="true"
              style={{
                width: "38%",
                marginLeft: "24%",
                height: "var(--space-3)",
                background: "#FFAA00",
                borderRadius: "var(--radius-full)",
              }}
            />
            <div
              style={{
                marginLeft: "24%",
                marginTop: "10px",
                fontFamily: "var(--font-headline)",
                fontSize: "var(--text-h3)",
                lineHeight: 1.1,
              }}
            >
              <span style={{ fontFamily: "var(--font-body)", color: "#FFAA00" }}>
                Phase 2:{" "}
              </span>
              <span>Confidential Transfer</span>
            </div>
            <p
              style={{
                marginLeft: "24%",
                marginTop: "8px",
                marginRight: 0,
                marginBottom: 0,
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                lineHeight: "var(--leading-body)",
                color: "var(--color-muted)",
                maxWidth: "40ch",
              }}
            >
              Send private SOL to a wallet registered with Privacy Rings. The amount is confidential while sender and recipient addresses remain public.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div>
          <div style={{ minWidth: 0 }}>
            <div
              aria-hidden="true"
              style={{
                width: "48%",
                marginLeft: "52%",
                height: "var(--space-3)",
                background: "#FF6A7B",
                borderRadius: "var(--radius-full)",
              }}
            />
            <div
              style={{
                marginLeft: "52%",
                marginTop: "10px",
                fontFamily: "var(--font-headline)",
                fontSize: "var(--text-h3)",
                lineHeight: 1.1,
              }}
            >
              <span style={{ fontFamily: "var(--font-body)", color: "#FF6A7B" }}>
                Phase 3:{" "}
              </span>
              <span>Withdraw</span>
            </div>
            <p
              style={{
                marginLeft: "52%",
                marginTop: "8px",
                marginRight: 0,
                marginBottom: 0,
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body)",
                lineHeight: "var(--leading-body)",
                color: "var(--color-muted)",
                maxWidth: "40ch",
              }}
            >
              Withdraw private SOL to a public Solana address. The wallet signs the transaction and the destination and amount are visible on-chain.
            </p>
            <a
              href="/app"
              className="lp-how-link"
              style={{
                marginLeft: "52%",
                marginTop: "var(--space-4)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body-sm)",
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                color: "var(--color-text)",
                textDecoration: "underline",
              }}
            >
              <span className="lp-how-link-label">
                Open the Vault
              </span>
              <span className="lp-how-link-arrow" aria-hidden="true">
                →
              </span>
            </a>
          </div>
        </div>
      </RevealBox>
    </section>
  );
};
