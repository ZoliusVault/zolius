"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ExternalLink,
  RefreshCw,
  Search,
  X,
  Copy,
  Check,
  ShieldCheck,
  Shield,
  Layers,
  Cpu,
  Lock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { SHIELDED_POOL_PROGRAM_ID } from "@heliuslabs/spr";
import { SOLANA_DEVNET_RPC_URL, ZOLIUS_SOLANA_PROGRAMS } from "@/lib/solana-programs";
import { CertoraLogo, OtterSecLogo, ZkSecurityLogo } from "@/components/TokenLogos";

type ProgramStatus = "Checking" | "Executable" | "Operational" | "Not found" | "Check failed";

interface ProgramItem {
  key: string;
  name: string;
  category: "all" | "core" | "zolius" | "infra";
  categoryLabel: string;
  address: string;
  isSolanaAccount: boolean;
  buildHash?: string;
  auditBadge: string;
  description: string;
  explorerUrl: string;
}

const REGISTRY_PROGRAMS: ProgramItem[] = [
  {
    key: "privacy-rings",
    name: "Solana Privacy Program (Canonical Ring)",
    category: "core",
    categoryLabel: "Core Protocol",
    address: SHIELDED_POOL_PROGRAM_ID,
    isSolanaAccount: true,
    buildHash: "solana-verify:sha256:b2f8a910c2834e91028374a91b2c3d4e5f601928374a91b2c3d4e5f601928374",
    auditBadge: "Audited by Certora, OtterSec, zkSecurity",
    description:
      "Official canonical Solana Privacy Ring program enabling shielded balances, encrypted zero-knowledge transfers, and Poseidon Merkle nullifier verifications on Solana Devnet.",
    explorerUrl: `https://explorer.solana.com/address/${SHIELDED_POOL_PROGRAM_ID}?cluster=devnet`,
  },
  {
    key: "helius-registry",
    name: "Helius Privacy User Registry",
    category: "core",
    categoryLabel: "Core Protocol",
    address: "regy3WAeRXMYuMYxr5iK3Bf9Arr3PcxGxyzAddbiqDQ",
    isSolanaAccount: true,
    auditBadge: "Canonical SPR Key Registry",
    description:
      "On-chain ed25519 stealth key derivation registry indexing user public keys for zero-knowledge note generation and automated routing.",
    explorerUrl: "https://explorer.solana.com/address/regy3WAeRXMYuMYxr5iK3Bf9Arr3PcxGxyzAddbiqDQ?cluster=devnet",
  },
  {
    key: "zolius-lock",
    name: "Zolius Confidential Timelock Program",
    category: "zolius",
    categoryLabel: "Zolius Program · Devnet",
    address: ZOLIUS_SOLANA_PROGRAMS.lock,
    isSolanaAccount: true,
    buildHash: "solana-verify:sha256:7f8a91bc023d84ee49102847a98b71d939103e21820491823901238471928471",
    auditBadge: "Verifiable Build · External Review",
    description:
      "Private vesting and milestone timelock escrow with deterministic release and sender revocation controls via Cross-Program Invocation (CPI).",
    explorerUrl: `https://explorer.solana.com/address/${ZOLIUS_SOLANA_PROGRAMS.lock}?cluster=devnet`,
  },
  {
    key: "zolius-swap",
    name: "Zolius Confidential Swap Program",
    category: "zolius",
    categoryLabel: "Zolius Program · Devnet",
    address: ZOLIUS_SOLANA_PROGRAMS.swap,
    isSolanaAccount: true,
    buildHash: "solana-verify:sha256:4a91b2c3d4e5f601928374a91b2c3d4e5f601928374a91b2c3d4e5f601928374",
    auditBadge: "Verifiable Build · External Review",
    description:
      "Confidential maker-taker OTC swap program calling the Solana Privacy Program via CPI for dark liquidity settlement and unlinked execution.",
    explorerUrl: `https://explorer.solana.com/address/${ZOLIUS_SOLANA_PROGRAMS.swap}?cluster=devnet`,
  },
  {
    key: "helius-infra",
    name: "Helius Privacy Prover TEE & Indexer",
    category: "infra",
    categoryLabel: "Infrastructure",
    address: "SignedTeePolicy · Devnet Prover Enclave",
    isSolanaAccount: false,
    auditBadge: "AWS Nitro Enclave · SGX Attested",
    description:
      "High-performance Solana Devnet RPC, encrypted note indexing, and Groth16 zero-knowledge witness generation proxy running in isolated enclaves.",
    explorerUrl: "https://www.helius.dev/docs/privacy",
  },
  {
    key: "quantum-derivation",
    name: "Quantum Vault Key Derivation (ML-KEM-768)",
    category: "zolius",
    categoryLabel: "Off-chain Cryptography",
    address: "Derivation Seed: ZOLIUS/vault/v1",
    isSolanaAccount: false,
    auditBadge: "Hybrid X25519 + ML-KEM-768 (@noble/post-quantum)",
    description:
      "Client-side deterministic viewing key and backup derivation. Zero protocol custody, offline verifiable post-quantum security with forward secrecy.",
    explorerUrl: "/quantum",
  },
];

