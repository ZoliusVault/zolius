import {
  SHIELDED_POOL_ABI,
  SHIELDED_VERIFIER_MOCK_ABI,
  VEIL_HOOK_ABI,
  VEIL_SHIELD_ROUTER_ABI,
  VEIL_TREASURY_ABI,
  VEIL_ATTESTATION_REGISTRY_ABI,
  VEIL_CREATE2_DEPLOYER_ABI,
} from "./veil-artifact";
import { APP_CHAIN_ID } from "./chains";

export const CONTRACT_ABIS = {
  ShieldedPool: SHIELDED_POOL_ABI,
  ShieldedVerifierMock: SHIELDED_VERIFIER_MOCK_ABI,
  VeilHook: VEIL_HOOK_ABI,
  VeilShieldRouter: VEIL_SHIELD_ROUTER_ABI,
  VeilTreasury: VEIL_TREASURY_ABI,
  VeilAttestationRegistry: VEIL_ATTESTATION_REGISTRY_ABI,
  VeilCreate2Deployer: VEIL_CREATE2_DEPLOYER_ABI,
} as const;

// Live Solana Devnet 46630 deployments (deployments/testnet-latest.json).
// NOTE: testnet reads TESTNET_-prefixed vars first and ignores the generic
// NEXT_PUBLIC_* vars (those hold MAINNET addresses in .env.local).
export const TESTNET_CONTRACT_ADDRESSES = {
  router: process.env.NEXT_PUBLIC_TESTNET_VEIL_SHIELD_ROUTER || "0x7c73e4b7f9c9cac1f1574c46fd17952be2853e27",
  hook: process.env.NEXT_PUBLIC_TESTNET_VEIL_HOOK || "0xc0bd5e335651394b57a9277411f65e149e73e0c4",
  poolEth: process.env.NEXT_PUBLIC_TESTNET_PRIVACY_POOL_ETH || "0x3783db43f4f08294da847c66a0fb7203bb3e005d",
  treasury: process.env.NEXT_PUBLIC_TESTNET_VEIL_TREASURY || "0x491413119a4adb0ea23b902c7fc7cee3845542b2",
  registry: process.env.NEXT_PUBLIC_TESTNET_VEIL_ATTESTATION_REGISTRY || "0x4d66540c3cd12ee8de89ad8013c51838b572dce3",
  verifier: process.env.NEXT_PUBLIC_TESTNET_SHIELDED_VERIFIER || "0xab9dd89a3b16db81140d6a5842a439de6f4969b6",
  deployer: process.env.NEXT_PUBLIC_TESTNET_VEIL_CREATE2_DEPLOYER || "0x25ed04b42071086c3a8647954422c9c958e35f3e",
  token: process.env.NEXT_PUBLIC_TESTNET_VEIL_TOKEN || "",
} as const;

// Live Solana Mainnet 4663 deployments (deployments/privacy-pools-mainnet-latest.json).
// Fresh suite owned by the current deployer. Env vars override these defaults.
export const MAINNET_CONTRACT_ADDRESSES = {
  router: process.env.NEXT_PUBLIC_VEIL_SHIELD_ROUTER || "0x3db4ae3429f1507aa0cd31c740a0fd276e22a55c",
  hook: process.env.NEXT_PUBLIC_VEIL_HOOK || "0xf95f041462ee34c2ea7b953a879838133ef820c4",
  poolEth: process.env.NEXT_PUBLIC_PRIVACY_POOL_ETH || "0x10c17b7538e13c63b890fea52708846e88bb1932",
  treasury: process.env.NEXT_PUBLIC_VEIL_TREASURY || "0xb68c3d25e5e9902363e8e10d5c0a471e65be8152",
  registry: process.env.NEXT_PUBLIC_VEIL_ATTESTATION_REGISTRY || "0xd1f17c70067f1cc2b478606b3f0faa18ee8add1d",
  verifier: process.env.NEXT_PUBLIC_SHIELDED_VERIFIER || "0xdbbe1acf08a99789b5ca0ee688679dab80ba12d2",
  deployer: process.env.NEXT_PUBLIC_VEIL_CREATE2_DEPLOYER || "0xea48e6a7ae296ebbd7d58792091b8087032d3aa4",
  // Temporary VeilToken (mainnet 0xe0e11ec0d62eda12de796d025d6334fadfe5ab2a).
  // Empty until set via NEXT_PUBLIC_VEIL_TOKEN; UI shows "—" and disables VEIL.
  token: process.env.NEXT_PUBLIC_VEIL_TOKEN || "0xe0e11ec0d62eda12de796d025d6334fadfe5ab2a",
} as const;

// Active suite follows NEXT_PUBLIC_CHAIN_ID (46630 = testnet, else mainnet).
export const CONTRACT_ADDRESSES =
  APP_CHAIN_ID === 46630 ? TESTNET_CONTRACT_ADDRESSES : MAINNET_CONTRACT_ADDRESSES;

export const TREASURY_DEPLOYMENT_BLOCK =
  APP_CHAIN_ID === 46630 ? 129135924n : 86333824n;

export const POOL_DEPLOYMENT_BLOCK =
  APP_CHAIN_ID === 46630 ? 129135904n : 86333824n;
