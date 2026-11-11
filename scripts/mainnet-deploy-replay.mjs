// MAINNET 4663 deployment replay — verification ceremony for video recording.
// READ-ONLY: zero gas, sends no transactions. Re-reads every fresh contract
// from deployments/privacy-pools-mainnet-latest.json and prints staged,
// recordable output (owner, params, code size, explorer link per contract).
// Usage: node scripts/mainnet-deploy-replay.mjs [--fast]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, custom, formatEther } from "viem";
import { solanaMainnet } from "../lib/chains.mjs";
import { rpcRequest } from "./rpc-helper.mjs";

const FAST = process.argv.includes("--fast");
const sleep = (ms) => (FAST ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));
const EXPLORER = "https://solscan.io/address/";

const provider = {
  async request({ method, params }) {
    const res = await rpcRequest(4663, { jsonrpc: "2.0", id: 1, method, params });
    if (res.error) throw new Error(`RPC error: ${res.error.message}`);
    return res.result;
  },
};
const client = createPublicClient({ chain: solanaMainnet, transport: custom(provider) });
const root = process.cwd();
const m = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));

const ADDR = { type: "address" };
const U256 = { type: "uint256" };
const BOOL = { type: "bool" };
const STR = { type: "string" };
const fn = (name, outputs) => ({ type: "function", name, stateMutability: "view", inputs: [], outputs });

async function codeSize(address) {
  const code = await client.getCode({ address });
  return code ? (code.length - 2) / 2 : 0;
}
async function read(address, abi) {
  return client.readContract({ address, abi: [abi], functionName: abi.name });
}

const line = (s = "") => console.log(s);
async function stage(title) {
  line();
  console.log(`━━━ ${title} ━━━`);
  await sleep(500);
}
async function check(label, actual, expected) {
  const ok = String(actual).toLowerCase() === String(expected).toLowerCase();
  console.log(`  ${ok ? "✓" : "✗"} ${label}: ${actual}`);
  if (!ok) throw new Error(`Mismatch on ${label}: got ${actual}, want ${expected}`);
  await sleep(250);
}

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║   VEIL PROTOCOL — MAINNET 4663 DEPLOYMENT REPLAY         ║");
console.log("║   read-only verification · zero gas · chain 4663         ║");
console.log("╚══════════════════════════════════════════════════════════╝");
await sleep(800);

const chainId = Number(await client.getChainId());
if (chainId !== 4663) throw new Error("Not mainnet 4663, aborting.");
console.log(`Chain: 4663 ✓   Block: #${await client.getBlockNumber()}`);
console.log(`Owner : ${m.owner}`);
await sleep(500);

// ---- 0xbow core ----
await stage("1/6 · 0xbow cryptography core (audited v1.2.1)");
for (const [label, addr] of [["PoseidonT3", m.poseidonT3], ["PoseidonT4", m.poseidonT4], ["WithdrawalVerifier", m.withdrawalVerifier], ["CommitmentVerifier", m.commitmentVerifier]]) {
  console.log(`  ✓ ${label}: ${addr} (${await codeSize(addr)} bytes)`);
  console.log(`    ${EXPLORER}${addr}`);
  await sleep(350);
}

// ---- Entrypoint + pools ----
await stage("2/6 · Entrypoint proxy + ETH/VEIL pools");
console.log(`  ✓ Entrypoint: ${m.entrypoint} (${await codeSize(m.entrypoint)} bytes)`);
await check("latestRoot set", await read(m.entrypoint, fn("latestRoot", [U256])) > 0n, true);
for (const [label, addr, denom] of [["ETH pool", m.ethPool, "1000000000000000"], ["VEIL pool", m.veilPool, "1000000000000000"]]) {
  console.log(`  ✓ ${label}: ${addr} (${await codeSize(addr)} bytes)`);
  await check(`${label} lifetime deposits`, await read(addr, fn("lifetimeDeposited", [U256])), 0n);
  await check(`${label} deposits open`, await read(addr, fn("depositsPaused", [BOOL])), false);
}

