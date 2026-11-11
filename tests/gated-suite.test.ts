import { describe, it, expect, vi } from "vitest";
import {
  TESTNET_GATED_SUITE,
  buildGatedPoolId,
  buildGatedPoolKey,
  buildGatedSwapTxArgs,
  resolveGatedSuite,
} from "../lib/gated-attest";

describe("resolveGatedSuite", () => {
  it("resolves testnet unconditionally with live addresses", () => {
    const s = resolveGatedSuite(46630);
    expect(s).toEqual(TESTNET_GATED_SUITE);
    expect(s?.hook).toBe("0xbebfc3048c7ced099337abe46e56189fa63420c4");
  });

  it("fails closed for unknown chains", () => {
    expect(resolveGatedSuite(1)).toBeNull();
    expect(resolveGatedSuite(null)).toBeNull();
  });

  it("fails closed for mainnet while env is absent", () => {
    if (!process.env.NEXT_PUBLIC_MAINNET_SWAP_HELPER) {
      expect(resolveGatedSuite(4663)).toBeNull();
    }
  });

  it("accepts a mainnet suite once configured", async () => {
    process.env.NEXT_PUBLIC_VEIL_ATTESTATION_REGISTRY = "0xd1f17c70067f1cc2b478606b3f0faa18ee8add1d";
    process.env.NEXT_PUBLIC_VEIL_HOOK = "0xf95f041462ee34c2ea7b953a879838133ef820c4";
    process.env.NEXT_PUBLIC_VEIL_TOKEN = "0xe0e11ec0d62eda12de796d025d6334fadfe5ab2a";
    process.env.NEXT_PUBLIC_MAINNET_SWAP_HELPER = "0x08b11d4d5fc78789e305e8437c45c52488a19a58";
    vi.resetModules();
    const fresh = await import("../lib/gated-attest");
    const s = fresh.resolveGatedSuite(4663);
    expect(s?.chainId).toBe(4663);
    expect(s?.hook.toLowerCase()).toBe("0xf95f041462ee34c2ea7b953a879838133ef820c4");
    delete process.env.NEXT_PUBLIC_VEIL_ATTESTATION_REGISTRY;
    delete process.env.NEXT_PUBLIC_VEIL_HOOK;
    delete process.env.NEXT_PUBLIC_VEIL_TOKEN;
    delete process.env.NEXT_PUBLIC_MAINNET_SWAP_HELPER;
  });
});

describe("suite-threaded gated builders keep testnet defaults", () => {
  it("pool key defaults to the testnet hook and token", () => {
    const key = buildGatedPoolKey();
    expect(key.hooks).toBe(TESTNET_GATED_SUITE.hook);
    expect(key.currency1).toBe(TESTNET_GATED_SUITE.veilToken);
  });

  it("pool key follows an explicit suite", () => {
    const key = buildGatedPoolKey({ ...TESTNET_GATED_SUITE, hook: "0xf95f041462ee34c2ea7b953a879838133ef820c4" });
    expect(key.hooks).toBe("0xf95f041462ee34c2ea7b953a879838133ef820c4");
  });

  it("swap tx args follow an explicit suite", () => {
    const suite = { ...TESTNET_GATED_SUITE, swapper: "0x08b11d4d5fc78789e305e8437c45c52488a19a58" as `0x${string}` };
    const args = buildGatedSwapTxArgs({
      from: "0xCAB1E4df4FBD2EF6F73cB03519Ec33cba08879e6" as `0x${string}`,
      amountIn: 1000000000000000000n,
      hookData: "0x1234",
      suite,
    });
    expect(args[0].inputToken).toBe(suite.veilToken);
  });

  it("pinned testnet pool id still reproduces", () => {
    expect(buildGatedPoolId()).toBe("0x837b0a31b5577f02f98e51829cab48f6e5b190546e168772523dd1c5c409419c");
  });
});
