"use client";

import { ArrowRight, ShieldAlert } from "lucide-react";
import { Panel } from "./Shared";

export default function OtcClient() {
  return (
    <div className="np-content">
      <Panel eyebrow="Mainnet availability" title="Private OTC is paused">
        <p className="np-muted">Zolius Swap has no Mainnet deployment. Quote creation and settlement stay disabled while its production program is being built.</p>
        <div className="np-note"><ShieldAlert size={15} style={{ verticalAlign: "middle", marginRight: 7 }} />The current Zolius Lock and Swap verifier keys are development-only. This Mainnet app uses Helius Privacy Rings for private deposits, transfers, and withdrawals.</div>
        <div className="np-actions"><a className="np-button" href="/app">Open Privacy Rings <ArrowRight size={14} /></a></div>
      </Panel>
    </div>
  );
}
