"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, Clock3, Copy, LockKeyhole } from "lucide-react";
import { DevnetBadge, Panel, ExplorerLink } from "./Shared";
import { loadWallet, subscribeWalletChange } from "@/lib/wallets";
import { createPrivateSwapOrder, readPrivateSwapOrders, takePrivateSwapOrder } from "@/lib/helius-spr-browser";
import { SOL_MINT } from "@heliuslabs/spr";

const SOL = SOL_MINT as string;
type Order = Awaited<ReturnType<typeof readPrivateSwapOrders>>[number];
const explorer = (signature: string) => `https://solscan.io/tx/${signature}?cluster=devnet`;

export default function OtcClient() {
  const [wallet, setWallet] = useState<ReturnType<typeof loadWallet>>(null);
  const [offerMint, setOfferMint] = useState(SOL);
  const [offerAmount, setOfferAmount] = useState("");
  const [requestMint, setRequestMint] = useState(SOL);
  const [requestAmount, setRequestAmount] = useState("");
  const [taker, setTaker] = useState("");
  const [expiresHours, setExpiresHours] = useState("24");
  const [order, setOrder] = useState<Order | null>(null);
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => { const sync = () => setWallet(loadWallet()); sync(); return subscribeWalletChange(sync); }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const maker = params.get("maker");
    const id = params.get("id");
    if (maker && id) {
      setBusy(true);
      const saved = loadWallet();
      if (!saved) { setStatus("Connect the wallet this OTC quote was addressed to."); setBusy(false); return; }
      readPrivateSwapOrders(saved, maker).then(orders => {
        const match = orders.find(item => item.id === id);
        if (!match) throw new Error("This quote is not addressed to this wallet, has already been taken, or could not be decrypted.");
        setOrder(match);
      }).catch(error => setStatus(error instanceof Error ? error.message : "Could not load this quote.")).finally(() => setBusy(false));
    }
  }, [wallet]);

  const create = async () => {
    if (!wallet) { setStatus("Connect the maker wallet first."); return; }
    setStatus(""); setBusy(true); setLink("");
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresHours) * 3600;
      const result = await createPrivateSwapOrder(wallet, { offerMint, offerAmount, requestMint, requestAmount, taker, expiresAt });
      setSignature(result.signature);
      const share = `${location.origin}/otc?maker=${encodeURIComponent(wallet.address)}&id=${encodeURIComponent(result.id)}`;
      setLink(share);
      setStatus("Order created and escrowed immediately. Share the invitation link with the named taker; do not assume expiry returns the funds automatically.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not create OTC order."); }
    finally { setBusy(false); }
  };

  const take = async () => {
    if (!wallet || !order) return;
    setBusy(true); setStatus("");
    try {
      const result = await takePrivateSwapOrder(wallet, { maker: order.maker, id: order.id });
      setSignature(result.signature);
      setStatus("Private OTC settlement confirmed. Sync both wallets to refresh balances.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Settlement failed."); }
    finally { setBusy(false); }
  };

  const quoteMode = new URLSearchParams(typeof window === "undefined" ? "" : location.search).has("id");
  return <div className="np-content np-grid np-grid--2">
    <Panel eyebrow={quoteMode ? "Invitation-only quote" : "Invitation-only desk"} title={quoteMode ? "Review the OTC terms" : "Create a private quote"}>
      <DevnetBadge small />
      {quoteMode && order ? <>
        <div className="np-grid np-grid--2" style={{marginTop:18}}>
          <div className="np-stat"><div className="np-stat-label">Maker offers</div><div className="np-stat-value">{order.offerAmount}</div><div className="np-stat-note">{order.offerMint}</div></div>
          <div className="np-stat"><div className="np-stat-label">Maker requests</div><div className="np-stat-value">{order.requestAmount}</div><div className="np-stat-note">{order.requestMint}</div></div>
        </div>
        <p className="np-muted" style={{marginTop:16}}>Maker {order.maker.slice(0,5)}…{order.maker.slice(-5)} · expires {new Date(order.expiresAt * 1000).toLocaleString()}</p>
        <button className="np-button" disabled={!wallet || busy || order.expiresAt <= Date.now()/1000} onClick={() => void take()}><ArrowLeftRight size={15}/>{busy ? "Settling…" : "Accept & settle atomically"}</button>
      </> : !quoteMode ? <>
        <p className="np-muted">Set a fixed private price and address the quote to one registered taker. Both parties need the requested private balances before settlement.</p>
        <div className="np-field"><label>Offer asset mint (SOL sentinel: {SOL})</label><input className="np-input" value={offerMint} onChange={e => setOfferMint(e.target.value)} /></div>
        <div className="np-field"><label>Offer amount</label><input className="np-input" inputMode="decimal" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} placeholder="1.0" /></div>
        <div className="np-field"><label>Request asset mint (SOL sentinel: {SOL})</label><input className="np-input" value={requestMint} onChange={e => setRequestMint(e.target.value)} /></div>
        <div className="np-field"><label>Request amount</label><input className="np-input" inputMode="decimal" value={requestAmount} onChange={e => setRequestAmount(e.target.value)} placeholder="100" /></div>
        <div className="np-field"><label>Registered taker wallet</label><input className="np-input" value={taker} onChange={e => setTaker(e.target.value)} placeholder="Taker's Solana address" /></div>
        <div className="np-field"><label>Expires in hours</label><select className="np-select" value={expiresHours} onChange={e => setExpiresHours(e.target.value)}><option value="1">1 hour</option><option value="6">6 hours</option><option value="24">24 hours</option><option value="72">72 hours</option></select></div>
        <div className="np-note"><strong>Escrow starts at creation.</strong> This deployed Zolius Swap program escrows the maker's offer as soon as you create the order. The taker cannot accept after expiry, but this UI does not expose the maker's cancel/refund action. Use Devnet test funds only and do not treat an expired quote as automatically refunded.</div>
        <button className="np-button" style={{marginTop:14}} disabled={!wallet || busy || !offerAmount || !requestAmount || !taker} onClick={() => void create()}><LockKeyhole size={15}/>{busy ? "Creating…" : "Create & escrow quote"}</button>
      </> : <p className="np-muted">{busy ? "Decrypting invitation for this wallet…" : "Could not load this invitation."}</p>}
      {link && <div className="np-note" style={{marginTop:14}}>Share this link only with your taker. <a className="np-address" href={link}>{link}</a><button className="np-button-secondary" style={{marginTop:10}} onClick={() => navigator.clipboard.writeText(link)}><Copy size={14}/>Copy invitation</button></div>}
      {signature && <div className="np-actions"><ExplorerLink href={explorer(signature)}>View transaction</ExplorerLink></div>}
      {status && <p className={status.includes("confirmed") || status.startsWith("Order created") ? "np-muted np-success" : "np-muted np-error"} style={{marginTop:14,overflowWrap:"anywhere"}}>{status}</p>}
    </Panel>
    <Panel eyebrow="Settlement model" title="A fixed private price">
      <div className="np-steps" style={{gridTemplateColumns:"1fr"}}>
        <div className="np-step"><strong><Clock3 size={15} style={{verticalAlign:"middle"}}/> Price agreed off-chain</strong><span>No public order book, solver or market-price update.</span></div>
        <div className="np-step"><strong>Both sides stay private</strong><span>Asset and amount are shielded; maker and taker identities remain visible to the program.</span></div>
        <div className="np-step"><strong>Private balances required</strong><span>Deposits from public wallets reveal the asset, amount and sender on-chain.</span></div>
      </div>
      <div className="np-note" style={{marginTop:18}}>Zolius Swap settles both sides atomically through its existing Devnet program. The program rejects settlement at or after the expiry timestamp. This UI has no maker cancellation/refund control yet.</div>
    </Panel>
  </div>;
}
