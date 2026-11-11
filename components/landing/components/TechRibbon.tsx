"use client";

import React from "react";

const SPEC_ITEMS = [
  "SOLANA MAINNET-BETA",
  "SOLANA PRIVACY RINGS (ring1GaL...)",
  "HYBRID ML-KEM-768 QUANTUM VAULT",
  "X-WING BACKUP ENCRYPTION",
  "SELF-CUSTODIAL CONFIDENTIAL TRANSFERS",
  "TOKEN-2022 CONFIDENTIAL TRANSFERS",
  "AUDITED CORE (CERTORA · OTTERSEC · ZKSECURITY)",
  "HELIUS PRIVACY API INTEGRATION",
  "CLIENT-SIDE ZERO-KNOWLEDGE PROOFS",
  "CONFIDENTIAL TIMELOCK ESCROW",
];

export const TechRibbon: React.FC = () => {
  return (
    <aside
      aria-label="Protocol Specifications & Cryptographic Primitives"
      style={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        overflow: "hidden",
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        background: "transparent",
        padding: "10px 0",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Left fixed badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 var(--space-4)",
          background: "transparent",
          zIndex: 3,
          flexShrink: 0,
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 10px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "rgba(26, 26, 26, 0.04)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--color-text)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Primitives
          </span>
        </div>
      </div>

      {/* Overflow mask & Marquee track */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          maskImage: "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
        }}
      >
        <div className="tech-marquee-track">
          {[...SPEC_ITEMS, ...SPEC_ITEMS].map((item, idx) => (
            <div
              key={idx}
              className="group cursor-default transition-colors duration-150"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-4)",
                paddingRight: "var(--space-6)",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "12px",
                color: "var(--color-muted)",
                letterSpacing: "0.04em",
                fontWeight: 500,
              }}
            >
              <span className="group-hover:text-[var(--color-text)] transition-colors">
                {item}
              </span>
              <span
                style={{
                  color: "var(--color-brand)",
                  opacity: 0.85,
                  fontSize: "9px",
                  userSelect: "none",
                }}
              >
                ◈
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default TechRibbon;
