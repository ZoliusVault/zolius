"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { appChain, APP_CHAIN_ID } from "@/lib/chains";
import { Search, CheckCircle2, ShieldCheck, Scale, ArrowUpRight, BookOpen, X } from "lucide-react";

interface DecisionItem {
  id: number;
  title: string;
  category: "architecture" | "scope" | "mainnet" | "zk";
  categoryLabel: string;
  date: string;
  status: "RATIFIED";
  summary: string;
  details?: string;
}

const DECISIONS: DecisionItem[] = [
  {
    id: 1,
    title: "Attestation: Open & Permissionless",
    category: "architecture",
    categoryLabel: "Founding Architecture",
    date: "2026-10-07",
    status: "RATIFIED",
    summary: "selfAttest is open to anyone with zero eligibility barriers. Gating acts exclusively as an anti-bot speedbump and launch windows safeguard.",
  },
  {
    id: 2,
    title: "Association Set: Open Sentinel Rule",
    category: "architecture",
    categoryLabel: "Founding Architecture",
    date: "2026-10-07",
    status: "RATIFIED",
    summary: "Every label deposited on-chain plus the genesis sentinel is included automatically by mechanical publication scripts. Zero human discretion.",
  },
  {
    id: 3,
    title: "Owner Control Maintenance",
    category: "architecture",
    categoryLabel: "Founding Architecture",
    date: "2026-10-07",
    status: "RATIFIED",
    summary: "No immediate renounce schedule. Guardian, treasury, registry, and hook ownership remain securely with the operator wallet indefinitely.",
  },
  {
    id: 4,
    title: "Fee Distribution: 30 BPS Hook / 70% Buyback",
    category: "architecture",
    categoryLabel: "Founding Architecture",
    date: "2026-10-07",
    status: "RATIFIED",
    summary: "Matches live defaults: 30 BPS hook swap fee with 70% share automatically routed to VeilTreasury for VEIL token burn.",
  },
  {
    id: 5,
    title: "Final Protocol Name: Veil",
    category: "scope",
    categoryLabel: "Scope & Risk",
    date: "2026-10-08",
    status: "RATIFIED",
    summary: "Adopted Veil as the canonical protocol brand; namespace collision risk evaluated and accepted.",
  },
  {
    id: 6,
    title: "External Audit: Comprehensive Internal Verification",
    category: "scope",
    categoryLabel: "Scope & Risk",
    date: "2026-10-08",
    status: "RATIFIED",
    summary: "Satisfied via deep automated fuzz suites, differential testing, and formal root verification with zero unresolved severity issues.",
  },
  {
    id: 7,
    title: "Whitelist v1: Native ETH + VEIL Token",
    category: "scope",
    categoryLabel: "Scope & Risk",
    date: "2026-10-08",
    status: "RATIFIED",
    summary: "Dedicated isolated fixed-denomination Merkle pools deployed for native ETH and the VEIL token.",
  },
  {
    id: 8,
    title: "Attestation Criteria: Open Self-Attest",
    category: "scope",
    categoryLabel: "Scope & Risk",
    date: "2026-10-08",
    status: "RATIFIED",
    summary: "Advanced zero-knowledge proof-of-clean-funds deferred to v2. v1 enforces open self-attestation via AttestationRegistry v2.",
  },
  {
    id: 9,
    title: "Guardian Emergency Role Maintained",
    category: "scope",
    categoryLabel: "Scope & Risk",
    date: "2026-10-08",
    status: "RATIFIED",
    summary: "Emergency deposit pause maintained by operator to contain potential zero-day threats while exits remain cryptographically unblockable.",
  },
  {
    id: 10,
    title: "Lifetime Deposit Caps & Volume Bounding",
    category: "mainnet",
    categoryLabel: "Mainnet Readiness",
    date: "2026-10-09",
    status: "RATIFIED",
    summary: "No private contract allowlists; open pool access is bounded by strict lifetime deposit caps (10 ETH per pool) to contain protocol risk.",
  },
  {
    id: 11,
    title: "Legal Risk Mitigation & Terms of Service",
    category: "mainnet",
    categoryLabel: "Mainnet Readiness",
    date: "2026-10-09",
    status: "RATIFIED",
    summary: "Mandatory public Terms of Service and Privacy Architecture disclosures with zero price speculation promises.",
  },
  {
    id: 12,
    title: "Relayer Model: Self-Relay Primary",
    category: "mainnet",
    categoryLabel: "Mainnet Readiness",
    date: "2026-10-09",
    status: "RATIFIED",
    summary: "Withdrawals execute directly from the browser via client-side Groth16 proofs. Zero dependency on centralized relay nodes.",
  },
  {
    id: 13,
    title: "UUPS Upgradeable Entrypoint Proxy",
    category: "mainnet",
    categoryLabel: "Mainnet Readiness",
    date: "2026-10-09",
    status: "RATIFIED",
    summary: "Canonical OpenZeppelin ERC1967 UUPS proxy standard adopted for 0xbow Entrypoint with transparent storage manifests.",
  },
  {
    id: 14,
    title: "Continuous Invariant Verification",
    category: "mainnet",
    categoryLabel: "Mainnet Readiness",
    date: "2026-10-09",
    status: "RATIFIED",
    summary: "Strict zero-custody and balance conservation invariants (totalDeposits − totalWithdrawn = pool balance) continuously monitored.",
  },
  {
    id: 15,
    title: "Blockscout & Sourcify Verification Mandate",
    category: "mainnet",
    categoryLabel: "Mainnet Readiness",
    date: "2026-10-09",
    status: "RATIFIED",
    summary: "All deployed smart contracts must be verifiable on-chain. Sourcify 10/10 verified bytecode published permanently.",
  },
  {
    id: 16,
    title: "Incident Response: Deposit-Pause First",
    category: "mainnet",
    categoryLabel: "Mainnet Readiness",
    date: "2026-10-09",
    status: "RATIFIED",
    summary: "In incident triage, pausing new deposits is the primary containment lever. Withdrawals remain autonomous and cannot be blocked.",
  },
  {
    id: 17,
    title: "Audited Circom & Groth16 Circuit Reuse",
    category: "zk",
    categoryLabel: "Full-ZK & Cryptography",
    date: "2026-10-09",
    status: "RATIFIED",
    summary: "Reuses battle-tested Groth16 commitment and withdrawal circuits with established trusted setup ceremony transcripts.",
  },
  {
    id: 18,
    title: "Operator Key Rotation & Address Retirement",
    category: "zk",
    categoryLabel: "Full-ZK & Cryptography",
    date: "2026-10-09",
    status: "RATIFIED",
    summary: "Keys rotated to active mainnet deployer and operator address (0xea48...3aa4). Historic testnet keys retired.",
  },
  {
    id: 19,
    title: "0xbow Suite v1.2.1 Deployment Standard",
    category: "zk",
    categoryLabel: "Full-ZK & Cryptography",
    date: "2026-10-09",
    status: "RATIFIED",
    summary: "Zolius Vault architecture and Privacy Rings core integration established on Solana Mainnet-Beta.",
  },
];

