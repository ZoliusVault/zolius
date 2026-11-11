"use client";

import React from "react";
import { SectionHeader } from "./SectionHeader";
import { RevealBox } from "./RevealBox";

const rows = [
  ["Private Ring balance", "Hidden from public observers"],
  ["Private transfer asset and amount", "Encrypted in the default Ring"],
  ["Sender and recipient addresses", "Visible on Solana"],
  ["Deposit and withdrawal", "Public transactions; amount is visible"],
  ["Quantum Vault direction", "Post-quantum viewing-key protection"],
];

export const ComparisonSection: React.FC = () => (
  <section id="transparency" style={{ padding: "var(--section-y) var(--page-gutter)" }}>
    <SectionHeader kicker="Visibility guide" title="Confidential amounts, visible wallets." sub="The default Privacy Ring encrypts assets and amounts for private transfers. Deposit and withdrawal details, including sender or destination, remain public." titleMaxW="26ch" kickerColor="#FF8C00" />
    <RevealBox y={24} style={{ marginTop: "var(--space-8)", overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480, textAlign: "left" }}>
        <thead><tr><th style={{ padding: 16, color: "var(--color-muted)", fontSize: 12, borderBottom: "1px solid var(--color-border)" }}>Flow or data</th><th style={{ padding: 16, color: "var(--color-muted)", fontSize: 12, borderBottom: "1px solid var(--color-border)" }}>What is visible</th></tr></thead>
        <tbody>{rows.map(([flow, visibility]) => <tr key={flow}><th scope="row" style={{ padding: 16, fontSize: 13, fontWeight: 600, borderBottom: "1px solid var(--color-border)" }}>{flow}</th><td style={{ padding: 16, color: "var(--color-muted)", fontSize: 13, borderBottom: "1px solid var(--color-border)" }}>{visibility}</td></tr>)}</tbody>
      </table>
    </RevealBox>
  </section>
);
