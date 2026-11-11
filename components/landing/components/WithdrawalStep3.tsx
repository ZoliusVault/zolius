"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, KeyRound, Cpu, CheckCircle2, Check, ArrowUpRight } from "lucide-react";
import { CountUp } from "./CountUp";

interface WithdrawalCycleData {
  noteId: string;
  grossAmount: string;
  relayerFee: string;
  netDelivered: string;
  token: string;
  recipient: string;
  relayer: string;
  nullifierHash: string;
}

const WITHDRAWAL_CYCLES: WithdrawalCycleData[] = [
  {
    noteId: "Solana Confidential SOL",
    grossAmount: "10.00 SOL",
    relayerFee: "Self-Relay (0.00)",
    netDelivered: "10.00 SOL",
    token: "SOL",
    recipient: "7xKp...9Wz2",
    relayer: "Self (Wallet)",
    nullifierHash: "5q98a1...44bc",
  },
  {
    noteId: "Privacy Rings USDC",
    grossAmount: "500.00 USDC",
    relayerFee: "Self-Relay (0.00)",
    netDelivered: "500.00 USDC",
    token: "USDC",
    recipient: "F3qL...1mE9",
    relayer: "Self (Wallet)",
    nullifierHash: "8b04ea...127f",
  },
  {
    noteId: "Token-2022 Shielded Note",
    grossAmount: "25.50 SOL",
    relayerFee: "Self-Relay (0.00)",
    netDelivered: "25.50 SOL",
    token: "SOL",
    recipient: "9aYb...4uTx",
    relayer: "Self (Wallet)",
    nullifierHash: "d9271a...9910",
  },
  {
    noteId: "Solana Shielded USDC",
    grossAmount: "1,250.00 USDC",
    relayerFee: "Self-Relay (0.00)",
    netDelivered: "1,250.00 USDC",
    token: "USDC",
    recipient: "3pNz...8vKq",
    relayer: "Self (Wallet)",
    nullifierHash: "192afc...e432",
  },
];

const WITHDRAWAL_STAGES = [
  { tag: "VERIFY", icon: ShieldCheck, title: "Membership", sub: "WASM Tree Proof" },
  { tag: "NULLIFY", icon: KeyRound, title: "Nullifier", sub: "Poseidon Hash" },
  { tag: "RELAY", icon: Cpu, title: "Execution", sub: "Client Self-Relay" },
  { tag: "SETTLED", icon: CheckCircle2, title: "Settled", sub: "Unlinked Exit" },
];

export const WithdrawalStep3: React.FC = () => {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [stage, setStage] = useState(1); // 1 = tree proof, 2 = nullifier, 3 = relayer broadcast, 4 = settled

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
        setCycleIndex((prev) => (prev + 1) % WITHDRAWAL_CYCLES.length);
      }, 2600);
    }

    return () => clearTimeout(timer);
  }, [stage]);

  const current = WITHDRAWAL_CYCLES[cycleIndex];

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
      {/* Terminal Header — Locked height with nowrap to prevent any layout jumping */}
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
              SOLANA RING
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
            ZK Withdrawal Terminal // Decoupled Exit
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
              Settlement stream
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
            <CountUp value={current.grossAmount} />
          </div>
        </div>
      </div>

      {/* 4-Stage Stepper Progress Strip — Semantic badges & icons, no numbers or dots */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)" }}>
        {WITHDRAWAL_STAGES.map((st, i) => {
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

      {/* Proof Circuit Verification Badges */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-3)",
        }}
      >
        <div
          style={{
            background: "var(--color-surface)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-hairline)",
            minHeight: "74px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-caption)",
              color: "var(--color-muted)",
              marginBottom: 4,
            }}
          >
            Selected Shielded Note
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "var(--text-body-sm)",
              fontWeight: 600,
              color: "var(--color-text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {current.noteId} (<CountUp value={current.grossAmount} />)
          </div>
        </div>

        <div
          style={{
            background: "var(--color-surface)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-hairline)",
            minHeight: "74px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-caption)",
              color: "var(--color-muted)",
              marginBottom: 4,
            }}
          >
            Merkle Tree Proof
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "var(--text-body-sm)",
              fontWeight: 600,
              color: "var(--color-text)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <Check size={12} style={{ color: "var(--color-accent)", strokeWidth: 2.5, flexShrink: 0 }} />
            LeanIMT Depth 20 · Valid
          </div>
        </div>

        <div
          style={{
            background: "var(--color-surface)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-hairline)",
            minHeight: "74px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-caption)",
              color: "var(--color-muted)",
              marginBottom: 4,
            }}
          >
            Association Set
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "var(--text-body-sm)",
              fontWeight: 600,
              color: "var(--color-text)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <Check size={12} style={{ color: "var(--color-accent)", strokeWidth: 2.5, flexShrink: 0 }} />
            ASP Self-Attested · Active
          </div>
        </div>
      </div>

      {/* Recipient Input and Calculation Box */}
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-4)",
          border: "1px solid var(--color-hairline)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <label
              htmlFor="zolius-withdrawal-address"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body-sm)",
                color: "var(--color-text)",
                fontWeight: 500,
              }}
            >
              Destination Address (Brand New / Unlinked)
            </label>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "var(--text-caption)",
                color: "var(--color-muted)",
              }}
            >
              Execution: {current.relayer}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--color-panel)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-hairline)",
            }}
          >
            <input
              id="zolius-withdrawal-address"
              type="text"
              readOnly
              value={current.recipient}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "monospace",
                fontSize: "var(--text-body-sm)",
                color: "var(--color-text)",
                width: "100%",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-caption)",
                color: "var(--color-muted)",
                whiteSpace: "nowrap",
                marginLeft: "var(--space-2)",
              }}
            >
              Fresh Wallet
            </span>
          </div>
        </div>

        {/* Financial Settlement Breakdown */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "var(--space-3)",
            paddingTop: "var(--space-2)",
            borderTop: "1px dashed var(--color-hairline)",
          }}
        >
          <div>
            <div style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)", whiteSpace: "nowrap" }}>Gross Amount</div>
            <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 600, whiteSpace: "nowrap" }}>
              <CountUp value={current.grossAmount} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)", whiteSpace: "nowrap" }}>Protocol Route</div>
            <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Client Self-Relay
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)", whiteSpace: "nowrap" }}>Intermediary Markup</div>
            <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap" }}>
              0 BPS (Direct)
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)", whiteSpace: "nowrap" }}>Net Delivered</div>
            <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 700, color: "var(--color-accent)", whiteSpace: "nowrap" }}>
              <CountUp value={current.netDelivered} />
            </div>
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
          {stage === 1 && `Proving Merkle membership locally in WASM for ${current.noteId}...`}
          {stage === 2 && `Deriving Poseidon nullifier hash (${current.nullifierHash}) to prevent double-spending...`}
          {stage === 3 && `Broadcasting transaction via wallet to Solana Mainnet-Beta...`}
          {stage === 4 && `Settled! ${current.netDelivered} delivered to ${current.recipient} via client-side Groth16 proof.`}
        </span>

        <span
          style={{
            fontFamily: "monospace",
            fontSize: "var(--text-caption)",
            color: "var(--color-faint)",
            whiteSpace: "nowrap",
          }}
        >
          Client Self-Relay
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
          {["Non-Custodial", "Client Self-Relay", "Decoupled Pool State"].map((t) => (
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
            Cycle {cycleIndex + 1}/{WITHDRAWAL_CYCLES.length}
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

export default WithdrawalStep3;
