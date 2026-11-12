"use client";

import React, { useState } from "react";

export const TOKEN_CONTRACT_ADDRESS = "3ozXKgY4aYsbKh3SLkzE3s7qQm1qmeNvxscc3Gh5pump";

export const HeroContractAddress: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(TOKEN_CONTRACT_ADDRESS);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = TOKEN_CONTRACT_ADDRESS;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div
      className="hero-ca-card hero-enter"
      style={{
        marginTop: "var(--space-4, 1rem)",
        marginBottom: "var(--space-2, 0.5rem)",
        width: "100%",
        maxWidth: "min(100%, 36.5rem)",
        animationDelay: "200ms",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          width: "100%",
        }}
      >
        {/* Top Meta Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
          {/* Status Label */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-muted, #555555)",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "8px",
                height: "8px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                  opacity: 0.75,
                  animation: "ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite",
                }}
              />
              <span
                style={{
                  position: "relative",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                }}
              />
            </span>
            <span>TOKEN CA (SOLANA)</span>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href={`https://pump.fun/coin/${TOKEN_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Trade token on pump.fun"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10.5px",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
                color: "#059669",
                textDecoration: "none",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "2px 7px",
                borderRadius: "5px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)";
                e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.55)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.3)";
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                }}
              />
              <span>pump.fun</span>
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3.5 1.5h7v7M10.5 1.5L1.5 10.5" />
              </svg>
            </a>

            <a
              href={`https://dexscreener.com/solana/${TOKEN_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Live Chart on DexScreener"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10.5px",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 600,
                color: "var(--color-muted, #666666)",
                textDecoration: "none",
                background: "rgba(0, 0, 0, 0.03)",
                border: "1px solid rgba(0, 0, 0, 0.09)",
                padding: "2px 7px",
                borderRadius: "5px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--color-text, #111111)";
                e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--color-muted, #666666)";
                e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.09)";
              }}
            >
              <span>DexScreener</span>
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3.5 1.5h7v7M10.5 1.5L1.5 10.5" />
              </svg>
            </a>

            <a
              href={`https://solscan.io/token/${TOKEN_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Inspect on Solscan"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10.5px",
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 600,
                color: "var(--color-muted, #666666)",
                textDecoration: "none",
                background: "rgba(0, 0, 0, 0.03)",
                border: "1px solid rgba(0, 0, 0, 0.09)",
                padding: "2px 7px",
                borderRadius: "5px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--color-text, #111111)";
                e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--color-muted, #666666)";
                e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.09)";
              }}
            >
              <span>Solscan</span>
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3.5 1.5h7v7M10.5 1.5L1.5 10.5" />
              </svg>
            </a>
          </div>
        </div>

        {/* Contract Address Interactive Card (Click to copy) */}
        <div
          onClick={handleCopy}
          role="button"
          tabIndex={0}
          title="Click to copy full contract address"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleCopy(e as any);
            }
          }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-2 sm:pl-3"
          style={{
            position: "relative",
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(12px)",
            border: copied
              ? "1px solid #10B981"
              : "1px solid rgba(26, 26, 26, 0.12)",
            borderRadius: "9px",
            cursor: "pointer",
            boxShadow: copied
              ? "0 0 0 2px rgba(16, 185, 129, 0.22), 0 4px 16px rgba(0, 0, 0, 0.04)"
              : "0 2px 10px rgba(0, 0, 0, 0.03)",
            transition: "all 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
            outline: "none",
            userSelect: "all",
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              e.currentTarget.style.borderColor = "rgba(26, 26, 26, 0.28)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.06)";
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              e.currentTarget.style.borderColor = "rgba(26, 26, 26, 0.12)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.03)";
            }
          }}
        >
          {/* Address Text - Full 44 characters, never truncated */}
          <div className="flex items-center min-w-0 flex-1">
            <span
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', ui-monospace, monospace)",
                fontSize: "clamp(10.5px, 2.2vw, 12.8px)",
                fontWeight: 600,
                letterSpacing: "0.015em",
                color: "#111111",
                wordBreak: "break-all",
                lineHeight: 1.35,
              }}
            >
              {TOKEN_CONTRACT_ADDRESS}
            </span>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Contract address copied" : "Copy contract address"}
            className="w-full sm:w-auto"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: copied
                ? "1px solid rgba(16, 185, 129, 0.35)"
                : "1px solid rgba(0, 0, 0, 0.1)",
              background: copied
                ? "rgba(16, 185, 129, 0.14)"
                : "#111111",
              color: copied ? "#059669" : "#ffffff",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              boxShadow: copied
                ? "none"
                : "0 1px 3px rgba(0, 0, 0, 0.12)",
              transition: "all 0.15s ease",
            }}
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" />
                  <path d="M9.5 4.5V2.5C9.5 1.95 9.05 1.5 8.5 1.5H2.5C1.95 1.5 1.5 1.95 1.5 2.5V8.5C1.5 9.05 1.95 9.5 2.5 9.5H4.5" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
