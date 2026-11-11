// MAINNET direct payout — first executeFullZkFlowDirect on mainnet.
// Spends the fresh VEIL note (mainnet-veil2-note.json): relay -> v4 swap
// VEIL->ETH -> visible payout to operator. ASP republish, prove, sim, send.
// Closes the last untested router leg. Guards, floor, no fee fields. REAL.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import http from "node:http";
import {
  createPublicClient, createWalletClient, custom, encodeAbiParameters,
  formatEther, formatGwei, parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  AccountService, PrivacyPoolSDK, DataService,
  calculateContext, generateMerkleProof,
} from "@0xbow/privacy-pools-core-sdk";
import { rpcRequest } from "./rpc-helper.mjs";
import { solanaMainnet } from "../lib/chains.mjs";

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
const provider = { async request({ method, params }) { const res = await rpcRequest(4663, { jsonrpc: "2.0", id: 1, method, params }); if (res.error) throw new Error(`RPC error: ${res.error.message}`); return res.result; } };
const transport = custom(provider);
const pub = createPublicClient({ chain: solanaMainnet, transport });
const wallet = createWalletClient({ account, chain: solanaMainnet, transport });
const MAX_GAS_PRICE = 50000000n;
async function calmNetwork(label) {
  const live = await pub.getGasPrice();
  console.log(`gas before ${label}: ${formatGwei(live)} gwei`);
  if (live > MAX_GAS_PRICE) throw new Error(`Gas spiked before ${label}; STOPPING without spending.`);
}
const RESERVE = parseEther("0.00005");

