"use client";

import React from "react";
import Link from "next/link";
import { Header } from "./Header";
import { DecodeText } from "./DecodeText";
import { HeroContractAddress } from "./HeroContractAddress";

export const HeroSection: React.FC = () => {
  return (
    <section
      id="hero"
      style={{
        position: "relative",
        overflow: "visible",
        background: "transparent",
        color: "var(--color-text)",
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Header inside hero section */}
      <Header />

      {/* Particle home anchor at center 50%, top 42% (DO NOT REMOVE: preserves 3D particle animation) */}
      <div
        data-hero-particle-home="true"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
      />

      {/* Massive Display Title */}
      <div
        className="hero-enter"
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 var(--page-gutter)",
          marginTop: "var(--space-2)",
          flexShrink: 0,
          animationDelay: "80ms",
        }}
      >
        <div
          style={{
            margin: 0,
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            gap: "var(--space-6)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "var(--text-display)",
              lineHeight: "var(--leading-display)",
              fontWeight: "var(--font-weight-regular)" as any,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            <DecodeText text="private" autoPlay={true} />
          </span>

          <span
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "var(--text-display)",
              lineHeight: "var(--leading-display)",
              fontWeight: "var(--font-weight-regular)" as any,
              letterSpacing: "-0.02em",
              margin: 0,
              textAlign: "right",
            }}
          >
            <DecodeText text="execution" autoPlay={true} />
          </span>
        </div>
      </div>

      {/* Bottom Area: Subhead, CTAs & Social Proof */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "var(--space-8)",
          padding: "var(--space-6) var(--page-gutter) var(--space-8)",
        }}
      >
        {/* Subhead & CTAs */}
        <div
          className="hero-enter"
          style={{
            maxWidth: "min(100%, 46rem)",
            animationDelay: "160ms",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-body)",
              fontWeight: "var(--font-weight-regular)" as any,
              fontSize: "var(--text-intro)",
              lineHeight: "var(--leading-intro)",
              color: "var(--color-text)",
              maxWidth: "34rem",
              overflowWrap: "break-word",
            }}
          >
            Self-custodial confidential transfers built on Solana Privacy Rings, with a Quantum Vault building toward quantum-resilient viewing-key protection using hybrid ML-KEM-768.
          </h1>

          <div
            style={{
              marginTop: "var(--space-2)",
              fontFamily: "monospace",
              fontSize: "var(--text-caption)",
              color: "var(--color-muted)",
              letterSpacing: "0.04em",
              maxWidth: "34rem",
            }}
          >
            SOL · USDC · SPL / Token-2022. Viewing keys encrypted with X-Wing.
          </div>

          {/* Official Token Contract Address (Full, Uncut, 1-Click Copy & Quick Links) */}
          <HeroContractAddress />

          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              flexWrap: "wrap",
              marginTop: "var(--space-5)",
            }}
          >
            <Link
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
            </Link>

            <Link
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
            </Link>
          </div>
        </div>

        {/* Logos / Social Proof */}
        <div
          className="hero-enter"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            animationDelay: "240ms",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "clamp(var(--space-6), 4vw, var(--space-10))",
              minWidth: 0,
            }}
          >
            {/* Left: Built on Solana (Solid Black Monochrome) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-caption)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--color-faint)",
                }}
              >
                Built on
              </span>
              <img
                className="lp-logo"
                src="/assets/logo/solana-black.svg"
                alt="Solana"
                style={{
                  height: "calc(1.35 * clamp(20px, 2vw, 30px))",
                  width: "auto",
                  display: "block",
                  opacity: 0.85,
                  flexShrink: 0,
                }}
              />
            </div>

            {/* Right: Privacy Rings Audited By (Solid Black Monochrome) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                flexShrink: 0,
                marginLeft: "auto",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-caption)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--color-faint)",
                  textAlign: "right",
                }}
              >
                Privacy Rings Audited By
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(var(--space-5), 3vw, var(--space-8))",
                  flexWrap: "nowrap",
                }}
              >
                {/* Certora (Black) */}
                <img
                  className="lp-logo"
                  src="/assets/logo/certora.png"
                  alt="Certora"
                  style={{
                    height: "calc(1.3 * clamp(20px, 2vw, 30px))",
                    width: "auto",
                    display: "block",
                    opacity: 0.85,
                    flexShrink: 0,
                  }}
                />

                {/* OtterSec (Black) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: 0.85,
                    flexShrink: 0,
                  }}
                >
                  <img
                    src="/assets/logo/ottersec.png"
                    alt="OtterSec"
                    style={{
                      height: "calc(1.2 * clamp(20px, 2vw, 30px))",
                      width: "auto",
                      display: "block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      color: "#000000",
                      fontFamily: "var(--font-headline, sans-serif)",
                      lineHeight: 1,
                    }}
                  >
                    OtterSec
                  </span>
                </div>

                {/* zkSecurity (Black) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: 0.85,
                    flexShrink: 0,
                  }}
                >
                  <img
                    className="lp-logo"
                    src="/assets/logo/zksecurity.svg"
                    alt="zkSecurity"
                    style={{
                      height: "calc(1.25 * clamp(20px, 2vw, 30px))",
                      width: "auto",
                      display: "block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      color: "#000000",
                      fontFamily: "var(--font-headline, sans-serif)",
                      lineHeight: 1,
                    }}
                  >
                    zkSecurity
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
