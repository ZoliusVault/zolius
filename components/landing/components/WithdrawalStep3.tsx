"use client";

import React, { useState, useEffect } from "react";
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
      {/* Terminal Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          borderBottom: "1px solid var(--color-hairline)",
          paddingBottom: "var(--space-4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "var(--radius-full)",
                background: "var(--color-border-strong)",
                display: "inline-block",
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "var(--radius-full)",
                background: "var(--color-border-strong)",
                display: "inline-block",
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "var(--radius-full)",
                background: "var(--color-border-strong)",
                display: "inline-block",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "var(--text-body)",
              fontWeight: 500,
              color: "var(--color-text)",
            }}
          >
            ZK Withdrawal Terminal // Decoupled Exit
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
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
            {current.noteId} · <CountUp value={current.grossAmount} />
          </div>
        </div>
      </div>

      {/* 4-Stage Stepper Progress Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--space-3)" }}>
        {[
          { num: "01", title: "Membership", sub: "WASM Tree Proof" },
          { num: "02", title: "Nullifier", sub: "Poseidon Hash" },
          { num: "03", title: "Execution", sub: "Client Self-Relay" },
          { num: "04", title: "Settled", sub: "Unlinked Exit" },
        ].map((st, i) => {
          const isPassed = stage > i + 1;
          const isCurrent = stage === i + 1;
          const isDone = isPassed || isCurrent;

          return (
            <div
              key={st.num}
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
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "18px" }}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "var(--text-caption)",
                    color: isDone ? "var(--color-accent)" : "var(--color-faint)",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {st.num}
                </span>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: isCurrent || isPassed ? "var(--color-accent)" : "rgba(26, 26, 26, 0.15)",
                    transition: "background-color 0.2s ease",
                    display: "inline-block",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 600,
                  color: isDone ? "var(--color-text)" : "var(--color-muted)",
                }}
              >
                {st.title}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "var(--text-caption)",
                  color: "var(--color-muted)",
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
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
            <span style={{ color: "var(--color-accent)", fontWeight: 700 }}>●</span>
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
            <span style={{ color: "var(--color-accent)", fontWeight: 700 }}>●</span>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "var(--space-3)",
            paddingTop: "var(--space-2)",
            borderTop: "1px dashed var(--color-hairline)",
          }}
        >
          <div>
            <div style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)" }}>Gross Amount</div>
            <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 600 }}>
              <CountUp value={current.grossAmount} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)" }}>Protocol Route</div>
            <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 600 }}>
              Client Self-Relay
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)" }}>Intermediary Markup</div>
            <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 600, color: "var(--color-text)" }}>
              0 BPS (Direct)
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--text-caption)", color: "var(--color-muted)" }}>Net Delivered</div>
            <div style={{ fontFamily: "monospace", fontSize: "var(--text-body-sm)", fontWeight: 700, color: "var(--color-accent)" }}>
              <CountUp value={current.netDelivered} />
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Stage Status Banner */}
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
          minHeight: "56px",
          boxSizing: "border-box",
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
