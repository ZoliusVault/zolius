import { generateKeyPairSync, sign } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { ml_kem768_x25519 } from "@noble/post-quantum/hybrid.js";
import { handleRegistrationMessage, normalizePayHandle, verifyHandleRegistration } from "../lib/pay";
import { decryptInvoiceFromLink, encryptInvoiceForPayee } from "../lib/quantum-vault";

describe("Zolius Pay handle registration", () => {
  it("normalizes valid handles and rejects reserved or malformed handles", () => {
    expect(normalizePayHandle("  Alice-9 ")).toBe("alice-9");
    expect(() => normalizePayHandle("a" )).toThrow();
    expect(() => normalizePayHandle("admin")).toThrow();
    expect(() => normalizePayHandle("alice/pay")).toThrow();
  });

  it("accepts an address-bound wallet signature and rejects tampering", () => {
    const pair = generateKeyPairSync("ed25519");
    const rawPublicKey = pair.publicKey.export({ format: "der", type: "spki" }).subarray(-32);
    const address = new PublicKey(rawPublicKey).toBase58();
    const handle = "alice-9";
    const vaultPublicKey = Buffer.alloc(1216, 7).toString("base64");
    const message = handleRegistrationMessage(handle, address, vaultPublicKey);
    const signature = sign(null, message, pair.privateKey).toString("base64");

    expect(verifyHandleRegistration({ handle, address, vaultPublicKey, signature })).toBe(true);
    expect(verifyHandleRegistration({ handle: "mallory", address, vaultPublicKey, signature })).toBe(false);
  });

  it("encrypts invoice terms so the link fragment decrypts them but the stored envelope does not expose them", async () => {
    const recipient = ml_kem768_x25519.keygen();
    const publicKey = Buffer.from(recipient.publicKey).toString("base64");
    const expiresAt = Date.now() + 60_000;
    const payload = { id: "invoice-1", amount: "12.5", mint: "So11111111111111111111111111111111111111112", note: "supplier invoice", expiresAt };
    const { envelope, linkKey } = await encryptInvoiceForPayee("recipient-address", publicKey, payload, expiresAt);

    expect(JSON.stringify(envelope)).not.toContain(payload.amount);
    expect(JSON.stringify(envelope)).not.toContain(payload.note);
    await expect(decryptInvoiceFromLink(envelope, linkKey)).resolves.toEqual(payload);
  });
});
