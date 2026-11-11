// Multi-wallet Solana provider detection & connection registry for Zolius Vault
// Supports Phantom, Solflare, Backpack, and OKX Solana wallets
// Standard Solana wallet adapter interface without heavy external dependencies

export type SolanaWalletId = "phantom" | "solflare" | "backpack" | "okx";
export type EvmWalletId = SolanaWalletId; // Backward-compatibility alias

export interface SolanaProvider {
  publicKey?: { toBase58: () => string; toString: () => string } | null;
  isConnected?: boolean;
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array }>;
  signTransaction?: (tx: unknown) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
}

export type WalletOption = {
  id: SolanaWalletId;
  name: string;
  installUrl: string;
  icon: string;
  description: string;
};

export const SOLANA_WALLETS: WalletOption[] = [
  {
    id: "phantom",
    name: "Phantom",
    installUrl: "https://phantom.app/download",
    icon: "/wallets/phantom.svg",
    description: "The most popular self-custody Solana wallet",
  },
  {
    id: "solflare",
    name: "Solflare",
    installUrl: "https://solflare.com/",
    icon: "/wallets/solflare.svg",
    description: "Fast, secure Solana wallet with hardware support",
  },
  {
    id: "backpack",
    name: "Backpack",
    installUrl: "https://backpack.app/download",
    icon: "/wallets/backpack.svg",
    description: "Next-gen xNFT & Solana crypto wallet",
  },
  {
    id: "okx",
    name: "OKX Wallet",
    installUrl: "https://www.okx.com/web3",
    icon: "/wallets/okx.svg",
    description: "Multi-chain Web3 wallet with Solana support",
  },
];

export const EVM_WALLETS = SOLANA_WALLETS; // Backward-compatibility alias

type Win = typeof window & {
  solana?: SolanaProvider;
  phantom?: { solana?: SolanaProvider };
  solflare?: SolanaProvider;
  backpack?: SolanaProvider;
  okxwallet?: { solana?: SolanaProvider };
};

const subscribers = new Set<() => void>();

export function onWalletsChanged(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function requestEip6963Providers(): void {
  // Notify listeners to refresh detection
  for (const sub of subscribers) {
    try {
      sub();
    } catch {
      // ignore
    }
  }
}

function win(): Win | null {
  return typeof window === "undefined" ? null : (window as unknown as Win);
}

export function detectSolana(id: SolanaWalletId): SolanaProvider | null {
  const w = win();
  if (!w) return null;

  try {
    if (id === "phantom") {
      if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
      if (w.solana?.isPhantom) return w.solana;
    }
    if (id === "solflare") {
      if (w.solflare?.isSolflare || (w.solflare && typeof w.solflare.connect === "function")) {
        return w.solflare;
      }
    }
    if (id === "backpack") {
      if (w.backpack?.isBackpack || (w.backpack && typeof w.backpack.connect === "function")) {
        return w.backpack;
      }
    }
    if (id === "okx") {
      if (w.okxwallet?.solana && typeof w.okxwallet.solana.connect === "function") {
        return w.okxwallet.solana;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export const detectEvm = detectSolana; // Backward-compatibility alias

const STORAGE_KEY = "zolius_solana_wallet";

export interface StoredWallet {
  id: SolanaWalletId;
  address: string;
}

export function loadWallet(): StoredWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWallet;
    if (parsed && parsed.id && parsed.address) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveWallet(id: SolanaWalletId, address: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, address }));
    for (const sub of subscribers) sub();
  } catch {
    // ignore
  }
}

export function clearWallet(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const sub of subscribers) sub();
  } catch {
    // ignore
  }
}

export function subscribeWalletChange(cb: () => void): () => void {
  return onWalletsChanged(cb);
}

export async function silentSolanaAccount(id: SolanaWalletId): Promise<string | null> {
  const provider = detectSolana(id);
  if (!provider) return null;
  try {
    if (provider.publicKey) {
      return provider.publicKey.toBase58();
    }
    // Attempt trusted reconnect without popup
    const res = await provider.connect({ onlyIfTrusted: true });
    if (res?.publicKey) {
      return res.publicKey.toBase58();
    }
  } catch {
    // Silent fail if not auto-trusted
  }
  return null;
}

export const silentEvmAccount = silentSolanaAccount; // Backward-compatibility alias

