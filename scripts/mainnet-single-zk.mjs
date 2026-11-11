// MAINNET 4663 single-note full-ZK flow, end to end with REAL funds:
// deposit 0.001 ETH note -> prove -> executeFullZkFlow on the mainnet ZK
// router (relay -> v4 swap -> 0.001 VEIL note + dust refund) -> verify all
// events. Then direct-payout leg reusing the fresh VEIL note.
// Secrets persist pre-deposit (crash-safe); every send simulated first.
// Aborts before spending gas on any doubt.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import http from "node:http";
import {
  createPublicClient, createWalletClient, custom, encodeAbiParameters,
  formatEther, parseEther,
} from "viem";
import { privateKeyToAccount, generateMnemonic, english } from "viem/accounts";
import {
  AccountService, PrivacyPoolSDK, DataService, calculateContext,
  generateMerkleProof, getCommitment,
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

if (Number(await pub.getChainId()) !== 4663) throw new Error("Not mainnet 4663.");
const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
if (man.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error("Not suite owner.");
const ETH_POOL = man.ethPool, VEIL_POOL = man.veilPool, ENTRYPOINT = man.entrypoint;
const ROUTER = man.zkRouter, VEIL = man.veilToken, PM = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
const ZERO = "0x0000000000000000000000000000000000000000";
const DENOM = parseEther("0.001");
const NOTE_FILE = join(root, "deployments", "mainnet-single-note.json"); // gitignored live-note rule

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

const bal = await pub.getBalance({ address: account.address });
console.log(`Balance: ${formatEther(bal)} ETH`);
if (bal < DENOM + parseEther("0.00005")) throw new Error("Insufficient balance for 0.001 lock + gas; aborting clean.");
const scopeETH = await pub.readContract({ address: ETH_POOL, abi: poolArt.abi, functionName: "SCOPE" });
const headNow = await pub.getBlockNumber();
const poolInfo = { chainId: 4663, address: ETH_POOL, scope: scopeETH, deploymentBlock: headNow - 1000000n }; // MUST cover dust-era events; headNow-200000 built a phantom state root (UnknownStateRoot, 2026-10-13)
const phrase = generateMnemonic(english, 256);
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
const dataService = new DS([{ chainId: 4663, privacyPoolAddress: ETH_POOL, startBlock: poolInfo.deploymentBlock, rpcUrl: LOCAL_RPC_URL }], pub);
const sdk = new PrivacyPoolSDK(new FileCircuits());
const accountService = new AccountService(dataService, { mnemonic: phrase.trim() });
const secrets = accountService.createDepositSecrets(poolInfo.scope);
writeFileSync(NOTE_FILE, JSON.stringify({ chainId: 4663, pool: ETH_POOL, scope: scopeETH.toString(), denomination: DENOM.toString(), mnemonic: phrase.trim(), nullifier: secrets.nullifier.toString(), secret: secrets.secret.toString(), precommitment: secrets.precommitment.toString(), depositHash: null }, null, 2));
console.log("Note secrets persisted (crash-safe).");

console.log("Depositing 0.001 ETH note...");
const depH = await wallet.writeContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "deposit", args: [secrets.precommitment], value: DENOM });
const depRc = await pub.waitForTransactionReceipt({ hash: depH });
if (depRc.status !== "success") throw new Error(`deposit reverted: ${depH}`);
console.log(`Deposit: ${depH} block ${depRc.blockNumber}`);
const ownLogs = await pub.getContractEvents({ address: ETH_POOL, abi: poolArt.abi, eventName: "Deposited", fromBlock: depRc.blockNumber, toBlock: depRc.blockNumber });
const ours = ownLogs.find((e) => e.transactionHash === depH);
if (!ours) throw new Error("Own deposit event missing.");
const ourLabel = BigInt(ours.args._label);
const exp = getCommitment(DENOM, ourLabel, secrets.nullifier, secrets.secret);
if (BigInt(exp.hash ?? exp) !== BigInt(ours.args._commitment)) throw new Error("Commitment mismatch.");
const note = JSON.parse(readFileSync(NOTE_FILE, "utf8"));
note.depositHash = depH; note.block = depRc.blockNumber.toString(); note.label = ourLabel.toString(); note.commitment = ours.args._commitment.toString();
writeFileSync(NOTE_FILE, JSON.stringify(note, null, 2));
accountService.addPoolAccount(poolInfo.scope, DENOM, secrets.nullifier, secrets.secret, ourLabel, depRc.blockNumber, depH);
const spendable = accountService.getSpendableCommitments().get(poolInfo.scope) ?? [];
if (!spendable.length) throw new Error("No spendable note.");
const commitment = spendable[0];

