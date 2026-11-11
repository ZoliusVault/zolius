// Build Blockscout verification packages for the 11 fresh Veil contracts.
// For each: standard-json (EXACT compile settings) + constructor args +
// local byte-identity proof (artifact deployedBytecode vs onchain code).
// Output: verification/mainnet-4663/<Name>.verify.json (git-tracked).
// Usage: node scripts/build-verify-packages.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, custom, encodeAbiParameters, parseAbi } from "viem";
import solc from "solc";
import { rpcRequest } from "./rpc-helper.mjs";
import { solanaMainnet } from "../lib/chains.mjs";
import {
  VEIL_ZK_ROUTER_ABI, VEIL_SHIELD_ROUTER_ABI, SHIELDED_POOL_ABI,
  SHIELDED_VERIFIER_MOCK_ABI, VEIL_CREATE2_DEPLOYER_ABI, VEIL_TREASURY_ABI,
  VEIL_ATTESTATION_REGISTRY_ABI, VEIL_HOOK_ABI,
} from "../lib/veil-artifact.mjs";

const root = process.cwd();
const provider = {
  async request({ method, params }) {
    const res = await rpcRequest(4663, { jsonrpc: "2.0", id: 1, method, params });
    if (res.error) throw new Error(`RPC error: ${res.error.message}`);
    return res.result;
  },
};
const client = createPublicClient({ chain: solanaMainnet, transport: custom(provider) });
if (Number(await client.getChainId()) !== 4663) throw new Error("Not mainnet 4663.");
console.log("solc:", solc.version());

const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
const OWNER = man.owner;
const PM = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
const VEIL = man.veilToken;
const ASSOC = "0x2188824287183927522224640574525727508854836440041603434369820418";
const addr = (s) => ({ type: "address" });
const u256 = (s) => ({ type: "uint256" });

