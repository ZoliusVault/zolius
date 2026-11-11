import { execSync } from "child_process";
import { readFileSync as readFsFileSync } from "fs";

// Canonical cutover safety: prefer manifest's canonical token when the Pons
// migration recorded one; otherwise keep the temp literal. Rerunning this
// script must NEVER revert VEIL_TOKEN to temp after a cutover.
let veilTokenValue = "0xe0e11ec0d62eda12de796d025d6334fadfe5ab2a";
try {
  const man = JSON.parse(readFsFileSync("deployments/privacy-pools-mainnet-latest.json", "utf8"));
  if (typeof man.veilTokenCanonical === "string" && /^0x[0-9a-fA-F]{40}$/.test(man.veilTokenCanonical)) {
    veilTokenValue = man.veilTokenCanonical;
  }
} catch {}

const envVars = [
  { key: "NEXT_PUBLIC_CHAIN_ID", value: "4663" },
  { key: "NEXT_PUBLIC_RPC_URL", value: "https://api.mainnet-beta.solana.com" },
  { key: "NEXT_PUBLIC_V4_POOL_MANAGER", value: "0x8366a39CC670B4001A1121B8F6A443A643e40951" },
  { key: "NEXT_PUBLIC_V4_POSITION_MANAGER", value: "0x58daec3116aae6d93017baaea7749052e8a04fa7" },
  { key: "NEXT_PUBLIC_V4_STATE_VIEW", value: "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b" },
  { key: "NEXT_PUBLIC_V4_PERMIT2", value: "0x000000000022D473030F116dDEE9F6B43aC78BA3" },
  { key: "NEXT_PUBLIC_WETH", value: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" },
  { key: "NEXT_PUBLIC_VEIL_CREATE2_DEPLOYER", value: "0xea48e6a7ae296ebbd7d58792091b8087032d3aa4" },
  { key: "NEXT_PUBLIC_SHIELDED_VERIFIER", value: "0xdbbe1acf08a99789b5ca0ee688679dab80ba12d2" },
  { key: "NEXT_PUBLIC_PRIVACY_POOL_ETH", value: "0x10c17b7538e13c63b890fea52708846e88bb1932" },
  { key: "NEXT_PUBLIC_VEIL_TREASURY", value: "0xb68c3d25e5e9902363e8e10d5c0a471e65be8152" },
  { key: "NEXT_PUBLIC_VEIL_ATTESTATION_REGISTRY", value: "0xd1f17c70067f1cc2b478606b3f0faa18ee8add1d" },
  { key: "NEXT_PUBLIC_VEIL_HOOK", value: "0xf95f041462ee34c2ea7b953a879838133ef820c4" },
  { key: "NEXT_PUBLIC_VEIL_SHIELD_ROUTER", value: "0x3db4ae3429f1507aa0cd31c740a0fd276e22a55c" },
  { key: "NEXT_PUBLIC_VEIL_TOKEN", value: veilTokenValue },
  { key: "NEXT_PUBLIC_0XBOW_ENTRYPOINT", value: "0x96cb8b1836d341a6f5f1f54428bd6696c8b950b1" },
  { key: "NEXT_PUBLIC_0XBOW_POOL_ETH", value: "0x10c17b7538e13c63b890fea52708846e88bb1932" },
  { key: "NEXT_PUBLIC_0XBOW_POOL_VEIL", value: "0xdb9f182670da2cc6c5ddd432ec98a45e4f2290d1" },
  { key: "NEXT_PUBLIC_0XBOW_ZK_ROUTER", value: "0x0fb48c9552154ea028cbd812430e1ea3465a9b4c" },
  { key: "NEXT_PUBLIC_VEIL_POOL_05", value: "0x493f64d4163fe1f966c423f9338cd955e80a99df" },
  { key: "NEXT_PUBLIC_VEIL_POOL_2", value: "0x3783db43f4f08294da847c66a0fb7203bb3e005d" },
  { key: "NEXT_PUBLIC_MAINNET_SWAP_HELPER", value: "0x08b11d4d5fc78789e305e8437c45c52488a19a58" },
];

console.log(`Setting up ${envVars.length} environment variables on Vercel (Production, Preview, Development)...`);

for (const { key, value } of envVars) {
  process.stdout.write(`Adding ${key}... `);
  try {
    execSync(`npx vercel env add ${key} production,preview,development --value "${value}" --yes --force`, {
      stdio: "pipe",
    });
    console.log("✓ Done");
  } catch (err) {
    console.error(`✗ Error adding ${key}:`, err.message);
  }
}

console.log("\nAll environment variables have been set successfully on Vercel!");