if (Number(await pub.getChainId()) !== 4663) throw new Error("Not mainnet 4663.");
const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
if (man.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Not suite owner.");
const ETH_POOL = man.ethPool, VEIL_POOL = man.veilPool, ENTRYPOINT = man.entrypoint;
const ROUTER = man.zkRouter, VEIL = man.veilToken;
const ZERO = "0x0000000000000000000000000000000000000000";
const DENOM = parseEther("0.001");
const NOTE_FILE = join(root, "deployments", "mainnet-veil2-note.json");
const note = JSON.parse(readFileSync(NOTE_FILE, "utf8"));
console.log(`Direct payout of VEIL note: label=${note.label} -> operator (visible demo)`);
const poolArt = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "VeilTestnetPrivacyPool.json"), "utf8"));
const epArt = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "Entrypoint.json"), "utf8"));
const { VEIL_ZK_ROUTER_ABI } = await import("../lib/veil-artifact.mjs");
const SNARK_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const SENTINEL = SNARK_FIELD - 1n;
class FileCircuits {
  async getWasm(n) { return new Uint8Array(readFileSync(join(root, "public", "shield-artifacts", "v1.2.1", `${n}.wasm`))); }
  async getProvingKey(n) { return new Uint8Array(readFileSync(join(root, "public", "shield-artifacts", "v1.2.1", `${n}.zkey`))); }
  async getVerificationKey(n) { return new Uint8Array(readFileSync(join(root, "public", "shield-artifacts", "v1.2.1", `${n}.vkey`))); }
}
class DS extends DataService {
  constructor(configs, client) {
    super(configs, new Map(configs.map((c) => [c.chainId, { blockChunkSize: 1800, concurrency: 1, chunkDelayMs: 100, retryOnFailure: true, maxRetries: 5, retryBaseDelayMs: 1000 }])));
    this.client = client;
  }
  async logs(pool, eventName) {
    const end = await this.client.getBlockNumber();
    const out = [];
    for (let from = pool.deploymentBlock; from <= end; from += 40000n) {
      const to = from + 40000n - 1n < end ? from + 40000n - 1n : end;
      out.push(...await this.client.getContractEvents({ address: pool.address, abi: poolArt.abi, eventName, fromBlock: from, toBlock: to, strict: true }));
    }
    return out;
  }
  async getDeposits(pool) {
    return (await this.logs(pool, "Deposited")).map((l) => ({ depositor: l.args._depositor.toLowerCase(), commitment: l.args._commitment, label: l.args._label, value: l.args._value, precommitment: l.args._precommitmentHash, blockNumber: l.blockNumber, transactionHash: l.transactionHash }));
  }
  async getWithdrawals(pool, fromBlock = pool.deploymentBlock) {
    return (await this.logs(pool, "Withdrawn")).filter((l) => l.blockNumber >= fromBlock).map((l) => ({ withdrawn: l.args._value, spentNullifier: l.args._spentNullifier, newCommitment: l.args._newCommitment, blockNumber: l.blockNumber, transactionHash: l.transactionHash }));
  }
  async getRagequits() { return []; }
}
const bal0 = await pub.getBalance({ address: account.address });
console.log(`Balance: ${formatEther(bal0)} ETH (floor ${formatEther(RESERVE)})`);
const scope = BigInt(note.scope);
const headNow = await pub.getBlockNumber();
const deploymentBlock = headNow - 1000000n;
const poolInfo = { chainId: 4663, address: VEIL_POOL, scope, deploymentBlock };
const LOCAL_RPC_URL = await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const out = await rpcRequest(4663, body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(typeof out === "string" ? out : JSON.stringify(out));
      } catch (e) { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); }
    });
  });
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
});
const dataService = new DS([{ chainId: 4663, privacyPoolAddress: VEIL_POOL, startBlock: deploymentBlock, rpcUrl: LOCAL_RPC_URL }], pub);
const sdk = new PrivacyPoolSDK(new FileCircuits());
const accountService = new AccountService(dataService, { mnemonic: note.mnemonic.trim() });
accountService.addPoolAccount(scope, DENOM, BigInt(note.nullifier), BigInt(note.secret), BigInt(note.label), BigInt(note.block), note.depositHash);
const spendable = accountService.getSpendableCommitments().get(scope) ?? [];
if (!spendable.length) throw new Error("Note not spendable.");
const commitment = spendable[0];
const stateDeposits = await pub.getContractEvents({ address: VEIL_POOL, abi: poolArt.abi, eventName: "Deposited", fromBlock: deploymentBlock, toBlock: "latest" });
const stateWithdrawals = await pub.getContractEvents({ address: VEIL_POOL, abi: poolArt.abi, eventName: "Withdrawn", fromBlock: deploymentBlock, toBlock: "latest" });
console.log(`VEIL pool history: ${stateDeposits.length} deposits, ${stateWithdrawals.length} withdrawals`);
const leaves = [
  ...stateDeposits.map((e) => ({ c: BigInt(e.args._commitment), b: e.blockNumber, i: e.logIndex })),
  ...stateWithdrawals.map((e) => ({ c: BigInt(e.args._newCommitment), b: e.blockNumber, i: e.logIndex })),
].sort((a, b) => (a.b !== b.b ? (a.b < b.b ? -1 : 1) : a.i - b.i)).map((x) => x.c);
const uniq = [...new Set(leaves.map(String))].map(BigInt);
if (!uniq.map(String).includes(commitment.hash.toString())) throw new Error("Note missing from state.");
const sroot = BigInt(generateMerkleProof(uniq, uniq[0]).root);
const stateProof = (() => { const p = generateMerkleProof(uniq, commitment.hash); if (BigInt(p.root) !== sroot) throw new Error("state root mismatch"); return p; })();
async function poolLabels(pool) {
  const logs = await pub.getContractEvents({ address: pool, abi: poolArt.abi, eventName: "Deposited", fromBlock: deploymentBlock, toBlock: "latest" });
  return logs.map((l) => BigInt(l.args._label));
}
const labelSet = [...new Set([...await poolLabels(ETH_POOL), ...await poolLabels(VEIL_POOL)].map(String))].map(BigInt).sort((a, b) => (a < b ? -1 : 1));
if (!labelSet.map(String).includes(BigInt(note.label).toString())) throw new Error("Own label missing.");
const withSent = [...labelSet, ...(labelSet.map(String).includes(SENTINEL.toString()) ? [] : [SENTINEL])].sort((a, b) => (a < b ? -1 : 1));
const aspRoot = BigInt(generateMerkleProof(withSent, withSent[0]).root);
console.log("Proving...");
const aspProof = generateMerkleProof(withSent, commitment.label);
if (BigInt(aspProof.root) !== aspRoot) throw new Error("ASP proof mismatch.");
const secrets2 = accountService.createWithdrawalSecrets(commitment);
const relayData = encodeAbiParameters([{ type: "tuple", components: [{ name: "recipient", type: "address" }, { name: "feeRecipient", type: "address" }, { name: "relayFeeBPS", type: "uint256" }] }], [{ recipient: ROUTER, feeRecipient: account.address, relayFeeBPS: 0n }]);
const withdrawal = { processooor: ENTRYPOINT, data: relayData };
const context = BigInt(calculateContext(withdrawal, scope));
const wproof = await sdk.proveWithdrawal(commitment, {
  withdrawalAmount: DENOM, stateMerkleProof: stateProof, aspMerkleProof: aspProof,
  stateRoot: sroot, stateTreeDepth: 32n, aspRoot, aspTreeDepth: 32n, context,
  newNullifier: secrets2.nullifier, newSecret: secrets2.secret,
});
if (!(await sdk.verifyWithdrawal(wproof))) throw new Error("Local proof verify failed.");
console.log("Proof verified locally.");
const pc = wproof.proof;
const proofStruct = {
  pA: [BigInt(pc.pi_a[0]), BigInt(pc.pi_a[1])],
  pB: [[BigInt(pc.pi_b[0][1]), BigInt(pc.pi_b[0][0])], [BigInt(pc.pi_b[1][1]), BigInt(pc.pi_b[1][0])]],
  pC: [BigInt(pc.pi_c[0]), BigInt(pc.pi_c[1])],
  pubSignals: wproof.publicSignals.map(BigInt),
};
// Offchain VEIL->ETH quote on live state (minOut source; return value is not a quote).
const STATEVIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
const svAbi = [
  { type: "function", name: "getSlot0", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint160" }, { type: "int24" }, { type: "uint24" }, { type: "uint24" }] },
  { type: "function", name: "getLiquidity", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint128" }] },
];
const { keccak256: k256, encodeAbiParameters: eap } = await import("viem");
const plainId = k256(eap(
  [{ type: "tuple", components: [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }] }],
  [[ZERO, VEIL, 3000, 60, ZERO]]
));
const [liveSqrtP] = await pub.readContract({ address: STATEVIEW, abi: svAbi, functionName: "getSlot0", args: [plainId] });
const liveLiq = await pub.readContract({ address: STATEVIEW, abi: svAbi, functionName: "getLiquidity", args: [plainId] });
const Q96 = 2n ** 96n;
const _x = liveLiq * Q96 / liveSqrtP;
const _y = liveLiq * liveSqrtP / Q96;
const _dyFee = DENOM * 997000n / 1000000n;
const offchainQuote = _x - (_x * _y) / (_y + _dyFee);
console.log(`Offchain VEIL->ETH quote for 0.001 VEIL: ${formatEther(offchainQuote)} ETH`);
const swapLeg = { key: [ZERO, VEIL, 3000, 60, ZERO], zeroForOne: false, sqrtPriceLimitX96: 146144670348521010328727305220398882048380662n, hookData: "0x" };
const onchainRoot = BigInt(await pub.readContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "latestRoot" }));
const needPublish = aspRoot !== onchainRoot;
console.log(`ASP ${needPublish ? "STALE (publish needed)" : "current"}.`);
let publishEst = 0n;
if (needPublish) {
  const cid = `mainnet-direct-4663-b${note.block}`.padEnd(40, "0");
  publishEst = await pub.estimateGas({ account, address: ENTRYPOINT, abi: epArt.abi, functionName: "updateRoot", args: [aspRoot, cid] }).catch(() => 200000n);
}
const execEst = 1000000n;
const gp = await pub.getGasPrice();
const need = (publishEst + execEst) * 12n / 10n * gp + RESERVE;
const bal = await pub.getBalance({ address: account.address });
console.log(`need ~${formatEther(need)} (have ${formatEther(bal)}, floor ${formatEther(RESERVE)})`);
if (bal < need) throw new Error("Cannot afford + floor; STOPPING without spending gas (note stays parked).");
if (needPublish) {
  await calmNetwork("asp publish");
  const cid = `mainnet-direct-4663-b${note.block}`.padEnd(40, "0");
  const uh = await wallet.writeContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "updateRoot", args: [aspRoot, cid] });
  const urc = await pub.waitForTransactionReceipt({ hash: uh });
  if (urc.status !== "success") throw new Error(`updateRoot reverted: ${uh}`);
  console.log(`ASP published: ${uh}`);
  const rootNow = BigInt(await pub.readContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "latestRoot" }));
  if (rootNow !== aspRoot) throw new Error("Published root mismatch; STOPPING.");
}
const minOut = (offchainQuote * 995n) / 1000n;
const dArgs = [{ processooor: ENTRYPOINT, data: relayData }, proofStruct, scope, ROUTER, VEIL, account.address, swapLeg, minOut];
await pub.simulateContract({ account, address: ROUTER, abi: VEIL_ZK_ROUTER_ABI, functionName: "executeFullZkFlowDirect", args: dArgs });
console.log(`Direct sim PASS (minOut ${formatEther(minOut)}). Executing...`);
await calmNetwork("direct");
const ethBefore = await pub.getBalance({ address: account.address });
const dh = await wallet.writeContract({ account, address: ROUTER, abi: VEIL_ZK_ROUTER_ABI, functionName: "executeFullZkFlowDirect", args: dArgs });
const drc = await pub.waitForTransactionReceipt({ hash: dh });
if (drc.status !== "success") throw new Error(`executeFullZkFlowDirect reverted: ${dh}`);
console.log(`DIRECT PAYOUT LIVE: ${dh} block ${drc.blockNumber} (gas ${drc.gasUsed})`);
const dlogs = await pub.getContractEvents({ address: ROUTER, abi: VEIL_ZK_ROUTER_ABI, eventName: "ZkDirectPayoutExecuted", fromBlock: drc.blockNumber, toBlock: drc.blockNumber });
if (!dlogs.length) throw new Error("ZkDirectPayoutExecuted missing.");
const nullifier = BigInt(wproof.publicSignals[1]);
const spent = await pub.readContract({ address: VEIL_POOL, abi: poolArt.abi, functionName: "nullifierHashes", args: [nullifier] });
if (!spent) throw new Error("Nullifier not spent.");
const ethAfter = await pub.getBalance({ address: account.address });
console.log(`Nullifier spent. Payout received (net of gas). Wallet ${formatEther(ethBefore)} -> ${formatEther(ethAfter)}.`);
console.log(`Explorer: https://solscan.io/tx/${dh}`);
try { unlinkSync(NOTE_FILE); console.log("Spent VEIL note file removed."); } catch {}
process.exit(0);

