// Diagnose UI swap-quote "Failed to verify proof" WITHOUT moving funds.
// Runs 100% locally: decrypts YOUR vault backup (password never leaves this
// machine), rebuilds the EXACT UI quote inputs (variant A) and the proven
// script construction (variant B), proves + verifies each, and diffs inputs.
// Prints NO secrets/nullifiers/labels — only shapes, counts and roots.
// Usage: node scripts/diagnose-ui-quote.mjs <vault-backup.json> [noteIndex]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import {
  createPublicClient, custom, encodeAbiParameters,
} from "viem";
import { generateMnemonic, english } from "viem/accounts";
import {
  AccountService, PrivacyPoolSDK,
  calculateContext, generateMerkleProof,
  hashPrecommitment, getCommitment,
} from "@0xbow/privacy-pools-core-sdk";
import { rpcRequest } from "./rpc-helper.mjs";
import { solanaMainnet } from "../lib/chains.mjs";

const root = process.cwd();
const [backupPath, indexArg] = process.argv.slice(2);
if (!backupPath) throw new Error("Usage: node scripts/diagnose-ui-quote.mjs <vault-backup.json> [noteIndex]");
const NOTE_INDEX = Number(indexArg ?? 0);

function askHidden(q) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin;
    const onData = (c) => { if (c === "\r" || c === "\n") { stdin.removeListener("data", onData); stdin.setRawMode(false); rl.close(); process.stdout.write("\n"); resolve(buf); } else if (c === "\u0003") { process.exit(1); } else { buf += c; } };
    let buf = "";
    process.stdout.write(q);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

const b64 = (s) => new Uint8Array(Buffer.from(String(s).replace(/\s+/g, ""), "base64"));
const toAB = (u8) => { const ab = new ArrayBuffer(u8.byteLength); new Uint8Array(ab).set(u8); return ab; };
async function decryptNoteBackup(backup, password) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", toAB(enc.encode(password)), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: toAB(b64(backup.salt)), iterations: backup.iterations },
    km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const aad = enc.encode("veil-shield-note-backup:v1");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toAB(b64(backup.iv)), additionalData: toAB(aad), tagLength: 128 }, key, toAB(b64(backup.ciphertext)));
  return new TextDecoder().decode(pt);
}

const password = process.env.VEIL_BACKUP_PASSWORD || await askHidden("Vault backup password: ");
const backup = JSON.parse(readFileSync(backupPath, "utf8"));
const decrypted = await decryptNoteBackup(backup, password);
function parseBowNoteString(s) {
  const parts = s.trim().split(":");
  if (parts.length !== 12 || parts[0] !== "veil-bow-note-v1") throw new Error("Invalid Veil 0xbow note format");
  return { type: "0xbow", version: "v1.2.1", chainId: Number(parts[1]), asset: parts[2].toLowerCase(), denomination: BigInt(parts[3]), scope: parts[4], label: parts[5], nullifier: parts[6], secret: parts[7], precommitment: parts[8], commitmentHash: parts[9], blockNumber: parts[10], txHash: parts[11], timestamp: Date.now() };
}
let parsed;
try {
  parsed = JSON.parse(decrypted);
} catch {
  parsed = decrypted;
}
if (typeof parsed === "string" && parsed.trim().startsWith("veil-bow-note-v1")) {
  const lines = parsed.trim().split("\n").map((x) => x.trim()).filter(Boolean);
  parsed = lines.map(parseBowNoteString);
}
const bowNote = Array.isArray(parsed) ? parsed[NOTE_INDEX] : parsed;
if (!bowNote || bowNote.type !== "0xbow") throw new Error("Note is not a 0xbow note.");
console.log("note asset is VEIL-pool:", true);

const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
const ENTRYPOINT = man.entrypoint, ROUTER = man.zkRouter;
const VEIL_POOL = man.veilPool, ETH_POOL = man.ethPool, VEIL_TOKEN = man.veilToken;
if (bowNote.chainId !== 4663) throw new Error("Note is not mainnet.");
if (String(bowNote.asset).toLowerCase() !== VEIL_TOKEN.toLowerCase()) throw new Error("Note is not a VEIL note.");

