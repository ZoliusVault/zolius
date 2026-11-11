// MAINNET Shield VEIL live — first direct VEIL deposit via entrypoint.
// 0.001 temp VEIL -> shielded VEIL note. Secrets persist PRE-deposit
// (crash-safe). Approve + sim + send, all guarded. REAL funds, fail-closed.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient, createWalletClient, custom,
  formatEther, formatGwei, parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { AccountService, DataService } from "@0xbow/privacy-pools-core-sdk";
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
const VEIL_POOL = man.veilPool, ENTRYPOINT = man.entrypoint, VEIL = man.veilToken;
const DENOM = parseEther("0.001");
const NOTE_FILE = join(root, "deployments", "mainnet-veil2-note.json");
const poolArt = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "VeilTestnetPrivacyPool.json"), "utf8"));
const epArt = JSON.parse(readFileSync(join(root, "artifacts", "privacy-pools-testnet", "Entrypoint.json"), "utf8"));
const erc20 = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];
class DS extends DataService {
  constructor() { super([], new Map()); }
  async logs() { return []; }
  async getDeposits() { return []; }
  async getWithdrawals() { return []; }
  async getRagequits() { return []; }
}
import http from "node:http";
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
const bal0 = await pub.getBalance({ address: account.address });
const veilBal = await pub.readContract({ address: VEIL, abi: erc20, functionName: "balanceOf", args: [account.address] });
console.log(`Balances: ${formatEther(bal0)} ETH, ${formatEther(veilBal)} VEIL (floor ${formatEther(RESERVE)})`);
if (veilBal < DENOM) throw new Error("Insufficient VEIL; aborting without spending gas.");
const scope = await pub.readContract({ address: VEIL_POOL, abi: poolArt.abi, functionName: "SCOPE" });
const paused = await pub.readContract({ address: VEIL_POOL, abi: poolArt.abi, functionName: "depositsPaused" });
if (paused) throw new Error("VEIL pool deposits paused; aborting.");
const dataService = new DS();
const { generateMnemonic, english } = await import("viem/accounts");
const { PrivacyPoolSDK, generateMerkleProof } = await import("@0xbow/privacy-pools-core-sdk");
const phrase = generateMnemonic(english, 256);
const accountService = new AccountService(dataService, { mnemonic: phrase.trim() });
const secrets = accountService.createDepositSecrets(scope);
writeFileSync(NOTE_FILE, JSON.stringify({ chainId: 4663, pool: VEIL_POOL, scope: scope.toString(), asset: VEIL, denomination: DENOM.toString(), mnemonic: phrase.trim(), nullifier: secrets.nullifier.toString(), secret: secrets.secret.toString(), precommitment: secrets.precommitment.toString(), depositHash: null }, null, 2));
console.log("Secrets persisted pre-deposit (crash-safe).");
// Allowance first (sims need it), then sim, then guard, then send.
await calmNetwork("approve");
const ah = await wallet.writeContract({ address: VEIL, abi: erc20, functionName: "approve", args: [ENTRYPOINT, DENOM] });
await pub.waitForTransactionReceipt({ hash: ah });
console.log("VEIL approved to entrypoint.");
await pub.simulateContract({ account, address: ENTRYPOINT, abi: epArt.abi, functionName: "deposit", args: [VEIL, DENOM, secrets.precommitment] });
console.log("Deposit sim PASS.");
const depEst = await pub.estimateGas({ account, address: ENTRYPOINT, abi: epArt.abi, functionName: "deposit", args: [VEIL, DENOM, secrets.precommitment] }).catch(() => 300000n);
const gp = await pub.getGasPrice();
const need = depEst * 12n / 10n * gp + RESERVE;
const bal = await pub.getBalance({ address: account.address });
console.log(`deposit est ${depEst}, need ~${formatEther(need)} (have ${formatEther(bal)}, floor ${formatEther(RESERVE)})`);
if (bal < need) throw new Error("Cannot afford + floor; STOPPING (only approve spent; secrets held, deposit later).");
await calmNetwork("deposit");
const depH = await wallet.writeContract({ address: ENTRYPOINT, abi: epArt.abi, functionName: "deposit", args: [VEIL, DENOM, secrets.precommitment] });
const depRc = await pub.waitForTransactionReceipt({ hash: depH });
if (depRc.status !== "success") throw new Error(`deposit reverted: ${depH}`);
console.log(`VEIL SHIELD LIVE: ${depH} block ${depRc.blockNumber}`);
const ownLogs = await pub.getContractEvents({ address: VEIL_POOL, abi: poolArt.abi, eventName: "Deposited", fromBlock: depRc.blockNumber, toBlock: depRc.blockNumber });
const ours = ownLogs.find((e) => e.transactionHash === depH);
if (!ours) throw new Error("Own deposit event missing.");
const { getCommitment } = await import("@0xbow/privacy-pools-core-sdk");
const exp = getCommitment(DENOM, BigInt(ours.args._label), secrets.nullifier, secrets.secret);
if (BigInt(exp.hash ?? exp) !== BigInt(ours.args._commitment)) throw new Error("Commitment mismatch.");
const note = JSON.parse(readFileSync(NOTE_FILE, "utf8"));
Object.assign(note, { depositHash: depH, block: depRc.blockNumber.toString(), label: ours.args._label.toString(), commitment: ours.args._commitment.toString(), savedAt: new Date().toISOString() });
writeFileSync(NOTE_FILE, JSON.stringify(note, null, 2));
console.log(`VEIL note saved (label ${note.label}). Explorer: https://solscan.io/tx/${depH}`);
process.exit(0);

