"use client";

import React from "react";
import Link from "next/link";
import { appChain, APP_CHAIN_ID } from "@/lib/chains";
import { Scale, ShieldCheck, FileCheck, AlertTriangle, ArrowUpRight } from "lucide-react";

export default function TermsPage() {
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
            <span>// Terms of Service</span>
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
            Terms of Service
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
            Protocol usage rules, non-custodial responsibility, and user sovereignty guidelines for Zolius Vault.
            Autonomous execution, client-side secret management, and as-is software warranties.
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
            Non-Custodial
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={13} />
            User Sovereignty
          </span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <FileCheck size={13} style={{ color: "var(--color-accent)" }} />
            Protocol v1
          </span>
        </div>
      </div>

      {/* Main 2-Column Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        {/* Column 1: Core Tenets Sidebar */}
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
              Core Tenets
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "var(--text-body-sm)", color: "var(--color-text)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>§1</span>
                <span>Decentralized &amp; Non-Custodial</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>§2</span>
                <span>Exclusive Key Custody</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>§3</span>
                <span>Association Set Proofs (ASP)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>§4</span>
                <span>As-Is Software Warranty</span>
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
              Related Documentation
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Link href="/privacy" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Privacy Architecture
              </Link>
              <Link href="/docs/asp-policy" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Association Set Policy (ASP)
              </Link>
              <Link href="/docs/decisions" style={{ color: "var(--color-accent)", fontSize: "var(--text-body-sm)", textDecoration: "none", fontWeight: 600 }}>
                → Owner Decisions (Binding)
              </Link>
            </div>
          </div>
        </div>

        {/* Column 2: Terms of Service Content Cards */}
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
                Nature of the Protocol
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              Zolius Vault is an independent, non-custodial privacy infrastructure built on open Solana Privacy Rings programs. The protocol comprises open-source, autonomous programs that execute according to public on-chain logic.
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
                User Responsibility &amp; Key Management
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              Users retain sole and exclusive custody of their cryptographic private keys, secret commitments, and nullifiers. Because Zolius Vault is non-custodial, lost notes or nullifiers cannot be restored by any protocol developer or validator. Users are responsible for maintaining secure backups of their encrypted note strings.
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
                Association Set Provider (ASP) Architecture &amp; User Attestation
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              Zolius Vault incorporates zero-knowledge Association Set Provider (ASP) proofs allowing depositors to prove membership in published deposit sets. Under the protocol&apos;s open self-attestation architecture, attestations are generated permissionlessly on the client side without centralized surveillance or custodial screening. Users remain solely responsible for complying with applicable local laws and regulations governing digital asset transactions.
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
                &ldquo;As-Is&rdquo; Software Disclaimer
              </h2>
            </div>
            <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.6, fontSize: "14px", fontFamily: "var(--font-body)" }}>
              Zolius Vault is provided &ldquo;as is&rdquo; without warranties of any kind. Smart contract interactions involve inherent financial and technological risks. Users interact with the protocol at their own discretion.
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
              Need help or have questions regarding protocol invariants?
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