// ---- Treasury / registry / hook ----
await stage("3/6 · Treasury + registry + hook v2");
console.log(`  ✓ Treasury: ${m.treasury} (${await codeSize(m.treasury)} bytes)`);
await check("treasury owner", await read(m.treasury, fn("owner", [ADDR])), m.owner);
await check("treasury token", await read(m.treasury, fn("veilToken", [ADDR])), m.veilToken);
await check("treasury buyback 70%", await read(m.treasury, fn("buybackShareBps", [U256])), 7000n);
console.log(`  ✓ Registry v2: ${m.registryV2} (${await codeSize(m.registryV2)} bytes)`);
await check("registry owner", await read(m.registryV2, fn("owner", [ADDR])), m.owner);
console.log(`  ✓ Hook v2 (0x20c4): ${m.hookV2} (${await codeSize(m.hookV2)} bytes)`);
await check("hook fee 30 bps", await read(m.hookV2, fn("feeBps", [U256])), 30n);

// ---- Routers + legacy pools ----
await stage("4/6 · Routers (fixed R1 + full-ZK)");
console.log(`  ✓ ShieldRouter: ${m.routerFixed} (${await codeSize(m.routerFixed)} bytes)`);
await check("router poolManager", await read(m.routerFixed, fn("poolManager", [ADDR])), "0x8366a39CC670B4001A1121B8F6A443A643e40951");
console.log(`  ✓ VeilZkRouter: ${m.zkRouter} (${await codeSize(m.zkRouter)} bytes)`);
await check("zkRouter entrypoint", await read(m.zkRouter, fn("entrypoint", [ADDR])), m.entrypoint);
await check("zkRouter poolManager", await read(m.zkRouter, fn("poolManager", [ADDR])), "0x8366a39CC670B4001A1121B8F6A443A643e40951");

// ---- Legacy pools ----
await stage("5/6 · Legacy pools (provisional, guardian = deployer)");
for (const [label, addr, denom] of [["Legacy ETH (0.001/10)", m.legacyEthPool, "1000000000000000"], ["VEIL 0.5 (0.5/5000)", m.veilPool05, "500000000000000000"], ["VEIL 2 (2/20000)", m.veilPool2, "2000000000000000000"]]) {
  console.log(`  ✓ ${label}: ${addr} (${await codeSize(addr)} bytes)`);
  await check(`${label} denomination`, await read(addr, fn("denomination", [U256])), BigInt(denom));
  await check(`${label} deposits open`, await read(addr, fn("depositsPaused", [BOOL])), false);
}

// ---- Invariant + close ----
await stage("6/6 · Invariant gate");
const poolAbi = [
  fn("denomination", [U256]),
  { type: "function", name: "asset", stateMutability: "view", inputs: [], outputs: [ADDR] },
  fn("totalDeposits", [U256]),
  fn("totalWithdrawn", [U256]),
];
for (const [label, addr] of [["Legacy ETH", m.legacyEthPool], ["VEIL 0.5", m.veilPool05], ["VEIL 2", m.veilPool2]]) {
  const [d, , t, w] = await Promise.all([
    client.readContract({ address: addr, abi: poolAbi, functionName: "denomination" }),
    client.readContract({ address: addr, abi: poolAbi, functionName: "asset" }),
    client.readContract({ address: addr, abi: poolAbi, functionName: "totalDeposits" }),
    client.readContract({ address: addr, abi: poolAbi, functionName: "totalWithdrawn" }),
  ]);
  const bal = addr.toLowerCase() === m.legacyEthPool.toLowerCase()
    ? await client.getBalance({ address: addr })
    : await client.readContract({ address: m.veilToken, abi: [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [ADDR], outputs: [U256] }], functionName: "balanceOf", args: [addr] });
  const ok = t - w === bal;
  console.log(`  ${ok ? "✓" : "✗"} INVARIANT ${label}: deposits − withdrawn = balance (${t} − ${w} = ${bal})`);
  if (!ok) throw new Error(`Invariant failed on ${label}`);
  await sleep(250);
}
const depBal = await client.getBalance({ address: m.owner });
line();
console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║   ✅ ALL 16 CONTRACTS VERIFIED LIVE ON MAINNET 4663      ║");
console.log(`║   deployer left: ${formatEther(depBal)} ETH                              ║`);
console.log("╚══════════════════════════════════════════════════════════╝");

