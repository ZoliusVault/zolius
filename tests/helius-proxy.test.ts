import { describe, expect, it } from "vitest";
import { resolveHeliusPrivacyUrl } from "../lib/helius-proxy";

describe("Helius Privacy Rings proxy URL", () => {
  it("forwards only the SPR path while preserving the server-side API key", () => {
    const url = resolveHeliusPrivacyUrl(
      "https://devnet.helius-rpc.com/?api-key=server-secret",
      ["v1", "spr", "prove"],
    );

    expect(url.origin).toBe("https://devnet.helius-rpc.com");
    expect(url.pathname).toBe("/v1/spr/prove");
    expect(url.searchParams.get("api-key")).toBe("server-secret");
  });

  it("rejects non-SPR paths and endpoints outside Helius Devnet", () => {
    expect(() => resolveHeliusPrivacyUrl("https://devnet.helius-rpc.com/?api-key=x", ["getBalance"])).toThrow();
    expect(() => resolveHeliusPrivacyUrl("https://api.mainnet-beta.solana.com", ["v1", "spr"])).toThrow();
    expect(() => resolveHeliusPrivacyUrl("http://devnet.helius-rpc.com/?api-key=x", ["v1", "spr"])).toThrow();
  });
});
