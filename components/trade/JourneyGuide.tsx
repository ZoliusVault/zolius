"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  ChevronDown,
  ChevronUp,
  Shield,
  ArrowLeftRight,
  ArrowUpRight,
  Wallet,
  ArrowRight,
} from "lucide-react";

export type JourneyTab = "buy_and_shield" | "shielded_swap" | "withdraw" | "trade" | "vault";

export interface JourneyGuideProps {
  activeTab: JourneyTab;
  onTab: (tab: JourneyTab) => void;
  notesCount: number;
  attested: boolean | null;
  showTraderEntry: boolean;
  onTradeEntry: () => void;
}

interface Step {
  id: JourneyTab;
  num: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

const STEPS: Step[] = [
  {
    id: "buy_and_shield",
    num: "1",
    title: "Shield",
    desc: "Deposit ETH or VEIL & mint note",
    icon: Shield,
  },
  {
    id: "shielded_swap",
    num: "2",
    title: "ZK Swap",
    desc: "Private trade via v4 pool",
    icon: ArrowLeftRight,
  },
  {
    id: "withdraw",
    num: "3",
    title: "Withdraw",
    desc: "Exit to fresh address",
    icon: ArrowUpRight,
  },
  {
    id: "vault",
    num: "4",
    title: "Vault",
    desc: "Manage notes & proofs",
    icon: Wallet,
  },
];

export const JourneyGuide: React.FC<JourneyGuideProps> = ({
  activeTab,
  onTab,
  notesCount,
  attested,
  showTraderEntry,
  onTradeEntry,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("veil_journey_guide_collapsed");
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch {
      // Ignore localStorage access issues
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("veil_journey_guide_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        backgroundColor: "rgba(26, 26, 26, 0.02)",
        border: "1px solid var(--color-border)",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        transition: "all var(--duration-fast) var(--ease-out)",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Compass size={13} style={{ color: "var(--color-accent-ink)", flexShrink: 0 }} />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--color-text)",
              fontFamily: "var(--font-mono)",
            }}
          >
            How Zolius Works
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            · 4 Steps
          </span>
          {notesCount > 0 && (
            <span
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "var(--color-muted)",
                backgroundColor: "rgba(26, 26, 26, 0.05)",
                padding: "1px 6px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {notesCount} note{notesCount > 1 ? "s" : ""} in vault
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isCollapsed && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--color-muted)",
              }}
              className="hidden sm:flex"
            >
              {STEPS.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    onClick={() => onTab(s.id)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "1px 4px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: activeTab === s.id ? "var(--color-accent-ink)" : "var(--color-muted)",
                      fontWeight: activeTab === s.id ? 700 : 400,
                    }}
                  >
                    {s.num}. {s.title}
                  </button>
                  {idx < STEPS.length - 1 && <span style={{ opacity: 0.3 }}>→</span>}
                </React.Fragment>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={toggleCollapse}
            aria-expanded={!isCollapsed}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              background: "none",
              border: "none",
              padding: "2px 6px",
              fontSize: "11px",
              color: "var(--color-muted)",
              cursor: "pointer",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {isCollapsed ? "Show" : "Hide"}
            {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>
      </div>

      {/* Expanded 4-Step Track */}
      {!isCollapsed && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: "6px",
            }}
          >
            {STEPS.map((step) => {
              const isActive = activeTab === step.id;
              const IconComp = step.icon;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onTab(step.id)}
                  aria-current={isActive ? "true" : undefined}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                    border: isActive
                      ? "1px solid var(--color-accent)"
                      : "1px solid var(--color-border)",
                    boxShadow: isActive ? "0 1px 4px rgba(255, 140, 0, 0.08)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all var(--duration-fast) var(--ease-out)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      marginBottom: "3px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: isActive ? "var(--color-accent-ink)" : "var(--color-muted)",
                      }}
                    >
                      {step.num}
                    </span>
                    <IconComp
                      size={12}
                      style={{
                        color: isActive ? "var(--color-accent-ink)" : "var(--color-muted)",
                        opacity: isActive ? 1 : 0.6,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--color-text)",
                      lineHeight: 1.2,
                    }}
                  >
                    {step.title}
                  </div>

                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--color-muted)",
                      marginTop: "2px",
                      lineHeight: 1.3,
                      opacity: 0.85,
                    }}
                  >
                    {step.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Minimal Context Bar */}
          {(showTraderEntry || notesCount > 0 || attested) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "4px",
                borderTop: "1px solid var(--color-hairline)",
                fontSize: "11px",
                color: "var(--color-muted)",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              <div>
                {notesCount > 0 ? (
                  <span>
                    You have {notesCount} private note{notesCount > 1 ? "s" : ""} in vault.
                  </span>
                ) : (
                  <span>Deposit ETH or VEIL in Step 1 to generate your first private note.</span>
                )}
                {attested === true && (
                  <span style={{ marginLeft: "4px", fontWeight: 600, color: "var(--color-text)" }}>
                    · Attestation verified
                  </span>
                )}
              </div>

              {showTraderEntry && (
                <button
                  type="button"
                  onClick={onTradeEntry}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--color-accent-ink)",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    marginLeft: "auto",
                  }}
                >
                  Gated Pool <ArrowRight size={11} />
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JourneyGuide;
