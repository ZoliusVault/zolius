"use client";

import React, { useState, useEffect } from "react";
import { KeyRound, Hash, ShieldCheck, CheckCircle2 } from "lucide-react";
import { CountUp } from "./CountUp";

interface CycleData {
  amount: string;
  token: string;
  leafIndex: number;
  secretEntropy: string;
  poseidonHash: string;
  notesInPool: string;
}

const CYCLES: CycleData[] = [
  {
    amount: "250.00 USDC",
    token: "USDC",
    leafIndex: 4813,
    secretEntropy: "7xKp9W...9b12",
    poseidonHash: "82b49c...e71a",
    notesInPool: "4,813",
  },
  {
    amount: "5.00 SOL",
    token: "SOL",
    leafIndex: 4814,
    secretEntropy: "3e18c2...47d0",
    poseidonHash: "41f90a...99bc",
    notesInPool: "4,814",
  },
  {
    amount: "1,000 USDC",
    token: "USDC",
    leafIndex: 4815,
    secretEntropy: "91d044...e391",
    poseidonHash: "1b87fc...88ff",
    notesInPool: "4,815",
  },
  {
    amount: "15.00 SOL",
    token: "SOL",
    leafIndex: 4816,
    secretEntropy: "5ac7e1...72ef",
    poseidonHash: "99e2bc...12aa",
    notesInPool: "4,816",
  },
];

const SHIELD_STAGES = [
  { tag: "ENTROPY", icon: KeyRound, title: "Key Gen", sub: "CSPRNG Entropy" },
  { tag: "POSEIDON", icon: Hash, title: "Poseidon", sub: "Leaf Hash" },
  { tag: "RING-SIG", icon: ShieldCheck, title: "Ring Sig", sub: "0-Held Balance" },
  { tag: "SETTLED", icon: CheckCircle2, title: "Settled", sub: "Privacy Ring" },
];

