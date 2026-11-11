"use client";

import React from "react";
import { ParticleCanvas } from "./ParticleCanvas";
import { DecodeText } from "./DecodeText";
import { RevealBox } from "./RevealBox";

export const CtaSection: React.FC = () => {
  return (
    <section
      id="demo"
      className="cta-cycle"
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#F9DEF3",
        color: "var(--color-text)",
        marginTop: "var(--section-y)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "0 var(--page-gutter)",
        boxSizing: "border-box",
      }}
    >
      <div
        className="particle-drift"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "72%",
          top: "45%",
          transform: "translate(-50%, -50%)",
          width: "clamp(28.8rem, 61.2vw, 61.2rem)",
          height: "clamp(28.8rem, 61.2vw, 61.2rem)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <ParticleCanvas
          config={{
            particleCount: 5200,
            maxPixelRatio: 1.5,
            fitMargin: 0.85,
            spawnDuration: 1.2,
          }}
        />
      </div>

      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          alignItems: "center",
          minHeight: 0,
        }}
      >
        <RevealBox y={28} style={{ position: "relative", zIndex: 1, maxWidth: "36rem" }}>
          <h2
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "var(--text-h1)",
              lineHeight: "var(--leading-h1)",
              fontWeight: "var(--font-weight-regular)" as any,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "var(--color-text)",
            }}
          >
            <DecodeText
              segments={[
                { text: "Ready to trade with " },
                { text: "true zero-knowledge privacy?", style: { fontFamily: "var(--font-body)" } },
              ]}
            />
          </h2>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-intro)",
              lineHeight: "var(--leading-intro)",
              color: "var(--color-text)",
              margin: "var(--space-5) 0 0",
            }}
          >
            Audited core on-chain. Non-custodial by design. Experience self-custodial confidential transfers built on Solana Privacy Rings.
          </p>
          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              marginTop: "var(--space-6)",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/app"
              className="lp-btn lp-btn--filled"
              style={{
                fontSize: "var(--text-body-lg)",
                minHeight: "3rem",
                padding: "0 var(--space-5)",
              }}
            >
              Launch Vault
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M1 6H10.4M6.2 1.8L10.4 6L6.2 10.2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </a>
            <a
              href="/contracts"
              className="lp-btn lp-btn--outline"
              style={{
                fontSize: "var(--text-body-lg)",
                minHeight: "3rem",
                padding: "0 var(--space-5)",
              }}
            >
              View Programs
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M1 6H10.4M6.2 1.8L10.4 6L6.2 10.2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </a>
          </div>
        </RevealBox>
      </div>
    </section>
  );
};
