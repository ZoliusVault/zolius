import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const PAGE = "app/trade/page.tsx";
const src = () => readFileSync(PAGE, "utf8");

describe("mainnet-only UI gates", () => {
  it("ZK gates require the mainnet suite, never testnet-only", () => {
    const text = src();
    const gates = text.match(/zkSuite\.chainId !== MAINNET_CHAIN_ID/g) ?? [];
    // Shield quote + Shield execute + Swap quote + Swap execute + Shield deposit
    expect(gates.length).toBeGreaterThanOrEqual(5);
    // No 0xbow flow still pins testnet as the only accepted chain
    // (gated-attest paths stay testnet-only by design — separate workstream).
    expect(text).not.toContain("Full-ZK Swap-to-Shield lives on Robinhood Testnet");
    expect(text).not.toContain("Shielded Swap lives on Robinhood Testnet");
    expect(text).not.toContain("0xbow shielded deposits live on Robinhood Testnet");
    expect(text).not.toContain("This 0xbow note lives on Robinhood Testnet");
  });

  it("swap picker hides non-mainnet notes", () => {
    const text = src();
    expect(text).toContain("chainId === MAINNET_CHAIN_ID");
  });

  it("legacy exit list stays untouched (exit promise kept)", () => {
    const text = src();
    expect(text).toContain("LEGACY_EXIT_VEIL_POOL_05");
  });
});
