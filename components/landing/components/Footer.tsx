"use client";

import React from "react";
import Link from "next/link";
import { ZoliusLogo } from "../../VeilLogo";
import { XLogo } from "../../TokenLogos";
import contracts from "@/lib/contracts.json";

export const Footer: React.FC = () => {
  const privacyProgram = contracts.programs.find((program) => program.id === "privacy-ring");
  return (
    <footer id="footer" className="landing-footer" aria-label="Site footer">
      <div className="landing-footer__inner">
        <div className="landing-footer__grid">
          {/* Brand Column */}
          <div className="landing-footer__brand">
            <ZoliusLogo href="/" size="lg" color="#ffffff" />
            <p style={{ marginTop: "14px", fontSize: "13px", lineHeight: "1.7", color: "#aba3ae" }}>
              Independent self-custodial confidential vault built on Solana Privacy Rings. Building toward quantum-resilient viewing-key protection with hybrid ML-KEM-768 X-Wing encryption.
            </p>
            <div
              style={{
                marginTop: "16px",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                fontSize: "11px",
                lineHeight: "1.55",
                color: "#aba3ae",
                maxWidth: "340px",
              }}
            >
              Independent project built on Solana Privacy Rings. Not affiliated with Helius.
            </div>
            <a
              className="landing-footer__email"
              href="https://x.com/ZoliusVault"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "16px", color: "#ffac47", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}
            >
              <XLogo size={13} color="currentColor" />
              <span>Follow @ZoliusVault</span>
            </a>
          </div>

          {/* Protocol Column */}
          <nav className="landing-footer__column landing-footer__solutions" aria-label="Protocol">
            <h2>Protocol</h2>
            <ul>
              <li><Link href="/app">Confidential Transfers</Link></li>
              <li><Link href="/app?tab=swap">Zolius Swap</Link></li>
              <li><Link href="/app?tab=lock">Timelock Escrow</Link></li>
              <li><Link href="/app?tab=vault">Vault Notes Manager</Link></li>
              <li><Link href="/pay">Zolius Pay</Link></li>
              <li><Link href="/otc">Private OTC</Link></li>
              <li><Link href="/agents">Private Agent Payments</Link></li>
              <li><Link href="/quantum">Quantum Vault</Link></li>
            </ul>
          </nav>

          {/* Architecture Column */}
          <nav className="landing-footer__column landing-footer__resources" aria-label="Architecture">
            <h2>Architecture</h2>
            <ul>
              <li><Link href="/contracts">Solana Program IDs</Link></li>
              <li><Link href="/exposed">Wallet Exposure Checker</Link></li>
              <li><Link href="/proof">Glass vs Vault</Link></li>
              <li><a href="https://www.helius.dev/docs/privacy" target="_blank" rel="noopener noreferrer">Solana Privacy Rings</a></li>
              <li><Link href="/quantum">ML-KEM-768 Specs</Link></li>
              <li><Link href="/contracts">Verifiable Builds</Link></li>
              <li><Link href="/status">System Status</Link></li>
            </ul>
          </nav>

          {/* Security & Audits Column */}
          <nav className="landing-footer__column landing-footer__company" aria-label="Security">
            <h2>Security &amp; Audits</h2>
            <ul>
              <li><a href="https://www.certora.com" target="_blank" rel="noopener noreferrer">Certora Formal Verification</a></li>
              <li><a href="https://osec.io" target="_blank" rel="noopener noreferrer">OtterSec Security Audit</a></li>
              <li><a href="https://www.zksecurity.xyz" target="_blank" rel="noopener noreferrer">zkSecurity Circuit Audit</a></li>
              <li><a href={privacyProgram?.explorer || "https://www.helius.dev/docs/privacy"} target="_blank" rel="noopener noreferrer">Solana Privacy Program</a></li>
            </ul>
          </nav>

          {/* Legal Column */}
          <nav className="landing-footer__column landing-footer__legal" aria-label="Legal">
            <h2>Legal &amp; Policy</h2>
            <ul>
              <li><Link href="/privacy">Privacy Architecture</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/docs/decisions">Architecture Decisions</Link></li>
            </ul>
          </nav>
        </div>

        {/* Footer Bottom Row */}
        <div className="landing-footer__bottom">
          <p>© 2026 Zolius Vault. Built on Solana Privacy Rings.</p>
          <div className="landing-footer__socials">
            <a
              href="https://x.com/ZoliusVault"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <XLogo size={13} color="currentColor" />
              <span>X (Twitter)</span>
            </a>
            <a
              href="https://solscan.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span>Solana Devnet</span>
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 18 18 6M6 6h12v12" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
