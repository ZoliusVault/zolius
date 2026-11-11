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
    q: "Which assets and network does this app support?",
    a: "Zolius is built for Solana, with confidential SOL flows at its core and an expanding vision across digital assets and private finance.",
  },
  {
    q: "Can I send a private payment to any address?",
    a: "The recipient needs a Privacy Ring registration to receive a private transfer. Withdraw to a public Solana address if it is not registered.",
  },
  {
    q: "What is the Quantum Vault vision?",
    a: "Quantum Vault is Zolius's post-quantum direction for viewing-key protection, combining X25519 with ML-KEM-768 (X-Wing) to address harvest-now-decrypt-later threats. The cryptographic design is described in the Quantum Vault roadmap.",
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
