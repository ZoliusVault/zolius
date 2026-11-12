"use client";

import { useEffect, useState } from "react";
import { Activity, CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";

const PRIVACY_PROGRAM = "ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW";

export function PrivacyRingTelemetry() {
  const [slot, setSlot] = useState<number | null>(null);
  const [rpcLive, setRpcLive] = useState<boolean | null>(null);
  const [programLive, setProgramLive] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/solana/rpc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify([
            { jsonrpc: "2.0", id: "slot", method: "getSlot", params: [{ commitment: "confirmed" }] },
            { jsonrpc: "2.0", id: "privacy-program", method: "getAccountInfo", params: [PRIVACY_PROGRAM, { encoding: "base64", dataSlice: { offset: 0, length: 0 }, commitment: "confirmed" }] },
          ]),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
        const rows = await response.json() as Array<{ id: string; result?: number | { value?: { executable?: boolean } | null } }>;
        const slotRow = rows.find((row) => row.id === "slot");
        const programRow = rows.find((row) => row.id === "privacy-program");
        if (typeof slotRow?.result !== "number" || !programRow?.result || typeof programRow.result === "number") throw new Error("Incomplete Mainnet RPC response");
        if (!active) return;
        setSlot(slotRow.result);
        setRpcLive(true);
        setProgramLive(programRow.result.value?.executable === true);
      } catch {
        if (!active) return;
        setRpcLive(false);
        setProgramLive(false);
      }
      timer = setTimeout(() => void refresh(), 30_000);
    };
    void refresh();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, []);

  return (
    <section aria-label="Solana Privacy Rings Mainnet status" className="veil-card-white p-4 sm:p-5" style={{ display: "grid", gap: 14, background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", boxShadow: "0 12px 36px -8px rgba(26, 26, 26, 0.08)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottom: "1px solid var(--color-border)", paddingBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, color: "#b45309", background: "rgba(255,140,0,.1)" }}><Activity size={15} /></span>
          <div><h3 style={{ margin: 0, fontSize: 14, fontFamily: "var(--font-headline)" }}>Privacy Rings network</h3><div style={{ color: "var(--color-muted)", fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: ".06em", textTransform: "uppercase" }}>Solana · Mainnet</div></div>
        </div>
        <span style={{ color: rpcLive ? "#16814b" : rpcLive === false ? "#b45309" : "var(--color-muted)", display: "inline-flex", gap: 5, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase" }}>{rpcLive === null ? <LoaderCircle size={14} className="animate-spin" /> : rpcLive ? <CircleCheck size={14} /> : <CircleAlert size={14} />}{rpcLive === null ? "Connecting" : rpcLive ? "RPC live" : "RPC offline"}</span>
      </header>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}><span style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>Confirmed slot</span><strong style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{typeof slot === "number" ? slot.toLocaleString() : "—"}</strong></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "9px 10px", fontSize: 12 }}><span>Helius Privacy Program</span><strong style={{ color: programLive ? "#16814b" : "#b45309", fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase" }}>{programLive ? "Executable" : "Unavailable"}</strong></div>
      <small style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>Live RPC reachability and executable Mainnet protocol account checks.</small>
    </section>
  );
}
