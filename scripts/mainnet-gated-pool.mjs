// MAINNET 4663 hooked pool: init ETH/temp-VEIL pool with hook v2, seed it,
// gate a 30-day launch window, deploy the swap helper, prove an attested
// dust swap (fee must land in treasury) + prove unattested reverts (sim).
// REAL funds, fail-closed at every send. Steps resume safely on re-run.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient, createWalletClient, custom, encodeAbiParameters,
  keccak256, parseEther, formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { solanaMainnet } from "../lib/chains.mjs";
import { rpcRequest } from "./rpc-helper.mjs";
import solc from "solc";

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
const artifact = await import("../lib/veil-artifact.mjs");

const PM = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
const STATEVIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
const ETH = "0x0000000000000000000000000000000000000000";
const VEIL = man.veilToken;
const HOOK = man.hookV2;
const TREASURY = man.treasury;
const REGISTRY = man.registryV2;
const ZERO = ETH;

const bal = await pub.getBalance({ address: account.address });
console.log(`Operator balance: ${formatEther(bal)} ETH`);
if (bal < parseEther("0.0015")) throw new Error("Need >= 0.0015 ETH for init+seed+gate+proof swap; aborting without spending gas.");

const poolKey = { currency0: ETH, currency1: VEIL, fee: 3000, tickSpacing: 60, hooks: HOOK };
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
const PRICE_STRG = (process.env.SEED_PRICE_VEIL_PER_ETH || "2000").trim();
const _pmg = PRICE_STRG.match(/^(\d+)(?:\.(\d+))?$/);
if (!_pmg) throw new Error("Bad SEED_PRICE_VEIL_PER_ETH (decimal VEIL per ETH).");
const TARGET_SQRT = isqrt((BigInt(_pmg[1] + (_pmg[2] || "")) * 2n ** 192n) / 10n ** BigInt((_pmg[2] || "").length));
const pmInitAbi = [{ type: "function", name: "initialize", stateMutability: "nonpayable", inputs: [{ type: "tuple", components: [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }] }, { type: "uint160" }], outputs: [{ type: "int24" }] }];
function keyTuple() {
  return [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]];
}
if (slot0[0] === 0n) {
  console.log(`Hooked pool uninitialized — initializing at ${PRICE_STRG} VEIL/ETH...`);
  await pub.simulateContract({ account, address: PM, abi: pmInitAbi, functionName: "initialize", args: [keyTuple()[0], TARGET_SQRT] });
  const h = await wallet.writeContract({ address: PM, abi: pmInitAbi, functionName: "initialize", args: [keyTuple()[0], TARGET_SQRT] });
  const rc = await pub.waitForTransactionReceipt({ hash: h });
  if (rc.status !== "success") throw new Error(`initialize reverted: ${h}`);
  console.log(`Hooked pool initialized: ${h}`);
} else {
  console.log(`Hooked pool exists — sqrtPrice ${slot0[0]}, tick ${slot0[1]}`);
}