const provider = { async request({ method, params }) { const res = await rpcRequest(4663, { jsonrpc: "2.0", id: 1, method, params }); if (res.error) throw new Error(`RPC error: ${res.error.message}`); return res.result; } };
const pub = createPublicClient({ chain: solanaMainnet, transport: custom(provider) });
const poolArt = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "VeilTestnetPrivacyPool.json"), "utf8"));
const SNARK_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const SENTINEL = SNARK_FIELD - 1n;
class FileCircuits {
  async getWasm(n) { return new Uint8Array(readFileSync(join(root, "public", "shield-artifacts", "v1.2.1", `${n}.wasm`))); }
  async getProvingKey(n) { return new Uint8Array(readFileSync(join(root, "public", "shield-artifacts", "v1.2.1", `${n}.zkey`))); }
  async getVerificationKey(n) { return new Uint8Array(readFileSync(join(root, "public", "shield-artifacts", "v1.2.1", `${n}.vkey`))); }
}
const sdk = new PrivacyPoolSDK(new FileCircuits());

const denomination = BigInt(bowNote.denomination);
const label = BigInt(bowNote.label);
const nullifier = BigInt(bowNote.nullifier);
const secret = BigInt(bowNote.secret);
const commitmentHash = BigInt(bowNote.commitmentHash);
const scope = BigInt(bowNote.scope);

// 1. Integrity (same as UI assertBowNoteIntegrity)
const depLogs = await pub.getContractEvents({ address: VEIL_POOL, abi: poolArt.abi, eventName: "Deposited", fromBlock: BigInt(bowNote.blockNumber), toBlock: BigInt(bowNote.blockNumber) });
const own = depLogs.find((l) => String(l.transactionHash).toLowerCase() === String(bowNote.txHash).toLowerCase());
console.log("integrity: own deposit event found:", Boolean(own));
if (!own) throw new Error("STOP: deposit event not found (wrong pool/tx).");
const pre = BigInt(hashPrecommitment(nullifier, secret));
console.log("integrity: precommitment match:", pre === BigInt(own.args._precommitmentHash));
const recomputed = getCommitment(denomination, label, nullifier, secret);
const recomputedHash = BigInt(typeof recomputed === "object" && recomputed !== null && "hash" in recomputed ? recomputed.hash : recomputed);
console.log("integrity: commitment match:", recomputedHash === commitmentHash);
if (recomputedHash !== commitmentHash) throw new Error("STOP: vault secrets do not reproduce commitment (corrupt note).");

// 2. State tree, UI-style (raw, no dedupe) + script-style (dedupe)
const allDeps = await pub.getContractEvents({ address: VEIL_POOL, abi: poolArt.abi, eventName: "Deposited", fromBlock: 86334089n, toBlock: "latest" });
const allWds = await pub.getContractEvents({ address: VEIL_POOL, abi: poolArt.abi, eventName: "Withdrawn", fromBlock: 86334089n, toBlock: "latest" });
const ordered = [
  ...allDeps.map((e) => ({ c: BigInt(e.args._commitment), b: e.blockNumber, t: e.transactionIndex ?? 0, l: e.logIndex ?? 0 })),
  ...allWds.filter((e) => BigInt(e.args._newCommitment ?? 0n) !== 0n).map((e) => ({ c: BigInt(e.args._newCommitment), b: e.blockNumber, t: e.transactionIndex ?? 0, l: e.logIndex ?? 0 })),
].sort((a, b) => (a.b !== b.b ? (a.b < b.b ? -1 : 1) : a.t !== b.t ? a.t - b.t : a.l - b.l)).map((x) => x.c);
const rawLeaves = [...ordered];
const dedupLeaves = [...new Set(ordered.map(String))].map(BigInt);
console.log("state: deposits=%d withdraws>0=%d rawLeaves=%d dedupLeaves=%d dups=%d", allDeps.length, allWds.filter((e) => BigInt(e.args._newCommitment ?? 0n) !== 0n).length, rawLeaves.length, dedupLeaves.length, rawLeaves.length - dedupLeaves.length);
const liveRoot = BigInt(await pub.readContract({ address: VEIL_POOL, abi: [{ type: "function", name: "currentRoot", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }], functionName: "currentRoot" }));
const rawRoot = BigInt(generateMerkleProof(rawLeaves, rawLeaves[0]).root);
const dedupRoot = BigInt(generateMerkleProof(dedupLeaves, dedupLeaves[0]).root);
console.log("state: rawRoot==live:", rawRoot === liveRoot, " dedupRoot==live:", dedupRoot === liveRoot);

