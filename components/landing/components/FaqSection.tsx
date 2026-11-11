"use client";

import React, { useState } from "react";
import { SectionHeader } from "./SectionHeader";
import { RevealBox } from "./RevealBox";

interface FaqItem {
  q: string;
  a: string;
}

const faqItems: FaqItem[] = [
  {
    q: "What does Zolius Vault hide and what remains visible on-chain?",
    a: "Under the default Solana Privacy Ring, token balances, transferred amounts, and transfer memos are fully encrypted and confidential. Note: Sender and recipient addresses remain visible on-chain. Deposit and withdrawal events are also public on-chain.",
  },
  {
    q: "What is Zolius Vault's relationship with Helius?",
    a: "Zolius Vault is an independent project built on the open Solana Privacy Rings protocol and uses the Helius Privacy API for RPC, indexer, and prover infrastructure. Zolius Vault is not affiliated with or endorsed by Helius.",
  },
  {
    q: "How does the Quantum Vault protect viewing keys?",
    a: "While on-chain transactions verify Groth16 zk-SNARKs, Quantum Vault is an off-chain layer that secures your viewing keys and transaction notes with hybrid post-quantum cryptography (X25519 + ML-KEM-768 / X-Wing), protecting against future 'harvest now, decrypt later' threats.",
  },
  {
    q: "Can anyone freeze or censor my confidential funds?",
    a: "Zolius Vault is completely self-custodial: every confidential transfer and withdrawal requires your wallet's cryptographic signature. Withdrawals cannot be frozen or stopped by any intermediary.",
  },
  {
    q: "I have funds in the legacy Veil pool. How do I migrate?",
    a: "Veil pool deposits on the legacy chain have been paused, but withdrawals remain open permanently with no expiration. Visit our /migrate portal to execute a zero-custody withdrawal and move assets to Solana Zolius Vault.",
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" style={{ padding: "var(--section-y) var(--page-gutter)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
      >
        <div>
          <SectionHeader
            kicker="FAQ"
            title="Frequently asked questions."
            titleMaxW="14ch"
            kickerColor="#FF8C00"
          />
        </div>

        <RevealBox y={24} delay={50} style={{ minWidth: 0, gridColumn: "span 2" }}>
          <div>
            {faqItems.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={i}
                  style={{
                    borderBottom: "var(--border-thin) solid var(--color-hairline)",
                    padding: "var(--space-4) 0",
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className="lp-acc-summary"
                    onClick={() => toggleItem(i)}
                    style={{
                      width: "100%",
                      appearance: "none",
                      background: "none",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "var(--space-4)",
                      fontFamily: "var(--font-headline)",
                      fontSize: "var(--text-h4)",
                      lineHeight: 1.2,
                    }}
                  >
                    <span style={{ flex: 1 }}>{item.q}</span>
                    <span
                      className="lp-acc-mark"
                      data-open={isOpen ? "true" : "false"}
                      style={{
                        fontFamily: "var(--font-body)",
                        color: "#FF8C00",
                        display: "inline-block",
                        flexShrink: 0,
                        fontSize: "1.25rem",
                      }}
                    >
                      +
                    </span>
                  </button>
                  <div className="lp-acc-panel" data-open={isOpen ? "true" : "false"}>
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "var(--text-body)",
                          lineHeight: "var(--leading-body)",
                          color: "var(--color-muted)",
                          marginTop: "var(--space-3)",
                          maxWidth: "48ch",
                        }}
                      >
                        {item.a}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </RevealBox>
      </div>
    </section>
  );
};
