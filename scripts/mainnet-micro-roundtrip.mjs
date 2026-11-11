// MAINNET 4663 MICRO round-trip — maximum achievable on ~5.5e-5 ETH.
// Dust-scale: deploy helper-v2, seed MICRO into the PLAIN pool, remove it,
// verify baseline + zero residue. PER-STEP balance guards: any step that does
// not fit aborts BEFORE spending (fail-closed). Fee capped so txs stall
// instead of overpaying if the network spikes. REAL funds, fail-closed.
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

// Fee cap: txs stall instead of overpaying if the network spikes. Planning
// uses the LIVE gas price with a 1.2x margin per step; every step re-guards
// and stops gracefully (v2 deployed but untested > nothing locked, ever).
const MAX_FEE = 50000000n; // 0.05 gwei
const gp = await pub.getGasPrice();
console.log(`network gasPrice: ${formatGwei(gp)} gwei (cap ${formatGwei(MAX_FEE)} gwei)`);
if (gp > MAX_FEE) throw new Error("Network gas too high; aborting without spending (retry later).");
const PP = gp * 12n / 10n; // planning price: live +20%

if (Number(await pub.getChainId()) !== 4663) throw new Error("Not mainnet 4663, aborting.");
const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
if (man.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Not the suite owner; refusing.");

const PM = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
const STATEVIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
const ETH = "0x0000000000000000000000000000000000000000";
const VEIL = man.veilToken;
const ZERO = ETH;
const CAP0 = parseEther("0.000003"); // 3e-6 ETH seed value
const CAP1 = parseEther("0.006");    // ~2000 VEIL/ETH ratio

async function mustAfford(need, label) {
  const bal = await pub.getBalance({ address: account.address });
  console.log(`balance: ${formatEther(bal)} ETH, need ~${formatEther(need)} for ${label}`);
  if (bal < need) throw new Error(`Cannot afford ${label}; STOPPING without spending.`);
  return bal;
}

// Per-send spike guard (replaces fee caps, which this chain's node rejects).
// Checks live gas right before every send; aborts if the network spiked.
async function calmNetwork(label) {
  const live = await pub.getGasPrice();
  console.log(`gas before ${label}: ${formatGwei(live)} gwei`);
  if (live > MAX_FEE) throw new Error(`Gas spiked before ${label}; STOPPING without spending.`);
}

const erc20 = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];
const veilBal = await pub.readContract({ address: VEIL, abi: erc20, functionName: "balanceOf", args: [account.address] });
if (veilBal < CAP1) throw new Error("Insufficient VEIL; aborting without spending gas.");

