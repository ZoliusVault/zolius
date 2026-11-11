import { describe, it, expect, vi } from "vitest";
import {
  MAINNET_ZK_ROUTER_ADDRESS,
  TESTNET_ZK_ROUTER_ADDRESS,
  TESTNET_ZK_ROUTER_ENTRYPOINT,
  TESTNET_ZK_SUITE,
  buildFullZkFlowArgs,
  buildMultiFullZkFlowArgs,
  resolveZkSuite,
} from "../lib/zk-router";

const FAKE_WITHDRAWAL = {
  processooor: TESTNET_ZK_ROUTER_ENTRYPOINT,
  data: "0x1234",
} as never;
const FAKE_PROOF = {
  pA: [1n, 2n],
  pB: [[1n, 2n], [3n, 4n]],
  pC: [5n, 6n],
  pubSignals: [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n],
} as never;

describe("resolveZkSuite", () => {
  it("resolves testnet unconditionally with live addresses", () => {
    const s = resolveZkSuite(46630);
    expect(s).toEqual(TESTNET_ZK_SUITE);
    expect(s?.router).toBe(TESTNET_ZK_ROUTER_ADDRESS);
    expect(s?.entrypoint).toBe(TESTNET_ZK_ROUTER_ENTRYPOINT);
  });

  it("fails closed for unknown chains", () => {
    expect(resolveZkSuite(1)).toBeNull();
    expect(resolveZkSuite(null)).toBeNull();
  });

  it("fails closed for mainnet while env is absent", () => {
    if (!process.env.NEXT_PUBLIC_0XBOW_ZK_ROUTER) {
      expect(resolveZkSuite(4663)).toBeNull();
    }
  });

  it("accepts a mainnet suite once configured", async () => {
    process.env.NEXT_PUBLIC_0XBOW_ENTRYPOINT = "0xb68c3d25e5e9902363e8e10d5c0a471e65be8152";
    process.env.NEXT_PUBLIC_0XBOW_POOL_ETH = "0xea48e6a7ae296ebbd7d58792091b8087032d3aa4";
    process.env.NEXT_PUBLIC_0XBOW_POOL_VEIL = "0xae2c219e462ca1b80473375bcbcad2b025cae610";
    process.env.NEXT_PUBLIC_VEIL_TOKEN = "0x019086f63407fadf0ccb89516e465baef5031aa9";
    process.env.NEXT_PUBLIC_0XBOW_ZK_ROUTER = "0x9ccf3800cb6aa5754ec9ec5815e06f432df10635";
    vi.resetModules();
    const fresh = await import("../lib/zk-router");
    const s = fresh.resolveZkSuite(4663);
    expect(s?.chainId).toBe(4663);
    expect(s?.router.toLowerCase()).toBe("0x9ccf3800cb6aa5754ec9ec5815e06f432df10635");
    delete process.env.NEXT_PUBLIC_0XBOW_ENTRYPOINT;
    delete process.env.NEXT_PUBLIC_0XBOW_POOL_ETH;
    delete process.env.NEXT_PUBLIC_0XBOW_POOL_VEIL;
    delete process.env.NEXT_PUBLIC_VEIL_TOKEN;
    delete process.env.NEXT_PUBLIC_0XBOW_ZK_ROUTER;
  });
});

describe("suite-threaded builders keep testnet defaults", () => {
  const base = {
    withdrawal: FAKE_WITHDRAWAL,
    proof: FAKE_PROOF,
    scope: 1n,
    withdrawAsset: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    depositAsset: "0x019086f63407fadf0ccb89516e465baef5031aa9" as `0x${string}`,
    depositValue: 1000000000000000n,
    precommitment: 123n,
    zeroForOne: true,
    quotedSwapOut: 2000000000000000000n,
    slippagePercent: 1,
  };

  it("single builder defaults to the testnet router", () => {
    const args = buildFullZkFlowArgs(base);
    expect(args.recipient).toBe(TESTNET_ZK_ROUTER_ADDRESS);
  });

  it("single builder honors an explicit suite", () => {
    const suite = { ...TESTNET_ZK_SUITE, router: "0x1111111111111111111111111111111111111111" as `0x${string}` };
    const args = buildFullZkFlowArgs({ ...base, suite });
    expect(args.recipient).toBe(suite.router);
  });

  it("single builder rejects a foreign entrypoint", () => {
    expect(() =>
      buildFullZkFlowArgs({
        ...base,
        withdrawal: { processooor: "0x2222222222222222222222222222222222222222", data: "0x1234" } as never,
      })
    ).toThrow(/processooor/);
  });

  it("multi builder honors an explicit suite", () => {
    const suite = {
      ...TESTNET_ZK_SUITE,
      multi: "0x3333333333333333333333333333333333333333" as `0x${string}`,
      router: "0x3333333333333333333333333333333333333333" as `0x${string}`,
    };
    const args = buildMultiFullZkFlowArgs({
      withdrawals: [FAKE_WITHDRAWAL],
      proofs: [FAKE_PROOF],
      scopes: [1n],
      withdrawAsset: base.withdrawAsset,
      depositAsset: base.depositAsset,
      depositValue: base.depositValue,
      precommitment: base.precommitment,
      zeroForOne: true,
      quotedSwapOut: base.quotedSwapOut,
      slippagePercent: 1,
      suite,
    });
    expect(args.recipient).toBe(suite.multi);
  });

  it("MAINNET_ZK_ROUTER_ADDRESS stays empty without env (fail-closed default)", () => {
    if (!process.env.NEXT_PUBLIC_0XBOW_ZK_ROUTER) {
      expect(MAINNET_ZK_ROUTER_ADDRESS).toBe("");
    }
  });
});
