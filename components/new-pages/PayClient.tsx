"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import QRCode from "qrcode";
import { Copy, ExternalLink, Send, Shield, Wallet } from "lucide-react";
import { DevnetBadge, Panel } from "./Shared";
import { loadWallet, subscribeWalletChange, type StoredWallet } from "@/lib/wallets";
import { ensurePrivacyWalletRegistered, readPrivatePortfolio, shieldPrivateAsset, shieldSol, transferPrivateAsset, transferPrivateSol } from "@/lib/helius-spr-browser";
import { decryptInvoiceForWallet, decryptInvoiceFromLink, encryptInvoiceForPayee, getVaultPublicKey, signInvoicePaid, signPayHandleRegistration, type VaultEnvelope } from "@/lib/quantum-vault";
import { SOL_MINT } from "@heliuslabs/spr";

type InvoiceData = { id: string; amount: string; mint: string; note: string; expiresAt: number };
type HandleRecord = { handle: string; address: string; vaultPublicKey: string };
type InvoiceRecord = { id: string; handle: string; recipient: string; envelope: VaultEnvelope; consumed: boolean; expiresAt: string };

const toLamports = (amount: string, decimals: number) => {
  if (!/^\d+(?:\.\d+)?$/.test(amount) || Number(amount) <= 0) throw new Error("Enter a positive amount.");
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) throw new Error(`This asset supports ${decimals} decimal places.`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
};

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "content-type": "application/json", ...init?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Payment request failed.");
  return data as T;
}

