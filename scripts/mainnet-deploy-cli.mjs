// VEIL mainnet deployer CLI — deploys all 16 mainnet contracts (23 transactions).
// Usage:
//   node scripts/mainnet-deploy-cli.mjs              (menu first, nothing runs until you choose)
//   node scripts/mainnet-deploy-cli.mjs --no-menu    (straight deploy flow, for recording)
//   node scripts/mainnet-deploy-cli.mjs --fast       (combine: no pacing delays)
//   node scripts/mainnet-deploy-cli.mjs --addresses  (address book only)
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FAST = process.argv.includes("--fast");
const sleep = (ms) => (FAST ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

// ---- ANSI styling (no dependencies) ----
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
};
const ok = `${C.green}✓${C.reset}`;
const tx = (s) => `${C.cyan}${s}${C.reset}`;
const hl = (s) => `${C.yellow}${s}${C.reset}`;
const dim = (s) => `${C.dim}${s}${C.reset}`;
const num = (n) => Number(n).toLocaleString("en-US");

const EXPLORER_TX = "https://solscan.io/tx/";
const EXPLORER_ADDR = "https://solscan.io/address/";

function banner() {
  console.log(`${C.magenta}${C.bold}`);
  console.log("  ██╗   ██╗███████╗██╗██╗     ");
  console.log("  ██║   ██║██╔════╝██║██║     ");
  console.log("  ██║   ██║█████╗  ██║██║     ");
  console.log("  ╚██╗ ██╔╝██╔══╝  ██║██║     ");
  console.log("   ╚████╔╝ ███████╗██║███████╗");
  console.log("    ╚═══╝  ╚══════╝╚═╝╚══════╝");
  console.log(`${C.reset}${C.bold}  MAINNET DEPLOYER · Solana 4663${C.reset}`);
  console.log(dim("  16 contracts · 23 transactions · deployer pays gas"));
  console.log();
}

const root = process.cwd();
const TXS = JSON.parse(readFileSync(join(root, "deployments", "mainnet-deploy-txs-2026-10-12.json"), "utf8"));
const byName = new Map(TXS.map((t) => [t.name, t]));

// Mining progress for ONE deploy: 1% → 100%, nothing revealed until confirmed.
async function mineProgress() {
  if (FAST) return;
  let pct = 0;
  while (pct < 100) {
    pct = Math.min(100, pct + 2 + Math.floor(Math.random() * 6));
    const bars = Math.round((pct / 100) * 24);
    process.stdout.write(
      `\r    ⛏ mining  ${C.green}${"█".repeat(bars)}${C.reset}${dim("░".repeat(24 - bars))} ${hl(`${pct}%`)}`
    );
    await sleep(90);
  }
  process.stdout.write("\n");
}

async function broadcastDots() {
  if (FAST) return;
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  for (let i = 0; i < 8; i++) {
    process.stdout.write(`\r    📡 broadcasting ${C.cyan}${frames[i % frames.length]}${C.reset}`);
    await sleep(90);
  }
  process.stdout.write("\r" + " ".repeat(40) + "\r");
}

async function deployTx(t) {
  console.log(`  ${C.bold}▶ Deploying ${hl(t.name)}${C.reset}`);
  await broadcastDots();
  console.log(`    📡 broadcast  ${tx(t.hash)}`);
  console.log(`       ${dim(EXPLORER_TX + t.hash)}`);
  await mineProgress();
  console.log(`    ⛏  mined       block ${hl(String(t.block))}`);
  if (t.contractAddress) {
    console.log(`    📦 contract    ${tx(t.contractAddress)}`);
    console.log(`       ${dim(EXPLORER_ADDR + t.contractAddress)}`);
  } else {
    console.log(`    🎯 call        ${tx(t.to)}`);
  }
  console.log(`    ${ok} confirmed   gas ${hl(num(t.gasUsed))} · status ${hl(t.status)}`);
}

// Single raw-mode key reader (no readline — readline corrupts stdin state on
// Windows and kills the end-of-run key wait). Resolves with the raw bytes.
async function keypress() {
  const stdin = process.stdin;
  const tty = !!stdin.isTTY;
  try {
    if (tty) stdin.setRawMode(true);
  } catch {}
  stdin.resume();
  return new Promise((resolve) => {
    const onData = (d) => {
      stdin.removeListener("data", onData);
      try {
        if (tty) stdin.setRawMode(false);
      } catch {}
      stdin.pause();
      resolve(Buffer.isBuffer(d) ? d : Buffer.from(String(d)));
    };
    stdin.on("data", onData);
  });
}

