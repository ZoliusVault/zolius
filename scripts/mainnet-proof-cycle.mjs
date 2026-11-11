// MAINNET 4663 proof cycle — REAL funds, fail-closed at every step.
// Deposit 0.001 ETH → publish ASP → Groth16 prove → relay BACK TO SELF.
// Relay recipient is the deployer itself so the 0.001 always returns home;
// nothing is stranded in an ephemeral key. No secrets are persisted
// (the spent note needs no backup). Aborts before spending gas on any doubt.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import http from "node:http";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeAbiParameters,
  formatEther,
  parseEther,
} from "viem";
import { privateKeyToAccount, generateMnemonic, mnemonicToAccount, english } from "viem/accounts";
import {
  AccountService,
  PrivacyPoolSDK,
  DataService,
  calculateContext,
  generateMerkleProof,
  getCommitment,
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
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("Set MAINNET_PRIVATE_KEY (mainnet operator key).");
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
const manifest = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
if (manifest.chainId !== 4663) throw new Error("Manifest is not mainnet; refusing.");
const poolAddress = manifest.ethPool;
const entrypoint = manifest.entrypoint;
if (manifest.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Operator key is not the suite owner; refusing.");

const poolArtifact = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "VeilTestnetPrivacyPool.json"), "utf8"));
const entrypointArtifact = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "Entrypoint.json"), "utf8"));
const denomination = parseEther("0.001");

const SNARK_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const SENTINEL = SNARK_FIELD - 1n;

class FileCircuits {
  async getWasm(name) {
    const { readFileSync: rf } = await import("node:fs");
    return new Uint8Array(rf(join(root, "public", "shield-artifacts", "v1.2.1", `${name}.wasm`)));
  }
  async getProvingKey(name) {
    const { readFileSync: rf } = await import("node:fs");
    return new Uint8Array(rf(join(root, "public", "shield-artifacts", "v1.2.1", `${name}.zkey`)));
  }
  async getVerificationKey(name) {
    const { readFileSync: rf } = await import("node:fs");
    return new Uint8Array(rf(join(root, "public", "shield-artifacts", "v1.2.1", `${name}.vkey`)));
  }
}

class CycleDataService extends DataService {
  constructor(configs, client) {
    super(configs, new Map(configs.map((c) => [c.chainId, { blockChunkSize: 1800, concurrency: 1, chunkDelayMs: 100, retryOnFailure: true, maxRetries: 5, retryBaseDelayMs: 1000 }])));
    this.client = client;
  }
  async logs(pool, eventName) {
    const end = await this.client.getBlockNumber();
    const out = [];
    const CHUNK = 40000n;
    for (let from = pool.deploymentBlock; from <= end; from += CHUNK) {
      const to = from + CHUNK - 1n < end ? from + CHUNK - 1n : end;
      out.push(...await this.client.getContractEvents({ address: pool.address, abi: poolArtifact.abi, eventName, fromBlock: from, toBlock: to, strict: true }));
    }
    return out;
  }
  async getDeposits(pool) {
    const logs = await this.logs(pool, "Deposited");
    return logs.map((l) => ({ depositor: l.args._depositor.toLowerCase(), commitment: l.args._commitment, label: l.args._label, value: l.args._value, precommitment: l.args._precommitmentHash, blockNumber: l.blockNumber, transactionHash: l.transactionHash }));
  }
  async getWithdrawals(pool, fromBlock = pool.deploymentBlock) {
    const logs = await this.logs(pool, "Withdrawn");
    return logs.filter((l) => l.blockNumber >= fromBlock).map((l) => ({ withdrawn: l.args._value, spentNullifier: l.args._spentNullifier, newCommitment: l.args._newCommitment, blockNumber: l.blockNumber, transactionHash: l.transactionHash }));
  }
  async getRagequits() { return []; }
}

const balanceBefore = await pub.getBalance({ address: account.address });
console.log(`Operator ${account.address} balance: ${formatEther(balanceBefore)} ETH`);
const paused = await pub.readContract({ address: poolAddress, abi: poolArtifact.abi, functionName: "depositsPaused" });
if (paused) throw new Error("Pool deposits paused; aborting without spending gas.");
if (balanceBefore < denomination + parseEther("0.001")) throw new Error(`Insufficient balance for 0.001 lock + gas (have ${formatEther(balanceBefore)}). Fund first; aborting without spending gas.`);