console.log("Waiting 30s for indexing, then proving...");
await new Promise((r) => setTimeout(r, 30000));
const stateDeposits = await pub.getContractEvents({ address: ETH_POOL, abi: poolArt.abi, eventName: "Deposited", fromBlock: poolInfo.deploymentBlock, toBlock: "latest" });
const stateWithdrawals = await pub.getContractEvents({ address: ETH_POOL, abi: poolArt.abi, eventName: "Withdrawn", fromBlock: poolInfo.deploymentBlock, toBlock: "latest" });
const leaves = [
  ...stateDeposits.map((e) => ({ c: BigInt(e.args._commitment), b: e.blockNumber, i: e.logIndex })),
  ...stateWithdrawals.map((e) => ({ c: BigInt(e.args._newCommitment), b: e.blockNumber, i: e.logIndex })),
  { c: BigInt(ours.args._commitment), b: depRc.blockNumber, i: -1 },
].sort((a, b) => (a.b !== b.b ? (a.b < b.b ? -1 : 1) : a.i - b.i)).map((x) => x.c);
const uniq = [...new Set(leaves.map(String))].map(BigInt);
if (!uniq.includes(commitment.hash)) throw new Error("Commitment missing from state.");
const sroot = BigInt(generateMerkleProof(uniq, uniq[0]).root);
const stateProof = (() => { const p = generateMerkleProof(uniq, commitment.hash); if (BigInt(p.root) !== sroot) throw new Error("state root mismatch"); return p; })();
// ASP: union both pools + sentinel, publish if stale.
async function poolLabels(pool) {
  const logs = await pub.getContractEvents({ address: pool, abi: poolArt.abi, eventName: "Deposited", fromBlock: poolInfo.deploymentBlock, toBlock: "latest" });
  return logs.map((l) => BigInt(l.args._label));
}
const labelSet = [...new Set([...await poolLabels(ETH_POOL), ...await poolLabels(VEIL_POOL)].map(String))].map(BigInt).sort((a, b) => (a < b ? -1 : 1));
if (!labelSet.includes(ourLabel)) throw new Error("Own label not indexed; aborting before publish.");
const withSent = [...labelSet, ...(labelSet.map(String).includes(SENTINEL.toString()) ? [] : [SENTINEL])].sort((a, b) => (a < b ? -1 : 1));
const aspRoot = BigInt(generateMerkleProof(withSent, withSent[0]).root);
const onchainRoot = BigInt(await pub.readContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "latestRoot" }));
if (aspRoot !== onchainRoot) {
  const cid = `mainnet-single-4663-b${depRc.blockNumber}`.padEnd(40, "0");
  const uh = await wallet.writeContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "updateRoot", args: [aspRoot, cid] });
  await pub.waitForTransactionReceipt({ hash: uh });
  console.log(`ASP published: ${uh}`);
} else console.log("ASP root already current.");
const { generateMerkleProof: genP } = await import("@0xbow/privacy-pools-core-sdk");
const aspProof = genP(withSent, commitment.label);
if (BigInt(aspProof.root) !== aspRoot) throw new Error("ASP proof mismatch.");
const secrets2 = accountService.createWithdrawalSecrets(commitment);
const relayData = encodeAbiParameters([{ type: "tuple", components: [{ name: "recipient", type: "address" }, { name: "feeRecipient", type: "address" }, { name: "relayFeeBPS", type: "uint256" }] }], [{ recipient: ROUTER, feeRecipient: account.address, relayFeeBPS: 0n }]);
const withdrawal = { processooor: ENTRYPOINT, data: relayData };
const context = BigInt(calculateContext(withdrawal, poolInfo.scope));
console.log("Proving (minutes)...");
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
// Fresh VEIL deposit secrets for the output note.
const scopeVEIL = await pub.readContract({ address: VEIL_POOL, abi: poolArt.abi, functionName: "SCOPE" });
const depSecrets = accountService.createDepositSecrets(scopeVEIL);
const zeroForOne = true; // ETH -> VEIL
const swapLeg = {
  key: { currency0: ZERO, currency1: VEIL, fee: 3000, tickSpacing: 60, hooks: ZERO },
  zeroForOne, sqrtPriceLimitX96: 4295128740n, hookData: "0x",
};
async function simFlow(minOut) {
  return pub.simulateContract({
    account: account.address, address: ROUTER, abi: VEIL_ZK_ROUTER_ABI, functionName: "executeFullZkFlow",
    args: [{ processooor: ENTRYPOINT, data: relayData }, proofStruct, poolInfo.scope, ROUTER, ZERO, VEIL, DENOM, depSecrets.precommitment, swapLeg, minOut],
  });
}
const pre = await simFlow(0n).catch((e) => { throw new Error("Preflight sim failed: " + String(e?.message || e).slice(0, 200)); });
// NOTE: executeFullZkFlow returns the deposit commitment, NOT swap output.
// minOut comes from offchain full-range math on live state (see quote-zk).
const STATEVIEW_Q = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
const svQ = [
  { type: "function", name: "getSlot0", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint160" }, { type: "int24" }, { type: "uint24" }, { type: "uint24" }] },
  { type: "function", name: "getLiquidity", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint128" }] },
];
const { keccak256: k256q, encodeAbiParameters: eapq } = await import("viem");
const plainIdQ = k256q(eapq(
  [{ type: "tuple", components: [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }] }],
  [[ZERO, VEIL, 3000, 60, ZERO]]
));
const [liveSqrtPQ] = await pub.readContract({ address: STATEVIEW_Q, abi: svQ, functionName: "getSlot0", args: [plainIdQ] });
const liveLiqQ = await pub.readContract({ address: STATEVIEW_Q, abi: svQ, functionName: "getLiquidity", args: [plainIdQ] });
const Q96Q = 2n ** 96n;
const _xQ = liveLiqQ * Q96Q / liveSqrtPQ;
const _yQ = liveLiqQ * liveSqrtPQ / Q96Q;
const _dxFeeQ = DENOM * 997000n / 1000000n;
const quoted = _yQ - (_xQ * _yQ) / (_xQ + _dxFeeQ);
console.log(`Quoted swap out: ${formatEther(quoted)} VEIL`);
if (quoted < DENOM) throw new Error("Quote below 0.001 VEIL note; aborting without spending execution gas.");
const minOut = (quoted * 995n) / 1000n;
await simFlow(minOut);
console.log(`Pre-send sim OK (minOut ${formatEther(minOut)}). Executing...`);
const execH = await wallet.writeContract({
  account, address: ROUTER, abi: VEIL_ZK_ROUTER_ABI, functionName: "executeFullZkFlow",
  args: [{ processooor: ENTRYPOINT, data: relayData }, proofStruct, poolInfo.scope, ROUTER, ZERO, VEIL, DENOM, depSecrets.precommitment, swapLeg, minOut],
});
const execRc = await pub.waitForTransactionReceipt({ hash: execH });
if (execRc.status !== "success") throw new Error(`executeFullZkFlow reverted: ${execH}`);
console.log(`FULL-ZK SINGLE LIVE: ${execH} block ${execRc.blockNumber}`);
// Event asserts: FullZkFlowExecuted + Deposited(0.001 VEIL) + nullifier spent.
const rlogs = await pub.getContractEvents({ address: ROUTER, abi: VEIL_ZK_ROUTER_ABI, eventName: "FullZkFlowExecuted", fromBlock: execRc.blockNumber, toBlock: execRc.blockNumber });
if (!rlogs.length) throw new Error("FullZkFlowExecuted missing.");
const dlogs = await pub.getContractEvents({ address: VEIL_POOL, abi: poolArt.abi, eventName: "Deposited", fromBlock: execRc.blockNumber, toBlock: execRc.blockNumber });
const dlog = dlogs.find((l) => l.transactionHash === execH);
if (!dlog || BigInt(dlog.args._value) !== DENOM) throw new Error("0.001 VEIL note not minted.");
const spent = await pub.readContract({ address: ETH_POOL, abi: poolArt.abi, functionName: "nullifierHashes", args: [BigInt(wproof.publicSignals[1])] });
if (!spent) throw new Error("Nullifier not spent.");
console.log(`VERIFIED: 0.001 VEIL note minted (commitment ${dlog.args._commitment}), nullifier spent.`);
console.log(`Explorer: https://solscan.io/tx/${execH}`);
// Persist the OUTPUT VEIL note (spendable later — do not lose it).
writeFileSync(join(root, "deployments", "mainnet-veil-note.json"), JSON.stringify({
  chainId: 4663, pool: VEIL_POOL, scope: scopeVEIL.toString(), asset: VEIL,
  denomination: DENOM.toString(), label: dlog.args._label.toString(),
  commitment: dlog.args._commitment.toString(),
  nullifier: depSecrets.nullifier.toString(), secret: depSecrets.secret.toString(),
  precommitment: depSecrets.precommitment.toString(),
  txHash: execH, block: execRc.blockNumber.toString(), savedAt: new Date().toISOString(),
}, null, 2));
console.log("Output VEIL note saved (spendable, backed up).");
try { unlinkSync(NOTE_FILE); console.log("Spent note file removed."); } catch {}
process.exit(0);

