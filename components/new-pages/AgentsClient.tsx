"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Bot, Eye, LockKeyhole } from "lucide-react";
import { Panel } from "./Shared";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

export default function AgentsClient() {
  const [contact, setContact] = useState("");
  const [kind, setKind] = useState("building");
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef("");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  useEffect(() => {
    if (!siteKey || !turnstileReady || !container.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      callback: token => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = "";
    };
  }, [siteKey, turnstileReady]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/agents/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact, kind, website, turnstileToken }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not join the waitlist.");
      setMessage("You're on the research waitlist."); setContact(""); setTurnstileToken("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not join the waitlist."); }
    finally { setBusy(false); }
  };

  return <div className="np-content np-grid np-grid--2">
    <Panel eyebrow="Why this matters" title="Agent payments are public strategy">
      <p className="np-muted">Agents that pay for APIs, data and other agents over public rails leave a readable trail. Payment timing and counterparties can expose what an agent is doing.</p>
      <ul className="np-list" style={{ marginTop: 18 }}>
        <li><span><LockKeyhole size={14}/> Private agent balance</span><span>Research</span></li>
        <li><span><Eye size={14}/> Owner viewing-key audit</span><span>Planned</span></li>
        <li><span><Bot size={14}/> x402-compatible flows</span><span>Exploring</span></li>
      </ul>
      <div className="np-note" style={{ marginTop: 18 }}>No SDK or live agent product is available yet. This page describes a research direction, not a shipped feature.</div>
    </Panel>
    <Panel eyebrow="Builder list" title="Get research updates">
      {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setTurnstileReady(true)} />}
      <form onSubmit={submit}>
        <div className="np-field"><label htmlFor="agent-contact">Email or X handle</label><input id="agent-contact" required maxLength={160} className="np-input" value={contact} onChange={event => setContact(event.target.value)} placeholder="you@example.com or @handle" /></div>
        <div className="np-field"><label htmlFor="agent-kind">I want toâ€¦</label><select id="agent-kind" className="np-select" value={kind} onChange={event => setKind(event.target.value)}><option value="building">Build an agent</option><option value="use">Use an agent</option></select></div>
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}><label htmlFor="agent-website">Leave blank</label><input id="agent-website" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></div>
        {siteKey && <div ref={container} style={{ margin: "12px 0" }} />}
        <button className="np-button" disabled={busy || (Boolean(siteKey) && !turnstileToken)}>{busy ? "Joining" : "Join the waitlist"}</button>
      </form>
      {message && <p className={message.startsWith("You're") ? "np-muted np-success" : "np-muted np-error"} style={{ marginTop: 14 }} role="status">{message}</p>}
      <p className="np-small" style={{ marginTop: 18 }}>We store only your contact, interest and submission time for this waitlist. No agent activity or wallet address is collected.</p>
    </Panel>
  </div>;
}
