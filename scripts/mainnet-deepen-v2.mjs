// MAINNET 4663 deepen via helper-v2 — REAL funds, fail-closed.
// Seeds CAP0 ETH + CAP1 VEIL into the PLAIN pool through the deployed v2
// helper (0xb419..., owner-gated removal, so funds stay recoverable).
// Guards: sim-descend L (free), live gas estimate, hard reserve floor, no
// fee fields (chain node rejects them), per-send gas re-check.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient, createWalletClient, custom,
  encodeAbiParameters, keccak256, parseEther, formatEther, formatGwei,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { solanaMainnet } from "../lib/chains.mjs";
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

const HELPER = "0xb4194deb8a51b69118e5d5414d7d08326a2e9b0b"; // v2, owner = us
const CAP0 = parseEther("0.0006");
// Pons-cutover ready: VEIL cap scales with pool price (decimal VEIL/ETH).
const PRICE_STR2 = (process.env.SEED_PRICE_VEIL_PER_ETH || "2000").trim();
const _pm2 = PRICE_STR2.match(/^(\d+)(?:\.(\d+))?$/);
if (!_pm2) throw new Error("Bad SEED_PRICE_VEIL_PER_ETH (decimal VEIL per ETH).");
const CAP1 = ((CAP0 * BigInt(_pm2[1] + (_pm2[2] || ""))) / 10n ** BigInt((_pm2[2] || "").length) * 12n) / 10n;
console.log(`Deepen caps: ${formatEther(CAP0)} ETH / ${formatEther(CAP1)} VEIL @ ${PRICE_STR2}/ETH`);
const RESERVE = parseEther("0.0003"); // hard floor, never dip below
const MAX_GAS_PRICE = 50000000n;
async function calmNetwork(label) {
  const live = await pub.getGasPrice();
  console.log(`gas before ${label}: ${formatGwei(live)} gwei`);
  if (live > MAX_GAS_PRICE) throw new Error(`Gas spiked before ${label}; STOPPING without spending.`);
}

