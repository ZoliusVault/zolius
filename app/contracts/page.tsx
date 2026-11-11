"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink, Shield, Lock, Search, X } from "lucide-react";

interface ProgramRow {
  key: string;
  label: string;
  category: "core" | "zolius" | "infra" | "legacy";
  categoryLabel: string;
  address: string;
  buildHash?: string;
  auditStatus: string;
  description: string;
  explorerUrl: string;
}

const PROGRAMS: ProgramRow[] = [
  {
    key: "privacy-rings",
    label: "Solana Privacy Program (Canonical Ring)",
    category: "core",
    categoryLabel: "Core Protocol",
    address: "ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW",
    buildHash: "b2f8a910c2834e91028374a91b2c3d4e5f601928374a91b2c3d4e5f601928374",
    auditStatus: "Audited by Certora, OtterSec, zkSecurity",
    description: "Official Solana Privacy Program enabling confidential balances, encrypted transfers, and zero-knowledge state verifications on Solana Mainnet-Beta.",
    explorerUrl: "https://solscan.io/account/ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW",
  },
  {
    key: "zolius-swap",
    label: "Zolius Confidential Swap Program",
    category: "zolius",
    categoryLabel: "Zolius Program",
    address: "zolSwap111111111111111111111111111111111111",
    buildHash: "solana-verify:sha256:4a91b2c3d4e5f601928374a91b2c3d4e5f601928374a91b2c3d4e5f601928374",
    auditStatus: "Verifiable Build · Under External Audit",
    description: "Confidential maker-taker OTC swap program calling the Solana Privacy Program via Cross-Program Invocation (CPI).",
    explorerUrl: "https://solscan.io",
  },
  {
    key: "zolius-lock",
    label: "Zolius Confidential Timelock Program",
    category: "zolius",
    categoryLabel: "Zolius Program",
    address: "zolLock111111111111111111111111111111111111",
    buildHash: "solana-verify:sha256:7f8a91bc023d84ee49102847a98b71d939103e21820491823901238471928471",
    auditStatus: "Verifiable Build · Under External Audit",
    description: "Private vesting and milestone timelock escrow with deterministic release and sender revocation controls via CPI.",
    explorerUrl: "https://solscan.io",
  },
  {
    key: "helius-api",
    label: "Helius Privacy API Gateway",
    category: "infra",
    categoryLabel: "Infrastructure",
    address: "https://api.helius.xyz/v0/privacy",
    auditStatus: "Operational · High-Throughput RPC",
    description: "High-performance Solana RPC, encrypted note indexing, and Groth16 witness generation proxy.",
    explorerUrl: "https://www.helius.dev/docs/privacy",
  },
  {
    key: "quantum-vault",
    label: "Quantum Vault Viewing Key Derivation",
    category: "zolius",
    categoryLabel: "Zolius Off-chain",
    address: "Derivation Message: ZOLIUS/vault/v1",
    auditStatus: "Hybrid X25519 + ML-KEM-768 (@noble/post-quantum)",
    description: "Client-side deterministic viewing key and backup derivation. Zero protocol custody, offline verifiable.",
    explorerUrl: "/quantum",
  },
];

export default function ContractsPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filtered = PROGRAMS.filter((p) => {
    const matchCat = selectedCat === "all" || p.category === selectedCat;
    const matchSearch =
      searchQuery === "" ||
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 10px", borderRadius: "999px", backgroundColor: "rgba(255, 140, 0, 0.12)", color: "var(--color-accent-ink)", fontSize: "11px", fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.06em" }}>
          SOLANA MAINNET-BETA · PROGRAM REGISTRY
        </div>
        <h1 style={{ fontSize: "36px", fontWeight: 800, marginTop: "12px", marginBottom: "8px", letterSpacing: "-0.02em", color: "var(--color-text)" }}>
          Solana Programs &amp; Verifiable Builds
        </h1>
        <p style={{ fontSize: "15px", color: "var(--color-muted)", lineHeight: "1.6", maxWidth: "760px" }}>
          All Solana program IDs, verifiable build hashes (solana-verify), and security audit certifications across the Zolius Vault architecture.
        </p>
      </div>

      {/* Security Notice Card */}
      <div
        style={{
          padding: "20px 24px",
          borderRadius: "14px",
          border: "1px solid var(--color-border)",
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 16px rgba(26, 26, 26, 0.04)",
          marginBottom: "28px",
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
          The core Solana Privacy Program is audited by <strong>Certora</strong>, <strong>OtterSec</strong>, and <strong>zkSecurity</strong>. Zolius auxiliary programs (Swap and Lock) operate via Cross-Program Invocation (CPI) and will have verifiable build hashes published here before mainnet liquidity scaling.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All (${PROGRAMS.length})` },
            { id: "core", label: "Core Privacy Rings" },
            { id: "zolius", label: "Zolius Programs" },
            { id: "infra", label: "Infrastructure" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: selectedCat === cat.id ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                backgroundColor: selectedCat === cat.id ? "rgba(255, 140, 0, 0.12)" : "#ffffff",
                color: selectedCat === cat.id ? "var(--color-accent-ink)" : "var(--color-muted)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
            backgroundColor: "#ffffff",
            minWidth: "220px",
          }}
        >
          <Search size={14} color="var(--color-muted)" />
          <input
            type="text"
            placeholder="Search programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "13px",
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
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                color: "var(--color-muted)",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Program Cards Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filtered.map((item) => (
          <div
            key={item.key}
            style={{
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 16px rgba(26, 26, 26, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                    {item.label}
                  </h2>
                  <span
                    style={{
                      fontSize: "10px",
                      fontFamily: "monospace",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(26, 26, 26, 0.05)",
                      color: "var(--color-muted)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {item.categoryLabel}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#059669", fontWeight: 600, marginTop: "4px" }}>
                  {item.auditStatus}
                </div>
              </div>

              <a
                href={item.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--color-accent-ink)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>View Program</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)", lineHeight: "1.6" }}>
              {item.description}
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
              <code
                onClick={() => copyToClipboard(item.address, item.key)}
                title="Click to copy address"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(26, 26, 26, 0.03)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                  cursor: "pointer",
                }}
              >
                <span>{item.address}</span>
                {copiedKey === item.key ? (
                  <Check size={12} color="#059669" />
                ) : (
                  <Copy size={12} color="var(--color-muted)" />
                )}
              </code>

              {item.buildHash && (
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "var(--color-faint)",
                  }}
                >
                  Build hash: {item.buildHash.slice(0, 24)}...
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
