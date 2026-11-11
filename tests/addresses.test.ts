import { describe, it, expect } from "vitest";
import { CONTRACT_ADDRESSES } from "../lib/contracts";

describe("Contract address source", () => {
  it("points at live mainnet deployments with valid hex addresses", () => {
    expect(CONTRACT_ADDRESSES.poolEth).toBe("0x10c17b7538e13c63b890fea52708846e88bb1932");
    expect(CONTRACT_ADDRESSES.hook).toBe("0xf95f041462ee34c2ea7b953a879838133ef820c4");
    expect(CONTRACT_ADDRESSES.router).toBe("0x3db4ae3429f1507aa0cd31c740a0fd276e22a55c");
    expect(CONTRACT_ADDRESSES.treasury).toBe("0xb68c3d25e5e9902363e8e10d5c0a471e65be8152");
    expect(CONTRACT_ADDRESSES.registry).toBe("0xd1f17c70067f1cc2b478606b3f0faa18ee8add1d");
    expect(CONTRACT_ADDRESSES.verifier).toBe("0xdbbe1acf08a99789b5ca0ee688679dab80ba12d2");
    expect(CONTRACT_ADDRESSES.deployer).toBe("0xea48e6a7ae296ebbd7d58792091b8087032d3aa4");
    for (const [key, addr] of Object.entries(CONTRACT_ADDRESSES)) {
      // token is empty until the canonical token deploys (NEXT_PUBLIC_VEIL_TOKEN).
      if (key === "token" && addr === "") continue;
      expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });
});
