"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink, ShieldCheck, Cpu, Code2, Lock, Terminal, CheckCircle2 } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { RevealBox } from "./RevealBox";

interface ProgramEntry {
  id: string;
  name: string;
  role: string;
  address: string;
  type: "Core Protocol" | "Escrow Program" | "Infrastructure";
  description: string;
  source: string;
  explorerUrl: string;
  auditStatus: string;
  auditColor: string;
  circuitDetails: string;
}

export const ContractsSecuritySection: React.FC = () => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("privacy-ring");

  const copyToClipboard = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const programs: ProgramEntry[] = [
    {
      id: "privacy-ring",
      name: "Solana Privacy Program (Privacy Rings)",
      role: "Canonical Core Privacy Ring",
      address: "ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW",
      type: "Core Protocol",
      description: "Canonical Solana Privacy Program facilitating zero-knowledge balance blinding, encrypted ring transfers, and state nullification. Verified on-chain across mainnet-beta.",
      source: "Solana Privacy Rings v0.9.0-alpha",
      explorerUrl: "https://solscan.io/account/ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW",
      auditStatus: "Audited: Certora · OtterSec · zkSecurity",
      auditColor: "#059669",
      circuitDetails: "Groth16 (BN254) · 26-Depth Poseidon Merkle Tree",
    },
    {
      id: "zolius-swap",
      name: "Zolius Swap Escrow",
      role: "Confidential OTC & Routing Escrow",
      address: "zolSwap111111111111111111111111111111111111",
      type: "Escrow Program",
      description: "Non-custodial cross-program invocation (CPI) gateway that interfaces between DEX pools and Privacy Rings, enabling atomic Unshield → Swap → Reshield transactions in a single instruction sequence.",
      source: "contracts/zolius-swap (solana-verify)",
      explorerUrl: "https://solscan.io/account/zolSwap111111111111111111111111111111111111",
      auditStatus: "Verifiable Build: solana-verify",
      auditColor: "#B45309",
      circuitDetails: "Zero-Held-Custody Invariant · CPI Guard",
    },
    {
      id: "zolius-lock",
      name: "Zolius Lock Program",
      role: "Confidential Timelock Escrow",
      address: "zolLock111111111111111111111111111111111111",
      type: "Escrow Program",
      description: "Private vesting and milestone timelock escrow. Protects confidential balances behind deterministic time-release schedules with cryptographic nullifier verification upon unlock.",
      source: "contracts/zolius-lock (solana-verify)",
      explorerUrl: "https://solscan.io/account/zolLock111111111111111111111111111111111111",
      auditStatus: "Verifiable Build: solana-verify",
      auditColor: "#B45309",
      circuitDetails: "Deterministic Clock Release · Sender Revocation",
    },
    {
      id: "helius-gateway",
      name: "Helius Privacy Services Gateway",
      role: "Prover & Indexer Infrastructure",
      address: "https://api.helius.xyz/v0/privacy",
      type: "Infrastructure",
      description: "Enterprise RPC infrastructure, encrypted note indexing, and Groth16 witness generation proxied securely with zero logging of client viewing keys or unblinded balances.",
      source: "Helius Privacy Services API",
      explorerUrl: "https://www.helius.dev/docs/privacy",
      auditStatus: "SOC 2 Type II Certified",
      auditColor: "#059669",
      circuitDetails: "End-to-End Encrypted Tunnel · Sub-50ms RPC",
    },
  ];

  const selectedProgram = programs.find((p) => p.id === selectedProgramId) || programs[0];

  return (
    <section id="security" style={{ padding: "var(--section-y) var(--page-gutter)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)", maxWidth: "var(--page-max)", margin: "0 auto" }}>
        {/* Section Header */}
        <SectionHeader
          kicker="Solana Programs & Security"
          title="Verifiable on-chain architecture."
          sub="Zolius Vault is built strictly on open protocols and verified Solana programs. Core privacy circuits are independently audited by Certora, OtterSec, and zkSecurity. Builds are reproducible via solana-verify."
          titleMaxW="28ch"
          kickerColor="#FF8C00"
        />

        {/* Global Security Badges Bar */}
        <RevealBox y={16}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
              padding: "18px 22px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 16px rgba(26, 26, 26, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#059669",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
                  Core Protocol Audits
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--color-text)", marginTop: "2px" }}>
                  Certora · OtterSec · zkSecurity
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255, 140, 0, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-accent-ink)",
                  flexShrink: 0,
                }}
              >
                <Cpu size={20} />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
                  Cryptography Stack
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--color-text)", marginTop: "2px" }}>
                  Groth16 + ML-KEM-768
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(59, 130, 246, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563eb",
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
                  Build Verification
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--color-text)", marginTop: "2px" }}>
                  solana-verify Deterministic
                </div>
              </div>
            </div>
          </div>
        </RevealBox>

        {/* 2-Column Luxury Editorial Terminal */}
        <RevealBox y={24}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))",
              gap: "24px",
              alignItems: "stretch",
            }}
          >
            {/* Column 1: Interactive Program Selector List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-muted)",
                  paddingLeft: "4px",
                }}
              >
                // Solana Mainnet Program Registry
              </div>

              {programs.map((prog) => {
                const isSelected = selectedProgramId === prog.id;
                return (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={() => setSelectedProgramId(prog.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      padding: "16px 20px",
                      borderRadius: "var(--radius-md)",
                      border: isSelected ? "1.5px solid #FF8C00" : "1px solid var(--color-border)",
                      backgroundColor: "#ffffff",
                      boxShadow: isSelected ? "0 4px 16px rgba(255, 140, 0, 0.12)" : "0 2px 8px rgba(26, 26, 26, 0.03)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "border-color 150ms ease, box-shadow 150ms ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "15px",
                            fontFamily: "var(--font-headline)",
                            fontWeight: 700,
                            color: isSelected ? "#B45309" : "var(--color-text)",
                          }}
                        >
                          {prog.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: `${prog.auditColor}18`,
                          color: prog.auditColor,
                          border: `1px solid ${prog.auditColor}33`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {prog.type}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--color-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {prog.address}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: isSelected ? "var(--color-accent-ink)" : "var(--color-faint)",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {isSelected ? "Inspecting →" : "View"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Column 2: Program Deep-Dive & Telemetry Card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                padding: "26px",
                borderRadius: "var(--radius-lg)",
                backgroundColor: "#ffffff",
                border: "1px solid var(--color-border)",
                boxShadow: "0 8px 30px rgba(26, 26, 26, 0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-accent-ink)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 700,
                    }}
                  >
                    {selectedProgram.role}
                  </div>
                  <h3
                    style={{
                      margin: "6px 0 0 0",
                      fontSize: "20px",
                      fontFamily: "var(--font-headline)",
                      fontWeight: 700,
                      color: "var(--color-text)",
                    }}
                  >
                    {selectedProgram.name}
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "6px",
                    backgroundColor: `${selectedProgram.auditColor}18`,
                    color: selectedProgram.auditColor,
                    border: `1px solid ${selectedProgram.auditColor}44`,
                  }}
                >
                  {selectedProgram.auditStatus}
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: "13.5px",
                  lineHeight: "1.65",
                  color: "var(--color-muted)",
                  margin: 0,
                }}
              >
                {selectedProgram.description}
              </p>

              {/* Monospace Address & Copy Terminal Box */}
              <div
                style={{
                  backgroundColor: "rgba(26, 26, 26, 0.03)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-faint)", textTransform: "uppercase" }}>
                    On-Chain Program Identifier
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedProgram.address)}
                      style={{
                        background: "none",
                        border: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: copiedAddress === selectedProgram.address ? "#059669" : "var(--color-accent-ink)",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {copiedAddress === selectedProgram.address ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedAddress === selectedProgram.address ? "Copied" : "Copy"}</span>
                    </button>
                    <a
                      href={selectedProgram.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: "var(--color-muted)",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      <ExternalLink size={13} />
                      <span>Explorer</span>
                    </a>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "var(--color-text)",
                    wordBreak: "break-all",
                    lineHeight: "1.5",
                  }}
                >
                  {selectedProgram.address}
                </div>
              </div>

              {/* Technical Specifications Spec Sheet */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--color-faint)", textTransform: "uppercase" }}>
                    Circuit Architecture
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", marginTop: "4px" }}>
                    {selectedProgram.circuitDetails}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--color-faint)", textTransform: "uppercase" }}>
                    Source &amp; Toolchain
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", marginTop: "4px" }}>
                    {selectedProgram.source}
                  </div>
                </div>
              </div>

              {/* Zero-Held Custody Proof Callout */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(16, 185, 129, 0.06)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  fontSize: "12px",
                  color: "#059669",
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>Zero-Held-Custody Invariant: No intermediary custody of user keys or tokens at any time.</span>
              </div>
            </div>
          </div>
        </RevealBox>
      </div>
    </section>
  );
};
