"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Is Dark ETF live?",
    a: "Not yet — this page is an announcement. Join the waitlist and we will notify you when early access opens.",
  },
  {
    q: "Which assets are supported?",
    a: "SPL and Token-2022 assets on Solana. The final whitelisted asset registry will be announced at launch.",
  },
  {
    q: "Who can use it?",
    a: "Access follows Stock Token jurisdictional limits. Strictly not available to U.S. persons or restricted territories.",
  },
  {
    q: "Is this an investment fund?",
    a: "No. Each basket is owned and controlled solely by a single user. There is no pooled fund management, no custodial intermediary, and no collective vehicle.",
  },
];

export const FaqAccordion: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div
            key={item.q}
            style={{
              borderRadius: "var(--radius-sm)",
              border: isOpen ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
              backgroundColor: isOpen ? "rgba(255, 140, 0, 0.02)" : "#ffffff",
              transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              aria-expanded={isOpen}
              style={{
                width: "100%",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                border: "none",
                background: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flex: 1 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: isOpen ? "var(--color-accent)" : "var(--color-muted)",
                    marginTop: "2px",
                    flexShrink: 0,
                  }}
                >
                  Q0{idx + 1}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-headline)",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--color-text)",
                    lineHeight: 1.35,
                  }}
                >
                  {item.q}
                </span>
              </div>
              <ChevronDown
                size={15}
                style={{
                  color: isOpen ? "var(--color-accent)" : "var(--color-muted)",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              />
            </button>

            {isOpen && (
              <div
                className="pl-3.5 sm:pl-[34px] pr-3.5 pb-3.5 pt-0"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: "var(--color-muted)",
                  animation: "tabContentEnter 200ms ease forwards",
                }}
              >
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FaqAccordion;
