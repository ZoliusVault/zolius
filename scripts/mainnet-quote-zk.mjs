// FREE offchain quote: exact VEIL-out for 0.001 ETH into the PLAIN pool,
// plus the deepen amount that makes single-ZK quotable. The plain pool holds
// exactly one full-range position (v1 L=3.75e16; micro round-trip net zero),
// so V2-style full-range math is exact. No sends, no signatures.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, custom, encodeAbiParameters, keccak256, formatEther, parseEther } from "viem";
import { solanaMainnet } from "../lib/chains.mjs";
import { rpcRequest } from "./rpc-helper.mjs";

const root = process.cwd();
const provider = {
  async request({ method, params }) {
    const res = await rpcRequest(4663, { jsonrpc: "2.0", id: 1, method, params });
    if (res.error) throw new Error(`RPC error: ${res.error.message}`);
    return res.result;
  },
};
const pub = createPublicClient({ chain: solanaMainnet, transport: custom(provider) });
const STATEVIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
const ETH = "0x0000000000000000000000000000000000000000";
const man = JSON.parse(readFileSync(join(root, "deployments", "privacy-pools-mainnet-latest.json"), "utf8"));
const poolKey = [ETH, man.veilToken, 3000, 60, ETH];
const poolId = keccak256(encodeAbiParameters(
  [{ type: "tuple", components: [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }] }],
  [poolKey]
));
const svAbi = [
  { type: "function", name: "getSlot0", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint160" }, { type: "int24" }, { type: "uint24" }, { type: "uint24" }] },
  { type: "function", name: "getLiquidity", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint128" }] },
];
const [sqrtP, tick] = await pub.readContract({ address: STATEVIEW, abi: svAbi, functionName: "getSlot0", args: [poolId] });
const L = await pub.readContract({ address: STATEVIEW, abi: svAbi, functionName: "getLiquidity", args: [poolId] });
console.log(`tick ${tick}, liquidity ${L}`);
const Q96 = 2n ** 96n;
const SQ = BigInt(sqrtP);
const Lb = BigInt(L);
// Full-range reserves (both 18 decimals): x = L*Q96/sqrtP, y = L*sqrtP/Q96
function quote(dx, x, y) {
  const dxFee = dx * 997000n / 1000000n; // 0.3% fee
  const k = x * y;
  const yOut = y - k / (x + dxFee);
  return yOut;
}
const x0 = Lb * Q96 / SQ;
const y0 = Lb * SQ / Q96;
console.log(`reserves: ${formatEther(x0)} ETH / ${formatEther(y0)} VEIL`);
const DX = parseEther("0.001");
const out0 = quote(DX, x0, y0);
console.log(`swap 0.001 ETH -> ${formatEther(out0)} VEIL (need >= 0.001 + margin)`);
const TARGET = parseEther("0.00105"); // 5% margin over the note
// Deepen solver: add D ETH + D*price VEIL (full-range, same price), find D s.t. quote hits TARGET.
const priceVEILperETH = y0 * 10n ** 18n / x0; // ~2000e18 scale
console.log(`implied price: ${formatEther(priceVEILperETH)} VEIL/ETH`);
let D = parseEther("0.0001");
let answer = null;
for (let i = 0; i < 40; i++) {
  const dv = D * priceVEILperETH / (10n ** 18n);
  const q = quote(DX, x0 + D, y0 + dv);
  if (q >= TARGET) { answer = { D, dv, q }; break; }
  D = D * 13n / 10n;
}
if (!answer) { console.log("NOT QUOTABLE even at large deepen; investigate."); process.exit(1); }
console.log(`deepen needed: ${formatEther(answer.D)} ETH + ${formatEther(answer.dv)} VEIL -> quote ${formatEther(answer.q)} VEIL`);
process.exit(0);