if (Number(await pub.getChainId()) !== 4663) throw new Error("Not mainnet 4663, aborting.");
const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
if (man.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Not the suite owner; refusing.");
const ETH = "0x0000000000000000000000000000000000000000";
const STATEVIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
const VEIL = man.veilToken;
const helpArt = JSON.parse(readFileSync(join(root, "deployments", "mainnet-liqhelper-artifact.json"), "utf8"));
const helpOwner = await pub.readContract({ address: HELPER, abi: helpArt.abi, functionName: "owner" });
if (helpOwner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Helper owner mismatch; aborting.");

const erc20 = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];
const ethBal = await pub.getBalance({ address: account.address });
const veilBal = await pub.readContract({ address: VEIL, abi: erc20, functionName: "balanceOf", args: [account.address] });
console.log(`Balances: ${formatEther(ethBal)} ETH, ${formatEther(veilBal)} VEIL`);
if (veilBal < CAP1) throw new Error("Insufficient VEIL; aborting without spending gas.");

const poolKey = { currency0: ETH, currency1: VEIL, fee: 3000, tickSpacing: 60, hooks: ETH };
const keyTuple = [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]];
const poolId = keccak256(encodeAbiParameters(
  [{ type: "tuple", components: [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }] }],
  [keyTuple[0]]
));
const liqAbi = [{ type: "function", name: "getLiquidity", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint128" }] }];
const liqBefore = await pub.readContract({ address: STATEVIEW, abi: liqAbi, functionName: "getLiquidity", args: [poolId] });
console.log(`Pool liquidity before: ${liqBefore}`);

const TICK_LOWER = -887220, TICK_UPPER = 887220;
// NOTE: sims run AFTER approve — the helper pulls VEIL via transferFrom, so
// pre-approve sims always revert. Approve first (~1e-6, to our own helper).
const approveEst = await pub.estimateGas({ account, address: VEIL, abi: erc20, functionName: "approve", args: [HELPER, CAP1] });
const gpPre = await pub.getGasPrice();
{
  const needPre = CAP0 + (approveEst + 600000n) * 12n / 10n * gpPre + RESERVE;
  const balPre = await pub.getBalance({ address: account.address });
  console.log(`pre-guard need ~${formatEther(needPre)} (have ${formatEther(balPre)}, floor ${formatEther(RESERVE)})`);
  if (balPre < needPre) throw new Error("Cannot afford deepen + reserve floor; STOPPING without spending gas.");
}
await calmNetwork("approve");
const ah = await wallet.writeContract({ address: VEIL, abi: erc20, functionName: "approve", args: [HELPER, CAP1] });
await pub.waitForTransactionReceipt({ hash: ah });
console.log("VEIL approved to helper.");
async function simAdd(L) {
  const args = [{ key: keyTuple[0], tickLower: TICK_LOWER, tickUpper: TICK_UPPER, liquidity: L, amount0Max: CAP0, amount1Max: CAP1, veil: VEIL }];
  try {
    await pub.simulateContract({ account, address: HELPER, abi: helpArt.abi, functionName: "addLiquidity", args, value: CAP0 });
    return true;
  } catch { return false; }
}
let L = 25000000000000000n, good = 0n;
for (let i = 0; i < 12; i++) {
  if (await simAdd(L)) { good = L; break; }
  console.log(`L=${L} reverts in sim, halving...`);
  L = L / 2n;
}
if (good <= 0n) throw new Error("No L simulates cleanly; aborting without spending gas.");
console.log(`deepen L=${good} (caps ${formatEther(CAP0)} ETH / ${formatEther(CAP1)} VEIL)`);
const addArgs = [{ key: keyTuple[0], tickLower: TICK_LOWER, tickUpper: TICK_UPPER, liquidity: good, amount0Max: CAP0, amount1Max: CAP1, veil: VEIL }];
const addEst = await pub.estimateGas({ account, address: HELPER, abi: helpArt.abi, functionName: "addLiquidity", args: addArgs, value: CAP0 });
const gp = await pub.getGasPrice();
const need = CAP0 + addEst * 12n / 10n * gp + RESERVE;
const bal = await pub.getBalance({ address: account.address });
console.log(`add est ${addEst}, need ~${formatEther(need)} (have ${formatEther(bal)}, floor ${formatEther(RESERVE)})`);
if (bal < need) throw new Error("Cannot afford deepen + reserve floor; STOPPING (only approve spent, allowance reusable).");

await calmNetwork("deepen");
const mintH = await wallet.writeContract({ address: HELPER, abi: helpArt.abi, functionName: "addLiquidity", args: addArgs, value: CAP0 });
const mintRc = await pub.waitForTransactionReceipt({ hash: mintH });
if (mintRc.status !== "success") throw new Error(`addLiquidity reverted: ${mintH}`);
console.log(`DEEPENED via ${HELPER}: ${mintH}`);
const liqAfter = await pub.readContract({ address: STATEVIEW, abi: liqAbi, functionName: "getLiquidity", args: [poolId] });
if (liqAfter <= liqBefore) throw new Error("Pool liquidity did not grow; investigate.");
console.log(`Pool liquidity: ${liqBefore} -> ${liqAfter} (v2-owned position, removable by owner)`);
const ethAfter = await pub.getBalance({ address: account.address });
console.log(`Wallet now: ${formatEther(ethAfter)} ETH (floor ${formatEther(RESERVE)})`);
if (ethAfter < RESERVE) throw new Error("Reserve floor breached; investigate (should be impossible by guard).");
console.log(`Explorer: https://solscan.io/tx/${mintH}`);
console.log(`REMOVE (if ever needed): removeLiquidity(key, ${TICK_LOWER}, ${TICK_UPPER}, ${good}) on ${HELPER}`);
process.exit(0);

