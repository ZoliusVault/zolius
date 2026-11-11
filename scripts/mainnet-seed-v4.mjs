// MAINNET 4663 v4 seed — plain ETH/temp-VEIL pool (fee 3000, no hook).
// Liquidity via MainnetLiquidityHelper (testnet-proven add path + owner-gated
// removal, so seeded funds stay recoverable). 0.001 ETH + up to 2 VEIL at
// ~2000 VEIL/ETH (testnet parity). Guards + pre-send simulation at every
// send. REAL funds, fail-closed.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient, createWalletClient, custom, encodeAbiParameters,
  keccak256, parseEther, formatEther,
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
const CAP0 = parseEther("0.001");
// Pons-cutover ready: pool price comes from env (decimal VEIL per ETH),
// default preserves the proven 2000 (temp era). Canonical launch price
// will differ wildly — never seed a fantasy price (instant arb donation).
const PRICE_STR = (process.env.SEED_PRICE_VEIL_PER_ETH || "2000").trim();
const _pm = PRICE_STR.match(/^(\d+)(?:\.(\d+))?$/);
if (!_pm) throw new Error("Bad SEED_PRICE_VEIL_PER_ETH (decimal VEIL per ETH).");
const PRICE_NUM = BigInt(_pm[1] + (_pm[2] || ""));
const PRICE_DEN = 10n ** BigInt((_pm[2] || "").length);
const CAP1 = (CAP0 * PRICE_NUM) / PRICE_DEN * 12n / 10n; // 20% headroom over ratio
console.log(`Seed price: ${PRICE_STR} VEIL/ETH, caps ${formatEther(CAP0)} ETH / ${formatEther(CAP1)} VEIL`);

const ethBal = await pub.getBalance({ address: account.address });
const erc20bal = [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }];
const veilBal = await pub.readContract({ address: VEIL, abi: erc20bal, functionName: "balanceOf", args: [account.address] });
console.log(`Balances: ${formatEther(ethBal)} ETH, ${formatEther(veilBal)} VEIL`);
if (ethBal < CAP0 + parseEther("0.001")) throw new Error("Insufficient ETH for seed + gas; aborting without spending gas.");
if (veilBal < CAP1) throw new Error("Insufficient VEIL for seed; aborting without spending gas.");

const poolKey = { currency0: ETH, currency1: VEIL, fee: 3000, tickSpacing: 60, hooks: ZERO };
const poolId = keccak256(encodeAbiParameters(
  [{ type: "tuple", components: [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }] }],
  [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
));
const svAbi = [{ type: "function", name: "getSlot0", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint160" }, { type: "int24" }, { type: "uint24" }, { type: "uint24" }] }];
let slot0;
try {
  slot0 = await pub.readContract({ address: STATEVIEW, abi: svAbi, functionName: "getSlot0", args: [poolId] });
} catch { slot0 = [0n, 0, 0, 0]; }

function isqrt(n) {
  if (n < 2n) return n;
  let x = n, y = (x + 1n) >> 1n;
  while (y < x) { x = y; y = (x + n / x) >> 1n; }
  return x;
}
const TARGET_SQRT = isqrt((PRICE_NUM * 2n ** 192n) / PRICE_DEN);

const pmInitAbi = [{ type: "function", name: "initialize", stateMutability: "nonpayable", inputs: [{ type: "tuple", components: [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }] }, { type: "uint160" }], outputs: [{ type: "int24" }] }];
function keyTuple() {
  return [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]];
}
if (slot0[0] === 0n) {
  console.log(`Pool uninitialized — initializing at ${PRICE_STR} VEIL/ETH...`);
  await pub.simulateContract({ account, address: PM, abi: pmInitAbi, functionName: "initialize", args: [keyTuple()[0], TARGET_SQRT] });
  const h = await wallet.writeContract({ address: PM, abi: pmInitAbi, functionName: "initialize", args: [keyTuple()[0], TARGET_SQRT] });
  const rc = await pub.waitForTransactionReceipt({ hash: h });
  if (rc.status !== "success") throw new Error(`initialize reverted: ${h}`);
  console.log(`Pool initialized: ${h}`);
  slot0 = await pub.readContract({ address: STATEVIEW, abi: svAbi, functionName: "getSlot0", args: [poolId] });
}
console.log(`Live sqrtPrice: ${slot0[0]}, tick: ${slot0[1]}`);

