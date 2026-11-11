import type { Metadata } from "next";
import { Suspense } from "react";
import { ComposerDemo } from "../../components/dark-etf/ComposerDemo";
import { WaitlistForm } from "../../components/dark-etf/WaitlistForm";
import { TickerHeroGrid } from "../../components/dark-etf/TickerHeroGrid";
import { FaqAccordion } from "../../components/dark-etf/FaqAccordion";
import { SolanaLogoMark } from "../../components/TokenLogos";
import { Shield, ArrowRight, AlertTriangle, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Zolius Dark ETF — Coming Soon",
  description:
    "Build a private basket of tokens on Solana. Hold it shielded in privacy vaults, rebalance in the dark.",
  alternates: { canonical: "https://zolius.vault/dark-etf" },
  openGraph: {
    title: "Zolius Dark ETF — Coming Soon",
    description:
      "Build a private basket of tokens on Solana. Hold it shielded in privacy vaults, rebalance in the dark.",
    url: "https://zolius.vault/dark-etf",
    siteName: "Zolius Protocol",
    images: [{ url: "/dark-etf/opengraph-image", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@zoliusvault",
    title: "Zolius Dark ETF — Coming Soon",
    description:
      "Build a private basket of tokens on Solana. Hold it shielded in privacy vaults, rebalance in the dark.",
    images: ["/dark-etf/opengraph-image"],
  },
};

export default function DarkEtfPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", width: "100%" }}>
      {/* 1. EDITORIAL HEADER (Standardized with /trade and /contracts) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          paddingBottom: "var(--space-5)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-muted)",
              marginBottom: "var(--space-2)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(26, 26, 26, 0.05)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                fontWeight: 600,
              }}
            >
              <SolanaLogoMark size={13} />
              SOLANA MAINNET-BETA
            </span>
            <span>// Confidential Stock Baskets</span>
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-headline)",
              fontSize: "clamp(1.75rem, 3.6vw, 2.75rem)",
              lineHeight: 1.15,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
              fontWeight: 600,
            }}
          >
            Your own ETF. Nobody sees what&apos;s inside.
          </h1>

          <p
            style={{
              margin: "var(--space-2) 0 0 0",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body-sm)",
              color: "var(--color-muted)",
              maxWidth: "720px",
              lineHeight: "1.6",
            }}
          >
            Build a private basket of tokens on Solana. Hold it shielded in privacy vaults, rebalance in the dark.
            Atomic settlement with Solana Privacy Rings batching.
          </p>

          {/* Quick Hero Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 mt-4 w-full sm:w-auto">
            <a
              href="#waitlist"
              className="lp-btn lp-btn--accent w-full sm:w-auto justify-center"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 22px",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <span>Join the Waitlist</span>
              <ArrowRight size={14} />
            </a>

            <a
              href="#composer"
              className="lp-btn lp-btn--outline w-full sm:w-auto justify-center"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "11px 18px",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <span>Try Composer Demo</span>
            </a>

            <a
              href="#how"
              className="lp-btn lp-btn--outline w-full sm:w-auto justify-center"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "11px 16px",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <span>How it Works</span>
            </a>
          </div>
        </div>

        {/* Technical Architecture Specs without random dots */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs font-mono text-[var(--color-muted)] mt-1 sm:mt-0">
          <span>Stock Tokens</span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span>Groth16 ZK-SNARK</span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span>Solana Privacy Rings</span>
        </div>
      </div>

      {/* 2. INTERACTIVE HERO STOCK TOKEN MARQUEE / GRID */}
      <TickerHeroGrid />

      {/* 3. PRO WORKSTATION GRID (2-Column Pro DEX Layout matching /trade: 7 Cols : 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Left Column (lg:col-span-7) — Interactive Workstation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="lg:col-span-7">
          {/* Card A: Interactive Basket Composer Simulation */}
          <div
            id="composer"
            className="veil-card-white p-4 sm:p-6"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-strong)",
              boxShadow: "0 12px 36px -8px rgba(26, 26, 26, 0.08)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: "4px",
                  fontWeight: 600,
                }}
              >
                [01 // INTERACTIVE SIMULATION]
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-headline)",
                  fontSize: "1.45rem",
                  fontWeight: 600,
                  color: "var(--color-text)",
                }}
              >
                Try the Basket Composer
              </h2>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  color: "var(--color-muted)",
                  lineHeight: 1.5,
                }}
              >
                Adjust allocation sliders dynamically and test the 4-stage zero-knowledge shielding process.
              </p>
            </div>

            <ComposerDemo />
          </div>

          {/* Card B: Three-Stage Architecture */}
          <div
            id="how"
            className="veil-card-white p-4 sm:p-6"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-strong)",
              boxShadow: "0 12px 36px -8px rgba(26, 26, 26, 0.08)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: "4px",
                  fontWeight: 600,
                }}
              >
                [02 // THREE-STAGE ARCHITECTURE]
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-headline)",
                  fontSize: "1.45rem",
                  fontWeight: 600,
                  color: "var(--color-text)",
                }}
              >
                How Dark ETF Operates
              </h2>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  color: "var(--color-muted)",
                  lineHeight: 1.5,
                }}
              >
                Private portfolio construction and rebalancing designed for confidential institutional execution.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  step: "01",
                  title: "Compose",
                  desc: "Pick Stock Tokens and customize your target weights. Fully custom baskets with no fund manager constraints.",
                },
                {
                  step: "02",
                  title: "Shield",
                  desc: "Your basket is minted as an encrypted note in a Solana Privacy Ring. The public ledger holds only a Poseidon commitment.",
                },
                {
                  step: "03",
                  title: "Rebalance in the Dark",
                  desc: "Rebalancing trades match peer-to-peer inside an off-chain batch auction. Only the net difference touches Solana DEX liquidity.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(26, 26, 26, 0.02)",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--color-accent)",
                        padding: "2px 6px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "rgba(255, 140, 0, 0.08)",
                      }}
                    >
                      STAGE {item.step}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-headline)",
                      fontSize: "1.15rem",
                      fontWeight: 600,
                      color: "var(--color-text)",
                    }}
                  >
                    {item.title}
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "12px",
                      lineHeight: 1.55,
                      color: "var(--color-muted)",
                      margin: 0,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Card C: The Surveillance Problem */}
          <div
            id="surveillance"
            className="veil-card-white p-4 sm:p-6"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-strong)",
              boxShadow: "0 12px 36px -8px rgba(26, 26, 26, 0.08)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: "4px",
                  fontWeight: 600,
                }}
              >
                [03 // SURVEILLANCE VULNERABILITY]
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-headline)",
                  fontSize: "1.45rem",
                  fontWeight: 600,
                  color: "var(--color-text)",
                }}
              >
                The Surveillance Problem
              </h2>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  color: "var(--color-muted)",
                  lineHeight: 1.5,
                }}
              >
                Every on-chain portfolio is a public billboard. Your weights, your entries, your rebalances — all
                indexed forever on public block explorers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Public Explorer Billboard */}
              <div
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(239, 68, 68, 0.02)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: "#DC2626",
                    fontWeight: 700,
                    marginBottom: "10px",
                  }}
                >
                  <span>PUBLIC MEMPOOL EXPLORER</span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "2px",
                      backgroundColor: "rgba(220, 38, 38, 0.1)",
                    }}
                  >
                    EXPOSED
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", color: "var(--color-text)", wordBreak: "break-all" }}>
                  <div>
                    <span style={{ color: "var(--color-muted)" }}>Target Wallet: </span>
                    <span style={{ fontWeight: 600 }}>0x7a29…41c8</span>
                  </div>
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "#ffffff",
                      border: "1px solid rgba(239, 68, 68, 0.15)",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#991B1B" }}>Public Positions:</div>
                    <div style={{ marginTop: "4px", fontSize: "11px" }}>
                      • NVDA: 40% (45.2 Shares)
                      <br />
                      • SPY: 30% (120.4 Shares)
                      <br />
                      • TSLA: 30% (88.1 Shares)
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#DC2626", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <AlertTriangle size={12} />
                    <span>Open to MEV sandwiching &amp; portfolio surveillance.</span>
                  </div>
                </div>
              </div>

              {/* Zolius Shielded Note */}
              <div
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "#141210",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 140, 0, 0.3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: "var(--color-accent)",
                    fontWeight: 700,
                    marginBottom: "10px",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Shield size={14} />
                    ZOLIUS SHIELDED COMMITMENT
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "2px",
                      backgroundColor: "rgba(255, 140, 0, 0.15)",
                    }}
                  >
                    SHIELDED
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", wordBreak: "break-all" }}>
                  <div>
                    <span style={{ color: "#8c8c8c" }}>Commitment Hash: </span>
                    <span style={{ color: "#ffffff", fontWeight: 600 }}>0x7f3a8c19…9b12fe04</span>
                  </div>
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--color-accent)" }}>Shielded Payload:</div>
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#d4d4d4" }}>
                      • Poseidon Merkle Leaf: Verified
                      <br />
                      • Basket Weights: [ENCRYPTED IN ZK-NOTE]
                      <br />
                      • Rebalance Strategy: Off-chain batch
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--color-accent)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Check size={12} />
                    <span>Zero individual trade leak. Only net touches Solana liquidity.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (lg:col-span-5) — Sidebar Workstation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="lg:col-span-5">
          {/* Card 1: Waitlist Early Access */}
          <div
            id="waitlist"
            className="veil-card-white p-4 sm:p-6"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-strong)",
              boxShadow: "0 12px 36px -8px rgba(26, 26, 26, 0.08)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: "4px",
                  fontWeight: 600,
                }}
              >
                [04 // EARLY ACCESS QUEUE]
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-headline)",
                  fontSize: "1.45rem",
                  fontWeight: 600,
                  color: "var(--color-text)",
                }}
              >
                Get in Line
              </h2>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  color: "var(--color-muted)",
                  lineHeight: 1.5,
                }}
              >
                Be first in line when Dark ETF opens. No wallet signature required. Double opt-in confirmation protects
                your spot.
              </p>
            </div>

            <Suspense>
              <WaitlistForm />
            </Suspense>
          </div>

          {/* Card 2: Frequently Asked Questions Accordion */}
          <div
            id="faq"
            className="veil-card-white p-4 sm:p-6"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border-strong)",
              boxShadow: "0 12px 36px -8px rgba(26, 26, 26, 0.08)",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: "4px",
                  fontWeight: 600,
                }}
              >
                [05 // PROTOCOL INTEL]
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-headline)",
                  fontSize: "1.45rem",
                  fontWeight: 600,
                  color: "var(--color-text)",
                }}
              >
                Frequently Asked Questions
              </h2>
            </div>

            <FaqAccordion />
          </div>

          {/* Card 3: Regulatory & Jurisdictional Notice */}
          <div
            style={{
              padding: "18px 20px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "rgba(26, 26, 26, 0.025)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-muted)",
                marginBottom: "8px",
              }}
            >
              // REGULATORY &amp; JURISDICTIONAL NOTICE
            </div>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                lineHeight: 1.6,
                color: "var(--color-muted)",
                margin: 0,
              }}
            >
              Zolius Dark ETF is under development and not available. This page is for informational purposes only and
              is not an offer to sell or a solicitation to buy any security, token, or financial product. “Dark ETF” is
              a product name; it is not a registered exchange-traded fund. Stock Tokens are issued by third parties and
              are subject to their own terms and jurisdictional restrictions, and are not available to U.S. persons.
              Zolius Vault is an independent project built on Solana Privacy Rings. Not affiliated with or endorsed by Helius.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
