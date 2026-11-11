"use client";

import React from "react";
import Link from "next/link";
import { ZoliusLogo } from "../../VeilLogo";
import { XLogo } from "../../TokenLogos";

export const Header: React.FC = () => {
  return (
    <header
      role="banner"
      className="hero-enter"
      style={{
        position: "relative",
        zIndex: 3,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-5) var(--page-gutter)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <ZoliusLogo href="/" size="md" />

      <nav
        aria-label="Primary"
        className="flex items-center gap-3 sm:gap-4 md:gap-6"
        style={{
          fontSize: "var(--text-body-sm)",
          fontFamily: "var(--font-body)",
        }}
      >
        <a
          href="#how"
          className="lp-link hidden lg:inline-block"
          style={{
            color: "var(--color-muted)",
            textDecoration: "none",
            transition: "opacity var(--duration-fast)",
          }}
        >
          How It Works
        </a>
        <a
          href="#transparency"
          className="lp-link hidden lg:inline-block"
          style={{
            color: "var(--color-muted)",
            textDecoration: "none",
            transition: "opacity var(--duration-fast)",
          }}
        >
          Visibility Guide
        </a>
        <Link
          href="/app?tab=swap"
          className="lp-link hidden md:inline-block"
          style={{
            color: "var(--color-muted)",
            textDecoration: "none",
            transition: "opacity var(--duration-fast)",
          }}
        >
          Swap
        </Link>
        <Link
          href="/app?tab=lock"
          className="lp-link hidden xl:inline-block"
          style={{
            color: "var(--color-muted)",
            textDecoration: "none",
            transition: "opacity var(--duration-fast)",
          }}
        >
          Lock
        </Link>
        <Link
          href="/quantum"
          className="lp-link hidden sm:inline-flex items-center gap-1.5"
          style={{
            color: "var(--color-muted)",
            textDecoration: "none",
            transition: "opacity var(--duration-fast)",
          }}
        >
          <span>Quantum Vault</span>
          <span
            style={{
              fontSize: "9px",
              fontFamily: "monospace",
              padding: "1px 5px",
              borderRadius: "4px",
              backgroundColor: "rgba(255, 140, 0, 0.15)",
              color: "var(--color-accent)",
              fontWeight: 700,
            }}
          >
            ML-KEM
          </span>
        </Link>

        {/* Action Group: Official X Button + Launch Vault */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <a
            href="https://x.com/zoliusvault"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Official X (Twitter) Account @zoliusvault"
            title="Official X: @zoliusvault"
            className="lp-btn lp-btn--filled hidden sm:inline-flex"
            style={{
              width: "2.25rem",
              height: "2.25rem",
              minHeight: "2.25rem",
              padding: 0,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XLogo size={15} color="currentColor" />
          </a>

          <Link
            href="/app"
            className="lp-btn lp-btn--filled"
            style={{
              minHeight: "2.25rem",
              height: "2.25rem",
              padding: "0 var(--space-4)",
              fontSize: "var(--text-body-sm)",
              fontWeight: 600,
            }}
          >
            <span>Launch Vault</span>
            <svg
              width="11"
              height="11"
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
      </nav>
    </header>
  );
};
