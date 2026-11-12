import { defineChain } from "viem";

export const solanaMainnet = defineChain({
  id: 4663,
  name: "Solana Mainnet-Beta",
  nativeCurrency: {
    decimals: 9,
    name: "Solana",
    symbol: "SOL",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"],
    },
    public: {
      http: ["https://api.mainnet-beta.solana.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Solscan",
      url: "https://solscan.io",
    },
  },
});

export const solanaDevnet = defineChain({
  id: 46630,
  name: "Solana Devnet",
  nativeCurrency: {
    decimals: 9,
    name: "Solana",
    symbol: "SOL",
  },
  rpcUrls: {
    default: {
      http: [process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com"],
    },
    public: {
      http: ["https://api.devnet.solana.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Solscan",
      url: "https://solscan.io",
    },
  },
});

export const APP_CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN_ID === "46630" ? 46630 : 4663;

export const appChain = APP_CHAIN_ID === 46630 ? solanaDevnet : solanaMainnet;

export function isTestnetMode() {
  return APP_CHAIN_ID === 46630;
}

export function explorerTxUrl(hash) {
  return `https://solscan.io/tx/${hash}`;
}

export function explorerAddressUrl(address) {
  return `https://solscan.io/account/${address}`;
}

export const robinhoodMainnet = solanaMainnet;
export const robinhoodTestnet = solanaDevnet;

export const V4_MAINNET_POOL_MANAGER = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
export const V4_MAINNET_POSITION_MANAGER = "0x58daec3116aae6d93017baaea7749052e8a04fa7";
export const V4_MAINNET_STATE_VIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
export const V4_MAINNET_PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const V4_MAINNET_WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
