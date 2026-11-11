import { afterEach, describe, expect, it, vi } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { ml_kem768_x25519 } from "@noble/post-quantum/hybrid.js";
import { PublicKey } from "@solana/web3.js";
import {
  decryptForWallet,
  encryptForWallet,
  getVaultPublicKey,
  type VaultEnvelope,
} from "../lib/quantum-vault";
import type { StoredWallet } from "../lib/wallets";

const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const address = new PublicKey(ed25519.getPublicKey(seed)).toBase58();
const wallet: StoredWallet = { id: "phantom", address };

function fromHex(value: string): Uint8Array {
  return Uint8Array.from(value.match(/.{2}/g) || [], (byte) => Number.parseInt(byte, 16));
}

function toHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function installWallet(addressValue = address) {
  const provider = {
    isPhantom: true,
    publicKey: { toBase58: () => addressValue },
    signMessage: async (message: Uint8Array) => ({ signature: ed25519.sign(message, seed) }),
    connect: async () => ({ publicKey: { toBase58: () => addressValue } }),
    disconnect: async () => undefined,
  };
  vi.stubGlobal("window", { phantom: { solana: provider } });
}

describe("Quantum Vault X-Wing envelopes", () => {
  it("matches the IETF draft X-Wing keygen and encapsulation vector", () => {
    const seed = fromHex("7f9c2ba4e88f827d616045507605853ed73b8093f6efbc88eb1a6eacfa66ef26");
    const encapsulationSeed = fromHex("3cb1eea988004b93103cfb0aeefd2a686e01fa4a58e8a3639ca8a1e3f9ae57e235b8cc873c23dc62b8d260169afa2f75ab916a58d974918835d25e6a435085b2");
    const keys = ml_kem768_x25519.keygen(seed);
    const encapsulated = ml_kem768_x25519.encapsulate(keys.publicKey, encapsulationSeed);

    expect(keys.publicKey).toHaveLength(1216);
    expect(toHex(keys.publicKey.slice(-32))).toBe("859edb06eff389b27dce59844570216223593d4ba32d9abac8cd049040ef6534");
    expect(encapsulated.cipherText).toHaveLength(1120);
    expect(toHex(encapsulated.cipherText.slice(-32))).toBe("e56f17576740ce2a32fc5145030145cfb97e63e0e41d354274a079d3e6fb2e15");
    expect(toHex(encapsulated.sharedSecret)).toBe("d2df0522128f09dd8e2c92b1e905c793d8f57a54c3da25861f10bf4ca613e384");
    expect(ml_kem768_x25519.decapsulate(encapsulated.cipherText, keys.secretKey)).toEqual(encapsulated.sharedSecret);
  });

  it("round-trips an encrypted backup with the same wallet-derived key", async () => {
    installWallet();
    const payload = { format: "zolius-vault-backup-v1", balance: 123n };
    const envelope = await encryptForWallet(wallet, payload, "backup");

    expect(envelope.scheme).toBe("X-Wing-ML-KEM-768-X25519+AES-256-GCM");
    await expect(decryptForWallet(wallet, envelope)).resolves.toEqual(payload);
  });

  it("rejects a share for another wallet and an expired share", async () => {
    installWallet();
    const recipientKey = await getVaultPublicKey(wallet);
    const share = await encryptForWallet(
      wallet,
      { history: ["signature"] },
      "share",
      recipientKey,
      address,
      Date.now() + 60_000,
    );

    const otherWallet = { ...wallet, address: new PublicKey("11111111111111111111111111111111").toBase58() };
    await expect(decryptForWallet(otherWallet, share)).rejects.toThrow("different wallet");

    const expired = { ...share, expiresAt: 0 } satisfies VaultEnvelope;
    await expect(decryptForWallet(wallet, expired)).rejects.toThrow("share has expired");
  });
});
