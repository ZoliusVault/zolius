"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { SHIELDED_POOL_PROGRAM_ID } from "@heliuslabs/spr";
import { SOLANA_DEVNET_RPC_URL, ZOLIUS_SOLANA_PROGRAMS } from "@/lib/solana-programs";

type Row = { name: string; address: string; status: "Checking" | "Executable" | "Not found" | "Check failed" };

async function checkProgram(address: string): Promise<Row["status"]> {
  const response = await fetch(SOLANA_DEVNET_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: address, method: "getAccountInfo", params: [address, { encoding: "base64", commitment: "confirmed", dataSlice: { offset: 0, length: 0 } }] }),
  });
  if (!response.ok) throw new Error("RPC unavailable");
  const payload = await response.json() as { result?: { value?: { executable?: boolean } | null }; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message || "RPC request failed");
  return payload.result?.value?.executable ? "Executable" : "Not found";
}

export default function ContractsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const programs = [
    { name: "Helius Privacy Ring", address: SHIELDED_POOL_PROGRAM_ID },
    { name: "Helius User Registry", address: "regy3WAeRXMYuMYxr5iK3Bf9Arr3PcxGxyzAddbiqDQ" },
    { name: "Zolius Lock · Devnet", address: ZOLIUS_SOLANA_PROGRAMS.lock },
    { name: "Zolius Swap · Devnet", address: ZOLIUS_SOLANA_PROGRAMS.swap },
  ];

  const refresh = async () => {
    setLoading(true);
    setRows(programs.map((program) => ({ ...program, status: "Checking" })));
    const checked = await Promise.all(programs.map(async (program) => {
      try { return { ...program, status: await checkProgram(program.address) }; }
      catch { return { ...program, status: "Check failed" as const }; }
    }));
    setRows(checked);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 72px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div><div style={{ color: "#64748b", font: "12px monospace", letterSpacing: ".08em", textTransform: "uppercase" }}>Solana Devnet</div><h1 style={{ margin: "10px 0", fontSize: 34 }}>Program addresses</h1><p style={{ maxWidth: 620, color: "#64748b", lineHeight: 1.6, fontSize: 14 }}>Live account checks for the Privacy Ring and Zolius programs. This confirms an executable account exists at each address; it does not represent an audit or a source-to-binary build match.</p></div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="lp-btn lp-btn--outline" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 12px" }}><RefreshCw size={15} />{loading ? "Checking…" : "Refresh"}</button>
      </div>
      <div style={{ display: "grid", gap: 12 }}>{rows.map((row) => <article key={row.address} style={{ padding: 18, border: "1px solid var(--color-border, #e7e5e4)", borderRadius: 12, background: "#fff" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}><strong>{row.name}</strong><span style={{ color: row.status === "Executable" ? "#15803d" : row.status === "Checking" ? "#64748b" : "#b45309", fontSize: 12, fontWeight: 700 }}>{row.status}</span></div><code style={{ fontSize: 12, color: "#475569", overflowWrap: "anywhere" }}>{row.address}</code><div style={{ marginTop: 12 }}><a href={`https://explorer.solana.com/address/${row.address}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>Open in Solana Explorer <ExternalLink size={13} /></a></div></article>)}</div>
      <p style={{ marginTop: 18, color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>The Zolius Lock and Swap programs are Devnet experiments. Their custom browser transaction builders are not connected in this app yet; the active workstation currently uses Helius Privacy Rings for native SOL actions.</p>
    </main>
  );
}
