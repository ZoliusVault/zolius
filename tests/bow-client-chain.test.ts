import { describe, it, expect } from "vitest";
import {
  createBowPublicClient,
  createTestnetBowPublicClient,
  resolveBowStartBlock,
} from "../lib/0xbow-client";
import { TESTNET_CHAIN_ID, MAINNET_CHAIN_ID } from "../lib/privacy-pools";

describe("chain-aware bow client", () => {
  it("generic client matches the legacy testnet client", () => {
    const a = createBowPublicClient(TESTNET_CHAIN_ID, "https://x.test/") as unknown as { chain: { id: number } };
    const b = createTestnetBowPublicClient("https://x.test/") as unknown as { chain: { id: number } };
    expect(a.chain.id).toBe(TESTNET_CHAIN_ID);
    expect(b.chain.id).toBe(TESTNET_CHAIN_ID);
  });

  it("builds a mainnet client for 4663", () => {
    const c = createBowPublicClient(MAINNET_CHAIN_ID, "https://x.test/") as unknown as { chain: { id: number } };
    expect(c.chain.id).toBe(MAINNET_CHAIN_ID);
  });

  it("resolves scan start blocks per chain, null otherwise", () => {
    expect(typeof resolveBowStartBlock(TESTNET_CHAIN_ID)).toBe("bigint");
    expect(resolveBowStartBlock(MAINNET_CHAIN_ID)).toBe(86334089n);
    expect(resolveBowStartBlock(1)).toBeNull();
    expect(resolveBowStartBlock(null)).toBeNull();
  });
});
