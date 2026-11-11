import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  MAINNET_ZK_ROUTER_ADDRESS,
  isMainnetZkConfigured,
} from "../lib/zk-router";

describe("mainnet ZK router parity", () => {
  it("migration script deploys VeilZkRouter with checkpoint resume", () => {
    const src = readFileSync("scripts/migrate-mainnet-0xbow.mjs", "utf8");
    expect(src).toContain("VeilZkRouter");
    expect(src).toContain("zkRouter");
    expect(src).toContain("NEXT_PUBLIC_0XBOW_ZK_ROUTER");
    // Constructor wiring must bind the fresh entrypoint + canonical PoolManager.
    expect(src).toContain("V4_PM_MAINNET");
    // Post-deploy verification, same discipline as routerFixed/legacy pools.
    expect(src).toContain("poolManager");
  });

  it("lib exposes a fail-closed mainnet ZK router address", () => {
    expect(typeof MAINNET_ZK_ROUTER_ADDRESS).toBe("string");
    expect(typeof isMainnetZkConfigured).toBe("function");
    // Unconfigured default (empty env) must fail closed, never a zero address.
    if (!process.env.NEXT_PUBLIC_0XBOW_ZK_ROUTER) {
      expect(MAINNET_ZK_ROUTER_ADDRESS).toBe("");
      expect(isMainnetZkConfigured()).toBe(false);
    }
  });

  it("runbook documents the ZK router migration step", () => {
    const runbook = readFileSync("docs/MAINNET_RUNBOOK.md", "utf8");
    expect(runbook).toContain("VeilZkRouter");
    expect(runbook).toContain("NEXT_PUBLIC_0XBOW_ZK_ROUTER");
  });
});

describe("migration deploy mechanics", () => {
  it("deploys libraries via deployContract (writeContract cannot deploy)", () => {
    const src = readFileSync("scripts/migrate-mainnet-0xbow.mjs", "utf8");
    const start = src.indexOf("async function deployLibrary");
    const end = src.indexOf("function link(");
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, end);
    expect(body).toContain("deployContract");
    expect(body).not.toContain("writeContract");
  });
});