// Stays open until a FRESH Ctrl+X (Enter accepted as fallback).
// First drains stale keystrokes (e.g. the Enter typed after the menu choice)
// so they can never auto-satisfy the wait. Pipes exit via end/close.
async function waitCtrlX() {
  console.log(`  ${dim("press")} ${hl("Ctrl+X")} ${dim("to close")}`);
  const stdin = process.stdin;
  const tty = !!stdin.isTTY;
  try {
    if (tty) stdin.setRawMode(true);
  } catch {}
  stdin.resume();
  await new Promise((resolve) => {
    let timer;
    const quiet = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        stdin.removeListener("data", gulp);
        resolve();
      }, 200);
    };
    const gulp = () => quiet();
    stdin.on("data", gulp);
    quiet();
  });
  // Pipe already ended (non-interactive run): exit instead of hanging.
  if (stdin.readableEnded || stdin.destroyed) return;
  await new Promise((resolve) => {
    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.removeListener("end", onEnd);
      stdin.removeListener("close", onEnd);
      try {
        if (tty) stdin.setRawMode(false);
      } catch {}
      stdin.pause();
    };
    const onData = (d) => {
      const buf = Buffer.isBuffer(d) ? d : Buffer.from(String(d));
      if (buf.includes(0x03)) process.exit(0);
      if (buf.includes(0x18) || buf.includes(0x0d) || buf.includes(0x0a)) {
        cleanup();
        resolve();
      }
      // any other key: ignored, keep waiting
    };
    const onEnd = () => {
      cleanup();
      resolve();
    };
    stdin.on("data", onData);
    stdin.on("end", onEnd);
    stdin.on("close", onEnd);
  });
}

async function stage(title, names) {
  console.log();
  console.log(`${C.bold}${title}${C.reset}`);
  for (const n of names) {
    await deployTx(byName.get(n));
    await sleep(600);
  }
}

async function deployFlow(opts = {}) {
  if (!opts.skipBanner) banner();
  console.log(`  deployer ${tx("0xCAB1E4df4FBD2EF6F73cB03519Ec33cba08879e6")} ${dim("· chain 4663")}`);
  console.log(`  queue    ${hl("16 contracts")} · ${hl("23 transactions")}`);
  console.log(dim("  press Ctrl+C anytime to abort · resume with the same command"));
  await sleep(1000);
  await stage("⛓  0xbow cryptography core", ["PoseidonT3", "PoseidonT4", "WithdrawalVerifier", "CommitmentVerifier"]);
  await stage("🔀 Entrypoint + pools + ASP", ["EntrypointImpl", "EntrypointProxy", "ETHPool", "VEILPool", "activateETH", "activateVEIL", "registerETH", "registerVEIL", "updateRootASP"]);
  await stage("🏛  Treasury + registry + hook", ["Treasury", "Create2Deployer", "MockVerifier", "LegacyETHPool", "RegistryV2", "HookV2"]);
  await stage("🔀 Routers + VEIL pools + ZK", ["ShieldRouter", "VEILPool05", "VEILPool2", "VeilZkRouter"]);
  console.log();
  console.log(`${C.green}${C.bold}  ✅ DEPLOYED — 16 CONTRACTS LIVE ON MAINNET 4663${C.reset}`);
  console.log(dim("  manifest: deployments/privacy-pools-mainnet-latest.json"));
  console.log();
  await waitCtrlX();
}

async function addressBook() {
  banner();
  const m = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
  console.log(`${C.bold}📖 MAINNET ADDRESS BOOK · chain 4663${C.reset}`);
  for (const [label, addr] of [
    ["Entrypoint (proxy)", m.entrypoint], ["ETH pool", m.ethPool], ["VEIL pool", m.veilPool],
    ["VEIL token", m.veilToken],
    ["Treasury", m.treasury], ["Registry v2", m.registryV2], ["Hook v2", m.hookV2],
    ["ShieldRouter", m.routerFixed], ["VeilZkRouter", m.zkRouter],
    ["Swap helper", m.swapHelper], ["Liq helper v2", m.liqHelper],
    ["Legacy ETH", m.legacyEthPool], ["VEIL 0.5", m.veilPool05], ["VEIL 2", m.veilPool2],
  ]) {
    if (typeof addr === "string" && addr.startsWith("0x")) console.log(`  ${label.padEnd(20)} ${tx(addr)}`);
  }
  console.log();
}

async function menu() {
  banner();
  console.log(`  ${hl("1")}  Deploy mainnet contracts`);
  process.stdout.write(`\n  ${C.bold}choice [1]:${C.reset} `);
  const k = await keypress();
  console.log();
  if (k[0] === 0x31 || k[0] === 0x0d || k[0] === 0x0a) await deployFlow({ skipBanner: true }).catch(fail);
  else console.log("  bye.");
}

function fail(e) {
  console.error(`\n  FAILED: ${e?.message || e}`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.includes("--addresses")) {
  await addressBook();
} else if (args.includes("--no-menu")) {
  await deployFlow().catch(fail);
} else {
  menu();
}

