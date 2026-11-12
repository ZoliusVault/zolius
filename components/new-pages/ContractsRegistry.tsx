"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import registry from "@/lib/contracts.json";
import { MainnetBadge, ExplorerLink, PageBottomLinks, PageHero, Panel } from "./Shared";

type Status = "checking" | "executable" | "missing" | "error";

export default function ContractsRegistry() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState("");

  const refresh = async () => {
    setChecking(true);
    setStatuses(Object.fromEntries(registry.programs.map((program) => [program.id, "checking" as Status])));
    try {
      const response = await fetch("/api/solana/rpc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(registry.programs.map((program) => ({
          jsonrpc: "2.0", id: program.id, method: "getAccountInfo",
          params: [program.address, { encoding: "base64", commitment: "confirmed", dataSlice: { offset: 0, length: 0 } }],
        }))),
      });
      const rows = await response.json();
      const list = Array.isArray(rows) ? rows : [rows];
      const next = Object.fromEntries(list.map((row: any) => [row.id, row.error ? "error" : row.result?.value?.executable ? "executable" : "missing"]));
      setStatuses(next);
    } catch {
      setStatuses(Object.fromEntries(registry.programs.map((program) => [program.id, "error" as Status])));
    } finally {
      setChecking(false);
    }
  };

  const copy = async (address: string, key: string) => {
    await navigator.clipboard.writeText(address);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1600);
  };

  return (
    <div className="np-page">
      <PageHero eyebrow="Trust directory / official addresses" title="Contracts Registry" aside={<MainnetBadge />}>
        This page is the canonical source for addresses used by the current Zolius app. The listed Helius Privacy Program address is checked against Solana Mainnet. Zolius Lock and Swap are not deployed on Mainnet.
      </PageHero>
      <div className="np-content np-grid">
        <div className="np-note">Only trust addresses published here. Zolius Vault is an independent project built on Solana Privacy Rings and is not affiliated with Helius.</div>
        <Panel eyebrow="Current network" title="Mainnet protocol registry">
          <div className="np-table-wrap">
            <table className="np-table">
              <thead><tr><th>Program</th><th>Address</th><th>Runtime status</th><th>Build / authority</th></tr></thead>
              <tbody>{registry.programs.map((program) => {
                const status = statuses[program.id];
                const label = status === "executable" ? "Executable" : status === "checking" ? "Checking" : status === "missing" ? "Not found" : "Not checked";
                return <tr key={program.id}>
                  <td><strong>{program.name}</strong><div className="np-small">{program.kind} · {program.operator}</div></td>
                  <td><span className="np-address">{program.address}</span><div className="np-actions" style={{ marginTop: 7 }}><button className="np-button-secondary" onClick={() => copy(program.address, program.id)}>{copied === program.id ? <Check size={13} /> : <Copy size={13} />}{copied === program.id ? "Copied" : "Copy"}</button><ExplorerLink href={program.explorer}>Explorer</ExplorerLink><ExplorerLink href={`https://solscan.io/account/${program.address}?cluster=mainnet-beta`}>Solscan</ExplorerLink></div></td>
                  <td><span className={`np-badge ${status === "executable" ? "np-badge--green" : status === "missing" ? "np-error" : "np-badge--amber"}`}>{label}</span></td>
                  <td>{program.buildStatus}<div className="np-small">Authority / maintainer: <span className="np-address">{program.authority}</span></div>{"deployTx" in program && <div className="np-small"><a href={`https://explorer.solana.com/tx/${program.deployTx}`} target="_blank" rel="noreferrer">Deployment transaction <ExternalLink size={11} /></a></div>}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <div className="np-actions"><button className="np-button-secondary" onClick={refresh} disabled={checking}><RefreshCw size={14} />{checking ? "Checking accounts" : "Check Mainnet accounts"}</button><span className="np-small">Checks executable accounts over the server RPC proxy.</span></div>
        </Panel>
        <div className="np-grid np-grid--2">
          <Panel eyebrow="Mint registry" title="$ZOLIUS token"><p className="np-muted">{registry.token.status}. A token address will appear here after it is configured and independently checked.</p><span className="np-badge np-badge--amber">Not configured on Mainnet</span></Panel>
          <Panel eyebrow="Treasury registry" title="Treasury / multisig"><p className="np-muted">{registry.treasury.status}. No Mainnet treasury or Squads multisig address is published.</p><span className="np-badge np-badge--amber">No multisig published</span></Panel>
        </div>
        <Panel eyebrow="Protocol dependency" title="Helius Privacy Rings review firms">
          <p className="np-muted">These reviews apply to the Helius Privacy Rings protocol, not to Zolius Lock or Zolius Swap.</p>
          <div className="np-token-logos">{registry.reviews.map((review) => <span key={review.name} title={`${review.name}: ${review.scope}`}><img src={review.logo} alt={review.name} /></span>)}</div>
          <div className="np-actions"><ExplorerLink href="https://www.helius.dev/docs/privacy">Helius Privacy documentation</ExplorerLink><span className="np-small">Dependency operated by Helius, not Zolius.</span></div>
        </Panel>
        <Panel eyebrow="Network migration" title="Zolius application programs">
          <div className="np-grid np-grid--3"><div className="np-stat"><div className="np-stat-label">Zolius Lock</div><div className="np-stat-value">Not deployed</div></div><div className="np-stat"><div className="np-stat-label">Zolius Swap</div><div className="np-stat-value">Not deployed</div></div><div className="np-stat"><div className="np-stat-label">Mainnet verifier</div><div className="np-stat-value">Not configured</div></div></div>
          <p className="np-muted" style={{ marginTop: 16 }}>Custom Zolius Lock and Swap use development verifier keys and remain disabled on Mainnet. Only the Helius Privacy Rings program is used for Mainnet deposits, transfers, and withdrawals.</p>
        </Panel>
        <Panel eyebrow="Deployment history / UTC" title="Devnet changelog">
          <ul className="np-list">{registry.changelog.map((change) => <li key={change.signature}><span><strong>{change.action}: {change.name}</strong><br/><span className="np-small">{new Date(change.date).toISOString().replace("T", " ").replace(".000Z", " UTC")} Â· slot {change.slot}</span></span><a className="np-external" href={`https://explorer.solana.com/tx/${change.signature}?cluster=devnet`} target="_blank" rel="noreferrer">Transaction <ExternalLink size={12}/></a></li>)}</ul>
          <p className="np-small">Entries are read from the same contracts.json file as the registry. This is not the Mainnet changelog.</p>
        </Panel>
        <Panel eyebrow="Token supply events" title="Devnet burns">
          <p className="np-muted">{registry.burns.status}</p>
          <div className="np-grid np-grid--2"><div className="np-stat"><div className="np-stat-label">Total burned</div><div className="np-stat-value">Not available</div></div><div className="np-stat"><div className="np-stat-label">Current supply</div><div className="np-stat-value">Not available</div></div></div>
          <div className="np-actions"><a className="np-button-secondary" href="/burn">Open burn page <ExternalLink size={13}/></a></div>
        </Panel>
      </div>
      <PageBottomLinks />
    </div>
  );
}
