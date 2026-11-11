import { describe, it, expect } from "vitest";
import {
  MAINNET_BOW_V3_ENTRYPOINT,
  MAINNET_BOW_V3_ETH_DENOMINATION,
  MAINNET_BOW_V3_VEIL_DENOMINATION,
  TESTNET_BOW_V3_ETH_DENOMINATION,
  TESTNET_BOW_V3_VEIL_DENOMINATION,
  isMainnetBowV3Configured,
} from "../lib/privacy-pools";

describe("mainnet v3 suite constants", () => {
  it("uses the same fixed 0.001 denomination both sides as testnet", () => {
    expect(MAINNET_BOW_V3_ETH_DENOMINATION).toBe(TESTNET_BOW_V3_ETH_DENOMINATION);
    expect(MAINNET_BOW_V3_VEIL_DENOMINATION).toBe(TESTNET_BOW_V3_VEIL_DENOMINATION);
    expect(MAINNET_BOW_V3_ETH_DENOMINATION).toBe(1000000000000000n);
  });

  it("fails closed while migration env is absent", () => {
    if (!process.env.NEXT_PUBLIC_0XBOW_ENTRYPOINT) {
      expect(MAINNET_BOW_V3_ENTRYPOINT).toBe("");
      expect(isMainnetBowV3Configured()).toBe(false);
    }
  });
});