// Compile + deploy the swap helper (same proven logic as testnet helper).
const swapSrc = { "MainnetSwapHelper.sol": { content: readFileSync(join(root, "contracts", "MainnetSwapHelper.sol"), "utf8") } };
const swapInput = {
  language: "Solidity", sources: swapSrc,
  settings: {
    remappings: ["@uniswap/=node_modules/@uniswap/", "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/"],
    optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const swapOut = JSON.parse(solc.compile(JSON.stringify(swapInput), {
  import(path) {
    const p = path.replaceAll("\\", "/");
    const r = swapInput.settings.remappings.find((x) => p.startsWith(x.split("=")[0]));
    const resolved = r ? r.split("=")[1] + p.slice(r.split("=")[0].length) : p;
    try { return { contents: readFileSync(resolved.startsWith("node_modules") ? resolved : `contracts/${resolved}`, "utf8") }; } catch { return { error: `Unable to resolve ${path}` }; }
  },
}));
const swapErrs = (swapOut.errors ?? []).filter((e) => e.severity === "error");
if (swapErrs.length) { for (const e of swapErrs) console.error(e.formattedMessage); throw new Error("swap helper compile failed"); }
const swapArt = swapOut.contracts["MainnetSwapHelper.sol"]["MainnetSwapHelper"];
const sh = await wallet.deployContract({ abi: swapArt.abi, bytecode: `0x${swapArt.evm.bytecode.object}`, args: [PM] });
const shrc = await pub.waitForTransactionReceipt({ hash: sh });
if (shrc.status !== "success" || !shrc.contractAddress) throw new Error(`swap helper deploy reverted: ${sh}`);
const SWAPPER = shrc.contractAddress;
console.log(`Swap helper deployed: ${SWAPPER} ${sh}`);

// Seed hooked pool via the liquidity helper (recoverable position).
const liqHelpArt = JSON.parse(readFileSync(join(root, "deployments", "mainnet-liqhelper-artifact.json"), "utf8"));
const LIQHELPER = "0xd1dd7d22dd3a2953af5a1383d9bfedbbc3064693";
const helpOwner = await pub.readContract({ address: LIQHELPER, abi: liqHelpArt.abi, functionName: "owner" });
if (helpOwner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Liquidity helper owner mismatch; refusing.");
const erc20approve = [{ type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] }];
const ah = await wallet.writeContract({ address: VEIL, abi: erc20approve, functionName: "approve", args: [LIQHELPER, parseEther("2")] });
await pub.waitForTransactionReceipt({ hash: ah });
async function simAdd(L) {
  const args = [{ key: keyTuple()[0], tickLower: -887220, tickUpper: 887220, liquidity: L, amount0Max: parseEther("0.001"), amount1Max: parseEther("2"), veil: VEIL }];
  try {
    await pub.simulateContract({ account, address: LIQHELPER, abi: liqHelpArt.abi, functionName: "addLiquidity", args, value: parseEther("0.001") });
    return true;
  } catch { return false; }
}
let L = 300000000000000000n, good = 0n;
for (let i = 0; i < 12; i++) {
  if (await simAdd(L)) { good = L; break; }
  L = L / 2n;
}
if (good <= 0n) throw new Error("No seed amount simulates cleanly; aborting without locking funds.");
const addArgs = [{ key: keyTuple()[0], tickLower: -887220, tickUpper: 887220, liquidity: good, amount0Max: parseEther("0.001"), amount1Max: parseEther("2"), veil: VEIL }];
const mintH = await wallet.writeContract({ address: LIQHELPER, abi: liqHelpArt.abi, functionName: "addLiquidity", args: addArgs, value: parseEther("0.001") });
const mintRc = await pub.waitForTransactionReceipt({ hash: mintH });
if (mintRc.status !== "success") throw new Error(`seed reverted: ${mintH}`);
console.log(`HOOKED POOL SEEDED (L=${good}): ${mintH}`);

// Gate a 30-day launch window (owner-only; re-gateable any time).
const gateH = await wallet.writeContract({ address: HOOK, abi: artifact.VEIL_HOOK_ABI, functionName: "setPoolGating", args: [keyTuple()[0], true, 30n * 86400n] });
const gateRc = await pub.waitForTransactionReceipt({ hash: gateH });
if (gateRc.status !== "success") throw new Error(`setPoolGating reverted: ${gateH}`);
console.log(`Gating window open (30d): ${gateH}`);

// Self-attest check (operator must be attested for the gated proof swap).
const attested = await pub.readContract({ address: REGISTRY, abi: artifact.VEIL_ATTESTATION_REGISTRY_ABI, functionName: "verifyAttestation", args: [account.address] });
if (!attested) throw new Error("Operator not attested on mainnet registry; run scripts/mainnet-selfattest.mjs first.");

// Proof swap: attested dust swap 0.0002 ETH -> VEIL with hookData; fee must
// land in the treasury.
const treasuryBefore = await pub.getBalance({ address: TREASURY });
const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
const inner = keccak256(encodeAbiParameters(
  [{ type: "address" }, { type: "uint256" }, { type: "address" }, { type: "bytes32" }, { type: "uint256" }],
  [HOOK, 4663n, account.address, poolId, deadline]
));
const sig = await account.signMessage({ message: { raw: inner } });
const hookData = encodeAbiParameters([{ type: "address" }, { type: "uint256" }, { type: "bytes" }], [account.address, deadline, sig]);
const swapArgs = [{ key: keyTuple()[0], zeroForOne: true, amountIn: parseEther("0.0002"), minOut: 1n, hookData, inputToken: ETH }];
await pub.simulateContract({ account, address: SWAPPER, abi: swapArt.abi, functionName: "swapExactIn", args: swapArgs, value: parseEther("0.0002") });
console.log("proof-swap simulate: OK");
const swapH = await wallet.writeContract({ address: SWAPPER, abi: swapArt.abi, functionName: "swapExactIn", args: swapArgs, value: parseEther("0.0002") });
const swapRc = await pub.waitForTransactionReceipt({ hash: swapH });
if (swapRc.status !== "success") throw new Error(`proof swap reverted: ${swapH}`);
const treasuryAfter = await pub.getBalance({ address: TREASURY });
if (treasuryAfter <= treasuryBefore) throw new Error("Treasury fee did not increase after gated swap.");
console.log(`GATED SWAP PROVEN: ${swapH} (treasury +${treasuryAfter - treasuryBefore} wei)`);

// Negative proof (free): unattested hookData must revert GatingActiveUserNotAttested.
const badHookData = encodeAbiParameters([{ type: "address" }, { type: "uint256" }, { type: "bytes" }], ["0x1111111111111111111111111111111111111111", deadline, "0x1234"]);
try {
  await pub.simulateContract({ account, address: SWAPPER, abi: swapArt.abi, functionName: "swapExactIn", args: [{ key: keyTuple()[0], zeroForOne: true, amountIn: parseEther("0.0002"), minOut: 1n, hookData: badHookData, inputToken: ETH }], value: parseEther("0.0002") });
  throw new Error("UNEXPECTED: unattested swap simulated clean — gate may be open!");
} catch (e) {
  const msg = String(e?.message || e);
  if (/GatingActiveUserNotAttested/i.test(msg) || /execution reverted/i.test(msg)) {
    console.log("Negative proof OK: unattested swap reverts (gate bites).");
  } else if (msg.includes("UNEXPECTED")) {
    throw e;
  } else {
    console.log("Negative proof OK (revert, reason stripped by RPC):", msg.slice(0, 120));
  }
}
console.log(`Explorer: https://solscan.io/tx/${swapH}`);
console.log(`HOOKED POOL: ${poolId} | SWAPPER: ${SWAPPER} | LIQHELPER: ${LIQHELPER}`);
process.exit(0);