export const ShieldConsoleStep1: React.FC = () => {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [stage, setStage] = useState(1); // 1 = key gen, 2 = commitment, 3 = ring signature, 4 = settled

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (stage === 1) {
      timer = setTimeout(() => setStage(2), 1200);
    } else if (stage === 2) {
      timer = setTimeout(() => setStage(3), 1200);
    } else if (stage === 3) {
      timer = setTimeout(() => setStage(4), 1200);
    } else if (stage === 4) {
      timer = setTimeout(() => {
        setStage(1);
        setCycleIndex((prev) => (prev + 1) % CYCLES.length);
      }, 2600);
    }

    return () => clearTimeout(timer);
  }, [stage]);

  const current = CYCLES[cycleIndex];

  return (
    <div
      data-diag-panel="true"
      style={{
        background: "#ffffff",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 4px 20px -2px rgba(26, 26, 26, 0.05)",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
        boxSizing: "border-box",
        position: "relative",
        minHeight: "480px",
      }}
    >
      {/* Terminal Window Header Bar — Locked height & nowrap */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "nowrap",
          gap: "var(--space-3)",
          borderBottom: "1px solid var(--color-hairline)",
          paddingBottom: "var(--space-4)",
          minHeight: "44px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 8px",
              borderRadius: "4px",
              backgroundColor: "rgba(255, 140, 0, 0.08)",
              border: "1px solid rgba(255, 140, 0, 0.22)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "10px",
                fontWeight: 700,
                color: "#FF8C00",
                letterSpacing: "0.06em",
              }}
            >
              SOLANA PIPELINE
            </span>
          </div>

          <span
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "var(--text-body)",
              fontWeight: 500,
              color: "var(--color-text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Zolius Confidential Pipeline // Solana Privacy Rings
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0, whiteSpace: "nowrap" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "var(--color-surface)",
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-hairline)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-caption)",
                color: "var(--color-text)",
                fontWeight: 500,
              }}
            >
              Simulated demo
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "var(--color-surface)",
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-hairline)",
              fontFamily: "monospace",
              fontSize: "var(--text-caption)",
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            <CountUp value={current.amount} />
          </div>
        </div>
      </div>

      {/* 4-Stage Stepper Progress Strip — Semantic badges & icons, no numbers or dots */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)" }}>
        {SHIELD_STAGES.map((st, i) => {
          const isPassed = stage > i + 1;
          const isCurrent = stage === i + 1;
          const isDone = isPassed || isCurrent;
          const Icon = st.icon;

          return (
            <div
              key={st.tag}
              style={{
                background: "var(--color-surface)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-sm)",
                border: isCurrent
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--color-hairline)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
                transition: "all 0.25s ease",
                minHeight: "82px",
                boxSizing: "border-box",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "18px" }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10px",
                    color: isCurrent ? "var(--color-accent)" : isPassed ? "#059669" : "var(--color-faint)",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    lineHeight: 1,
                  }}
                >
                  [{st.tag}]
                </span>
                <Icon
                  size={13}
                  style={{
                    color: isCurrent ? "var(--color-accent)" : isPassed ? "#059669" : "rgba(26, 26, 26, 0.2)",
                    transition: "color 0.2s ease",
                    flexShrink: 0,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 600,
                  color: isDone ? "var(--color-text)" : "var(--color-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {st.title}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "var(--text-caption)",
                  color: "var(--color-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {st.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Telemetry Readout Grid — Locked row heights & nowrap to eliminate jumping */}
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-4)",
          border: "1px solid var(--color-hairline)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--space-3)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ minHeight: "44px", boxSizing: "border-box" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-caption)", color: "var(--color-muted)", marginBottom: 4, whiteSpace: "nowrap" }}>
            Depositor Asset
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <CountUp value={current.amount} />
          </div>
        </div>

        <div style={{ minHeight: "44px", boxSizing: "border-box" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-caption)", color: "var(--color-muted)", marginBottom: 4, whiteSpace: "nowrap" }}>
            Client Secret (s)
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--color-accent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {stage >= 1 ? current.secretEntropy : "0x••••••••••••"}
          </div>
        </div>

        <div style={{ minHeight: "44px", boxSizing: "border-box" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-caption)", color: "var(--color-muted)", marginBottom: 4, whiteSpace: "nowrap" }}>
            Poseidon Leaf C(s,n)
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {stage >= 2 ? current.poseidonHash : "Pending Derivation"}
          </div>
        </div>

        <div style={{ minHeight: "44px", boxSizing: "border-box" }}>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-caption)", color: "var(--color-muted)", marginBottom: 4, whiteSpace: "nowrap" }}>
            Router Invariant
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "var(--text-body-sm)",
              fontWeight: 600,
              color: stage >= 3 ? "var(--color-accent)" : "var(--color-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {stage >= 3 ? "0.0000 [VERIFIED]" : "0.0000 [CHECK]"}
          </div>
        </div>
      </div>

      {/* Real-time Stage Status Banner — Locked height */}
      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-sm)",
          borderLeft: "3px solid var(--color-accent)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          gap: "var(--space-3)",
          height: "58px",
          minHeight: "58px",
          maxHeight: "58px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-caption)",
            color: "var(--color-text)",
            fontWeight: 500,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {stage === 1 && "Synthesizing CSPRNG note entropy locally via WebAssembly..."}
          {stage === 2 && "Computing Poseidon Merkle leaf commitment & zkSNARK proof..."}
          {stage === 3 && "Solana ring signature verified · Program holds 0 custodial balance"}
          {stage === 4 && `Settled! Note #${current.leafIndex} inscribed in Depth-20 LeanIMT · Association pool: ${current.notesInPool} notes`}
        </span>

        <span
          style={{
            fontFamily: "monospace",
            fontSize: "var(--text-caption)",
            color: "var(--color-faint)",
            whiteSpace: "nowrap",
          }}
        >
          Depth <CountUp value={20} /> LeanIMT
        </span>
      </div>

      {/* Footer Protocol Tags & Loop Countdown */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          borderTop: "1px dashed var(--color-hairline)",
          paddingTop: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {["Client WASM", "0-Held Balance", "Atomic Inscription"].map((t) => (
            <span
              key={t}
              style={{
                fontFamily: "monospace",
                fontSize: "var(--text-caption)",
                color: "var(--color-muted)",
                background: "var(--color-surface)",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-hairline)",
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontFamily: "monospace", fontSize: "var(--text-caption)", color: "var(--color-faint)" }}>
            Cycle {cycleIndex + 1}/{CYCLES.length}
          </span>
          <div
            style={{
              width: "48px",
              height: "4px",
              backgroundColor: "rgba(26, 26, 26, 0.1)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: stage === 4 ? "100%" : `${(stage / 4) * 100}%`,
                backgroundColor: "var(--color-accent)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShieldConsoleStep1;