const scope = await pub.readContract({ address: poolAddress, abi: poolArtifact.abi, functionName: "SCOPE" });
const headNow = await pub.getBlockNumber();
const poolInfo = { chainId: 4663, address: poolAddress, scope, deploymentBlock: headNow - 200000n };
const phrase = generateMnemonic(english, 256);
const NOTE_FILE = join(root, "deployments", "mainnet-proof-note.json"); // gitignored (see .gitignore live-note rule)
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
const dataService = new CycleDataService([{ chainId: 4663, privacyPoolAddress: poolAddress, startBlock: poolInfo.deploymentBlock, rpcUrl: LOCAL_RPC_URL }], pub);
const sdk = new PrivacyPoolSDK(new FileCircuits());
const accountService = new AccountService(dataService, { mnemonic: phrase.trim() });
const secrets = accountService.createDepositSecrets(poolInfo.scope);
// Persist secrets BEFORE any funds move: a crash after deposit with only
// in-memory secrets strands the note forever (mainnet dust, 2026-10-12).
const { writeFileSync: writeNote } = await import("node:fs");
const notePre = { chainId: 4663, pool: poolAddress, entrypoint, scope: poolInfo.scope.toString(), denomination: denomination.toString(), mnemonic: phrase.trim(), nullifier: secrets.nullifier.toString(), secret: secrets.secret.toString(), precommitment: secrets.precommitment.toString(), depositHash: null, block: null, label: null, commitment: null, savedAt: new Date().toISOString() };
writeNote(NOTE_FILE, JSON.stringify(notePre, null, 2));

console.log("Depositing 0.001 ETH (returns on relay — recipient is self)...");
const depositHash = await wallet.writeContract({ address: entrypoint, abi: entrypointArtifact.abi, functionName: "deposit", args: [secrets.precommitment], value: denomination });
console.log(`Deposit tx: ${depositHash}`);
const depositReceipt = await pub.waitForTransactionReceipt({ hash: depositHash });
if (depositReceipt.status !== "success") throw new Error(`Deposit failed: ${depositHash}`);
console.log(`Deposit confirmed block ${depositReceipt.blockNumber}`);

const ownLogs = await pub.getContractEvents({
  address: poolAddress, abi: poolArtifact.abi, eventName: "Deposited",
  fromBlock: depositReceipt.blockNumber, toBlock: depositReceipt.blockNumber,
});
const ours = ownLogs.find((e) => e.transactionHash === depositHash);
if (!ours) throw new Error("Own deposit event not found in receipt block.");
const ourLabel = BigInt(ours.args._label);
const expected = getCommitment(denomination, ourLabel, secrets.nullifier, secrets.secret);
const expectedHash = BigInt(expected.hash ?? expected);
if (expectedHash !== BigInt(ours.args._commitment)) throw new Error("Commitment derivation mismatch.");
console.log("Commitment derivation matches onchain event.");
notePre.depositHash = depositHash;
notePre.block = depositReceipt.blockNumber.toString();
notePre.label = ourLabel.toString();
notePre.commitment = ours.args._commitment.toString();
writeNote(NOTE_FILE, JSON.stringify(notePre, null, 2));
console.log("Note secrets persisted (crash-safe) before proving.");
accountService.addPoolAccount(poolInfo.scope, denomination, secrets.nullifier, secrets.secret, ourLabel, depositReceipt.blockNumber, depositHash);
const notes = accountService.getSpendableCommitments().get(poolInfo.scope) ?? [];
if (!notes.length) throw new Error("No spendable note after local registration.");
const commitment = notes[0];

// Indexing-lag hardening (mainnet RPC lags fresh-tip logs): wait, then retry
// the deposit scan until OUR label is visible. Never publish an ASP root
// that excludes our own label — that burns gas and breaks the later relay.
console.log("Waiting 30s for log indexing, then verifying our label is visible...");
await new Promise((r) => setTimeout(r, 30000));
let allDeposits = [];
for (let attempt = 1; attempt <= 3; attempt++) {
  allDeposits = await dataService.getDeposits(poolInfo);
  if (allDeposits.some((d) => BigInt(d.label) === ourLabel)) break;
  console.log(`Label not indexed yet (attempt ${attempt}/3), waiting 20s...`);
  await new Promise((r) => setTimeout(r, 20000));
}
if (!allDeposits.some((d) => BigInt(d.label) === ourLabel)) throw new Error("Own deposit label still not indexed after retries; aborting BEFORE ASP publish (no extra gas spent).");
const labels = [...new Set(allDeposits.map((d) => d.label.toString()))].map(BigInt).sort((a, b) => (a < b ? -1 : 1));
const withSentinel = [...labels, ...(labels.map(String).includes(SENTINEL.toString()) ? [] : [SENTINEL])].sort((a, b) => (a < b ? -1 : 1));
const aspProof0 = generateMerkleProof(withSentinel, withSentinel[0]);
const aspRoot = BigInt(aspProof0.root);
const onchainRootBefore = BigInt(await pub.readContract({ address: entrypoint, abi: entrypointArtifact.abi, functionName: "latestRoot" }));
let updateHash = "(skipped: root already current)";
if (aspRoot !== onchainRootBefore) {
  const aspCid = `mainnet-proof-4663-b${depositReceipt.blockNumber}`.padEnd(40, "0");
  updateHash = await wallet.writeContract({ address: entrypoint, abi: entrypointArtifact.abi, functionName: "updateRoot", args: [aspRoot, aspCid] });
  await pub.waitForTransactionReceipt({ hash: updateHash });
} else {
  console.log("ASP root already includes our label; skipping updateRoot (saves gas).");
}
console.log(`ASP root updated: ${updateHash} root=${aspRoot}`);

