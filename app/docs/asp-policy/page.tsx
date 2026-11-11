"use client";

import { useState } from "react";
import Link from "next/link";
import { appChain, APP_CHAIN_ID } from "@/lib/chains";
import { Copy, Check, ShieldCheck, Scale, FileText, ArrowUpRight, Terminal, CheckCircle2 } from "lucide-react";

export default function AspPolicyDocPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const GENESIS_CID = "QmVtkNm5Ro2F1oVBdP17TxcAcafXtMoG8rYPnu7S8kXJxV";
  const SCRIPT_CMD = "node scripts/publish-asp.mjs --network mainnet";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", width: "100%" }}>
      {/* Editorial Header */}
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
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(26, 26, 26, 0.05)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                fontWeight: 600,
              }}
            >
              SOLANA MAINNET-BETA
            </span>
            <span>// Association Set Policy (ASP)</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-headline)",
              fontSize: "clamp(2rem, 3.2vw, 2.6rem)",
              lineHeight: 1.15,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
              fontWeight: 600,
            }}
          >
            Association Set Policy (v1)
          </h1>
          <p
            style={{
              margin: "var(--space-2) 0 0 0",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body-sm)",
              color: "var(--color-muted)",
              maxWidth: "680px",
              lineHeight: "1.6",
            }}
          >
            Deterministic, mechanical inclusion rules for clean withdrawal sets on Solana.
            Zero human discretion, open automated publishing tooling, and anti-censorship guarantees.
          </p>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--color-muted)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Scale size={13} style={{ color: "var(--color-accent)" }} />
            Mechanical Inclusion
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={13} />
            Zero Discretion
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <FileText size={13} style={{ color: "var(--color-accent)" }} />
            Open Source Tooling
          </span>
        </div>
      </div>

      {/* Main 2-Column Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        {/* Column 1: Policy Invariants & Navigation Sidebar */}
        <div className="flex flex-col gap-4 col-span-1">
          <div
            className="veil-card-white"
            style={{
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Core Policy Rules
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "var(--text-body-sm)", color: "var(--color-text)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>§1</span>
                <span>Every Onchain Label Included</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>§2</span>
                <span>Mechanical Script Execution</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>§3</span>
                <span>Anti-Censorship Gated Role</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>§4</span>
                <span>Zero Human Discretion</span>
              </div>
            </div>
          </div>

          <div
            className="veil-card-white"
            style={{
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Related Governance
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Link href="/docs/decisions" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Owner Decisions
              </Link>
              <Link href="/privacy" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Privacy Architecture
              </Link>
              <Link href="/trade" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Shield Terminal &amp; Gated Pool
              </Link>
            </div>
          </div>
        </div>

        {/* Column 2: ASP Policy Content */}
        <div className="flex flex-col gap-4 col-span-1 lg:col-span-2">
          {/* Section 1: The Rule */}
          <div
            className="veil-card-white"
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255, 140, 0, 0.12)", color: "var(--color-accent-ink)" }}>
                §1
              </span>
              <h2 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "var(--text-h3)", color: "var(--color-text)" }}>
                The Inclusion Rule
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              The association set contains <strong style={{ color: "var(--color-text)" }}>every label ever deposited onchain</strong> plus the
              genesis sentinel, nothing more, nothing less. No human decides inclusion or exclusion.
              Publication is strictly mechanical: <code>scripts/publish-asp.mjs</code> rebuilds the Merkle tree from on-chain <code>Deposited</code> events and submits <code>updateRoot</code> to the 0xbow Entrypoint proxy.
            </p>

            {/* Publication Script Box */}
            <div
              style={{
                marginTop: "var(--space-2)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(26, 26, 26, 0.03)",
                border: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-3)",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Terminal size={14} style={{ color: "var(--color-muted)" }} />
                <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--color-text)" }}>
                  {SCRIPT_CMD}
                </code>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(SCRIPT_CMD, "script")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--color-border)",
                  color: copiedId === "script" ? "var(--color-accent)" : "var(--color-text)",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                }}
              >
                {copiedId === "script" ? <Check size={12} /> : <Copy size={12} />}
                {copiedId === "script" ? "Copied" : "Copy Command"}
              </button>
            </div>
          </div>

          {/* Section 2: Why Updater Key is Gated */}
          <div
            className="veil-card-white"
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255, 140, 0, 0.12)", color: "var(--color-accent-ink)" }}>
                §2
              </span>
              <h2 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "var(--text-h3)", color: "var(--color-text)" }}>
                Why the Updater Role is Gated
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              <code>updateRoot</code> on the 0xbow Entrypoint proxy requires the designated postman role.
              An open, unpermissioned <code>updateRoot</code> would allow malicious actors to publish fraudulent roots that omit legitimate user labels, effectively stranding withdrawals.
              Open deterministic publication tooling paired with a dedicated operational updater key represents the minimal safe architecture: the rule is public and mathematically verifiable, while the key prevents censorship.
            </p>
          </div>

          {/* Section 3: Current Sets */}
          <div
            className="veil-card-white"
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255, 140, 0, 0.12)", color: "var(--color-accent-ink)" }}>
                §3
              </span>
              <h2 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "var(--text-h3)", color: "var(--color-text)" }}>
                Current Association Sets
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(26, 26, 26, 0.02)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "13px" }}>
                    Solana Mainnet-Beta (Privacy Rings)
                  </span>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-accent)", fontWeight: 600 }}>
                    CANONICAL LIVE
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                  Published from live pool deposits with deterministic root updates under the rule above. Genesis sentinel CID is permanently pinned to IPFS.
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "4px", backgroundColor: "#ffffff", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}>
                    Genesis IPFS CID:
                  </span>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-text)", fontWeight: 500 }}>
                    {GENESIS_CID}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(GENESIS_CID, "cid")}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: copiedId === "cid" ? "var(--color-accent)" : "var(--color-muted)",
                    }}
                  >
                    {copiedId === "cid" ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(26, 26, 26, 0.01)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--color-muted)", fontSize: "13px" }}>
                  Testnet 46630 (Historic Reference Only)
                </span>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--color-muted)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                  Sentinel-only genesis retained strictly for regression testing and historic telemetry benchmarks.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Policy Evolution */}
          <div
            className="veil-card-white"
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(255, 140, 0, 0.12)", color: "var(--color-accent-ink)" }}>
                §4
              </span>
              <h2 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "var(--text-h3)", color: "var(--color-text)" }}>
                Rule Mutations
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              Any rule change requires a published policy revision before code changes are deployed. Code never leads policy.
              Refer to ratified <Link href="/docs/decisions" style={{ color: "var(--color-accent)", fontWeight: 600 }}>Owner Decisions</Link> for ratification histories.
            </p>
          </div>

          {/* Bottom Terminal CTA Card */}
          <div
            className="veil-card-white"
            style={{
              padding: "var(--space-5) var(--space-6)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "var(--space-3)",
            }}
          >
            <span style={{ fontSize: "var(--text-body-sm)", color: "var(--color-muted)", fontFamily: "var(--font-body)" }}>
              Ready to verify association sets on-chain?
            </span>
            <Link
              href="/trade"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--color-text)",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                textDecoration: "none",
                fontSize: "12px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
              }}
            >
              <span>Launch Veil Terminal</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
