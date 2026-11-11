"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Loader2, Share2 } from "lucide-react";

/** Waitlist form: posts to /api/dark-etf/waitlist, handles ?confirm= links. */
export const WaitlistForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [wallet, setWallet] = useState("");
  const [consent, setConsent] = useState(false);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmState, setConfirmState] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      setSource(q.get("utm_source") || "");
      const token = q.get("confirm") || "";
      if (/^[0-9a-f]{64}$/.test(token)) {
        fetch(`/api/dark-etf/waitlist?token=${token}`)
          .then((r) => r.json())
          .then((j) => setConfirmState(j.message || (j.success ? "Confirmed." : "Link invalid.")))
          .catch(() => setConfirmState("Could not confirm. Try again later."));
      }
    } catch {
      /* non-browser (SSR prerender) — skip */
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);
    setIsSuccess(false);
    window.dispatchEvent(new CustomEvent("veil:cta_waitlist_click"));
    try {
      const res = await fetch("/api/dark-etf/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          xHandle,
          wallet,
          consent,
          source,
          website: honeypotRef.current?.value || "",
        }),
      });
      const j = await res.json();
      if (j.success) {
        setIsSuccess(true);
        setNote(j.message || "You're on the list.");
        window.dispatchEvent(new CustomEvent("veil:waitlist_submit_success"));
        setEmail("");
        setXHandle("");
        setWallet("");
        setConsent(false);
      } else {
        setIsSuccess(false);
        setNote(j.error || "Something went wrong. Try again.");
      }
    } catch {
      setIsSuccess(false);
      setNote("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const shareOnX = () => {
    const text = encodeURIComponent(
      "Just joined the @zoliusvault Dark ETF waitlist — confidential token baskets with zero public mempool leakage on Solana.\n\nJoin here: https://zolius.vault/dark-etf"
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    minHeight: "44px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border-strong)",
    backgroundColor: "#ffffff",
    color: "var(--color-text)",
    fontSize: "14px",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color var(--duration-fast) var(--ease-out)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--color-faint)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  return (
    <div>
      {confirmState && (
        <div
          role="status"
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(255, 140, 0, 0.08)",
            border: "1px solid rgba(255, 140, 0, 0.3)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--color-text)",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ShieldCheck size={16} style={{ color: "var(--color-accent)" }} />
          <span>{confirmState}</span>
        </div>
      )}

      {isSuccess ? (
        <div
          role="status"
          style={{
            padding: "24px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(255, 140, 0, 0.08)",
            border: "1px solid rgba(255, 140, 0, 0.25)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            animation: "tabContentEnter 240ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
          }}
        >
          <CheckCircle2 size={36} style={{ color: "var(--color-accent)" }} />
          <div
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "1.4rem",
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            You&apos;re in line for Dark ETF.
          </div>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: "var(--color-muted)",
              maxWidth: "460px",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {note || "Check your inbox for confirmation. We will notify you when early access opens."}
          </p>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginTop: "6px" }}>
            <button
              type="button"
              onClick={shareOnX}
              className="lp-btn lp-btn--filled"
              style={{
                padding: "8px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              }}
            >
              <Share2 size={13} />
              <span>Share on X</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="lp-btn lp-btn--outline"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                padding: "8px 14px",
              }}
            >
              Register another address
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "4px" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="wl-email" style={labelStyle}>
              <span style={{ color: "var(--color-accent)" }}>[01]</span> EMAIL ADDRESS (REQUIRED)
            </label>
            <input
              id="wl-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@veilpools.tech"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="wl-x" style={labelStyle}>
                <span style={{ color: "var(--color-accent)" }}>[02]</span> X / TWITTER HANDLE (OPTIONAL)
              </label>
              <input
                id="wl-x"
                type="text"
                autoComplete="off"
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
                placeholder="@handle"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="wl-wallet" style={labelStyle}>
                <span style={{ color: "var(--color-accent)" }}>[03]</span> EVM WALLET ADDRESS (OPTIONAL)
              </label>
              <input
                id="wl-wallet"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x…"
                style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
              />
            </div>
          </div>

          {/* Honeypot: invisible to humans, bots fill it. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-9999px",
              top: "auto",
              width: "1px",
              height: "1px",
              overflow: "hidden",
            }}
          >
            <label htmlFor="wl-website">Website</label>
            <input
              id="wl-website"
              ref={honeypotRef}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          <label
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              fontSize: "12px",
              lineHeight: 1.5,
              cursor: "pointer",
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(26, 26, 26, 0.02)",
              border: "1px solid var(--color-border)",
            }}
          >
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: "2px", accentColor: "var(--color-accent)", width: "16px", height: "16px" }}
            />
            <span style={{ color: "var(--color-muted)" }}>
              I agree to be contacted about Dark ETF early access and verify that I am not a U.S. person.
              Access follows jurisdictional limits where restricted.
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full lp-btn lp-btn--accent"
            style={{
              padding: "14px 24px",
              minHeight: "46px",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              letterSpacing: "0.02em",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Recording waitlist entry…</span>
              </>
            ) : (
              <>
                <span>Join the Waitlist</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {note && !isSuccess && (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#EF4444",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              }}
            >
              <AlertCircle size={15} />
              <span>{note}</span>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default WaitlistForm;
