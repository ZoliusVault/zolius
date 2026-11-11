"use client";

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { ml_kem768_x25519 } from "@noble/post-quantum/hybrid.js";
import { detectSolana, type StoredWallet } from "@/lib/wallets";

const encoder = new TextEncoder();
const VAULT_DOMAIN = "ZOLIUS/vault/v1";
const VAULT_CONTEXT = "ZOLIUS/vault/xwing-seed/v1";

export type VaultEnvelope = {
  version: 1;
  scheme: "X-Wing-ML-KEM-768-X25519+AES-256-GCM";
  owner: string;
  recipient: string;
  purpose: "backup" | "share" | "note";
  createdAt: number;
  expiresAt: number | null;
  encapsulation: string;
  iv: string;
  ciphertext: string;
};

type VaultKeys = { publicKey: Uint8Array; secretKey: Uint8Array };

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function buffer(bytes: Uint8Array): ArrayBuffer {
  const result = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(result).set(bytes);
  return result;
}

async function deriveKeys(wallet: StoredWallet): Promise<VaultKeys> {
  const provider = detectSolana(wallet.id);
  if (!provider?.signMessage) throw new Error("Reconnect a Solana wallet that supports message signing.");
  const address = provider.publicKey?.toBase58();
  if (address !== wallet.address) throw new Error("Connected wallet changed. Reconnect before using Quantum Vault.");
  const message = encoder.encode(`${VAULT_DOMAIN}\n${wallet.address}`);
  const result = await provider.signMessage(message, "utf8");
  const signature = result instanceof Uint8Array ? result : result.signature;
  if (!(signature instanceof Uint8Array) || signature.length !== 64) {
    throw new Error("Wallet returned an invalid Quantum Vault signature.");
  }
  const seed = hkdf(sha256, signature, encoder.encode(wallet.address), encoder.encode(VAULT_CONTEXT), 32);
  try {
    return ml_kem768_x25519.keygen(seed);
  } finally {
    seed.fill(0);
    signature.fill(0);
  }
}

function aad(envelope: Pick<VaultEnvelope, "owner" | "recipient" | "purpose" | "expiresAt">): Uint8Array {
  return encoder.encode(
    `zolius-quantum-vault:v1|${envelope.owner}|${envelope.recipient}|${envelope.purpose}|${envelope.expiresAt ?? "never"}`,
  );
}

async function importAeadKey(sharedSecret: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", buffer(sharedSecret), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function getVaultPublicKey(wallet: StoredWallet): Promise<string> {
  const keys = await deriveKeys(wallet);
  try {
    return toBase64(keys.publicKey);
  } finally {
    keys.secretKey.fill(0);
  }
}

export async function encryptForWallet(
  wallet: StoredWallet,
  payload: unknown,
  purpose: VaultEnvelope["purpose"],
  recipientPublicKey = "",
  recipientAddress = wallet.address,
  expiresAt: number | null = null,
): Promise<VaultEnvelope> {
  if (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) {
    throw new Error("Share expiration must be in the future.");
  }
  const publicKey = recipientPublicKey ? fromBase64(recipientPublicKey.trim()) : await getPublicKeyFor(wallet);
  if (publicKey.length !== ml_kem768_x25519.lengths.publicKey) {
    throw new Error("Recipient X-Wing public key has an invalid length.");
  }

  const envelope: VaultEnvelope = {
    version: 1,
    scheme: "X-Wing-ML-KEM-768-X25519+AES-256-GCM",
    owner: wallet.address,
    recipient: recipientAddress,
    purpose,
    createdAt: Date.now(),
    expiresAt,
    encapsulation: "",
    iv: "",
    ciphertext: "",
  };
  const { cipherText, sharedSecret } = ml_kem768_x25519.encapsulate(publicKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  try {
    const key = await importAeadKey(sharedSecret);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: buffer(iv), additionalData: buffer(aad(envelope)), tagLength: 128 },
      key,
      buffer(encoder.encode(JSON.stringify(payload))),
    );
    return { ...envelope, encapsulation: toBase64(cipherText), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(encrypted)) };
  } finally {
    sharedSecret.fill(0);
  }
}

async function getPublicKeyFor(wallet: StoredWallet): Promise<Uint8Array> {
  const keys = await deriveKeys(wallet);
  keys.secretKey.fill(0);
  return keys.publicKey;
}

export async function decryptForWallet(wallet: StoredWallet, envelope: VaultEnvelope): Promise<unknown> {
  if (envelope.version !== 1 || envelope.scheme !== "X-Wing-ML-KEM-768-X25519+AES-256-GCM") {
    throw new Error("Unsupported Quantum Vault file format.");
  }
  if (envelope.recipient !== wallet.address) throw new Error("This encrypted file belongs to a different wallet.");
  if (envelope.expiresAt !== null && Date.now() >= envelope.expiresAt) throw new Error("This share has expired.");

  const keys = await deriveKeys(wallet);
  const sharedSecret = ml_kem768_x25519.decapsulate(fromBase64(envelope.encapsulation), keys.secretKey);
  try {
    const key = await importAeadKey(sharedSecret);
    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: buffer(fromBase64(envelope.iv)),
        additionalData: buffer(aad(envelope)),
        tagLength: 128,
      },
      key,
      buffer(fromBase64(envelope.ciphertext)),
    );
    return JSON.parse(new TextDecoder().decode(plain)) as unknown;
  } catch {
    throw new Error("Unable to decrypt: wallet, key, or file does not match.");
  } finally {
    sharedSecret.fill(0);
    keys.secretKey.fill(0);
  }
}
