import { describe, expect, it } from "vitest";
import {
  SOLANA_WALLETS,
  isSolanaAddress,
  isEvmAddress,
  matchEvm,
  revalidateWallet,
  walletLabel,
} from "../lib/wallets";

describe("zolius solana wallets registry", () => {
  it("lists official Solana wallets with vector logos and install URLs", () => {
    expect(SOLANA_WALLETS.map((w) => w.id)).toEqual(["phantom", "solflare", "backpack", "okx"]);
    for (const w of SOLANA_WALLETS) {
      expect(w.installUrl).toMatch(/^https:\/\//);
      expect(w.icon).toMatch(/^\/wallets\//);
      expect(w.description.length).toBeGreaterThan(5);
    }
  });

  it("validates base58 Solana public key addresses", () => {
    expect(isSolanaAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")).toBe(true);
    expect(isSolanaAddress("ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW")).toBe(true);
    expect(isSolanaAddress("invalid-addr")).toBe(false);
    expect(isSolanaAddress("0x123")).toBe(false);
  });

  it("strictly distinguishes providers", () => {
    expect(matchEvm({ isMetaMask: true }, "metamask")).toBe(true);
    expect(matchEvm({ isMetaMask: true, isRabby: true }, "metamask")).toBe(false);
    expect(matchEvm({ isPhantom: true }, "phantom")).toBe(true);
  });

  it("formats user-friendly error messages", () => {
    expect(walletLabel(new Error("wallet_missing"))).toContain("not detected");
    expect(walletLabel(new Error("wallet_rejected"))).toContain("cancelled");
    expect(walletLabel(new Error("wallet_timeout"))).toContain("timed out");
  });
});
