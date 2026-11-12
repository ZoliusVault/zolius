"use client";

import React, { useState } from "react";

export const TOKEN_CONTRACT_ADDRESS = "3ozXKgY4aYsbKh3SLkzE3s7qQm1qmeNvxscc3Gh5pump";

export const HeroContractAddress: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      onClick={handleCopy}
      title="Click to copy CA"
      className="hero-enter"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        marginTop: "var(--space-4, 1rem)",
        cursor: "pointer",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "clamp(14px, 2vw, 17.5px)",
        lineHeight: 1.4,
        color: "var(--color-text, #111111)",
        userSelect: "all",
        maxWidth: "100%",
        flexWrap: "wrap",
        animationDelay: "180ms",
      }}
    >
      <span style={{ color: "var(--color-muted, #666666)", fontWeight: 700, letterSpacing: "0.04em" }}>CA:</span>
      <span style={{ fontWeight: 700, wordBreak: "break-all", letterSpacing: "0.025em" }}>
        {TOKEN_CONTRACT_ADDRESS}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "13px",
          color: copied ? "#10B981" : "var(--color-muted, #666666)",
          fontWeight: 700,
          transition: "color 0.15s ease",
          flexShrink: 0,
        }}
      >
        {copied ? (
          <>
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
            </svg>
            <span>Copied!</span>
          </>
        ) : (
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ opacity: 0.85 }}>
            <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" />
            <path d="M9.5 4.5V2.5C9.5 1.95 9.05 1.5 8.5 1.5H2.5C1.95 1.5 1.5 1.95 1.5 2.5V8.5C1.5 9.05 1.95 9.5 2.5 9.5H4.5" />
          </svg>
        )}
      </span>
    </div>
  );
};
