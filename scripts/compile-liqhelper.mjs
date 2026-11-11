// Compiles TestnetLiquidityHelper (v4-core test-utils pattern, no viaIR).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import solc from "solc";

const sources = {
  "TestnetLiquidityHelper.sol": { content: readFileSync("contracts/TestnetLiquidityHelper.sol", "utf8") },
  "MainnetLiquidityHelper.sol": { content: readFileSync("contracts/MainnetLiquidityHelper.sol", "utf8") },
};
const remappings = [
  "@uniswap/=node_modules/@uniswap/",
  "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/",
];
const input = {
  language: "Solidity",
  sources,
  settings: {
    remappings,
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const out = JSON.parse(solc.compile(JSON.stringify(input), {
  import(path) {
    const p = path.replaceAll("\\", "/");
    const r = remappings.find((x) => p.startsWith(x.split("=")[0]));
    const resolved = r ? r.split("=")[1] + p.slice(r.split("=")[0].length) : p;
    try {
      return { contents: readFileSync(resolved.startsWith("node_modules") ? resolved : `contracts/${resolved}`, "utf8") };
    } catch {
      return { error: `Unable to resolve ${path} -> ${resolved}` };
    }
  },
}));
const errors = (out.errors ?? []).filter((e) => e.severity === "error");
if (errors.length) {
  for (const e of errors) console.error(e.formattedMessage);
  process.exit(1);
}
const c = out.contracts["TestnetLiquidityHelper.sol"]["TestnetLiquidityHelper"];
mkdirSync("deployments", { recursive: true });
writeFileSync("deployments/liqhelper-artifact.json", JSON.stringify({ abi: c.abi, bytecode: `0x${c.evm.bytecode.object}` }));
const m = out.contracts["MainnetLiquidityHelper.sol"]["MainnetLiquidityHelper"];
writeFileSync("deployments/mainnet-liqhelper-artifact.json", JSON.stringify({ abi: m.abi, bytecode: `0x${m.evm.bytecode.object}` }));
console.log("LiquidityHelper compiled (testnet + mainnet).");
