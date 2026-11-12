"use client";

import { ArrowRight, ShieldAlert } from "lucide-react";
import { Panel } from "./Shared";

export default function OtcClient() {
  return (
    <div className="np-content">
      <Panel eyebrow="Mainnet availability" title="Private OTC is paused">
        <p className="np-muted">The production Zolius Swap verifier and browser proving keys are prepared. Quote creation and settlement stay disabled until the Mainnet program is funded, deployed, and verified.</p>
        <div className="np-note"><ShieldAlert size={15} style={{ verticalAlign: "middle", marginRight: 7 }} />Private deposits, transfers, and withdrawals are live through Helius Privacy Rings. Zolius Lock and Swap will activate after their Mainnet deployment.</div>
        <div className="np-actions"><a className="np-button" href="/app">Open Privacy Rings <ArrowRight size={14} /></a></div>
      </Panel>
    </div>
  );
}
