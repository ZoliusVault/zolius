"use client";

import React, { useEffect, useState, type ChangeEvent } from "react";
import { Copy, Download, FileLock2, KeyRound, LockKeyhole, Plus, ShieldCheck, Trash2, Upload } from "lucide-react";
import { detectSolana, type StoredWallet } from "@/lib/wallets";
import {
  decryptForWallet,
  encryptForWallet,
  getVaultPublicKey,
  serializeVaultPayload,
  type VaultEnvelope,
} from "@/lib/quantum-vault";
import { readPrivateVaultAccess } from "@/lib/helius-spr-browser";

type SavedNote = { id: string; envelope: VaultEnvelope };
type SavedShare = { id: string; recipient: string; expiresAt: number; envelope: VaultEnvelope };

function downloadJson(filename: string, content: unknown) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readList<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T[]) : [];
  } catch {
    return [];
  }
}

async function readEnvelope(file: File): Promise<VaultEnvelope> {
  if (file.size > 8 * 1024 * 1024) throw new Error("Quantum Vault files are limited to 8 MB.");
  const value = JSON.parse(await file.text()) as VaultEnvelope;
  if (!value || typeof value !== "object") throw new Error("Invalid Quantum Vault file.");
  return value;
}

const box: React.CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  background: "#fff",
  padding: "24px",
  boxShadow: "0 4px 20px rgba(26, 26, 26, 0.04)",
};

const input: React.CSSProperties = {
  width: "100%",
  minHeight: "44px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border-strong)",
  background: "#fff",
  padding: "10px 12px",
  font: "inherit",
  color: "var(--color-text)",
};

