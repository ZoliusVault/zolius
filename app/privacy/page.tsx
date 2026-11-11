"use client";

import React from "react";
import Link from "next/link";
import { appChain, APP_CHAIN_ID } from "@/lib/chains";
import { ShieldCheck, Lock, EyeOff, ServerOff, ArrowUpRight, CheckCircle2 } from "lucide-react";

export default function PrivacyPage() {
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
              SOLANA DEVNET
            </span>
            <span>// Cryptographic Invariants</span>
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
            Privacy Architecture
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
            Mathematical guarantees, zero-knowledge verification, and non-custodial privacy invariants across the Zolius protocol stack.
            Browser-side proving, zero centralized note logging, and non-blocking withdrawals.
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
            <Lock size={13} style={{ color: "var(--color-accent)" }} />
            Groth16 ZK-SNARK
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <EyeOff size={13} />
            LeanIMT Merkle
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <ServerOff size={13} style={{ color: "var(--color-accent)" }} />
            Zero Server Logs
          </span>
        </div>
      </div>

      {/* Main 2-Column Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        {/* Column 1: Cryptographic Invariants Sidebar */}
        <div className="flex flex-col gap-4 col-span-1">
          <div
            className="zolius-card-white"
            style={{
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Architectural Invariants
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "var(--text-body-sm)", color: "var(--color-text)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>#1</span>
                <span>0-Held Custody Invariant</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>#2</span>
                <span>Client-Side Prover Assembly</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>#3</span>
                <span>Client-Side Self-Relay</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>#4</span>
                <span>Unpausable Withdrawals</span>
              </div>
            </div>
          </div>

          <div
            className="zolius-card-white"
            style={{
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Compliance &amp; Policy
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Link href="/docs/asp-policy" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Association Set Policy (ASP)
              </Link>
              <Link href="/docs/decisions" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Owner Decisions (Binding)
              </Link>
              <Link href="/terms" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Terms of Service
              </Link>
            </div>
          </div>
        </div>

        {/* Column 2: Privacy Architecture Content Cards */}
        <div className="flex flex-col gap-4 col-span-1 lg:col-span-2">
          {/* Card 1 */}
          <div
            className="zolius-card-white"
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
                Non-Custodial by Mathematical Invariant
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              Zolius Vault operates entirely through decentralized programs on Solana. When you deposit or transfer funds through Privacy Rings, your assets are cryptographically accounted for via ring commitments. Neither Zolius Vault, relayers, nor validators hold custody of your assets. The Zolius Vault enforces a strict <strong style={{ color: "var(--color-text)" }}>0-held custody invariant</strong>, ensuring no user funds ever linger in intermediary storage.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="zolius-card-white"
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
                Client-Side Proving &amp; Zero Server Logging
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              All cryptographic secrets, nullifiers, and viewing keys are generated locally in your browser using cryptographically secure randomness (Web Cryptography API). At no point are private viewing keys or secret parameters transmitted to any external server or indexer. Proof payloads are assembled client-side; zero-knowledge verification operates trustlessly on Solana.
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="zolius-card-white"
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
                Client-Side Self-Relay &amp; Decoupled Settlement
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              Withdrawals are broadcast directly via client-side self-relay from your browser wallet to the VeilZkRouter contract. All transaction parameters (pool, minimum amount out, recipient address, and fees) are cryptographically bound to the public input context hash of the ZK proof. Destination balances are decoupled from origin deposit notes inside the zero-knowledge pool. Users are advised to submit self-relayed withdrawals using distinct operational wallets to prevent linkability at the caller layer.
            </p>
          </div>

          {/* Card 4 */}
          <div
            className="zolius-card-white"
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
                Non-Blocking Withdrawal Invariant
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              Zolius contracts guarantee immutable, censorship-resistant withdrawals. While protocol guardians may pause incoming deposits in an emergency, withdrawal mechanisms can <strong style={{ color: "var(--color-text)" }}>never be paused, censored, or frozen under any circumstance</strong>.
            </p>
          </div>

          {/* Bottom Terminal CTA Card */}
          <div
            className="zolius-card-white"
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
              Ready to execute decoupled zero-knowledge swaps?
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
              <span>Launch Zolius Vault</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
