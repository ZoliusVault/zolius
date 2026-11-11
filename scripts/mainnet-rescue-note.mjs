// MAINNET 4663 rescue — relay the PARKED single-ZK note back to self.
// Loads deployments/mainnet-single-note.json (deposit 0xd470fa57..., secrets
// held), rebuilds state + ASP, Groth16-proves, relays 0.001 home. NO new
// deposit. Every send simulated + gas-estimated first, with a hard reserve
// floor. NO fee fields (this chain's node rejects them). REAL funds,
// fail-closed.
import { readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import http from "node:http";
import {
  createPublicClient, createWalletClient, custom,
  encodeAbiParameters, formatEther, formatGwei, parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  AccountService, PrivacyPoolSDK, DataService,
  calculateContext, generateMerkleProof, getCommitment,
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

const MAX_GAS_PRICE = 50000000n; // 0.05 gwei spike cap (no fee fields on sends)
async function calmNetwork(label) {
  const live = await pub.getGasPrice();
  console.log(`gas before ${label}: ${formatGwei(live)} gwei`);
  if (live > MAX_GAS_PRICE) throw new Error(`Gas spiked before ${label}; STOPPING without spending.`);
}
const RESERVE = parseEther("0.000005"); // never dip below this

if (Number(await pub.getChainId()) !== 4663) throw new Error("Not mainnet 4663, aborting.");
const manifest = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
const poolAddress = manifest.ethPool;
const veilPool = manifest.veilPool;
const entrypoint = manifest.entrypoint;
if (manifest.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Not the suite owner; refusing.");

const NOTE_FILE = join(root, "deployments", "mainnet-single-note.json");
const note = JSON.parse(readFileSync(NOTE_FILE, "utf8"));
if (note.chainId !== 4663 || note.pool.toLowerCase() !== poolAddress.toLowerCase()) throw new Error("Note file is not this mainnet ETH pool; refusing.");
if (!note.mnemonic || !note.nullifier || !note.secret || !note.label || !note.commitment) throw new Error("Note file missing secrets; refusing.");
const denomination = BigInt(note.denomination);
if (denomination !== parseEther("0.001")) throw new Error("Note denomination is not 0.001; refusing.");
console.log(`Rescuing note: deposit=${note.depositHash} block=${note.block} label=${note.label}`);

const poolArtifact = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "VeilTestnetPrivacyPool.json"), "utf8"));
const entrypointArtifact = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "Entrypoint.json"), "utf8"));
const SNARK_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const SENTINEL = SNARK_FIELD - 1n;

class FileCircuits {
  async getWasm(n) { return new Uint8Array(readFileSync(join(root, "public", "shield-artifacts", "v1.2.1", `${n}.wasm`))); }
  async getProvingKey(n) { return new Uint8Array(readFileSync(join(root, "public", "shield-artifacts", "v1.2.1", `${n}.zkey`))); }
  async getVerificationKey(n) { return new Uint8Array(readFileSync(join(root, "public", "shield-artifacts", "v1.2.1", `${n}.vkey`))); }
}
class RescueDS extends DataService {
  constructor(configs, client) {
    super(configs, new Map(configs.map((c) => [c.chainId, { blockChunkSize: 1800, concurrency: 1, chunkDelayMs: 100, retryOnFailure: true, maxRetries: 5, retryBaseDelayMs: 1000 }])));
    this.client = client;
  }
  async logs(pool, eventName) {
    const end = await this.client.getBlockNumber();
    const out = [];
    for (let from = pool.deploymentBlock; from <= end; from += 40000n) {
      const to = from + 40000n - 1n < end ? from + 40000n - 1n : end;
      out.push(...await this.client.getContractEvents({ address: pool.address, abi: poolArtifact.abi, eventName, fromBlock: from, toBlock: to, strict: true }));
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
console.log(`Operator balance: ${formatEther(bal0)} ETH (reserve floor ${formatEther(RESERVE)})`);
const scope = BigInt(note.scope);
const onchainScope = await pub.readContract({ address: poolAddress, abi: poolArtifact.abi, functionName: "SCOPE" });
if (BigInt(onchainScope) !== scope) throw new Error("Note scope mismatches pool SCOPE; refusing.");
const headNow = await pub.getBlockNumber();
const deploymentBlock = headNow - 1000000n; // covers dust era + everything

const LOCAL_RPC_URL = await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const out = await rpcRequest(4663, body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(typeof out === "string" ? out : JSON.stringify(out));
      } catch (e) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { message: e.message } }));
      }
    });
  });
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
});
const dataService = new RescueDS([{ chainId: 4663, privacyPoolAddress: poolAddress, startBlock: deploymentBlock, rpcUrl: LOCAL_RPC_URL }], pub);
const sdk = new PrivacyPoolSDK(new FileCircuits());
const accountService = new AccountService(dataService, { mnemonic: note.mnemonic.trim() });
accountService.addPoolAccount(scope, denomination, BigInt(note.nullifier), BigInt(note.secret), BigInt(note.label), BigInt(note.block), note.depositHash);
const spendable = accountService.getSpendableCommitments().get(scope) ?? [];
if (!spendable.length) throw new Error("Note not spendable locally (already spent onchain?); aborting without spending gas.");
const commitment = spendable[0];
// Sanity: recomputed commitment must match the file + the onchain event.
const exp = getCommitment(denomination, BigInt(note.label), BigInt(note.nullifier), BigInt(note.secret));
if (BigInt(exp.hash ?? exp) !== BigInt(note.commitment)) throw new Error("Commitment recomputation mismatch; refusing.");
const depLogs = await pub.getContractEvents({ address: poolAddress, abi: poolArtifact.abi, eventName: "Deposited", fromBlock: BigInt(note.block), toBlock: BigInt(note.block) });
if (!depLogs.some((e) => e.transactionHash.toLowerCase() === note.depositHash.toLowerCase())) throw new Error("Note deposit tx not found onchain; refusing.");
console.log("Note verified: secrets match, deposit onchain, spendable locally.");