const poolKey = { currency0: ETH, currency1: VEIL, fee: 3000, tickSpacing: 60, hooks: ZERO };
const keyTuple = [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]];
const poolId = keccak256(encodeAbiParameters(
  [{ type: "tuple", components: [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }] }],
  [keyTuple[0]]
));
const liqAbi = [{ type: "function", name: "getLiquidity", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint128" }] }];
const liqBefore = await pub.readContract({ address: STATEVIEW, abi: liqAbi, functionName: "getLiquidity", args: [poolId] });
if (liqBefore <= 0n) throw new Error("Plain pool empty; aborting.");
console.log(`Pool liquidity before: ${liqBefore}`);

// ---- STEP 1: estimate deploy, guard, deploy v2 helper ----
// Resume mode: HELPER=0x... skips deploy and continues on an existing v2.
const helpArt = JSON.parse(readFileSync(join(root, "deployments", "mainnet-liqhelper-artifact.json"), "utf8"));
if (!helpArt.abi.some((e) => e.name === "removeLiquidity")) throw new Error("Artifact is not helper-v2; recompile first.");
let helper = (process.env.HELPER || "").trim();
if (/^0x[0-9a-fA-F]{40}$/.test(helper)) {
  console.log(`RESUME on predeployed helper: ${helper}`);
} else {
  const deployGas = await pub.estimateGas({ account, data: `${helpArt.bytecode}000000000000000000000000${PM.slice(2).toLowerCase()}` });
  // Post-deploy budget: live approve estimate + flat caps for add/remove.
  // Margins are thin ON PURPOSE: every later step re-guards live, so the worst
  // case is a graceful stop (v2 deployed, nothing locked) — never stranded seed.
  const approveEstPre = await pub.estimateGas({ account, address: VEIL, abi: erc20, functionName: "approve", args: ["0x0000000000000000000000000000000000000001", CAP1] }).catch(() => 60000n);
  const afterBudget = CAP0 + (approveEstPre + 700000n) * PP;
  await mustAfford(deployGas * 102n / 100n * PP + afterBudget, "v2 deploy + full micro round-trip");
  await calmNetwork("v2 deploy");
  const dh = await wallet.deployContract({ abi: helpArt.abi, bytecode: helpArt.bytecode, args: [PM] });
  const drc = await pub.waitForTransactionReceipt({ hash: dh });
  if (drc.status !== "success" || !drc.contractAddress) throw new Error(`helper deploy reverted: ${dh}`);
  helper = drc.contractAddress;
  console.log(`HELPER V2 DEPLOYED: ${helper} ${dh} (gas ${drc.gasUsed})`);
}
const helpOwner = await pub.readContract({ address: helper, abi: helpArt.abi, functionName: "owner" });
if (helpOwner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Helper owner mismatch; aborting.");
const TICK_LOWER = -887220, TICK_UPPER = 887220;
// Skip-seed mode: LIQ=<liquidity> jumps straight to removal (position exists).
let good = 0n;
const skipSeed = /^(\d+)$/.test((process.env.LIQ || "").trim());
if (skipSeed) {
  good = BigInt(process.env.LIQ.trim());
  console.log(`SKIP-SEED: removing existing L=${good}`);
}

// ---- STEP 2: guard, approve, sim-descend L, seed micro ----
if (!skipSeed) {
const approveEst = await pub.estimateGas({ account, address: VEIL, abi: erc20, functionName: "approve", args: [helper, CAP1] });
await mustAfford(CAP0 + (approveEst + 800000n) * 12n / 10n * PP, "approve + seed + remove");
await calmNetwork("approve");
const ah = await wallet.writeContract({ address: VEIL, abi: erc20, functionName: "approve", args: [helper, CAP1] });
await pub.waitForTransactionReceipt({ hash: ah });
console.log("VEIL approved to helper.");
async function simAdd(L) {
  const args = [{ key: keyTuple[0], tickLower: TICK_LOWER, tickUpper: TICK_UPPER, liquidity: L, amount0Max: CAP0, amount1Max: CAP1, veil: VEIL }];
  try {
    await pub.simulateContract({ account, address: helper, abi: helpArt.abi, functionName: "addLiquidity", args, value: CAP0 });
    return true;
  } catch { return false; }
}
if (skipSeed) {
  console.log(`SKIP-SEED: position L=${good} already onchain, no new seed.`);
} else {
let L = 200000000000000n;
good = 0n;
for (let i = 0; i < 14; i++) {
  if (await simAdd(L)) { good = L; break; }
  L = L / 2n;
}
if (good <= 0n) throw new Error("No micro-L simulates; STOPPING (v2 deployed, nothing locked).");
console.log(`micro seed L=${good}`);
const addArgs = [{ key: keyTuple[0], tickLower: TICK_LOWER, tickUpper: TICK_UPPER, liquidity: good, amount0Max: CAP0, amount1Max: CAP1, veil: VEIL }];
const addEst = await pub.estimateGas({ account, address: helper, abi: helpArt.abi, functionName: "addLiquidity", args: addArgs, value: CAP0 });
const remEstDraft = 350000n; // refined after position exists; guard re-checked
await mustAfford(CAP0 + (addEst + remEstDraft) * 12n / 10n * PP + 2000n, "seed + remove");
await calmNetwork("seed");
const mintH = await wallet.writeContract({ address: helper, abi: helpArt.abi, functionName: "addLiquidity", args: addArgs, value: CAP0 });
const mintRc = await pub.waitForTransactionReceipt({ hash: mintH });
if (mintRc.status !== "success") throw new Error(`addLiquidity reverted: ${mintH}`);
console.log(`SEEDED micro L=${good}: ${mintH}`);
const liqMid = await pub.readContract({ address: STATEVIEW, abi: liqAbi, functionName: "getLiquidity", args: [poolId] });
console.log(`Pool liquidity after seed: ${liqMid} (delta ${liqMid - liqBefore})`);
} // end seed block
} // end if (!skipSeed)

// ---- STEP 3: guard, simulate removal, remove, verify ----
const remArgs = [keyTuple[0], TICK_LOWER, TICK_UPPER, good];
const remEst = await pub.estimateGas({ account, address: helper, abi: helpArt.abi, functionName: "removeLiquidity", args: remArgs });
await mustAfford(remEst * 12n / 10n * PP + 1000n, "remove");
await calmNetwork("remove");
const sim = await pub.simulateContract({ account, address: helper, abi: helpArt.abi, functionName: "removeLiquidity", args: remArgs });
console.log(`removeLiquidity sim returns: amount0=${sim.result[0]}, amount1=${sim.result[1]}`);
if (sim.result[0] <= 0n || sim.result[1] <= 0n) throw new Error("Removal sim returns zero; STOPPING (position stays, recoverable later).");
const veilBefore = await pub.readContract({ address: VEIL, abi: erc20, functionName: "balanceOf", args: [account.address] });
const remH = await wallet.writeContract({ address: helper, abi: helpArt.abi, functionName: "removeLiquidity", args: remArgs });
const remRc = await pub.waitForTransactionReceipt({ hash: remH });
if (remRc.status !== "success") throw new Error(`removeLiquidity reverted: ${remH}`);
console.log(`REMOVED: ${remH}`);
const liqAfter = await pub.readContract({ address: STATEVIEW, abi: liqAbi, functionName: "getLiquidity", args: [poolId] });
const veilAfter = await pub.readContract({ address: VEIL, abi: erc20, functionName: "balanceOf", args: [account.address] });
const helpEth = await pub.getBalance({ address: helper });
const helpVeil = await pub.readContract({ address: VEIL, abi: erc20, functionName: "balanceOf", args: [helper] });
console.log(`Pool liquidity after removal: ${liqAfter} (baseline restored: ${liqAfter === liqBefore})`);
const expectedBaseline = skipSeed ? liqBefore - good : liqBefore;
console.log(`Expected baseline: ${expectedBaseline} (match: ${liqAfter === expectedBaseline})`);
console.log(`Owner VEIL back: ${formatEther(veilAfter - veilBefore)}`);
console.log(`Helper residue: ${formatEther(helpEth)} ETH, ${formatEther(helpVeil)} VEIL`);
if (liqAfter !== expectedBaseline) throw new Error("Pool liquidity did not return to baseline; investigate.");
if (helpEth > 0n || helpVeil > 0n) throw new Error("Helper retains residue; investigate.");
if (veilAfter <= veilBefore) throw new Error("VEIL did not return to owner; investigate.");
console.log("MICRO ROUND-TRIP PROVEN: v2 deploy -> seed -> remove -> funds back, zero residue.");
console.log(`HELPER V2 (recoverable seeding from now on): ${helper}`);
console.log(`Explorer: https://solscan.io/tx/${remH}`);
process.exit(0);

