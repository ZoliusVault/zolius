// MAINNET: pause deposits on the 3 fresh legacy (Mock-verifier) pools.
// Rationale: Mock accepts arbitrary proofs — open Mock pools holding real
// funds are stealable. 0xbow Groth16 pools stay open (the real path).
// Guardian-only, reversible (unpause to re-open for a drill). Fail-closed.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, custom } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { solanaMainnet } from "../lib/chains.mjs";
import { VEIL_TREASURY_ABI } from "../lib/veil-artifact.mjs";
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
const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
if (man.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Not the suite owner; refusing.");

const { SHIELDED_POOL_ABI } = await import("../lib/veil-artifact.mjs");
const POOLS = [["legacyEth", man.legacyEthPool], ["veil05", man.veilPool05], ["veil2", man.veilPool2]];
for (const [label, addr] of POOLS) {
  const guardian = await pub.readContract({ address: addr, abi: SHIELDED_POOL_ABI, functionName: "guardian" });
  if (guardian.toLowerCase() !== account.address.toLowerCase()) throw new Error(`${label}: guardian is not us; refusing.`);
  const paused = await pub.readContract({ address: addr, abi: SHIELDED_POOL_ABI, functionName: "depositsPaused" });
  if (paused) {
    console.log(`${label} ${addr}: already paused, skipping.`);
    continue;
  }
  const bal = await pub.readContract({ address: addr, abi: SHIELDED_POOL_ABI, functionName: "totalDeposits" }).catch(() => 0n);
  console.log(`${label} ${addr}: pausing (deposits so far: ${bal})...`);
  const h = await wallet.writeContract({ address: addr, abi: SHIELDED_POOL_ABI, functionName: "pauseDeposits", args: [] });
  const rc = await pub.waitForTransactionReceipt({ hash: h });
  if (rc.status !== "success") throw new Error(`${label} pause reverted: ${h}`);
  const nowPaused = await pub.readContract({ address: addr, abi: SHIELDED_POOL_ABI, functionName: "depositsPaused" });
  if (!nowPaused) throw new Error(`${label} still unpaused after tx.`);
  console.log(`${label}: PAUSED ${h}`);
}
console.log("ALL LEGACY MOCK POOLS PAUSED (withdrawals stay open by code).");
process.exit(0);

