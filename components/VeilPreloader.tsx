"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, Terminal } from "lucide-react";

export const VeilPreloader: React.FC = () => {
  const [stage, setStage] = useState<"active" | "fading" | "hidden">("active");
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Check reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("hidden");
      return;
    }

    // Check if shown previously this session
    if (sessionStorage.getItem("veil_preloader_seen")) {
      setStage("hidden");
      return;
    }

    const messages = [
      "INITIALIZING SOLANA MAINNET-BETA RPC...",
      "CONNECTING SOLANA PRIVACY RINGS CORE PROGRAM (ring1GaL...)",
      "LOADING HYBRID ML-KEM-768 QUANTUM VAULT PARAMETERS...",
      "ESTABLISHING HELIUS PRIVACY API COMPRESSION ROUTE...",
      "ZERO-SERVER CUSTODY ACTIVE. VIEWING KEYS ENCRYPTED WITH X-WING.",
      "ZOLIUS VAULT INITIALIZED. CONFIDENTIAL ON-CHAIN TRANSFERS ACTIVE.",
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < messages.length) {
        setLogs((prev) => [...prev, messages[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => setStage("fading"), 350);
        setTimeout(() => {
          setStage("hidden");
          sessionStorage.setItem("veil_preloader_seen", "true");
        }, 850);
      }
    }, 180);

    return () => clearInterval(interval);
  }, []);

  if (stage === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl transition-opacity duration-500 ${
        stage === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-xl p-8 mx-4 rounded-3xl border border-emerald-500/30 bg-slate-950/90 shadow-2xl shadow-emerald-950/40 relative overflow-hidden">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <span className="font-bold tracking-widest text-sm text-white">ZOLIUS PROTOCOL</span>
              <p className="text-[10px] font-mono text-emerald-400">CONFIDENTIAL TRANSFERS ON SOLANA</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-emerald-400" /> SYSTEM BOOT
          </span>
        </div>

        {/* Terminal Logs */}
        <div className="space-y-2 font-mono text-xs text-slate-300 min-h-[160px]">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold select-none">&gt;</span>
              <span className={idx === logs.length - 1 ? "text-emerald-300 font-semibold" : "text-slate-400"}>
                {log}
              </span>
            </div>
          ))}
          {stage === "active" && (
            <div className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-4" />
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>SOLANA MAINNET-BETA · PRIVACY RINGS</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Sparkles className="w-3 h-3" /> READY FOR EXECUTION
          </span>
        </div>
      </div>
    </div>
  );
};
