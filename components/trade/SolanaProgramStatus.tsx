"use client";

import { useEffect, useState } from "react";
import {
  getZoliusProgramStatus,
  type SolanaProgramStatus as ProgramStatus,
  type ZoliusProgramName,
} from "@/lib/solana-programs";

interface SolanaProgramStatusProps {
  program: ZoliusProgramName;
}

export function SolanaProgramStatus({ program }: SolanaProgramStatusProps) {
  const [status, setStatus] = useState<ProgramStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus(null);
    setError(null);
    getZoliusProgramStatus(program, controller.signal)
      .then(setStatus)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not read Devnet program status");
      });
    return () => controller.abort();
  }, [program]);

  const label = program === "lock" ? "Zolius Lock" : "Zolius Swap";
  const connected = status?.executable === true;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--color-border)",
        background: "rgba(26, 26, 26, 0.025)",
        color: "var(--color-muted)",
        fontSize: "11px",
        lineHeight: 1.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontWeight: 700, color: connected ? "#16814b" : "var(--color-text)" }}>
          {error ? "Devnet check failed" : status ? `${label} live on Devnet` : `Connecting ${label}…`}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
          {status ? "Upgradeable Loader" : "Solana Devnet"}
        </span>
      </div>
      <div style={{ marginTop: 3, overflowWrap: "anywhere", fontFamily: "var(--font-mono)" }}>
        {error || status?.programId || "Reading program account…"}
      </div>
    </div>
  );
}