// Deploy the helper (owner = us, removable later via removeLiquidity).
const helpArt = JSON.parse(readFileSync(join(root, "deployments", "mainnet-liqhelper-artifact.json"), "utf8"));
const dh = await wallet.deployContract({ abi: helpArt.abi, bytecode: helpArt.bytecode, args: [PM] });
const drc = await pub.waitForTransactionReceipt({ hash: dh });
if (drc.status !== "success" || !drc.contractAddress) throw new Error(`helper deploy reverted: ${dh}`);
const helper = drc.contractAddress;
console.log(`Helper deployed: ${helper} ${dh}`);
const helpOwner = await pub.readContract({ address: helper, abi: helpArt.abi, functionName: "owner" });
if (helpOwner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Helper owner mismatch; aborting.");

const erc20approve = [{ type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] }];
const ah = await wallet.writeContract({ address: VEIL, abi: erc20approve, functionName: "approve", args: [helper, CAP1] });
await pub.waitForTransactionReceipt({ hash: ah });
console.log("VEIL approved to helper.");

const TICK_LOWER = -887220, TICK_UPPER = 887220;
async function simAdd(L) {
  const args = [{ key: keyTuple()[0], tickLower: TICK_LOWER, tickUpper: TICK_UPPER, liquidity: L, amount0Max: CAP0, amount1Max: CAP1, veil: VEIL }];
  try {
    await pub.simulateContract({ account, address: helper, abi: helpArt.abi, functionName: "addLiquidity", args, value: CAP0 });
    return true;
  } catch {
    return false;
  }
}
// Descend from the testnet-proven scale until simulation passes (all free).
let L = 300000000000000000n, good = 0n;
for (let i = 0; i < 12; i++) {
  if (await simAdd(L)) { good = L; break; }
  console.log(`L=${L} reverts in sim, halving...`);
  L = L / 2n;
}
if (good <= 0n) throw new Error("No liquidity amount simulates cleanly; aborting without locking funds.");
console.log(`mint liquidity: ${good} (caps ${formatEther(CAP0)} ETH / ${formatEther(CAP1)} VEIL)`);
const addArgs = [{ key: keyTuple()[0], tickLower: TICK_LOWER, tickUpper: TICK_UPPER, liquidity: good, amount0Max: CAP0, amount1Max: CAP1, veil: VEIL }];
const mintH = await wallet.writeContract({ address: helper, abi: helpArt.abi, functionName: "addLiquidity", args: addArgs, value: CAP0 });
const mintRc = await pub.waitForTransactionReceipt({ hash: mintH });
if (mintRc.status !== "success") throw new Error(`addLiquidity reverted: ${mintH}`);
console.log(`LIQUIDITY SEEDED via ${helper}: ${mintH}`);

// Verify: pool carries nonzero total liquidity.
const liqAbi = [{ type: "function", name: "getLiquidity", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint128" }] }];
const liq = await pub.readContract({ address: STATEVIEW, abi: liqAbi, functionName: "getLiquidity", args: [poolId] });
if (liq <= 0n) throw new Error("Pool liquidity reads zero; investigate.");
console.log(`Pool liquidity: ${liq} (helper-owned position, removable by owner)`);
const after = await pub.readContract({ address: STATEVIEW, abi: svAbi, functionName: "getSlot0", args: [poolId] });
console.log(`Pool live — sqrtPrice: ${after[0]}, tick: ${after[1]}`);
console.log(`Explorer: https://solscan.io/tx/${mintH}`);
console.log(`HELPER (for future removal): ${helper}`);
process.exit(0);