// ---- sources closure (same resolution as scripts/compile.mjs) ----
const seedFiles = [
  "ShieldedVerifierMock.sol", "ShieldedPool.sol", "VeilTreasury.sol",
  "VeilAttestationRegistry.sol", "VeilHook.sol", "VeilShieldRouter.sol",
  "VeilZkRouter.sol", "VeilCreate2Deployer.sol",
];
const sources = {};
for (const f of seedFiles) sources[f] = { content: readFileSync(join(root, "contracts", f), "utf8") };
function pull(path) {
  if (sources[path]) return;
  let content = null;
  if (path.startsWith("@openzeppelin/") || path.startsWith("@uniswap/")) {
    try { content = readFileSync(join(root, "node_modules", path), "utf8"); } catch {}
  } else {
    const local = path.replace(/^\.\//, "");
    if (seedFiles.includes(local)) content = sources[local].content;
  }
  if (content === null) throw new Error(`Cannot resolve import ${path}`);
  sources[path] = { content };
}
const importRe = /import\s+(?:[^'"]+\s+from\s+)?["']([^"']+)["']/g;
for (let round = 0; round < 10; round++) {
  let added = false;
  for (const [f, s] of Object.entries(sources)) {
    for (const m of s.content.matchAll(importRe)) {
      const p = m[1];
      if (p.startsWith("@") && !sources[p]) { pull(p); added = true; }
    }
  }
  if (!added) break;
}
// NOTE: relative imports inside node_modules (e.g. ../utils/X) resolve
// relative to the importing file, not repo root. Handle by path joining.
function resolveRel(base, rel) {
  const parts = base.split("/").slice(0, -1);
  for (const seg of rel.split("/")) {
    if (seg === ".") continue;
    else if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}
for (let round = 0; round < 10; round++) {
  let added = false;
  for (const [f, s] of Object.entries({ ...sources })) {
    for (const m of s.content.matchAll(importRe)) {
      const p = m[1];
      if (p.startsWith(".")) {
        const key = f.includes("/") ? resolveRel(f, p) : p.replace(/^\.\//, "");
        if (!sources[key]) {
          const tries = [join(root, "node_modules", key), join(root, "contracts", key.split("/").pop())];
          let content = null;
          for (const t of tries) { try { content = readFileSync(t, "utf8"); break; } catch {} }
          if (content === null) throw new Error(`Cannot resolve relative import ${p} from ${f}`);
          sources[key] = { content };
          added = true;
        }
      }
    }
  }
  if (!added) break;
}

const stdInput = {
  language: "Solidity",
  sources,
  settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: "cancun", outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.deployedBytecode.immutableReferences"] } } },
};
console.log("compiling", Object.keys(sources).length, "sources...");
const out = JSON.parse(solc.compile(JSON.stringify(stdInput), { import: (p) => ({ error: `unresolved ${p}` }) }));
const errs = (out.errors ?? []).filter((e) => e.severity === "error");
if (errs.length) { for (const e of errs) console.error(e.formattedMessage); throw new Error("compile failed"); }

// Simpler: load artifact via dynamic import instead.
const artifact = await import("../lib/veil-artifact.mjs");

const CONTRACTS = [
  { name: "VeilZkRouter", file: "VeilZkRouter.sol", address: man.zkRouter, abi: artifact.VEIL_ZK_ROUTER_ABI, ctorTypes: [addr(), addr()], ctorArgs: [man.entrypoint, PM] },
  { name: "VeilShieldRouter", file: "VeilShieldRouter.sol", address: man.routerFixed, abi: artifact.VEIL_SHIELD_ROUTER_ABI, ctorTypes: [addr()], ctorArgs: [PM] },
  { name: "ShieldedPoolLegacyETH", file: "ShieldedPool.sol", address: man.legacyEthPool, abi: artifact.SHIELDED_POOL_ABI, ctorTypes: [addr(), addr(), u256(), u256(), { type: "bytes32" }, addr()], ctorArgs: ["0x0000000000000000000000000000000000000000", man.mockVerifier, "1000000000000000", "10000000000000000000", ASSOC, OWNER] },
  { name: "ShieldedPoolVEIL05", file: "ShieldedPool.sol", address: man.veilPool05, abi: artifact.SHIELDED_POOL_ABI, ctorTypes: [addr(), addr(), u256(), u256(), { type: "bytes32" }, addr()], ctorArgs: [VEIL, man.mockVerifier, "500000000000000000", "5000000000000000000000", ASSOC, OWNER] },
  { name: "ShieldedPoolVEIL2", file: "ShieldedPool.sol", address: man.veilPool2, abi: artifact.SHIELDED_POOL_ABI, ctorTypes: [addr(), addr(), u256(), u256(), { type: "bytes32" }, addr()], ctorArgs: [VEIL, man.mockVerifier, "2000000000000000000", "20000000000000000000000", ASSOC, OWNER] },
  { name: "ShieldedVerifierMock", file: "ShieldedVerifierMock.sol", address: man.mockVerifier, abi: artifact.SHIELDED_VERIFIER_MOCK_ABI, ctorTypes: [], ctorArgs: [] },
  { name: "VeilCreate2Deployer", file: "VeilCreate2Deployer.sol", address: man.create2Deployer, abi: artifact.VEIL_CREATE2_DEPLOYER_ABI, ctorTypes: [], ctorArgs: [] },
  { name: "VeilTreasury", file: "VeilTreasury.sol", address: man.treasury, abi: artifact.VEIL_TREASURY_ABI, ctorTypes: [addr(), addr()], ctorArgs: [OWNER, VEIL] },
  { name: "VeilAttestationRegistry", file: "VeilAttestationRegistry.sol", address: man.registryV2, abi: artifact.VEIL_ATTESTATION_REGISTRY_ABI, ctorTypes: [addr()], ctorArgs: [OWNER] },
  { name: "VeilHook", file: "VeilHook.sol", address: man.hookV2, abi: artifact.VEIL_HOOK_ABI, ctorTypes: [addr(), addr(), addr(), addr()], ctorArgs: [PM, man.treasury, man.registryV2, OWNER], factoryNote: "Deployed via VeilCreate2Deployer.deploy(salt, initCode). If the explorer cannot trace the internal creation tx, verify with standard-json + these constructor args manually." },
];

const dir = join(root, "verification", "mainnet-4663");
mkdirSync(dir, { recursive: true });
for (const c of CONTRACTS) {
  const contractName = c.file === "ShieldedPool.sol" ? "ShieldedPool" : c.name;
  const compiled = out.contracts[c.file][contractName].evm.deployedBytecode;
  const compiledByte = compiled.object.toLowerCase();
  const onchain = (await client.getCode({ address: c.address })).slice(2).toLowerCase();
  // Immutable variables (constructor-set) legitimately differ from the
  // artifact zeros: mask every immutable slot, then require exact match.
  // The VALUES are proven separately by onchain getter reads (migration
  // post-deploy checks + replay ceremony).
  const mask = new Array(compiledByte.length).fill(false);
  for (const refs of Object.values(compiled.immutableReferences ?? {})) {
    for (const r of refs) {
      for (let i = r.start * 2; i < (r.start + r.length) * 2; i++) mask[i] = true;
    }
  }
  let match = compiledByte.length === onchain.length;
  let masked = 0;
  if (match) {
    for (let i = 0; i < compiledByte.length; i++) {
      if (mask[i]) { masked++; continue; }
      if (compiledByte[i] !== onchain[i]) { match = false; break; }
    }
  }
  const ctorEncoded = c.ctorArgs.length ? encodeAbiParameters(c.ctorTypes, c.ctorArgs).slice(2) : "";
  const pkg = {
    chainId: 4663, address: c.address, contractFile: c.file, contractName,
    compilerVersion: solc.version(), optimizerRuns: 200, viaIR: true, evmVersion: "cancun",
    constructorArgumentsEncoded: ctorEncoded, constructorArgumentsDecoded: c.ctorArgs,
    localByteMatch: match,
    ...(c.factoryNote ? { note: c.factoryNote } : {}),
    standardJsonInput: stdInput,
  };
  writeFileSync(join(dir, `${c.name}.verify.json`), JSON.stringify(pkg, null, 2));
  console.log(`${match ? "MATCH  " : "MISMATCH"} ${c.name} ${c.address} (immutable bytes masked: ${masked})`);
  if (!match) throw new Error(`Byte mismatch on ${c.name} — investigate before submitting.`);
}
console.log("PACKAGES_WRITTEN", CONTRACTS.length, "→", dir);