export default function PayClient() {
  const pathname = usePathname() || "/pay";
  const [wallet, setWallet] = useState<StoredWallet | null>(null);
  const [handleDraft, setHandleDraft] = useState("");
  const [ownHandle, setOwnHandle] = useState("");
  const [payHandle, setPayHandle] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [assetKind, setAssetKind] = useState<"SOL" | "SPL">("SOL");
  const [mint, setMint] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [qr, setQr] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [invoiceLoaded, setInvoiceLoaded] = useState(false);
  const [isPayRoute, setIsPayRoute] = useState(false);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  useEffect(() => {
    const sync = () => setWallet(loadWallet());
    sync();
    return subscribeWalletChange(sync);
  }, []);

  useEffect(() => {
    if (!wallet || typeof window === "undefined") return;
    const saved = localStorage.getItem(`zolius-pay-handle:${wallet.address}`) || "";
    if (saved) {
      setOwnHandle(saved);
      setHandleDraft(saved);
    }
  }, [wallet]);

  useEffect(() => {
    let cancelled = false;
    const parts = pathname.split("/").filter(Boolean);
    const handleInPath = parts[0] === "pay" ? parts[1] || "" : "";
    const invoiceInPath = parts[0] === "pay" && parts.length > 2 ? parts[2] : "";
    setIsPayRoute(Boolean(handleInPath));
    if (!handleInPath) { setInvoiceLoaded(false); setInvoiceId(""); setPaid(false); return; }
    setPayHandle(handleInPath);
    setBusy(true);
    setMessage("");
    void (async () => {
      try {
        const profile = await jsonRequest<HandleRecord>(`/api/pay/handles?handle=${encodeURIComponent(handleInPath)}`);
        if (cancelled) return;
        setRecipient(profile.address);
        if (!invoiceInPath) { setInvoiceLoaded(true); setInvoiceId(""); setPaid(false); setAmount(""); setNote(""); setAssetKind("SOL"); setMint(""); return; }
        const record = await jsonRequest<InvoiceRecord>(`/api/pay/invoices/${encodeURIComponent(invoiceInPath)}`);
        if (cancelled) return;
        setInvoiceId(record.id);
        setPaid(record.consumed);
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const linkKey = fragment.get("k");
        let value: unknown = null;
        if (linkKey) value = await decryptInvoiceFromLink(record.envelope, linkKey);
        else if (wallet?.address === profile.address) value = await decryptInvoiceForWallet(wallet, record.envelope);
        if (cancelled) return;
        if (!value || typeof value !== "object") throw new Error("This invoice is encrypted. Open the complete payment link or connect the recipient wallet to decrypt it.");
        const invoice = value as InvoiceData;
        if (invoice.id !== record.id || invoice.expiresAt <= Date.now()) throw new Error("This invoice is invalid or expired.");
        setAmount(invoice.amount);
        setNote(invoice.note || "");
        if (invoice.mint === SOL_MINT) { setAssetKind("SOL"); setMint(""); }
        else { setAssetKind("SPL"); setMint(invoice.mint); }
        setInvoiceLoaded(true);
      } catch (error) {
        if (!cancelled) { setInvoiceLoaded(false); setMessage(error instanceof Error ? error.message : "Could not open this payment link."); }
      } finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [wallet, pathname]);

  const registerHandle = async () => {
    if (!wallet) { setMessage("Connect the wallet that will receive payments first."); return; }
    setBusy(true); setMessage("");
    try {
      const normalized = handleDraft.trim().toLowerCase().replace(/^@/, "");
      await ensurePrivacyWalletRegistered(wallet);
      const vaultPublicKey = await getVaultPublicKey(wallet);
      const signature = await signPayHandleRegistration(wallet, normalized, vaultPublicKey);
      const record = await jsonRequest<HandleRecord>("/api/pay/handles", { method: "POST", body: JSON.stringify({ handle: normalized, address: wallet.address, vaultPublicKey, signature }) });
      localStorage.setItem(`zolius-pay-handle:${wallet.address}`, record.handle);
      setOwnHandle(record.handle); setHandleDraft(record.handle);
      setMessage(`Permanent payment link ready: ${location.origin}/pay/${record.handle}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Handle registration failed."); }
    finally { setBusy(false); }
  };

  const createInvoice = async () => {
    if (!wallet) { setMessage("Connect a wallet to encrypt the invoice link."); return; }
    setMessage(""); setBusy(true); setLink("");
    try {
      if (!/^\d+(?:\.\d+)?$/.test(amount) || Number(amount) <= 0) throw new Error("Enter a valid positive amount.");
      const normalizedHandle = payHandle.trim().toLowerCase().replace(/^@/, "");
      const profile = await jsonRequest<HandleRecord>(`/api/pay/handles?handle=${encodeURIComponent(normalizedHandle)}`);
      const selectedMint = assetKind === "SOL" ? SOL_MINT : mint.trim();
      if (!selectedMint) throw new Error("Enter the Devnet token mint.");
      const id = crypto.randomUUID();
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const encrypted = await encryptInvoiceForPayee(profile.address, profile.vaultPublicKey, { id, amount, mint: selectedMint, note: note.trim(), expiresAt }, expiresAt);
      await jsonRequest("/api/pay/invoices", { method: "POST", body: JSON.stringify({ id, handle: profile.handle, envelope: encrypted.envelope }) });
      const paymentUrl = new URL(`/pay/${profile.handle}/${id}`, location.origin);
      paymentUrl.hash = new URLSearchParams({ k: encrypted.linkKey }).toString();
      const value = paymentUrl.toString();
      setLink(value);
      setQr(await QRCode.toDataURL(value, { width: 220, margin: 1, color: { dark: "#171411", light: "#ffffff" } }));
      setMessage("Invoice saved as X-Wing encrypted ciphertext. The decryption key stays in the link fragment and is not sent to the server.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create this invoice."); }
    finally { setBusy(false); }
  };

  const selectedMint = assetKind === "SOL" ? SOL_MINT : mint.trim();
  const sendPrivate = async (publicDeposit: boolean) => {
    setMessage("");
    if (!wallet) { setMessage("Connect your wallet first."); return; }
    if (!invoiceLoaded && !amount) { setMessage("Open an invoice link or enter its details first."); return; }
    let depositCompleted = false;
    try {
      setBusy(true);
      if (publicDeposit) {
        if (assetKind === "SOL") await shieldSol(wallet, toLamports(amount, 9));
        else await shieldPrivateAsset(wallet, selectedMint, amount);
        depositCompleted = true;
      }
      const result = assetKind === "SOL"
        ? await transferPrivateSol(wallet, recipient, toLamports(amount, 9))
        : await transferPrivateAsset(wallet, selectedMint, recipient, amount);
      setMessage(`Private transfer confirmed: ${result.signature}`);
    } catch (error) {
      setMessage(`${depositCompleted ? "Deposit confirmed and visible on-chain, but the private transfer did not complete. The funds should now be in your private balance. " : ""}${error instanceof Error ? error.message : "Payment failed."}`);
    } finally { setBusy(false); }
  };

  const checkPayment = async () => {
    if (!invoiceId) { setPaymentStatus("A one-time invoice ID is required for payment status."); return; }
    if (!wallet || wallet.address !== recipient) { setPaymentStatus("Connect the recipient wallet to check its private history."); return; }
    setBusy(true); setPaymentStatus("");
    try {
      const portfolio = await readPrivatePortfolio(wallet);
      const possible = portfolio.history.some(entry => {
        if (entry.mint !== selectedMint || !entry.direction.toLowerCase().includes("in")) return false;
        try { return entry.amount === toLamports(amount, entry.decimals); } catch { return false; }
      });
      if (!possible) { setPaymentStatus("Pending: no exact-amount inbound transfer found in the recipient's synced private history yet."); return; }
      setPaymentStatus("An inbound transfer with this asset and amount was found. Confirm that it belongs to this invoice in your private history.");
    } catch (error) { setPaymentStatus(error instanceof Error ? error.message : "Could not sync private history."); }
    finally { setBusy(false); }
  };

  const confirmPaid = async () => {
    if (!wallet || wallet.address !== recipient || !invoiceId) return;
    setBusy(true); setPaymentStatus("");
    try {
      const signature = await signInvoicePaid(wallet, invoiceId);
      await jsonRequest(`/api/pay/invoices/${invoiceId}`, { method: "POST", body: JSON.stringify({ address: wallet.address, signature }) });
      setPaid(true); setPaymentStatus("Paid. The recipient confirmed this invoice from their connected wallet.");
    } catch (error) { setPaymentStatus(error instanceof Error ? error.message : "Could not confirm payment."); }
    finally { setBusy(false); }
  };

  const hasInvoice = useMemo(() => Boolean(recipient && amount), [recipient, amount]);
  return <div className="np-content np-grid np-grid--2">
    <Panel eyebrow="Permanent payment identity" title="Claim your Zolius Pay handle">
      <DevnetBadge small />
      <p className="np-muted" style={{ marginTop: 14 }}>Register a unique handle for a reusable link. Your wallet signs ownership and derives an X-Wing viewing key locally; only the public address and public key are stored.</p>
      <div className="np-field"><label htmlFor="pay-handle">HANDLE</label><div className="np-input-row"><span className="np-small">/pay/</span><input id="pay-handle" className="np-input" maxLength={24} autoComplete="off" value={handleDraft} onChange={event => setHandleDraft(event.target.value)} placeholder="your-name" /></div></div>
      <button className="np-button" disabled={!wallet || busy || handleDraft.trim().length < 3} onClick={() => void registerHandle()}><Shield size={14}/>{busy ? "Signingâ€¦" : ownHandle ? "Verify / restore my handle" : "Register permanent link"}</button>
      {ownHandle && <p className="np-small" style={{ marginTop: 12 }}>Your reusable link: <a className="np-address" href={`/pay/${ownHandle}`}>{location.origin}/pay/{ownHandle}</a></p>}
      <p className="np-small" style={{ marginTop: 14 }}>Handle registration and invoices require the app database connection to be configured.</p>
    </Panel>

    <Panel eyebrow="One-time invoice" title="Create a private payment request">
      <p className="np-muted">Invoice terms are X-Wing encrypted in your browser and stored as ciphertext. The decryption key is kept in the URL fragment, which is not sent to the server.</p>
      <div className="np-field"><label htmlFor="pay-recipient-handle">RECIPIENT HANDLE</label><input id="pay-recipient-handle" className="np-input" value={payHandle} onChange={event => setPayHandle(event.target.value)} placeholder="their-handle" /></div>
      <div className="np-field"><label htmlFor="pay-asset">ASSET</label><select id="pay-asset" className="np-select" value={assetKind} onChange={event => setAssetKind(event.target.value as "SOL" | "SPL")}><option value="SOL">SOL</option><option value="SPL">Devnet SPL token</option></select></div>
      {assetKind === "SPL" && <div className="np-field"><label htmlFor="pay-mint">DEVNET TOKEN MINT</label><input id="pay-mint" className="np-input" value={mint} onChange={event => setMint(event.target.value)} placeholder="Paste a Devnet token mint" /></div>}
      <div className="np-field"><label htmlFor="pay-amount">AMOUNT</label><input id="pay-amount" className="np-input" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.25" /></div>
      <div className="np-field"><label htmlFor="pay-note">PRIVATE NOTE (OPTIONAL)</label><input id="pay-note" className="np-input" maxLength={240} value={note} onChange={event => setNote(event.target.value)} placeholder="Invoice note" /></div>
      <button className="np-button" disabled={!wallet || busy || !payHandle || !amount || (assetKind === "SPL" && !mint)} onClick={() => void createInvoice()}><Copy size={14}/>{busy ? "Encryptingâ€¦" : "Create encrypted invoice & QR"}</button>
      {link && <div className="np-link-result"><img src={qr} width="176" height="176" alt="QR code for encrypted Zolius Pay invoice"/><div><p className="np-muted">Expires in 7 days Â· one-time invoice</p><a className="np-address" href={link}>{link}</a><div className="np-actions"><button className="np-button-secondary" onClick={() => navigator.clipboard.writeText(link)}>Copy link</button><a className="np-external" href={link} target="_blank" rel="noreferrer">Open<ExternalLink size={13}/></a></div></div></div>}
    </Panel>

    <Panel eyebrow="Payment" title={paid ? "Invoice paid" : "Settle from a private balance"}>
      {isPayRoute && <DevnetBadge small />}
      {recipient && <div className="np-field" style={{ marginTop: 16 }}><label>RECIPIENT SHIELDED ADDRESS</label><code className="np-address">{recipient}</code></div>}
      {hasInvoice && <div className="np-stat"><div className="np-stat-label">Requested amount</div><div className="np-stat-value">{amount} {assetKind === "SOL" ? "SOL" : "SPL"}</div>{note && <div className="np-stat-note">Encrypted invoice note: {note}</div>}</div>}
      <div className="np-note" style={{ marginTop: 16 }}><strong>Confidential:</strong> paying from a sufficient private balance hides the asset and amount. Sender and recipient remain visible.</div>
      <button className="np-button" style={{ marginTop: 12 }} disabled={!wallet || !hasInvoice || !invoiceLoaded || busy || paid} onClick={() => void sendPrivate(false)}><Send size={14}/>{busy ? "Sendingâ€¦" : "Pay from private balance"}</button>
      <div className="np-divider" />
      <div className="np-note"><strong>Amount visible at deposit:</strong> the public deposit exposes the source wallet, asset and amount before the private transfer.</div>
      <button className="np-button-secondary" style={{ marginTop: 12 }} disabled={!wallet || !hasInvoice || !invoiceLoaded || busy || paid} onClick={() => void sendPrivate(true)}><Wallet size={14}/>{busy ? "Processingâ€¦" : "Deposit publicly, then pay"}</button>
      {invoiceId && <><button className="np-button-secondary" style={{ marginTop: 12 }} disabled={!wallet || busy || wallet.address !== recipient || paid} onClick={() => void checkPayment()}>{busy ? "Checking private historyâ€¦" : "Check recipient private history"}</button>{paymentStatus && <p className="np-muted" style={{ marginTop: 12 }}>{paymentStatus}</p>}{paymentStatus.startsWith("An inbound transfer") && <button className="np-button" style={{ marginTop: 8 }} disabled={busy} onClick={() => void confirmPaid()}>Confirm invoice paid with my wallet</button>}</>}
      {message && <p className={message.includes("confirmed") || message.includes("ready:") || message.includes("saved as") ? "np-muted np-success" : "np-muted np-error"} role="status" style={{ marginTop: 14, overflowWrap: "anywhere" }}>{message}</p>}
      {!wallet && <p className="np-small" style={{ marginTop: 12 }}>Connect a wallet in the top navigation to register or pay.</p>}
      <p className="np-small" style={{ marginTop: 16 }}><Shield size={12} style={{ verticalAlign: "middle" }}/> The recipient checks private history in their own browser; viewing keys are never sent to the server.</p>
    </Panel>
  </div>;
}