export async function connectSolana(id: SolanaWalletId): Promise<{ address: string; provider: SolanaProvider }> {
  const provider = detectSolana(id);

  if (!provider) {
    // If not detected, provide deterministic dev demo address or throw install error
    if (process.env.NODE_ENV !== "production") {
      // In dev mode when browser has no extension, allow simulation
      const mockAddr = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
      saveWallet(id, mockAddr);
      return {
        address: mockAddr,
        provider: {
          publicKey: { toBase58: () => mockAddr, toString: () => mockAddr },
          isConnected: true,
          connect: async () => ({ publicKey: { toBase58: () => mockAddr } }),
          disconnect: async () => {},
        },
      };
    }
    const option = SOLANA_WALLETS.find((w) => w.id === id);
    const url = option?.installUrl || "https://phantom.app";
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    throw new Error(`${option?.name || id} is not installed in your browser. Install extension to continue.`);
  }

  try {
    const res = await provider.connect();
    let addr = "";
    if (res?.publicKey) {
      addr = res.publicKey.toBase58();
    } else if (provider.publicKey) {
      addr = provider.publicKey.toBase58();
    } else {
      throw new Error("No public key returned by Solana wallet.");
    }

    saveWallet(id, addr);

    if (provider.on) {
      provider.on("disconnect", () => {
        clearWallet();
      });
      provider.on("accountChanged", (newPub: unknown) => {
        if (newPub && typeof newPub === "object" && "toBase58" in newPub) {
          saveWallet(id, (newPub as { toBase58: () => string }).toBase58());
        } else {
          clearWallet();
        }
      });
    }

    return { address: addr, provider };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("User rejected")) {
      throw new Error("Connection request was rejected in wallet.");
    }
    throw new Error(msg || "Failed to connect to Solana wallet.");
  }
}

export const connectEvm = connectSolana; // Backward-compatibility alias

export function isSolanaAddress(addr: string): boolean {
  if (typeof addr !== "string") return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

export function isEvmAddress(addr: string): boolean {
  if (typeof addr !== "string") return false;
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export function matchEvm(provider: unknown, id: string): boolean {
  if (!provider || typeof provider !== "object") return false;
  const p = provider as Record<string, unknown>;
  if (id === "metamask") return Boolean(p.isMetaMask && !p.isRabby);
  if (id === "rabby") return Boolean(p.isRabby);
  if (id === "phantom") return Boolean(p.isPhantom);
  if (id === "coinbase") return Boolean(p.isCoinbaseWallet);
  if (id === "okx") return Boolean(p.isOkxWallet);
  if (id === "trust") return Boolean(p.isTrustWallet);
  return false;
}

export function walletLabel(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (msg.includes("wallet_missing")) return "Wallet extension not detected. Please install it.";
  if (msg.includes("wallet_rejected") || msg.includes("rejected")) return "Connection request cancelled by user.";
  if (msg.includes("wallet_timeout") || msg.includes("timeout")) return "Wallet request timed out. Please retry.";
  if (msg) return msg;
  return "Connection failed. Please retry.";
}

export function getActiveEvmProvider(): SolanaProvider | null {
  const current = loadWallet();
  if (!current) return null;
  return detectSolana(current.id);
}

export async function revalidateWallet(
  provider?: unknown,
  expectedAccount?: string,
  expectedChainId?: number
): Promise<{ chainId?: number; account?: string } | void> {
  if (provider && typeof provider === "object" && "request" in provider) {
    const p = provider as { request: (args: { method: string }) => Promise<unknown> };
    let chainId: number | undefined;
    let account: string | undefined;
    try {
      const hexChain = (await p.request({ method: "eth_chainId" })) as string;
      if (hexChain) chainId = parseInt(hexChain, 16);
    } catch {}
    try {
      const accs = (await p.request({ method: "eth_accounts" })) as string[];
      if (accs && accs[0]) account = accs[0];
    } catch {}
    if (expectedChainId !== undefined && chainId !== undefined && chainId !== expectedChainId) {
      throw new Error("Chain mismatch");
    }
    if (expectedAccount && account && expectedAccount.toLowerCase() !== account.toLowerCase()) {
      throw new Error("Account mismatch");
    }
    return { chainId, account: account || expectedAccount };
  }
  for (const sub of subscribers) sub();
}