// State tree (full history, ordered).
const deposits = await pub.getContractEvents({ address: poolAddress, abi: poolArtifact.abi, eventName: "Deposited", fromBlock: deploymentBlock, toBlock: "latest" });
const withdrawals = await pub.getContractEvents({ address: poolAddress, abi: poolArtifact.abi, eventName: "Withdrawn", fromBlock: deploymentBlock, toBlock: "latest" });
const ordered = [
  ...deposits.map((e) => ({ c: BigInt(e.args._commitment), b: e.blockNumber, i: e.logIndex })),
  ...withdrawals.map((e) => ({ c: BigInt(e.args._newCommitment), b: e.blockNumber, i: e.logIndex })),
].sort((a, b) => (a.b !== b.b ? (a.b < b.b ? -1 : 1) : a.i - b.i)).map((x) => x.c);
const uniq = [...new Set(ordered.map(String))].map(BigInt);
if (!uniq.map(String).includes(commitment.hash.toString())) throw new Error("Note commitment missing from rebuilt state; aborting.");
const sroot = BigInt(generateMerkleProof(uniq, uniq[0]).root);
const stateProof = (() => { const p = generateMerkleProof(uniq, commitment.hash); if (BigInt(p.root) !== sroot) throw new Error("state root mismatch"); return p; })();
console.log(`State rebuilt: ${uniq.length} leaves, root ${sroot}`);

// ASP: union ETH + VEIL labels + sentinel; publish only if stale.
async function poolLabels(pool) {
  const logs = await pub.getContractEvents({ address: pool, abi: poolArtifact.abi, eventName: "Deposited", fromBlock: deploymentBlock, toBlock: "latest" });
  return logs.map((l) => BigInt(l.args._label));
}
const labelSet = [...new Set([...await poolLabels(poolAddress), ...await poolLabels(veilPool)].map(String))].map(BigInt).sort((a, b) => (a < b ? -1 : 1));
if (!labelSet.map(String).includes(BigInt(note.label).toString())) throw new Error("Own label not indexed; aborting before any spend.");
const withSent = [...labelSet, ...(labelSet.map(String).includes(SENTINEL.toString()) ? [] : [SENTINEL])].sort((a, b) => (a < b ? -1 : 1));
const aspRoot = BigInt(generateMerkleProof(withSent, withSent[0]).root);
const onchainRoot = BigInt(await pub.readContract({ address: entrypoint, abi: entrypointArtifact.abi, functionName: "latestRoot" }));
const needPublish = aspRoot !== onchainRoot;
console.log(`ASP root ${needPublish ? "STALE (publish needed)" : "current (no publish)"}.`);

// Prove (local compute, minutes, free).
const aspProof = generateMerkleProof(withSent, commitment.label);
if (BigInt(aspProof.root) !== aspRoot) throw new Error("ASP proof mismatch.");
const secrets2 = accountService.createWithdrawalSecrets(commitment);
const relayData = encodeAbiParameters([{ type: "tuple", components: [{ name: "recipient", type: "address" }, { name: "feeRecipient", type: "address" }, { name: "relayFeeBPS", type: "uint256" }] }], [{ recipient: account.address, feeRecipient: account.address, relayFeeBPS: 0n }]);
const withdrawal = { processooor: entrypoint, data: relayData };
const context = BigInt(calculateContext(withdrawal, scope));
console.log("Proving (minutes, local)...");
const wproof = await sdk.proveWithdrawal(commitment, {
  withdrawalAmount: denomination, stateMerkleProof: stateProof, aspMerkleProof: aspProof,
  stateRoot: sroot, stateTreeDepth: 32n, aspRoot, aspTreeDepth: 32n, context,
  newNullifier: secrets2.nullifier, newSecret: secrets2.secret,
});
if (!(await sdk.verifyWithdrawal(wproof))) throw new Error("Local proof verify failed; aborting without spending gas.");
console.log("Proof verified locally.");
const pc = wproof.proof;
const proofStruct = {
  pA: [BigInt(pc.pi_a[0]), BigInt(pc.pi_a[1])],
  pB: [[BigInt(pc.pi_b[0][1]), BigInt(pc.pi_b[0][0])], [BigInt(pc.pi_b[1][1]), BigInt(pc.pi_b[1][0])]],
  pC: [BigInt(pc.pi_c[0]), BigInt(pc.pi_c[1])],
  pubSignals: wproof.publicSignals.map(BigInt),
};

