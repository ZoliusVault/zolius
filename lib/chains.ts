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
      http: [
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.mainnet-beta.solana.com",
      ],
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
      http: [
        process.env.NEXT_PUBLIC_DEVNET_RPC_URL ||
        "https://api.devnet.solana.com",
      ],
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

// Backward-compat aliases
export const robinhoodMainnet = solanaMainnet;
export const robinhoodTestnet = solanaDevnet;

export const APP_CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN_ID === "46630" ? 46630 : 4663;

export const appChain = APP_CHAIN_ID === 46630 ? solanaDevnet : solanaMainnet;

export function isTestnetMode(): boolean {
  return APP_CHAIN_ID === 46630;
}

export function explorerTxUrl(hash: string): string {
  return `https://solscan.io/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://solscan.io/account/${address}`;
}
