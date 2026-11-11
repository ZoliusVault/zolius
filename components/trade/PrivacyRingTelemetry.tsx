"use client";

import { useEffect, useState } from "react";
import { Activity, CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { getZoliusProgramStatus, SOLANA_DEVNET_RPC_URL, type ZoliusProgramName } from "@/lib/solana-programs";

type ProgramHealth = "checking" | "live" | "unavailable";

export function PrivacyRingTelemetry() {
  const [slot, setSlot] = useState<number | null>(null);
  const [rpcLive, setRpcLive] = useState<boolean | null>(null);
  const [programs, setPrograms] = useState<Record<ZoliusProgramName, ProgramHealth>>({
    lock: "checking",
    swap: "checking",
  });

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();

    const refresh = async () => {
      const [rpc, lock, swap] = await Promise.allSettled([
        fetch(SOLANA_DEVNET_RPC_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: "zolius-slot", method: "getSlot", params: [{ commitment: "confirmed" }] }),
          signal: controller.signal,
        }).then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = await response.json() as { result?: number; error?: { message?: string } };
          if (payload.error || typeof payload.result !== "number") throw new Error(payload.error?.message || "Invalid slot response");
          return payload.result;
        }),
        getZoliusProgramStatus("lock", controller.signal),
        getZoliusProgramStatus("swap", controller.signal),
      ]);

      if (!active) return;
      if (rpc.status === "fulfilled") {
        setSlot(rpc.value);
        setRpcLive(true);
      } else {
        setRpcLive(false);
      }
      setPrograms({
        lock: lock.status === "fulfilled" && lock.value.executable ? "live" : "unavailable",
        swap: swap.status === "fulfilled" && swap.value.executable ? "live" : "unavailable",
      });
      timer = setTimeout(() => void refresh(), 30_000);
    };

    void refresh();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const StatusIcon = ({ value }: { value: ProgramHealth | boolean | null }) => {
    if (value === "checking" || value === null) return <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />;
    return value === "live" || value === true
      ? <CircleCheck size={14} aria-hidden="true" />
      : <CircleAlert size={14} aria-hidden="true" />;
  };

  const stateColor = (value: ProgramHealth | boolean | null) =>
    value === "live" || value === true ? "#16814b" : value === "unavailable" || value === false ? "#b45309" : "var(--color-muted)";

  return (
    <section aria-label="Solana Privacy Rings network status" className="veil-card-white p-4 sm:p-5" style={{ display: "grid", gap: 14, background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-strong)", boxShadow: "0 12px 36px -8px rgba(26, 26, 26, 0.08)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottom: "1px solid var(--color-border)", paddingBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, color: "#b45309", background: "rgba(255,140,0,.1)" }}><Activity size={15} /></span>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontFamily: "var(--font-headline)" }}>Privacy Rings network</h3>
            <div style={{ color: "var(--color-muted)", fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: ".06em", textTransform: "uppercase" }}>Solana · Devnet</div>
          </div>
        </div>
        <span style={{ color: stateColor(rpcLive), display: "inline-flex", gap: 5, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase" }}><StatusIcon value={rpcLive} />{rpcLive === null ? "Connecting" : rpcLive ? "RPC live" : "RPC offline"}</span>
      </header>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>Confirmed slot</span>
        <strong style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{slot?.toLocaleString() ?? "—"}</strong>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {(["lock", "swap"] as const).map((program) => (
          <ProgramRow key={program} label={program === "lock" ? "Zolius Lock" : "Zolius Swap"} status={programs[program]} />
        ))}
      </div>
      <small style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>Status checks confirm RPC reachability and that each program address is executable. They do not check the deployed binary hash.</small>
    </section>
  );
}

function ProgramRow({ label, status }: { label: string; status: ProgramHealth }) {
  const color = status === "live" ? "#16814b" : status === "unavailable" ? "#b45309" : "var(--color-muted)";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "9px 10px", fontSize: 12 }}>
      <span>{label}</span>
      <span style={{ color, display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase" }}>
        {status === "checking" ? <LoaderCircle size={13} className="animate-spin" aria-hidden="true" /> : status === "live" ? <CircleCheck size={13} aria-hidden="true" /> : <CircleAlert size={13} aria-hidden="true" />}
        {status === "checking" ? "Checking" : status === "live" ? "Executable" : "Unavailable"}
      </span>
    </div>
  );
}
