// MAINNET 4663 self-attestation — permissionless, single cheap tx, fail-closed.
// Attests the operator wallet on the fresh registryV2 (needed before any
// gated-window swap). Skips silently if already attested. Real funds: gas only.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, custom, encodeAbiParameters, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { solanaMainnet } from "../lib/chains.mjs";
import { VEIL_ATTESTATION_REGISTRY_ABI } from "../lib/veil-artifact.mjs";
import { rpcRequest } from "./rpc-helper.mjs";

const root = process.cwd();
function loadEnvFile(path) {
  try {
    for (const rawLine of readFileSync(path, "utf8").split("\n")) {
      const line = rawLine.split("#")[0].trim();
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]]) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      process.env[m[1]] = val;
    }
  } catch {}
}
loadEnvFile(".env.mainnet.local");
loadEnvFile(".env.local");

const key = (process.env.MAINNET_PRIVATE_KEY || process.env.PRIVATE_KEY || "").trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("Set MAINNET_PRIVATE_KEY.");
const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const provider = {
  async request({ method, params }) {
    const res = await rpcRequest(4663, { jsonrpc: "2.0", id: 1, method, params });
    if (res.error) throw new Error(`RPC error: ${res.error.message}`);
    return res.result;
  },
};
const transport = custom(provider);
const pub = createPublicClient({ chain: solanaMainnet, transport });
const wallet = createWalletClient({ account, chain: solanaMainnet, transport });

if (Number(await pub.getChainId()) !== 4663) throw new Error("Not mainnet 4663, aborting.");
const manifest = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
if (manifest.chainId !== 4663) throw new Error("Manifest is not mainnet; refusing.");
const registry = manifest.registryV2;
if (manifest.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Operator key is not the suite owner; refusing.");

const already = await pub.readContract({ address: registry, abi: VEIL_ATTESTATION_REGISTRY_ABI, functionName: "verifyAttestation", args: [account.address] });
if (already) {
  console.log("Already attested on mainnet registry; nothing to do.");
  process.exit(0);
}
const nonce = await pub.readContract({ address: registry, abi: VEIL_ATTESTATION_REGISTRY_ABI, functionName: "attestationNonce", args: [account.address] });
const proofRoot = keccak256(new TextEncoder().encode(`veil-mainnet-selfattest-${Date.now()}`));
const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);
const inner = keccak256(encodeAbiParameters(
  [{ type: "address" }, { type: "uint256" }, { type: "address" }, { type: "bytes32" }, { type: "uint256" }, { type: "uint256" }],
  [registry, 4663n, account.address, proofRoot, nonce, deadline]
));
const sig = await account.signMessage({ message: { raw: inner } });
await pub.simulateContract({ account, address: registry, abi: VEIL_ATTESTATION_REGISTRY_ABI, functionName: "selfAttest", args: [proofRoot, deadline, sig] });
console.log("simulate: OK");
const h = await wallet.writeContract({ address: registry, abi: VEIL_ATTESTATION_REGISTRY_ABI, functionName: "selfAttest", args: [proofRoot, deadline, sig] });
const rc = await pub.waitForTransactionReceipt({ hash: h });
if (rc.status !== "success") throw new Error(`selfAttest reverted: ${h}`);
const ok = await pub.readContract({ address: registry, abi: VEIL_ATTESTATION_REGISTRY_ABI, functionName: "verifyAttestation", args: [account.address] });
if (!ok) throw new Error("Attestation missing after success receipt.");
console.log(`SELF-ATTESTED on mainnet: ${h} verifyAttestation=${ok}`);
process.exit(0);

