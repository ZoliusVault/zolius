// Manual ASP publish with EXPLICIT gas (bypasses estimateGas, which reverts
// empty on the bypass node for updateRoot). Uses the postman key, publishes
// only when stale, verifies root after. Usage:
// ASP_POSTMAN_KEY=0x... node scripts/asp-publish-manual.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, custom } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { generateMerkleProof } from "@0xbow/privacy-pools-core-sdk";
import { rpcRequest } from "./rpc-helper.mjs";
import { solanaMainnet } from "../lib/chains.mjs";

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
const key = (process.env.ASP_POSTMAN_KEY || "").trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("Set ASP_POSTMAN_KEY.");
const account = privateKeyToAccount(key);
const provider = { async request({ method, params }) { const res = await rpcRequest(4663, { jsonrpc: "2.0", id: 1, method, params }); if (res.error) throw new Error(`RPC error: ${res.error.message}`); return res.result; } };
const transport = custom(provider);
const pub = createPublicClient({ chain: solanaMainnet, transport });
const wallet = createWalletClient({ account, chain: solanaMainnet, transport });
const root = process.cwd();
const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
const ENTRYPOINT = man.entrypoint, ETH_POOL = man.ethPool, VEIL_POOL = man.veilPool;
const poolArt = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "VeilTestnetPrivacyPool.json"), "utf8"));
const SNARK_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const SENTINEL = SNARK_FIELD - 1n;
const epAbi = [
  { type: "function", name: "latestRoot", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "updateRoot", stateMutability: "nonpayable", inputs: [{ name: "_root", type: "uint256" }, { name: "_ipfsCID", type: "string" }], outputs: [{ type: "uint256" }] },
];
async function poolLabels(pool) {
  const logs = await pub.getContractEvents({ address: pool, abi: poolArt.abi, eventName: "Deposited", fromBlock: 86334089n, toBlock: "latest" });
  return logs.map((l) => BigInt(l.args._label));
}
const labelSet = [...new Set([...await poolLabels(ETH_POOL), ...await poolLabels(VEIL_POOL)].map(String))].map(BigInt).sort((a, b) => (a < b ? -1 : 1));
const withSent = [...labelSet, ...(labelSet.map(String).includes(SENTINEL.toString()) ? [] : [SENTINEL])].sort((a, b) => (a < b ? -1 : 1));
const aspRoot = BigInt(generateMerkleProof(withSent, withSent[0]).root);
const onchain = BigInt(await pub.readContract({ address: ENTRYPOINT, abi: epAbi, functionName: "latestRoot" }));
console.log(`labels=${withSent.length} computed=${aspRoot} onchain=${onchain} stale=${aspRoot !== onchain}`);
if (aspRoot === onchain) { console.log("ASP current, nothing to publish."); process.exit(0); }
const head = await pub.getBlockNumber();
const cid = `auto-asp-4663-b${head}-l${withSent.length}`.padEnd(33, "0");
console.log("cid:", cid, "len:", cid.length);
const gp = await pub.getGasPrice();
const h = await wallet.writeContract({ address: ENTRYPOINT, abi: epAbi, functionName: "updateRoot", args: [aspRoot, cid], gas: 250000n, maxFeePerGas: gp, maxPriorityFeePerGas: 0n });
console.log("sent:", h);
const rc = await pub.waitForTransactionReceipt({ hash: h });
if (rc.status !== "success") throw new Error("updateRoot reverted onchain.");
const now = BigInt(await pub.readContract({ address: ENTRYPOINT, abi: epAbi, functionName: "latestRoot" }));
if (now !== aspRoot) throw new Error("Published root mismatch.");
console.log(`ASP PUBLISHED: ${h} root=${aspRoot}`);
process.exit(0);