export function QuantumVaultPanel({ wallet, onConnect }: { wallet: StoredWallet | null; onConnect: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [shares, setShares] = useState<SavedShare[]>([]);
  const [txSignature, setTxSignature] = useState("");
  const [noteText, setNoteText] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientKey, setRecipientKey] = useState("");
  const [shareHours, setShareHours] = useState("24");
  const [restoreResult, setRestoreResult] = useState<string | null>(null);
  const [openedShare, setOpenedShare] = useState<{
    viewingKey?: string;
    history?: Array<{ signature: string; kind: string; direction: string; amount: bigint; decimals: number }>;
    balances?: Array<{ mint: string; amount: string | bigint; decimals: number }>;
  } | null>(null);

  useEffect(() => {
    if (!wallet) return;
    setNotes(readList<SavedNote>(`zolius:vault:notes:${wallet.address}`));
    setShares(readList<SavedShare>(`zolius:vault:shares:${wallet.address}`));
    setPublicKey("");
  }, [wallet]);

  function persistNotes(next: SavedNote[]) {
    if (!wallet) return;
    setNotes(next);
    localStorage.setItem(`zolius:vault:notes:${wallet.address}`, JSON.stringify(next));
  }

  function persistShares(next: SavedShare[]) {
    if (!wallet) return;
    setShares(next);
    localStorage.setItem(`zolius:vault:shares:${wallet.address}`, JSON.stringify(next));
  }

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function signAndGetPublicKey() {
    if (!wallet) throw new Error("Connect a Solana wallet first.");
    const provider = detectSolana(wallet.id);
    if (provider?.publicKey?.toBase58() !== wallet.address) throw new Error("Reconnect the selected wallet.");
    setPublicKey(await getVaultPublicKey(wallet));
  }

  async function createBackup() {
    if (!wallet) throw new Error("Connect a Solana wallet first.");
    const access = await readPrivateVaultAccess(wallet);
    const envelope = await encryptForWallet(
      wallet,
      { format: "zolius-vault-backup-v1", wallet: wallet.address, exportedAt: new Date().toISOString(), ...access },
      "backup",
    );
    downloadJson(`zolius-vault-${wallet.address.slice(0, 6)}.json`, envelope);
    setMessage("Encrypted backup downloaded with your Privacy Rings viewing key and account snapshot. Restore it with the same wallet on another device.");
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    if (!wallet) throw new Error("Connect a Solana wallet first.");
    const file = event.target.files?.[0];
    if (!file) return;
    await perform(async () => {
      const envelope = await readEnvelope(file);
      const restored = (await decryptForWallet(wallet, envelope)) as { format?: string; viewingKey?: string; portfolio?: unknown };
      if (restored.format !== "zolius-vault-backup-v1") throw new Error("This file is not a Zolius Vault backup.");
      const current = await readPrivateVaultAccess(wallet);
      if (!restored.viewingKey || restored.viewingKey !== current.viewingKey) throw new Error("The backup viewing key does not match this connected wallet.");
      localStorage.setItem(`zolius:vault:restore:${wallet.address}`, serializeVaultPayload({ format: restored.format, portfolio: restored.portfolio }));
      setRestoreResult("Backup decrypted successfully. Your private account history can be re-synced from Privacy Rings.");
    });
    event.target.value = "";
  }

  async function addEncryptedNote() {
    if (!wallet) throw new Error("Connect a Solana wallet first.");
    if (!txSignature.trim() || !noteText.trim()) throw new Error("Enter a transaction signature and a note.");
    const envelope = await encryptForWallet(
      wallet,
      { format: "zolius-private-note-v1", signature: txSignature.trim(), note: noteText.trim() },
      "note",
    );
    const next = [{ id: crypto.randomUUID(), envelope }, ...notes];
    persistNotes(next);
    setTxSignature("");
    setNoteText("");
    setMessage("Encrypted note saved in this browser and linked to the transaction signature.");
  }

  async function revealNote(note: SavedNote) {
    if (!wallet) return;
    const value = (await decryptForWallet(wallet, note.envelope)) as { signature: string; note: string };
    setMessage(`${value.signature}: ${value.note}`);
  }

  async function createShare() {
    if (!wallet) throw new Error("Connect a Solana wallet first.");
    if (!recipientAddress.trim() || !recipientKey.trim()) throw new Error("Enter the recipient wallet address and X-Wing public key.");
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipientAddress.trim())) throw new Error("Recipient wallet address is invalid.");
    const hours = Number(shareHours);
    if (!Number.isFinite(hours) || hours < 1 || hours > 8760) throw new Error("Choose an expiration between 1 hour and 365 days.");
    const expiresAt = Date.now() + hours * 60 * 60 * 1000;
    const access = await readPrivateVaultAccess(wallet);
    const envelope = await encryptForWallet(
      wallet,
      { format: "zolius-view-share-v1", viewingKey: access.viewingKey, history: access.portfolio.history, balances: access.portfolio.balances.map(({ mint, amount, decimals }) => ({ mint, amount: String(amount), decimals })) },
      "share",
      recipientKey,
      recipientAddress.trim(),
      expiresAt,
    );
    downloadJson(`zolius-view-share-${recipientAddress.slice(0, 6)}.json`, envelope);
    persistShares([{ id: crypto.randomUUID(), recipient: recipientAddress.trim(), expiresAt, envelope }, ...shares]);
    setMessage("Encrypted viewing file created with your viewing key and current private history snapshot. Only the recipient can open it with their wallet.");
  }

  async function importShare(event: ChangeEvent<HTMLInputElement>) {
    if (!wallet) throw new Error("Connect the recipient wallet before opening a share.");
    const file = event.target.files?.[0];
    if (!file) return;
    await perform(async () => {
      const envelope = await readEnvelope(file);
      if (envelope.purpose !== "share") throw new Error("This file is not a viewing share.");
      const value = (await decryptForWallet(wallet, envelope)) as NonNullable<typeof openedShare>;
      if (typeof value.viewingKey !== "string" || !/^[0-9a-f]{64}$/.test(value.viewingKey)) throw new Error("This share does not contain a valid Privacy Rings viewing key.");
      setOpenedShare(value);
      setRestoreResult(`Viewing share opened with its encrypted viewing key: ${value.history?.length ?? 0} history entries and ${value.balances?.length ?? 0} private asset balances.`);
    });
    event.target.value = "";
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    if (!wallet) throw new Error("Connect a Solana wallet first.");
    await restoreBackup(event);
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <header style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 22 }}>
        <div style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "var(--color-accent-ink)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>
          <ShieldCheck size={15} /> Quantum Vault // X-Wing + AES-256-GCM
        </div>
        <h2 style={{ margin: "10px 0 6px", fontFamily: "var(--font-headline)", fontSize: 22, fontWeight: 600 }}>Your keys. Your quantum vault.</h2>
        <p style={{ margin: 0, color: "var(--color-muted)", maxWidth: 760, lineHeight: 1.65 }}>Encrypted backups, expiring history shares, and private transaction notes. Vault access is derived from a wallet signature over <code>ZOLIUS/vault/v1</code>.</p>
      </header>

      {!wallet ? (
        <section style={box}>
          <h2 style={{ marginTop: 0 }}>Connect your wallet</h2>
          <p style={{ color: "var(--color-muted)" }}>The connected wallet derives your X-Wing key pair locally; private key material is not sent to a server.</p>
          <button className="lp-btn lp-btn--filled" onClick={onConnect}>Connect Solana wallet</button>
        </section>
      ) : (
        <>
          <section style={{ ...box, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
              <div><div style={{ fontSize: 11, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>Connected identity</div><code>{wallet.address}</code></div>
              <button className="lp-btn lp-btn--outline" disabled={busy} onClick={() => void perform(signAndGetPublicKey)}><KeyRound size={15} /> Derive X-Wing public key</button>
            </div>
            {publicKey && <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}><code style={{ overflowWrap: "anywhere", fontSize: 11 }}>{publicKey}</code><button className="lp-btn lp-btn--outline" onClick={() => void navigator.clipboard.writeText(publicKey)} aria-label="Copy X-Wing public key"><Copy size={14} /></button></div>}
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 20 }}>
            <section style={{ ...box, display: "grid", alignContent: "start", gap: 12 }}>
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 9 }}><FileLock2 size={19} /> Encrypted backup</h2>
              <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.55 }}>Synces your private account, then encrypts its history and metadata to your wallet-derived X-Wing key. The same wallet restores it on another device.</p>
              <button className="lp-btn lp-btn--filled" disabled={busy} onClick={() => void perform(createBackup)}><Download size={15} /> Create encrypted backup</button>
              <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Restore backup<input type="file" accept="application/json,.json" disabled={busy} onChange={(event) => void importBackup(event)} /></label>
            </section>

            <section style={{ ...box, display: "grid", alignContent: "start", gap: 12 }}>
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 9 }}><LockKeyhole size={19} /> Share viewing history</h2>
              <p style={{ margin: 0, color: "var(--color-muted)", lineHeight: 1.55 }}>Encrypt a read-only history export to the recipient’s X-Wing public key. Expiration is checked before decryption.</p>
              <input style={input} placeholder="Recipient Solana wallet address" value={recipientAddress} onChange={(event) => setRecipientAddress(event.target.value)} />
              <textarea style={{ ...input, minHeight: 88, resize: "vertical" }} placeholder="Recipient X-Wing public key (base64)" value={recipientKey} onChange={(event) => setRecipientKey(event.target.value)} />
              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Expires in hours<input style={input} type="number" min="1" max="8760" value={shareHours} onChange={(event) => setShareHours(event.target.value)} /></label>
              <button className="lp-btn lp-btn--filled" disabled={busy} onClick={() => void perform(createShare)}><Upload size={15} /> Create encrypted share</button>
              <label style={{ display: "grid", gap: 7, fontSize: 13 }}>Open a share on the recipient wallet<input type="file" accept="application/json,.json" disabled={busy} onChange={(event) => void importShare(event)} /></label>
              {shares.length > 0 && <div style={{ display: "grid", gap: 8, marginTop: 4 }}><strong style={{ fontSize: 12 }}>Issued shares</strong>{shares.map((share) => <div key={share.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderTop: "1px solid var(--color-border)", paddingTop: 8, fontSize: 12 }}><span>{share.recipient.slice(0, 6)}…{share.recipient.slice(-4)} · {new Date(share.expiresAt).toLocaleString()}</span><button className="lp-btn lp-btn--outline" aria-label="Remove share record" onClick={() => persistShares(shares.filter((item) => item.id !== share.id))}><Trash2 size={14} /> Remove</button></div>)}<small style={{ color: "var(--color-muted)" }}>Removing a record only removes it from this browser. A recipient who already downloaded a share can keep it until expiry.</small></div>}
            </section>
          </div>

          {openedShare && <section style={box}>
            <h2 style={{ marginTop: 0 }}>Decrypted read-only snapshot</h2>
            {(openedShare.balances || []).map((balance, index) => <div key={`${balance.mint}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--color-border)", padding: "9px 0", fontSize: 12 }}><code>{balance.mint}</code><strong>{String(balance.amount)} base units · {balance.decimals} decimals</strong></div>)}
            {(openedShare.history || []).map((row, index) => <div key={`${row.signature}-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 12, borderTop: "1px solid var(--color-border)", padding: "10px 0", fontSize: 12 }}><span>{row.kind} · {row.direction}</span><strong>{String(row.amount)} base units · {row.decimals} decimals</strong><a href={`https://explorer.solana.com/tx/${row.signature}`} target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-ink)" }}>View transaction</a></div>)}
          </section>}

          <section style={{ ...box, display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 9 }}><LockKeyhole size={19} /> Encrypted transaction notes</h2>
            <p style={{ margin: 0, color: "var(--color-muted)" }}>Attach labels, invoice references, or accounting notes to a transaction signature. Notes are encrypted before local storage.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 10 }}><input style={input} placeholder="Solana transaction signature" value={txSignature} onChange={(event) => setTxSignature(event.target.value)} /><input style={input} placeholder="Private note" value={noteText} onChange={(event) => setNoteText(event.target.value)} /></div>
            <div><button className="lp-btn lp-btn--filled" disabled={busy} onClick={() => void perform(addEncryptedNote)}><Plus size={15} /> Save encrypted note</button></div>
            {notes.map((note) => <div key={note.id} style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><span style={{ fontSize: 12 }}>Transaction note · {new Date(note.envelope.createdAt).toLocaleString()}</span><span style={{ display: "flex", gap: 8 }}><button className="lp-btn lp-btn--outline" onClick={() => void perform(() => revealNote(note))}>Decrypt</button><button className="lp-btn lp-btn--outline" onClick={() => persistNotes(notes.filter((item) => item.id !== note.id))}><Trash2 size={14} /> Delete</button></span></div>)}
          </section>
        </>
      )}

      {(error || message || restoreResult) && <div role={error ? "alert" : "status"} style={{ ...box, borderColor: error ? "var(--color-danger-border)" : "rgba(22, 163, 74, .25)", color: error ? "var(--color-danger-ink)" : "var(--color-text)" }}>{error || restoreResult || message}</div>}
      {busy && <div style={{ color: "var(--color-muted)", fontSize: 13 }}>Waiting for wallet signature and encrypting locally…</div>}
    </section>
  );
}
