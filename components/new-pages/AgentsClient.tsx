"use client";

import { useState } from "react";
import { Bot, Eye, LockKeyhole } from "lucide-react";
import { Panel } from "./Shared";

export default function AgentsClient() {
  const [contact, setContact] = useState("");
  const [kind, setKind] = useState("building");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/agents/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact, kind, website }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not join the waitlist.");
      setMessage("You're on the research waitlist."); setContact("");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not join the waitlist."); }
    finally { setBusy(false); }
  };
  return <div className="np-content np-grid np-grid--2">
    <Panel eyebrow="Why this matters" title="Agent payments are public strategy">
      <p className="np-muted">Agents that pay for APIs, data and other agents over public rails leave a readable trail. Payment timing and counterparties can expose what an agent is doing.</p>
      <ul className="np-list" style={{marginTop:18}}>
        <li><span><LockKeyhole size={14}/> Private agent balance</span><span>Research</span></li>
        <li><span><Eye size={14}/> Owner viewing-key audit</span><span>Planned</span></li>
        <li><span><Bot size={14}/> x402-compatible flows</span><span>Exploring</span></li>
      </ul>
      <div className="np-note" style={{marginTop:18}}>No SDK or live agent product is available yet. This page describes a research direction, not a shipped feature.</div>
    </Panel>
    <Panel eyebrow="Builder list" title="Get research updates">
      <form onSubmit={submit}>
        <div className="np-field"><label htmlFor="agent-contact">Email or X handle</label><input id="agent-contact" required maxLength={160} className="np-input" value={contact} onChange={e => setContact(e.target.value)} placeholder="you@example.com or @handle" /></div>
        <div className="np-field"><label htmlFor="agent-kind">I want to…</label><select id="agent-kind" className="np-select" value={kind} onChange={e => setKind(e.target.value)}><option value="building">Build an agent</option><option value="use">Use an agent</option></select></div>
        <div aria-hidden="true" style={{position:"absolute",left:"-10000px",width:1,height:1,overflow:"hidden"}}><label htmlFor="agent-website">Leave blank</label><input id="agent-website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)}/></div>
        <button className="np-button" disabled={busy}>{busy ? "Joining…" : "Join the waitlist"}</button>
      </form>
      {message && <p className={message.startsWith("You're") ? "np-muted np-success" : "np-muted np-error"} style={{marginTop:14}}>{message}</p>}
      <p className="np-small" style={{marginTop:18}}>We store only your contact, interest and submission time for this waitlist. No agent activity or wallet address is collected.</p>
    </Panel>
  </div>;
}