// Simulate relay (free) — informational only: with a stale ASP root it is
// EXPECTED to revert. The binding gate is the post-publish sim below.
try {
  await pub.simulateContract({ account, address: entrypoint, abi: entrypointArtifact.abi, functionName: "relay", args: [withdrawal, proofStruct, scope] });
  console.log("Relay pre-sim OK (unexpected with stale root, but fine).");
} catch {
  if (!needPublish) throw new Error("Relay sim reverts even though ASP root is current; STOPPING without spending gas.");
  console.log("Relay pre-sim reverts as expected (ASP root not yet published).");
}

// Estimate everything (free), then ONE affordability guard with reserve.
const relayEst = await pub.estimateGas({ account, address: entrypoint, abi: entrypointArtifact.abi, functionName: "relay", args: [withdrawal, proofStruct, scope] }).catch(() => 600000n);
let publishEst = 0n;
let publishCid = "";
if (needPublish) {
  publishCid = `mainnet-rescue-4663-b${note.block}`.padEnd(40, "0");
  publishEst = await pub.estimateGas({ account, address: entrypoint, abi: entrypointArtifact.abi, functionName: "updateRoot", args: [aspRoot, publishCid] });
}
const gp = await pub.getGasPrice();
const need = (relayEst + publishEst) * 12n / 10n * gp + RESERVE;
const bal = await pub.getBalance({ address: account.address });
console.log(`relay est ${relayEst}, publish est ${publishEst}, need ~${formatEther(need)} (have ${formatEther(bal)}, reserve ${formatEther(RESERVE)})`);
if (bal < need) throw new Error("Cannot afford rescue + reserve; STOPPING without spending gas.");

// Send: publish (if needed) then BINDING sim, then relay.
if (needPublish) {
  await calmNetwork("asp publish");
  const uh = await wallet.writeContract({ address: entrypoint, abi: entrypointArtifact.abi, functionName: "updateRoot", args: [aspRoot, publishCid] });
  const urc = await pub.waitForTransactionReceipt({ hash: uh });
  if (urc.status !== "success") throw new Error(`updateRoot reverted: ${uh}`);
  console.log(`ASP published: ${uh}`);
  const rootNow = BigInt(await pub.readContract({ address: entrypoint, abi: entrypointArtifact.abi, functionName: "latestRoot" }));
  if (rootNow !== aspRoot) throw new Error("Published root mismatch; STOPPING before relay.");
}
await pub.simulateContract({ account, address: entrypoint, abi: entrypointArtifact.abi, functionName: "relay", args: [withdrawal, proofStruct, scope] });
console.log("Relay sim OK post-publish (note unspent, proof accepted).");
await calmNetwork("rescue relay");
const ethBefore = await pub.getBalance({ address: account.address });
const relayHash = await wallet.writeContract({ address: entrypoint, abi: entrypointArtifact.abi, functionName: "relay", args: [withdrawal, proofStruct, scope] });
const relayRc = await pub.waitForTransactionReceipt({ hash: relayHash });
if (relayRc.status !== "success") throw new Error(`Relay reverted: ${relayHash}`);
console.log(`RESCUE RELAY: ${relayHash} block ${relayRc.blockNumber}`);
const nullifier = BigInt(wproof.publicSignals[1]);
const spent = await pub.readContract({ address: poolAddress, abi: poolArtifact.abi, functionName: "nullifierHashes", args: [nullifier] });
if (!spent) throw new Error("Nullifier not spent; investigate.");
const ethAfter = await pub.getBalance({ address: account.address });
console.log(`Nullifier spent. Wallet ${formatEther(ethBefore)} -> ${formatEther(ethAfter)} (net +${formatEther(ethAfter - ethBefore)}).`);
renameSync(NOTE_FILE, join(root, "deployments", "mainnet-single-note-rescued.json"));
console.log("Note file archived as rescued (secrets dead, audit trail kept).");
console.log(`Explorer: https://solscan.io/tx/${relayHash}`);
process.exit(0);