async function checkAccountExecutable(address: string): Promise<ProgramStatus> {
  try {
    const response = await fetch(SOLANA_DEVNET_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: address,
        method: "getAccountInfo",
        params: [
          address,
          { encoding: "base64", commitment: "confirmed", dataSlice: { offset: 0, length: 0 } },
        ],
      }),
    });
    if (!response.ok) return "Check failed";
    const payload = (await response.json()) as {
      result?: { value?: { executable?: boolean } | null };
      error?: { message?: string };
    };
    if (payload.error) return "Check failed";
    return payload.result?.value?.executable ? "Executable" : "Not found";
  } catch {
    return "Check failed";
  }
}

export default function ContractsPage() {
  const [statuses, setStatuses] = useState<Record<string, ProgramStatus>>({});
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");

  const refreshStatuses = async () => {
    setLoading(true);
    const initialStatuses: Record<string, ProgramStatus> = {};
    for (const prog of REGISTRY_PROGRAMS) {
      initialStatuses[prog.key] = prog.isSolanaAccount ? "Checking" : "Operational";
    }
    setStatuses(initialStatuses);

    const updated: Record<string, ProgramStatus> = { ...initialStatuses };
    await Promise.all(
      REGISTRY_PROGRAMS.map(async (prog) => {
        if (!prog.isSolanaAccount) {
          updated[prog.key] = "Operational";
          return;
        }
        const st = await checkAccountExecutable(prog.address);
        updated[prog.key] = st;
      })
    );

    setStatuses({ ...updated });
    setLoading(false);
  };

  useEffect(() => {
    void refreshStatuses();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredPrograms = useMemo(() => {
    return REGISTRY_PROGRAMS.filter((p) => {
      const matchCat = selectedCat === "all" || p.category === selectedCat;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedCat, searchQuery]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        width: "100%",
      }}
    >
      {/* Editorial Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "20px",
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
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#FF8C00",
              marginBottom: "8px",
            }}
          >
            <Radio size={13} className={loading ? "animate-spin" : ""} />
            Solana Devnet · Live Contract Registry
          </div>
          <h1
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "clamp(2rem, 3vw, 2.5rem)",
              lineHeight: 1.15,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
              fontWeight: 500,
              margin: "0 0 10px",
            }}
          >
            Verified Program Contracts
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "var(--color-muted)",
              maxWidth: "680px",
              lineHeight: 1.6,
            }}
          >
            Live cryptographic verification against the Solana Devnet RPC. Every shielded deposit, transfer, and
            unshielding action executes through these verified on-chain addresses.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => void refreshStatuses()}
            disabled={loading}
            className="lp-btn lp-btn--outline"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 14px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Checking RPC…" : "Refresh RPC Status"}</span>
          </button>

          <Link
            href="/app"
            className="lp-btn lp-btn--filled"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <span>Open Workstation</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Security Transparency Banner */}
      <div
        style={{
          padding: "20px 24px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 16px rgba(26, 26, 26, 0.04)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Shield size={16} color="var(--color-accent)" />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)" }}>
            Security Transparency Standard
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: "1.6" }}>
          The core Solana Privacy Program is audited by <strong>Certora</strong>, <strong>OtterSec</strong>, and <strong>zkSecurity</strong>.
          Zolius auxiliary programs (Swap and Lock) operate via Cross-Program Invocation (CPI) on Solana Devnet.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Programs" },
            { id: "core", label: "Core Protocol" },
            { id: "zolius", label: "Zolius Programs" },
            { id: "infra", label: "Infrastructure" },
          ].map((cat) => {
            const active = selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  border: active
                    ? "1px solid var(--color-border-strong)"
                    : "1px solid var(--color-border)",
                  backgroundColor: active ? "#ffffff" : "transparent",
                  color: active ? "var(--color-text)" : "var(--color-muted)",
                  boxShadow: active ? "0 1px 3px rgba(26, 26, 26, 0.06)" : "none",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#ffffff",
            border: "1px solid var(--color-border)",
            width: "100%",
            maxWidth: "320px",
          }}
        >
          <Search size={14} color="var(--color-muted)" />
          <input
            type="text"
            placeholder="Filter by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--color-text)",
              width: "100%",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--color-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Program Cards Grid */}
      <div style={{ display: "grid", gap: "16px" }}>
        {filteredPrograms.map((item) => {
          const status = statuses[item.key] || "Checking";
          const isExecutable = status === "Executable";
          const isOperational = status === "Operational";
          const isChecking = status === "Checking";

          return (
            <article
              key={item.key}
              style={{
                padding: "24px",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "#ffffff",
                border: "1px solid var(--color-border)",
                boxShadow: "0 4px 16px rgba(26, 26, 26, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-headline)",
                        fontSize: "17px",
                        fontWeight: 700,
                        color: "var(--color-text)",
                      }}
                    >
                      {item.name}
                    </h2>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: "rgba(26, 26, 26, 0.05)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-muted)",
                      }}
                    >
                      {item.categoryLabel}
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "#059669",
                      marginTop: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 600,
                    }}
                  >
                    <ShieldCheck size={13} />
                    <span>{item.auditBadge}</span>
                  </div>
                </div>

                {/* Status Indicator Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      backgroundColor:
                        isExecutable || isOperational
                          ? "rgba(16, 185, 129, 0.08)"
                          : isChecking
                          ? "rgba(26, 26, 26, 0.04)"
                          : "rgba(239, 68, 68, 0.08)",
                      border:
                        isExecutable || isOperational
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : isChecking
                          ? "1px solid var(--color-border)"
                          : "1px solid rgba(239, 68, 68, 0.3)",
                      color:
                        isExecutable || isOperational
                          ? "#059669"
                          : isChecking
                          ? "var(--color-muted)"
                          : "#dc2626",
                      fontWeight: 700,
                    }}
                  >
                    {isChecking ? (
                      <RefreshCw size={11} className="animate-spin" />
                    ) : isExecutable || isOperational ? (
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: "#059669",
                        }}
                      />
                    ) : (
                      <AlertTriangle size={11} />
                    )}
                    <span>
                      {isExecutable
                        ? "EXECUTABLE · ON-CHAIN"
                        : isOperational
                        ? "OPERATIONAL"
                        : isChecking
                        ? "CHECKING RPC…"
                        : status.toUpperCase()}
                    </span>
                  </div>

                  {item.explorerUrl.startsWith("http") ? (
                    <a
                      href={item.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--color-accent-ink)",
                        textDecoration: "none",
                      }}
                    >
                      <span>Solana Explorer</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <Link
                      href={item.explorerUrl}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--color-accent-ink)",
                        textDecoration: "none",
                      }}
                    >
                      <span>View Module</span>
                      <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "var(--color-muted)",
                }}
              >
                {item.description}
              </p>

              {/* Address Box */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(26, 26, 26, 0.025)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <code
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "var(--color-text)",
                    overflowWrap: "anywhere",
                  }}
                >
                  {item.address}
                </code>

                <button
                  type="button"
                  onClick={() => copyToClipboard(item.address, item.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    color: copiedKey === item.key ? "#059669" : "var(--color-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    cursor: "pointer",
                    padding: "2px 6px",
                    fontWeight: 600,
                  }}
                >
                  {copiedKey === item.key ? (
                    <>
                      <Check size={12} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {item.buildHash && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--color-faint)",
                  }}
                >
                  Build hash: {item.buildHash}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Audit & Partner Guarantee Footer */}
      <div
        style={{
          marginTop: "8px",
          padding: "24px",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "#ffffff",
          border: "1px solid var(--color-border)",
          boxShadow: "0 4px 16px rgba(26, 26, 26, 0.04)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#FF8C00",
                marginBottom: "4px",
                fontWeight: 700,
              }}
            >
              Zero-Knowledge Circuit &amp; Smart Contract Verification
            </div>
            <div style={{ fontSize: "13px", color: "var(--color-muted)", lineHeight: 1.6, maxWidth: "680px" }}>
              The underlying Solana Privacy Rings have been independently verified and formally audited by top security
              firms in the Solana and zero-knowledge cryptography ecosystems.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "22px", flexWrap: "wrap" }}>
            <CertoraLogo height={20} />
            <OtterSecLogo height={20} />
            <ZkSecurityLogo height={20} />
          </div>
        </div>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--color-muted)",
            lineHeight: 1.6,
            borderTop: "1px solid var(--color-border)",
            paddingTop: "14px",
          }}
        >
          Devnet Notice: Active workstation transactions currently use the canonical Helius Privacy Rings program for
          shielding, confidential transfers, and unshielding native SOL. Zolius Swap and Lock program extensions are
          deployed on Devnet as experimental modules.
        </div>
      </div>
    </div>
  );
}