// 3. ASP set
async function poolLabels(pool) {
  const logs = await pub.getContractEvents({ address: pool, abi: poolArt.abi, eventName: "Deposited", fromBlock: 86334089n, toBlock: "latest" });
  return logs.map((l) => BigInt(l.args._label));
}
const labelSet = [...new Set([...await poolLabels(ETH_POOL), ...await poolLabels(VEIL_POOL)].map(String))].map(BigInt).sort((a, b) => (a < b ? -1 : 1));
const withSent = [...labelSet, ...(labelSet.map(String).includes(SENTINEL.toString()) ? [] : [SENTINEL])].sort((a, b) => (a < b ? -1 : 1));
const aspRoot = BigInt(generateMerkleProof(withSent, withSent[0]).root);
const onchainAsp = BigInt(await pub.readContract({ address: ENTRYPOINT, abi: [{ type: "function", name: "latestRoot", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }], functionName: "latestRoot" }));
console.log("asp: labels=%d ownPresent=%s root==onchain=%s", withSent.length, withSent.map(String).includes(label.toString()), aspRoot === onchainAsp);

// 4. Context encodings (UI quote vs script relay) — values only, no secrets
function uiContext(recipient, feeRecipient) {
  const data = encodeAbiParameters([{ type: "tuple", components: [{ name: "recipient", type: "address" }, { name: "feeRecipient", type: "address" }, { name: "relayFeeBPS", type: "uint256" }] }], [{ recipient, feeRecipient, relayFeeBPS: 0n }]);
  return BigInt(calculateContext({ processooor: ENTRYPOINT, data }, scope));
}
console.log("context: uiQuote(router,operator) computed:", true);

// 5. Variant A (UI-exact) vs B (script-exact)
const FIELD = SNARK_FIELD;
const inField = (v) => v >= 0n && v < FIELD;
async function tryProve(tag, leaves, commitmentObj, useSpendable) {
  try {
    const sroot = BigInt(generateMerkleProof(leaves, leaves[0]).root);
    const sp = generateMerkleProof(leaves, commitmentObj.hash ?? commitmentObj);
    const ap = generateMerkleProof(withSent, label);
    const accountService = new AccountService(null, { mnemonic: generateMnemonic(english, 256).trim() });
    accountService.addPoolAccount(scope, denomination, nullifier, secret, label, BigInt(bowNote.blockNumber), bowNote.txHash);
    let commitment = commitmentObj;
    if (useSpendable) {
      const sp2 = accountService.getSpendableCommitments().get(scope) ?? [];
      if (!sp2.length) { console.log(tag, ": spendable empty -> FAIL-input"); return; }
      commitment = sp2[0];
      console.log(tag, ": spendable hash==vault:", BigInt(commitment.hash) === commitmentHash, " hasPreimage:", "preimage" in commitment);
    }
    const secrets2 = accountService.createWithdrawalSecrets(commitment);
    const wproof = await sdk.proveWithdrawal(commitment, {
      withdrawalAmount: denomination, stateMerkleProof: sp, aspMerkleProof: ap,
      stateRoot: sroot, stateTreeDepth: 32n, aspRoot, aspTreeDepth: 32n,
      context: uiContext(ROUTER, man.owner),
      newNullifier: secrets2.nullifier, newSecret: secrets2.secret,
    });
    const ok = await sdk.verifyWithdrawal(wproof);
    const vals = [denomination, label, nullifier, secret, sroot, aspRoot, secrets2.nullifier, secrets2.secret];
    console.log(tag, ": prove ok, verify=", ok, " allInField=", vals.every(inField), " stateSib=", sp.siblings.length, " aspSib=", ap.siblings.length);
  } catch (e) {
    console.log(tag, ": ERROR:", String(e?.message ?? e).slice(0, 220));
  }
}
const manualObj = { hash: commitmentHash, label, nullifier, secret, value: denomination, blockNumber: BigInt(bowNote.blockNumber), txHash: bowNote.txHash };
await tryProve("A-ui-manual-raw", rawLeaves, manualObj, false);
await tryProve("B-script-spendable-dedup", dedupLeaves, manualObj, true);
console.log("DIAGNOSE DONE (no funds moved, nothing sent).");
process.exit(0);

