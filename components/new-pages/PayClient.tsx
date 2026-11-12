"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, ExternalLink, Send, Shield, Wallet } from "lucide-react";
import { DevnetBadge, Panel } from "./Shared";
import { loadWallet, subscribeWalletChange } from "@/lib/wallets";
import { readPrivatePortfolio, shieldPrivateAsset, shieldSol, transferPrivateAsset, transferPrivateSol } from "@/lib/helius-spr-browser";
import { SOL_MINT } from "@heliuslabs/spr";

type Invoice = { to: string; amount: string; mint: string; id: string; expires: number };
const lamports = (amount: string) => {
  if (!/^\d+(\.\d{0,9})?$/.test(amount) || Number(amount) <= 0) throw new Error("Enter a valid SOL amount.");
  return lamportsForDecimals(amount, 9);
};
const lamportsForDecimals = (amount: string, decimals: number) => {
  if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) throw new Error("Enter a positive amount.");
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) throw new Error(`This token supports ${decimals} decimal places.`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
};

export default function PayClient() {
  const [wallet, setWallet] = useState<ReturnType<typeof loadWallet>>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [assetKind, setAssetKind] = useState<"SOL" | "SPL">("SOL");
  const [mint, setMint] = useState("");
  const [link, setLink] = useState("");
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  useEffect(() => {
    setWallet(loadWallet());
    return subscribeWalletChange(() => setWallet(loadWallet()));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const to = url.searchParams.get("to");
    if (to) setRecipient(to);
    if (url.hash.startsWith("#i=")) {
      try {
        const invoice = JSON.parse(decodeURIComponent(escape(atob(url.hash.slice(3))))) as Invoice;
        if (invoice.expires > Date.now()) {
          setRecipient(invoice.to);
          setAmount(invoice.amount);
          if (invoice.mint !== SOL_MINT) { setAssetKind("SPL"); setMint(invoice.mint); }
        } else setMessage("This invoice has expired.");
      } catch { setMessage("This payment link is invalid."); }
    }
  }, []);

  const createLink = async () => {
    setMessage("");
    try {
      if (!recipient.trim()) throw new Error("Enter the recipient's connected Solana wallet address.");
      if (!amount) throw new Error("Enter an invoice amount.");
      if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount) || Number(amount) <= 0) throw new Error("Enter a valid positive amount.");
      if (assetKind === "SPL" && !mint.trim()) throw new Error("Enter the SPL token mint address.");
      if (assetKind === "SOL") lamports(amount);
      const invoice: Invoice = { to: recipient.trim(), amount, mint: assetKind === "SOL" ? SOL_MINT : mint.trim(), id: crypto.randomUUID(), expires: Date.now() + 7 * 86400000 };
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify(invoice))));
      const url = `${location.origin}/pay#i=${payload}`;
      setLink(url);
      setQr(await QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#171411", light: "#ffffff" } }));
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not create payment link."); }
  };

  const sendPrivate = async (publicDeposit: boolean) => {
    setMessage("");
    if (!wallet) { setMessage("Connect your wallet first."); return; }
    let depositCompleted = false;
    try {
      setBusy(true);
      const selectedMint = assetKind === "SOL" ? SOL_MINT : mint.trim();
      if (publicDeposit) {
        if (assetKind === "SOL") await shieldSol(wallet, lamports(amount));
        else await shieldPrivateAsset(wallet, selectedMint, amount);
        depositCompleted = true;
      }
      const result = assetKind === "SOL"
        ? await transferPrivateSol(wallet, recipient, lamports(amount))
        : await transferPrivateAsset(wallet, selectedMint, recipient, amount);
      setMessage(`Private transfer confirmed: ${result.signature}`);
    } catch (e) { setMessage(`${depositCompleted ? "Deposit confirmed and visible on-chain, but the private transfer did not complete. Your funds should now be in your private balance. " : ""}${e instanceof Error ? e.message : "Payment failed."}`); }
    finally { setBusy(false); }
  };

  const checkPayment = async () => {
    const current = loadWallet();
    if (!current || current.address !== recipient) { setPaymentStatus("Connect the recipient wallet to check its private history."); return; }
    setBusy(true); setPaymentStatus("");
    try {
      const portfolio = await readPrivatePortfolio(current);
      const selectedMint = assetKind === "SOL" ? SOL_MINT : mint.trim();
      const possible = portfolio.history.some(entry => {
        if (entry.mint !== selectedMint || !entry.direction.toLowerCase().includes("in")) return false;
        try { return entry.amount === lamportsForDecimals(amount, entry.decimals); } catch { return false; }
      });
      setPaymentStatus(possible ? "Possible paid match found in this wallet's private history. Check timestamp and sender in your own wallet; amount-only matching is not unique." : "No matching inbound transfer found in the recipient's synced private history yet.");
    } catch (error) { setPaymentStatus(error instanceof Error ? error.message : "Could not sync private history."); }
    finally { setBusy(false); }
  };

  const validPayee = useMemo(() => Boolean(recipient && amount), [recipient, amount]);
  return <div className="np-content np-grid np-grid--2">
    <Panel eyebrow="Create a payment request" title="Make a Zolius Pay link">
      <p className="np-muted">Create a one-time SOL invoice link. The recipient, amount and expiry live in the URL fragment, which browsers do not send to the server. Anyone holding the link can read and pay it.</p>
      <div className="np-field"><label htmlFor="pay-to">Recipient wallet address</label><input id="pay-to" className="np-input" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Solana address registered with Privacy Rings" /></div>
      <button type="button" className="np-button-secondary" style={{marginBottom:14}} disabled={!wallet} onClick={() => wallet && setRecipient(wallet.address)}>Use my connected wallet</button>
      <div className="np-field"><label htmlFor="pay-asset">Asset</label><select id="pay-asset" className="np-select" value={assetKind} onChange={e => setAssetKind(e.target.value as "SOL" | "SPL")}><option value="SOL">SOL</option><option value="SPL">SPL token</option></select></div>
      {assetKind === "SPL" && <div className="np-field"><label htmlFor="pay-mint">Devnet SPL mint</label><input id="pay-mint" className="np-input" value={mint} onChange={e => setMint(e.target.value)} placeholder="Paste the token mint address" /></div>}
      <div className="np-field"><label htmlFor="pay-amount">Amount ({assetKind === "SOL" ? "SOL" : "SPL"})</label><input id="pay-amount" className="np-input" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.25" /></div>
      <button className="np-button" onClick={createLink} disabled={!validPayee}><Copy size={15}/>Create link & QR</button>
      {link && <div className="np-link-result"><img src={qr} width="176" height="176" alt="QR code for this Zolius Pay invoice"/><div><p className="np-muted">Expires in 7 days · one-time request</p><a className="np-address" href={link}>{link}</a><div className="np-actions"><button className="np-button-secondary" onClick={() => navigator.clipboard.writeText(link)}>Copy link</button><a className="np-external" href={link} target="_blank" rel="noreferrer">Open<ExternalLink size={13}/></a></div></div></div>}
      <div className="np-note" style={{marginTop:18}}>Invoice details are not stored or encrypted by a server in this v1 link. Treat the link as shareable and private to its intended payer.</div>
    </Panel>
    <Panel eyebrow="Pay an invoice" title="Settle from your private balance">
      <DevnetBadge small />
      {recipient && <div className="np-field" style={{marginTop:16}}><label>Recipient</label><code className="np-address">{recipient}</code></div>}
      {amount && <div className="np-stat"><div className="np-stat-label">Requested amount</div><div className="np-stat-value">{amount} {assetKind === "SOL" ? "SOL" : "SPL"}</div></div>}
      <div className="np-note" style={{marginTop:16}}><strong>Confidential:</strong> pay from a sufficient private SOL balance. The transfer amount is hidden; sender and recipient remain visible.</div>
      <button className="np-button" style={{marginTop:12}} disabled={!wallet || !validPayee || busy} onClick={() => void sendPrivate(false)}><Send size={15}/>{busy ? "Sending…" : "Pay from private balance"}</button>
      <div className="np-divider"/>
      <div className="np-note"><strong>Amount visible at deposit:</strong> if you choose the public-wallet route, the deposit asset, amount and sender are visible on chain before the private transfer.</div>
      <button className="np-button-secondary" style={{marginTop:12}} disabled={!wallet || !validPayee || busy} onClick={() => void sendPrivate(true)}><Wallet size={15}/>{busy ? "Processing…" : "Deposit publicly, then pay privately"}</button>
      {!wallet && <p className="np-small" style={{marginTop:12}}>Connect a wallet in the top navigation to pay.</p>}
      {message && <p className={message.includes("confirmed") ? "np-muted np-success" : "np-muted np-error"} style={{marginTop:14,overflowWrap:"anywhere"}}>{message}</p>}
      <p className="np-small" style={{marginTop:16}}><Shield size={12} style={{verticalAlign:"middle"}}/> Recipient must have a registered Privacy Rings address. The recipient confirms receipt by syncing their private portfolio.</p>
      <button className="np-button-secondary" style={{marginTop:12}} disabled={!wallet || busy || wallet.address !== recipient || !validPayee} onClick={() => void checkPayment()}>{busy ? "Syncing private history…" : "Check payment (recipient only)"}</button>
      {paymentStatus && <p className="np-muted" style={{marginTop:12}}>{paymentStatus}</p>}
    </Panel>
  </div>;
}
