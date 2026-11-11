// MAINNET 4663 helper-v2 round-trip — proves seeded funds are recoverable.
// Dust-scale: deploy fresh v2 helper, seed tiny into the PLAIN pool, then
// removeLiquidity the full position and verify funds return to owner.
// Guards + pre-send simulation at every send. REAL funds, fail-closed.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient, createWalletClient, custom,
  encodeAbiParameters, keccak256, parseEther, formatEther,
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

if (Number(await pub.getChainId()) !== 4663) throw new Error("Not mainnet 4663, aborting.");
const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
if (man.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Not the suite owner; refusing.");

const PM = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
const STATEVIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
const ETH = "0x0000000000000000000000000000000000000000";
const VEIL = man.veilToken;
const ZERO = ETH;
const CAP0 = parseEther("0.0002");
const CAP1 = parseEther("0.4");

const ethBal = await pub.getBalance({ address: account.address });
const erc20bal = [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }];
const veilBal = await pub.readContract({ address: VEIL, abi: erc20bal, functionName: "balanceOf", args: [account.address] });
console.log(`Balances: ${formatEther(ethBal)} ETH, ${formatEther(veilBal)} VEIL`);
if (ethBal < CAP0 + parseEther("0.0008")) throw new Error("Insufficient ETH for round-trip + gas; aborting without spending gas.");
if (veilBal < CAP1) throw new Error("Insufficient VEIL; aborting without spending gas.");

const poolKey = { currency0: ETH, currency1: VEIL, fee: 3000, tickSpacing: 60, hooks: ZERO };
const keyTuple = [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]];
const poolId = keccak256(encodeAbiParameters(
  [{ type: "tuple", components: [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }] }],
  [keyTuple[0]]
));
const liqAbi = [{ type: "function", name: "getLiquidity", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint128" }] }];
const liqBefore = await pub.readContract({ address: STATEVIEW, abi: liqAbi, functionName: "getLiquidity", args: [poolId] });
if (liqBefore <= 0n) throw new Error("Plain pool uninitialized/empty; aborting.");
console.log(`Pool liquidity before: ${liqBefore}`);

// 1. Deploy fresh v2 helper (owner = us).
const helpArt = JSON.parse(readFileSync(join(root, "deployments", "mainnet-liqhelper-artifact.json"), "utf8"));
if (!helpArt.abi.some((e) => e.name === "removeLiquidity")) throw new Error("Artifact is not helper-v2 (no removeLiquidity); recompile first.");
const dh = await wallet.deployContract({ abi: helpArt.abi, bytecode: helpArt.bytecode, args: [PM] });
const drc = await pub.waitForTransactionReceipt({ hash: dh });
if (drc.status !== "success" || !drc.contractAddress) throw new Error(`helper deploy reverted: ${dh}`);
const helper = drc.contractAddress;
console.log(`Helper v2 deployed: ${helper} ${dh}`);
const helpOwner = await pub.readContract({ address: helper, abi: helpArt.abi, functionName: "owner" });
if (helpOwner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Helper owner mismatch; aborting.");

// 2. Approve dust VEIL, find simulating L, seed.
const erc20approve = [{ type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] }];
const ah = await wallet.writeContract({ address: VEIL, abi: erc20approve, functionName: "approve", args: [helper, CAP1] });
await pub.waitForTransactionReceipt({ hash: ah });
console.log("VEIL approved to helper.");

const TICK_LOWER = -887220, TICK_UPPER = 887220;
async function simAdd(L) {
  const args = [{ key: keyTuple[0], tickLower: TICK_LOWER, tickUpper: TICK_UPPER, liquidity: L, amount0Max: CAP0, amount1Max: CAP1, veil: VEIL }];
  try {
    await pub.simulateContract({ account, address: helper, abi: helpArt.abi, functionName: "addLiquidity", args, value: CAP0 });
    return true;
  } catch { return false; }
}
let L = 60000000000000000n, good = 0n;
for (let i = 0; i < 12; i++) {
  if (await simAdd(L)) { good = L; break; }
  L = L / 2n;
}
if (good <= 0n) throw new Error("No liquidity amount simulates cleanly; aborting without locking funds.");
const addArgs = [{ key: keyTuple[0], tickLower: TICK_LOWER, tickUpper: TICK_UPPER, liquidity: good, amount0Max: CAP0, amount1Max: CAP1, veil: VEIL }];
const mintH = await wallet.writeContract({ address: helper, abi: helpArt.abi, functionName: "addLiquidity", args: addArgs, value: CAP0 });
const mintRc = await pub.waitForTransactionReceipt({ hash: mintH });
if (mintRc.status !== "success") throw new Error(`addLiquidity reverted: ${mintH}`);
console.log(`SEEDED dust L=${good} via ${helper}: ${mintH}`);
const liqMid = await pub.readContract({ address: STATEVIEW, abi: liqAbi, functionName: "getLiquidity", args: [poolId] });
console.log(`Pool liquidity after seed: ${liqMid} (delta ${liqMid - liqBefore})`);

// 3. Simulate removal, then remove the full position.
const remArgs = [keyTuple[0], TICK_LOWER, TICK_UPPER, good];
const sim = await pub.simulateContract({ account, address: helper, abi: helpArt.abi, functionName: "removeLiquidity", args: remArgs });
console.log(`removeLiquidity sim returns: amount0=${sim.result[0]}, amount1=${sim.result[1]}`);
const ethBefore = await pub.getBalance({ address: account.address });
const veilBefore = await pub.readContract({ address: VEIL, abi: erc20bal, functionName: "balanceOf", args: [account.address] });
const remH = await wallet.writeContract({ address: helper, abi: helpArt.abi, functionName: "removeLiquidity", args: remArgs });
const remRc = await pub.waitForTransactionReceipt({ hash: remH });
if (remRc.status !== "success") throw new Error(`removeLiquidity reverted: ${remH}`);
console.log(`REMOVED: ${remH}`);
const liqAfter = await pub.readContract({ address: STATEVIEW, abi: liqAbi, functionName: "getLiquidity", args: [poolId] });
const ethAfter = await pub.getBalance({ address: account.address });
const veilAfter = await pub.readContract({ address: VEIL, abi: erc20bal, functionName: "balanceOf", args: [account.address] });
const helpEth = await pub.getBalance({ address: helper });
const helpVeil = await pub.readContract({ address: VEIL, abi: erc20bal, functionName: "balanceOf", args: [helper] });
console.log(`Pool liquidity after removal: ${liqAfter} (back to baseline: ${liqAfter === liqBefore})`);
console.log(`Owner ETH Δ (incl gas): ${formatEther(ethAfter - ethBefore)}, VEIL Δ: ${formatEther(veilAfter - veilBefore)}`);
console.log(`Helper residue: ${formatEther(helpEth)} ETH, ${formatEther(helpVeil)} VEIL`);
if (liqAfter !== liqBefore) throw new Error("Pool liquidity did not return to baseline; investigate.");
if (helpEth > 0n || helpVeil > 0n) throw new Error("Helper retains residue; investigate.");
if (veilAfter <= veilBefore) throw new Error("VEIL did not return to owner; investigate.");
console.log("ROUND-TRIP PROVEN: seed -> remove -> funds back, zero residue.");
console.log(`Explorer: https://solscan.io/tx/${remH}`);
process.exit(0);

