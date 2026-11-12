"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Eye, LoaderCircle, Search } from "lucide-react";
import { loadWallet } from "@/lib/wallets";
import { readPrivatePortfolio } from "@/lib/helius-spr-browser";
import { ExplorerLink, Panel } from "./Shared";
import registry from "@/lib/contracts.json";

type Tx = { signature: string; slot: number; blockTime?: number; err?: unknown; transaction?: { message?: { accountKeys?: any[]; instructions?: any[] } }; meta?: { fee?: number; innerInstructions?: any[] } };
const isPrivacyTx = (tx: Tx) => {
  const keys = (tx.transaction?.message?.accountKeys || []).map(keyText);
  const instructions = [...(tx.transaction?.message?.instructions || []), ...(tx.meta?.innerInstructions || []).flatMap(group => group.instructions || [])];
  return instructions.some((instruction: any) => (instruction.programId || keys[instruction.programIdIndex]) === registry.programs.find(program => program.id === "privacy-ring")?.address);
};
const keyText = (item: any) => typeof item === "string" ? item : item?.pubkey?.toBase58?.() || item?.pubkey || "";
const brief = (value: string) => value ? `${value.slice(0, 7)}…${value.slice(-7)}` : "Not present";

async function fetchTransaction(signature: string): Promise<Tx> {
  const response = await fetch("/api/solana/rpc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: "proof", method: "getTransaction", params: [signature, { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 1 }] }) });
  const payload = await response.json();
  if (payload.error || !payload.result) throw new Error(payload.error?.message || "Transaction was not found on Mainnet.");
  return { signature, ...payload.result };
}

function summarize(tx: Tx) {
  const accountKeys = (tx.transaction?.message?.accountKeys || []).map(keyText).filter(Boolean);
  const instructions = [ ...(tx.transaction?.message?.instructions || []), ...(tx.meta?.innerInstructions || []).flatMap((group: any) => group.instructions || []) ];
  const publicTransfers: { sender: string; recipient: string; amount?: string; asset: string }[] = [];
  for (const instruction of instructions) {
    const info = instruction.parsed?.info;
    const type = instruction.parsed?.type;
    if (!info) continue;
    if ((type === "transfer" || type === "transferWithSeed") && info.source && info.destination) publicTransfers.push({ sender: info.source, recipient: info.destination, amount: info.lamports ? `${Number(info.lamports) / 1e9} SOL` : undefined, asset: "SOL" });
    if ((type === "transferChecked" || type === "transfer") && info.source && info.destination && info.tokenAmount) publicTransfers.push({ sender: info.authority || info.source, recipient: info.destination, amount: `${info.tokenAmount.uiAmountString} tokens`, asset: info.mint || "SPL" });
  }
  const privateData = instructions.filter((instruction) => instruction.data).map((instruction) => ({ program: instruction.programId || accountKeys[instruction.programIdIndex] || "Program", data: instruction.data }));
  return { accountKeys, publicTransfers, privateData };
}

export default function ProofClient() {
  const [glassSignature, setGlassSignature] = useState("");
  const [vaultSignature, setVaultSignature] = useState("");
  const [glass, setGlass] = useState<Tx | null>(null);
  const [vault, setVault] = useState<Tx | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [decrypted, setDecrypted] = useState<{ amount: string; direction: string; asset: string } | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  const loadDemo = async () => {
    setLoading(true); setError(""); setDecrypted(null);
    try {
      const [left, right] = await Promise.all([fetchTransaction(glassSignature.trim()), fetchTransaction(vaultSignature.trim())]);
      if (isPrivacyTx(left)) throw new Error("The Glass signature also invokes Solana Privacy Rings. Enter a standard public transfer instead.");
      if (!isPrivacyTx(right)) throw new Error("The Vault signature is not a Solana Privacy Rings transaction on Mainnet.");
      setGlass(left); setVault(right);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load these transactions."); }
    finally { setLoading(false); }
  };

  const decrypt = async () => {
    const wallet = loadWallet();
    if (!wallet || !vault) return;
    setDecrypting(true); setError("");
    try {
      const portfolio = await readPrivatePortfolio(wallet);
      const item = portfolio.history.find((entry) => entry.signature === vault.signature);
      if (!item) throw new Error("This connected wallet has no private history entry for that transaction.");
      setDecrypted({ amount: `${Number(item.amount) / 10 ** item.decimals} ${item.mint}`, direction: item.direction, asset: item.mint });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Local decryption did not find this transaction."); }
    finally { setDecrypting(false); }
  };

  const left = glass ? summarize(glass) : null;
  const right = vault ? summarize(vault) : null;
  return <div className="np-grid">
    <Panel eyebrow="Compare Mainnet transactions" title="Load a matched pair">
      <div className="np-grid np-grid--2"><div className="np-field"><label htmlFor="glass-signature">PUBLIC / GLASS SIGNATURE</label><input id="glass-signature" className="np-input" value={glassSignature} onChange={(event) => setGlassSignature(event.target.value)} placeholder="Paste a public transfer signature" /></div><div className="np-field"><label htmlFor="vault-signature">ZOLIUS / VAULT SIGNATURE</label><input id="vault-signature" className="np-input" value={vaultSignature} onChange={(event) => setVaultSignature(event.target.value)} placeholder="Paste a Privacy Rings signature" /></div></div>
      <div className="np-actions"><button className="np-button" onClick={() => void loadDemo()} disabled={loading || !glassSignature || !vaultSignature}>{loading ? <LoaderCircle className="animate-spin" size={14} /> : <Search size={14} />}{loading ? "Loading" : "Compare these transactions"}</button><span className="np-small">Read-only Mainnet requests use the server RPC proxy.</span></div>
      {error && <p className="np-error np-muted" role="alert">{error}</p>}
    </Panel>
    {glass && vault && <div className="np-grid np-grid--2">
      <Panel eyebrow="Public transfer" title="Glass"><div className="np-note">The public transaction may reveal amount, asset, sender, and recipient.</div><div className="np-divider" /><div className="np-overline">Signature</div><ExplorerLink href={`https://explorer.solana.com/tx/${glass.signature}`}>{brief(glass.signature)}</ExplorerLink><div className="np-divider" />{left?.publicTransfers.length ? <ul className="np-list">{left.publicTransfers.map((transfer, index) => <li key={index}><span>{transfer.sender === left.accountKeys[0] ? "Sender" : "Transfer"}<br/><span className="np-address">{brief(transfer.sender)}</span></span><span>{transfer.amount || "Amount visible in transaction"}<br/><span className="np-small">to {brief(transfer.recipient)}</span></span></li>)}</ul> : <div className="np-muted">Transfer amount or addresses were not parsed for this signature. The account keys remain visible in the raw transaction.</div>}<div className="np-overline" style={{ marginTop: 18 }}>Account keys</div><div className="np-small">{left?.accountKeys.slice(0, 6).map(brief).join(" · ")}</div></Panel>
      <Panel eyebrow="Confidential transfer" title="Zolius Vault"><div className="np-note">For the default Ring, sender and recipient remain public while the asset, amount, and memo are encrypted.</div><div className="np-divider" /><div className="np-overline">Signature</div><ExplorerLink href={`https://explorer.solana.com/tx/${vault.signature}`}>{brief(vault.signature)}</ExplorerLink><div className="np-divider" /><ul className="np-list"><li><span>Sender / transaction signer</span><span className="np-address">{brief(right?.accountKeys[0] || "")}</span></li><li><span>Recipient</span><span>Public protocol account data</span></li><li><span>Asset</span><span>Encrypted</span></li><li><span>Amount</span><span>Encrypted</span></li><li><span>Memo</span><span>Encrypted</span></li><li><span>ZK proof</span><span>Verified by Solana Privacy Program</span></li></ul><div className="np-overline" style={{ marginTop: 18 }}>Raw instruction data</div><code className="np-small" style={{ display: "block", overflowWrap: "anywhere" }}>{right?.privateData[0]?.data?.slice(0, 120) || "Not returned by RPC"}{(right?.privateData[0]?.data?.length || 0) > 120 ? "…" : ""}</code>
        <div className="np-actions"><button className="np-button-secondary" onClick={() => void decrypt()} disabled={!loadWallet() || decrypting}><Eye size={14}/>{decrypting ? "Decrypting locally" : "Decrypt with my viewing key"}</button><span className="np-small">Viewing key stays in this browser.</span></div>{decrypted && <p className="np-success np-muted">Decrypted locally: {decrypted.direction} · {decrypted.amount}</p>}</Panel>
    </div>}
    <Panel eyebrow="Read carefully" title="Confidential is not anonymous"><p className="np-muted">Solana Privacy Rings' default Ring hides the asset and amount on private transfers. Sender, recipient, transaction signature, and the public deposit or withdrawal remain visible. Depositing from a public wallet exposes the deposit amount and sender.</p><div className="np-actions"><a className="np-external" href="https://www.helius.dev/docs/privacy/concepts/overview" target="_blank" rel="noreferrer">Privacy guarantees<ExternalLink size={13}/></a><a className="np-button" href="/app">Open Vault<ExternalLink size={13}/></a></div></Panel>
  </div>;
}
