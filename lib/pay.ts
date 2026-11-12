import { createPublicKey, verify } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

const RESERVED_HANDLES = new Set(["admin", "api", "app", "assets", "contracts", "exposed", "otc", "pay", "proof", "www"]);
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function normalizePayHandle(value: unknown): string {
  if (typeof value !== "string") throw new Error("Choose a handle using 3–24 letters, numbers, or hyphens.");
  const handle = value.trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])$/.test(handle) || RESERVED_HANDLES.has(handle)) {
    throw new Error("Choose an available handle using 3–24 letters, numbers, or hyphens.");
  }
  return handle;
}

export function handleRegistrationMessage(handle: string, address: string, vaultPublicKey: string): Uint8Array {
  return new TextEncoder().encode(`ZOLIUS/pay/handle/v1\n${handle}\n${address}\n${vaultPublicKey}`);
}

export function verifyHandleRegistration(input: {
  handle: string;
  address: string;
  vaultPublicKey: string;
  signature: string;
}): boolean {
  try {
    const vaultKey = Buffer.from(input.vaultPublicKey, "base64");
    if (vaultKey.length !== 1216) return false;
    return verifyWalletSignature(input.address, handleRegistrationMessage(input.handle, input.address, input.vaultPublicKey), input.signature);
  } catch {
    return false;
  }
}

export function verifyWalletSignature(address: string, message: Uint8Array, encodedSignature: string): boolean {
  try {
    const publicKey = new PublicKey(address).toBytes();
    const signature = Buffer.from(encodedSignature, "base64");
    if (signature.length !== 64) return false;
    const verifierKey = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, publicKey]), format: "der", type: "spki" });
    return verify(null, message, verifierKey, signature);
  } catch {
    return false;
  }
}

export function isInvoiceEnvelope(value: unknown): value is Record<string, unknown> & {
  version: 1; scheme: string; owner: string; recipient: string; purpose: "note";
  createdAt: number; expiresAt: number; encapsulation: string; iv: string; ciphertext: string;
} {
  if (typeof value !== "object" || value === null) return false;
  const envelope = value as Record<string, unknown>;
  return envelope.version === 1 && envelope.scheme === "X-Wing-ML-KEM-768-X25519+AES-256-GCM" &&
    envelope.purpose === "note" && typeof envelope.owner === "string" && typeof envelope.recipient === "string" &&
    Number.isSafeInteger(envelope.createdAt) && Number.isSafeInteger(envelope.expiresAt) &&
    typeof envelope.encapsulation === "string" && envelope.encapsulation.length <= 4000 &&
    typeof envelope.iv === "string" && envelope.iv.length <= 128 &&
    typeof envelope.ciphertext === "string" && envelope.ciphertext.length > 0 && envelope.ciphertext.length <= 16000;
}