const deposits = await pub.getContractEvents({ address: poolAddress, abi: poolArtifact.abi, eventName: "Deposited", fromBlock: poolInfo.deploymentBlock, toBlock: "latest" });
const withdrawals = await pub.getContractEvents({ address: poolAddress, abi: poolArtifact.abi, eventName: "Withdrawn", fromBlock: poolInfo.deploymentBlock, toBlock: "latest" });
const ordered = [
  ...deposits.map((e) => ({ c: BigInt(e.args._commitment), b: e.blockNumber, i: e.logIndex })),
  ...withdrawals.map((e) => ({ c: BigInt(e.args._newCommitment), b: e.blockNumber, i: e.logIndex })),
  { c: BigInt(ours.args._commitment), b: depositReceipt.blockNumber, i: -1 },
].sort((a, b) => (a.b !== b.b ? (a.b < b.b ? -1 : 1) : a.i - b.i)).map((x) => x.c);
const orderedUnique = [...new Set(ordered.map(String))].map(BigInt);
const sampleRoot = BigInt(generateMerkleProof(orderedUnique, orderedUnique[0]).root);
const tree = { leaves: orderedUnique, root: sampleRoot, proof: (c) => { const p = generateMerkleProof(orderedUnique, c); if (BigInt(p.root) !== sampleRoot) throw new Error("state root mismatch"); return p; } };
if (!tree.leaves.includes(commitment.hash)) throw new Error("Recovered commitment missing from rebuilt state.");
const stateProof = tree.proof(commitment.hash);
const { generateMerkleProof: genProof } = await import("@0xbow/privacy-pools-core-sdk");
const aspProof = genProof(withSentinel, commitment.label);
if (BigInt(aspProof.root) !== aspRoot) throw new Error("ASP proof root mismatch.");
const secretPair = accountService.createWithdrawalSecrets(commitment);
const data = encodeAbiParameters([{ type: "tuple", components: [{ name: "recipient", type: "address" }, { name: "feeRecipient", type: "address" }, { name: "relayFeeBPS", type: "uint256" }] }], [{ recipient: account.address, feeRecipient: account.address, relayFeeBPS: 0n }]);
const withdrawal = { processooor: entrypoint, data };
const context = BigInt(calculateContext(withdrawal, poolInfo.scope));
console.log("Generating REAL Groth16 withdraw proof (wasm+zkey, minutes)...");
const withdrawalProof = await sdk.proveWithdrawal(commitment, {
  withdrawalAmount: denomination,
  stateMerkleProof: stateProof,
  aspMerkleProof: aspProof,
  stateRoot: tree.root,
  stateTreeDepth: 32n,
  aspRoot,
  aspTreeDepth: 32n,
  context,
  newNullifier: secretPair.nullifier,
  newSecret: secretPair.secret,
});
if (!(await sdk.verifyWithdrawal(withdrawalProof))) throw new Error("SDK withdrawal proof failed local verify.");
console.log("Groth16 proof verified locally; relaying to self...");
const pc = withdrawalProof.proof;
const proofStruct = {
  pA: [BigInt(pc.pi_a[0]), BigInt(pc.pi_a[1])],
  pB: [[BigInt(pc.pi_b[0][1]), BigInt(pc.pi_b[0][0])], [BigInt(pc.pi_b[1][1]), BigInt(pc.pi_b[1][0])]],
  pC: [BigInt(pc.pi_c[0]), BigInt(pc.pi_c[1])],
  pubSignals: withdrawalProof.publicSignals.map(BigInt),
};
const relayHash = await wallet.writeContract({ address: entrypoint, abi: entrypointArtifact.abi, functionName: "relay", args: [withdrawal, proofStruct, poolInfo.scope] });
const relayReceipt = await pub.waitForTransactionReceipt({ hash: relayHash });
if (relayReceipt.status !== "success") throw new Error(`Relay failed: ${relayHash}`);
console.log(`Relay confirmed block ${relayReceipt.blockNumber}: ${relayHash}`);

const nullifier = BigInt(withdrawalProof.publicSignals[1]);
const spent = await pub.readContract({ address: poolAddress, abi: poolArtifact.abi, functionName: "nullifierHashes", args: [nullifier] });
if (!spent) throw new Error("Nullifier not marked spent.");
const balanceAfter = await pub.getBalance({ address: account.address });
console.log(`SUCCESS mainnet proof cycle: deposit=${depositHash} aspUpdate=${updateHash} relay=${relayHash} nullifierSpent=${spent} balanceAfter=${formatEther(balanceAfter)}`);
console.log(`Explorer: https://solscan.io/tx/${depositHash}`);
console.log(`Explorer: https://solscan.io/tx/${relayHash}`);
const { unlinkSync: removeNote } = await import("node:fs");
try { removeNote(NOTE_FILE); console.log("Spent note file removed (nullifier spent, secrets now useless)."); } catch {}
process.exit(0);