export default function DecisionsDocPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredDecisions = useMemo(() => {
    return DECISIONS.filter((d) => {
      const matchesCat = activeCategory === "all" || d.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        `#${d.id}`.includes(q) ||
        d.id.toString() === q;
      return matchesCat && matchesQuery;
    });
  }, [searchQuery, activeCategory]);

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
            <span>// Governance Decisions Log</span>
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
            Veil Owner Decisions
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
            All 19 binding architectural, risk, and deployment decisions ratified by protocol governance.
            Each policy decision forms the immutable operational baseline for smart contract parameters.
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
            19 Ratified Policies
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={13} />
            Oct 2026
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={13} style={{ color: "var(--color-accent)" }} />
            Binding On-Chain
          </span>
        </div>
      </div>

      {/* Main 2-Column Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        {/* Column 1: Sidebar Navigation & Filters */}
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
              Filter by Category
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[
                { id: "all", label: "All Decisions", count: 19 },
                { id: "architecture", label: "Founding Architecture", count: 4 },
                { id: "scope", label: "Scope & Risk", count: 5 },
                { id: "mainnet", label: "Mainnet Readiness", count: 7 },
                { id: "zk", label: "Full-ZK & Cryptography", count: 3 },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: activeCategory === c.id ? "rgba(26, 26, 26, 0.06)" : "transparent",
                    color: activeCategory === c.id ? "var(--color-text)" : "var(--color-muted)",
                    fontWeight: activeCategory === c.id ? 600 : 400,
                    fontSize: "13px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>{c.label}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      padding: "1px 6px",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: activeCategory === c.id ? "var(--color-text)" : "rgba(26, 26, 26, 0.04)",
                      color: activeCategory === c.id ? "#ffffff" : "var(--color-muted)",
                    }}
                  >
                    {c.count}
                  </span>
                </button>
              ))}
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
              <Link href="/docs/asp-policy" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Association Set Policy (ASP)
              </Link>
              <Link href="/privacy" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Privacy Architecture
              </Link>
              <Link href="/contracts" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Verified Contracts Registry
              </Link>
            </div>
          </div>
        </div>

        {/* Column 2: Search Bar & Decisions List */}
        <div className="flex flex-col gap-4 col-span-1 lg:col-span-2">
          {/* Search Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "8px 14px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "#ffffff",
              border: "1px solid var(--color-border)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <Search size={15} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search decisions by keyword or number (e.g. audit, pause, #15)..."
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                color: "var(--color-text)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  background: "none",
                  border: "none",
                  padding: "2px",
                  cursor: "pointer",
                  color: "var(--color-muted)",
                  fontSize: "12px",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Decision Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {filteredDecisions.length === 0 ? (
              <div
                className="veil-card-white"
                style={{
                  padding: "var(--space-8)",
                  textAlign: "center",
                  color: "var(--color-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                }}
              >
                No decisions matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredDecisions.map((d) => (
                <div
                  key={d.id}
                  className="veil-card-white"
                  style={{
                    padding: "var(--space-5) var(--space-6)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "rgba(255, 140, 0, 0.12)",
                          color: "var(--color-accent-ink)",
                        }}
                      >
                        #{d.id.toString().padStart(2, "0")}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-headline)",
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "var(--color-text)",
                        }}
                      >
                        {d.title}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "rgba(26, 26, 26, 0.05)",
                          color: "var(--color-muted)",
                        }}
                      >
                        {d.categoryLabel}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "rgba(26, 26, 26, 0.08)",
                          color: "var(--color-text)",
                        }}
                      >
                        {d.status}
                      </span>
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-body)",
                      fontSize: "13px",
                      color: "var(--color-muted)",
                      lineHeight: 1.55,
                    }}
                  >
                    {d.summary}
                  </p>
                </div>
              ))
            )}
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
              Ready to trade with verified smart contract guarantees?
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
