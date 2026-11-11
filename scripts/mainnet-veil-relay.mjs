// MAINNET VEIL-note withdraw — the exact contract call the Withdraw tab makes.
// Relays the shielded 0.001 VEIL note (mainnet-veil-note.json) to a FRESH
// decoupled recipient via entrypoint.relay. First-ever VEIL (ERC20-leg) relay
// on mainnet: exercises _transfer/_assetBalance on the token path + pool
// balance check. ASP republish (VEIL label is new), Groth16 prove, sim, send.
// Guards, reserve floor, no fee fields. REAL funds, fail-closed.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import http from "node:http";
import {
  createPublicClient, createWalletClient, custom,
  encodeAbiParameters, formatEther, formatGwei, parseEther, keccak256, toHex,
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
// Fresh decoupled recipient (mirrors the tab's clean-recipient semantics).
// Deterministic, nobody's wallet: first 20 bytes of keccak("veil-withdraw-tab-test-1").
const FRESH = `0x${keccak256(toHex("veil-withdraw-tab-test-1")).slice(2, 42)}`;

if (Number(await pub.getChainId()) !== 4663) throw new Error("Not mainnet 4663.");
const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
if (man.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Not suite owner.");
const ETH_POOL = man.ethPool, VEIL_POOL = man.veilPool, ENTRYPOINT = man.entrypoint;
const VEIL = man.veilToken;
const DENOM = parseEther("0.001");
const NOTE_FILE = join(root, "deployments", "mainnet-veil-note.json");
const note = JSON.parse(readFileSync(NOTE_FILE, "utf8"));
if (note.chainId !== 4663 || note.pool.toLowerCase() !== VEIL_POOL.toLowerCase()) throw new Error("Note file mismatch.");
console.log(`Withdrawing VEIL note: tx=${note.txHash} label=${note.label} -> fresh ${FRESH}`);

const poolArt = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "VeilTestnetPrivacyPool.json"), "utf8"));
const epArt = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "Entrypoint.json"), "utf8"));
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
const deploymentBlock = headNow - 1000000n; // wide: never build phantom state
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
// VEIL note file has no mnemonic (script-generated secrets only) — register
// directly via addPoolAccount with saved nullifier/secret/label.
// VEIL note file has no mnemonic (script-generated secrets only). Mirror the
// UI exactly: random mnemonic + explicit addPoolAccount (secrets supplied).
const { generateMnemonic, english } = await import("viem/accounts");
const accountService = new AccountService(dataService, { mnemonic: generateMnemonic(english, 256).trim() });
accountService.addPoolAccount(scope, DENOM, BigInt(note.nullifier), BigInt(note.secret), BigInt(note.label), BigInt(note.block), note.txHash);
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
console.log(`State leaves ${uniq.length}, ASP labels ${withSent.length}. Proving...`);
const aspProof = generateMerkleProof(withSent, commitment.label);
if (BigInt(aspProof.root) !== aspRoot) throw new Error("ASP proof mismatch.");
const secrets2 = accountService.createWithdrawalSecrets(commitment);
const relayData = encodeAbiParameters([{ type: "tuple", components: [{ name: "recipient", type: "address" }, { name: "feeRecipient", type: "address" }, { name: "relayFeeBPS", type: "uint256" }] }], [{ recipient: FRESH, feeRecipient: account.address, relayFeeBPS: 0n }]);
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
const onchainRoot = BigInt(await pub.readContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "latestRoot" }));
const needPublish = aspRoot !== onchainRoot;
console.log(`ASP ${needPublish ? "STALE (publish needed)" : "current"}.`);
let publishEst = 0n;
if (needPublish) {
  const cid = `mainnet-veilwd-4663-b${note.block}`.padEnd(40, "0");
  publishEst = await pub.estimateGas({ account, address: ENTRYPOINT, abi: epArt.abi, functionName: "updateRoot", args: [aspRoot, cid] }).catch(() => 200000n);
}
const relayEst = 700000n;
const gp = await pub.getGasPrice();
const need = (publishEst + relayEst) * 12n / 10n * gp + RESERVE;
const bal = await pub.getBalance({ address: account.address });
console.log(`need ~${formatEther(need)} (have ${formatEther(bal)}, floor ${formatEther(RESERVE)})`);
if (bal < need) throw new Error("Cannot afford + floor; STOPPING without spending gas.");
if (needPublish) {
  await calmNetwork("asp publish");
  const cid = `mainnet-veilwd-4663-b${note.block}`.padEnd(40, "0");
  const uh = await wallet.writeContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "updateRoot", args: [aspRoot, cid] });
  const urc = await pub.waitForTransactionReceipt({ hash: uh });
  if (urc.status !== "success") throw new Error(`updateRoot reverted: ${uh}`);
  console.log(`ASP published: ${uh}`);
  const rootNow = BigInt(await pub.readContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "latestRoot" }));
  if (rootNow !== aspRoot) throw new Error("Published root mismatch; STOPPING.");
}
await pub.simulateContract({ account, address: ENTRYPOINT, abi: epArt.abi, functionName: "relay", args: [withdrawal, proofStruct, scope] });
console.log("Relay sim PASS (VEIL ERC20 leg accepted).");
await calmNetwork("veil relay");
const erc20bal = [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }];
const freshBefore = await pub.readContract({ address: VEIL, abi: erc20bal, functionName: "balanceOf", args: [FRESH] });
const relayHash = await wallet.writeContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "relay", args: [withdrawal, proofStruct, scope] });
const relayRc = await pub.waitForTransactionReceipt({ hash: relayHash });
if (relayRc.status !== "success") throw new Error(`Relay reverted: ${relayHash}`);
console.log(`VEIL WITHDRAW LIVE: ${relayHash} block ${relayRc.blockNumber} (gas ${relayRc.gasUsed})`);
const nullifier = BigInt(wproof.publicSignals[1]);
const spent = await pub.readContract({ address: VEIL_POOL, abi: poolArt.abi, functionName: "nullifierHashes", args: [nullifier] });
if (!spent) throw new Error("Nullifier not spent.");
const freshAfter = await pub.readContract({ address: VEIL, abi: erc20bal, functionName: "balanceOf", args: [FRESH] });
console.log(`Nullifier spent. Fresh recipient VEIL: ${freshBefore} -> ${freshAfter} (str ${freshAfter.toString()})`);
if (freshAfter - freshBefore !== DENOM) throw new Error("Recipient did not receive exactly 0.001 VEIL.");
console.log("TAB-EQUIVALENT WITHDRAW PROVEN on mainnet: VEIL note -> fresh decoupled recipient.");
console.log(`Explorer: https://solscan.io/tx/${relayHash}`);
process.exit(0);

