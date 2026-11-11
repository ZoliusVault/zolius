import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  normalizeXHandle,
  normalizeWallet,
  validateWaitlist,
  newConfirmToken,
} from "../lib/dark-etf-waitlist";

describe("dark ETF waitlist validation", () => {
  it("accepts a full valid payload", () => {
    const r = validateWaitlist({
      email: "  Ada@Example.COM ",
      xHandle: "@veilpools",
      wallet: "0xCAB1E4df4FBD2EF6F73cB03519Ec33cba08879e6",
      consent: true,
      source: "x?utm=x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe("ada@example.com");
      expect(r.value.xHandle).toBe("veilpools");
      expect(r.value.wallet).toBe("0xCAB1E4df4FBD2EF6F73cB03519Ec33cba08879e6");
    }
  });

  it("accepts email-only payload", () => {
    const r = validateWaitlist({ email: "a@b.co", consent: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.xHandle).toBe(null);
      expect(r.value.wallet).toBe(null);
    }
  });

  it("rejects bad email, bad handle, bad wallet, missing consent", () => {
    expect(validateWaitlist({ email: "nope", consent: true }).ok).toBe(false);
    expect(validateWaitlist({ email: "a@b.co", consent: false }).ok).toBe(false);
    expect(validateWaitlist({ email: "a@b.co", xHandle: "way-too-long-handle!!", consent: true }).ok).toBe(false);
    expect(validateWaitlist({ email: "a@b.co", wallet: "0x123", consent: true }).ok).toBe(false);
  });

  it("normalizes edge cases", () => {
    expect(normalizeEmail(null)).toBe(null);
    expect(normalizeXHandle(undefined)).toBe(null);
    expect(normalizeXHandle("")).toBe(null);
    expect(normalizeWallet("")).toBe(null);
  });

  it("mints unique 64-hex confirm tokens", () => {
    const a = newConfirmToken();
    const b = newConfirmToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(b).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

import { normalizeWeights } from "../components/dark-etf/ComposerDemo";

describe("dark ETF composer mathematical invariants", () => {
  const allTickers = ["NVDA", "SPY", "TSLA", "AAPL", "MSFT"] as const;

  it("always sums to exactly 100% across arbitrary slider inputs (2 to 5 assets)", () => {
    for (let count = 2; count <= 5; count++) {
      const picked = allTickers.slice(0, count);
      for (const changed of picked) {
        for (const testVal of [0, 1, 15, 33, 50, 77, 99, 100, -10, 120]) {
          const w = normalizeWeights([...picked], changed, testVal);
          const sum = picked.reduce((acc, t) => acc + (w[t] ?? 0), 0);
          expect(sum).toBe(100);

          // All values must be non-negative integers <= 100
          for (const t of picked) {
            expect(w[t]).toBeGreaterThanOrEqual(0);
            expect(w[t]).toBeLessThanOrEqual(100);
            expect(Number.isInteger(w[t])).toBe(true);
          }
        }
      }
    }
  });

  it("handles single-asset edge case gracefully by locking to 100%", () => {
    const w = normalizeWeights(["NVDA"], "NVDA", 42);
    expect(w.NVDA).toBe(100);
  });

  it("equally redistributes remaining balance when one asset is maximized to 100%", () => {
    const picked = ["NVDA", "SPY", "TSLA"] as const;
    const w = normalizeWeights([...picked], "NVDA", 100);
    expect(w.NVDA).toBe(100);
    expect(w.SPY).toBe(0);
    expect(w.TSLA).toBe(0);
    expect(w.NVDA + w.SPY + w.TSLA).toBe(100);
  });

  it("equally distributes entire balance when one asset is minimized to 0%", () => {
    const picked = ["NVDA", "SPY", "TSLA"] as const;
    const w = normalizeWeights([...picked], "NVDA", 0);
    expect(w.NVDA).toBe(0);
    expect(w.SPY + w.TSLA).toBe(100);
  });
});

