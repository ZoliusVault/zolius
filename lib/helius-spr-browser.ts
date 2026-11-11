"use client";

import {
  buildDepositTransaction,
  buildRegistrationTransaction,
  buildTransferTransaction,
  buildWithdrawalTransaction,
  createSprClient,
  formatAmount,
  LocalKeys,
  SOL_MINT,
  AssetMetadataCache,
  getPrivateTokenBalances,
  getPrivateTransactions,
  syncWallet,
  Wallet,
  type Address,
  type Bytes32,
  type Signature,
} from "@heliuslabs/spr";
import { isWalletRegistered } from "@heliuslabs/spr/wallet";
import { ed25519DerivationMessage } from "@heliuslabs/spr/keypair";
import { SignedTeePolicy } from "@heliuslabs/spr/client";
import { getBase64EncodedWireTransaction } from "@solana/kit";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { detectSolana, type SolanaWalletId, type StoredWallet } from "@/lib/wallets";

const INDEXER_URL =
  process.env.NEXT_PUBLIC_SOLANA_INDEXER_URL || "https://d34xe1hqb2ibg2.cloudfront.net";
const PROVER_URL =
  process.env.NEXT_PUBLIC_SOLANA_PROVER_URL || "https://dd73hh473h6ha.cloudfront.net";
const RPC_URL = "/api/solana/rpc";

type SprSession = {
  client: Awaited<ReturnType<typeof createSprClient>>;
  wallet: Wallet;
  keys: LocalKeys;
  address: string;
  walletId: SolanaWalletId;
};

export type SyncedSolNote = {
  id: string;
  nullifier: string;
  commitmentHash: string;
  amount: string;
  spent: boolean;
  leafIndex: number;
};

export type PrivateAssetBalance = {
  mint: string;
  amount: bigint;
  decimals: number;
};

export type PrivateHistoryEntry = {
  signature: string;
  slot: bigint;
  kind: string;
  direction: string;
  mint: string;
  amount: bigint;
  decimals: number;
};

export type PrivatePortfolio = {
  balances: PrivateAssetBalance[];
  history: PrivateHistoryEntry[];
};

function parseTokenAmount(value: string, decimals: number): bigint {
  const normalized = value.trim();
  const fractionDigits = Math.min(Math.max(decimals, 0), 18);
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a positive token amount using decimal notation.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > fractionDigits) {
    throw new Error(`This token supports up to ${fractionDigits} decimal places.`);
  }
  return BigInt(whole) * 10n ** BigInt(fractionDigits) + BigInt(fraction.padEnd(fractionDigits, "0") || "0");
}

function formatTokenAmount(value: bigint, decimals: number): string {
  const places = Math.min(Math.max(decimals, 0), 18);
  const scale = 10n ** BigInt(places);
  const fraction = (value % scale).toString().padStart(places, "0").replace(/0+$/, "");
  return fraction ? `${value / scale}.${fraction}` : (value / scale).toString();
}

async function portfolioForSession(session: SprSession): Promise<PrivatePortfolio> {
  const metadata = new AssetMetadataCache(session.client);
  const balances = await Promise.all(
    getPrivateTokenBalances(session.wallet).map(async (balance) => {
      const details = await metadata.get(balance.mint);
      return { mint: balance.mint, amount: balance.amount, decimals: details.decimals };
    }),
  );
  const history = await Promise.all(
    getPrivateTransactions(session.wallet).map(async (transaction) => {
      const details = await metadata.get(transaction.asset);
      return {
        signature: String(transaction.id.signature),
        slot: transaction.id.slot,
        kind: transaction.kind,
        direction: transaction.direction,
        mint: transaction.asset,
        amount: transaction.amount,
        decimals: details.decimals,
      };
    }),
  );
  return { balances, history };
}

async function syncAndConfirmPrivateTransaction(
  session: SprSession,
  transaction: Parameters<typeof getBase64EncodedWireTransaction>[0],
): Promise<{ signature: string; portfolio: PrivatePortfolio }> {
  const signature = await sendWithWallet(session, transaction);
  const slot = await session.client.confirmTransaction(signature as Signature);
  await syncWallet({
    client: session.client,
    wallet: session.wallet,
    keys: session.keys,
    config: { requireSlot: slot },
  });
  await session.client.confirmPrivateTransaction(signature as Signature);
  return { signature, portfolio: await portfolioForSession(session) };
}

export async function readPrivatePortfolio(stored: StoredWallet): Promise<PrivatePortfolio> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    return await portfolioForSession(session);
  } finally {
    session.keys.destroy();
  }
}

export async function shieldPrivateAsset(
  stored: StoredWallet,
  mintValue: string,
  amountText: string,
  memo?: string,
): Promise<{ signature: string; portfolio: PrivatePortfolio }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    await ensureRegistered(session);
    const mint = mintValue.trim() as Address;
    const metadata = await new AssetMetadataCache(session.client).get(mint);
    const amount = parseTokenAmount(amountText, metadata.decimals);
    if (amount <= 0n) throw new Error("Amount must be greater than zero.");
    const transaction = await buildDepositTransaction({
      client: session.client,
      feePayer: session.address as Address,
      depositor: session.address as Address,
      recipient: session.wallet.identity,
      asset: mint,
      amount,
      ...(memo ? { memo: new TextEncoder().encode(memo) } : {}),
    });
    return await syncAndConfirmPrivateTransaction(session, transaction);
  } finally {
    session.keys.destroy();
  }
}

export async function transferPrivateAsset(
  stored: StoredWallet,
  mintValue: string,
  recipientValue: string,
  amountText: string,
): Promise<{ signature: string; portfolio: PrivatePortfolio }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    const mint = mintValue.trim() as Address;
    const metadata = await new AssetMetadataCache(session.client).get(mint);
    const amount = parseTokenAmount(amountText, metadata.decimals);
    if (amount <= 0n) throw new Error("Amount must be greater than zero.");
    if (session.wallet.balance(mint).amount < amount) {
      throw new Error("Insufficient private balance for this asset.");
    }
    const recipient = new PublicKey(recipientValue.trim()).toBase58() as Address;
    const transaction = await buildTransferTransaction({
      client: session.client,
      wallet: session.wallet,
      keys: session.keys,
      feePayer: session.address as Address,
      recipient,
      asset: mint,
      amount,
    });
    return await syncAndConfirmPrivateTransaction(session, transaction);
  } finally {
    session.keys.destroy();
  }
}

export async function withdrawPrivateAsset(
  stored: StoredWallet,
  mintValue: string,
  recipientValue: string,
  amountText: string,
): Promise<{ signature: string; portfolio: PrivatePortfolio }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    const mint = mintValue.trim() as Address;
    const metadata = await new AssetMetadataCache(session.client).get(mint);
    const amount = parseTokenAmount(amountText, metadata.decimals);
    if (amount <= 0n) throw new Error("Amount must be greater than zero.");
    if (session.wallet.balance(mint).amount < amount) {
      throw new Error("Insufficient private balance for this asset.");
    }
    const recipient = new PublicKey(recipientValue.trim()).toBase58() as Address;
    const transaction = await buildWithdrawalTransaction({
      client: session.client,
      wallet: session.wallet,
      keys: session.keys,
      feePayer: session.address as Address,
      recipient,
      asset: mint,
      amount,
    });
    return await syncAndConfirmPrivateTransaction(session, transaction);
  } finally {
    session.keys.destroy();
  }
}

export { formatTokenAmount };

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function solNotes(session: SprSession): SyncedSolNote[] {
  return session.wallet
    .utxos()
    .filter(({ utxo }) => utxo.asset === SOL_MINT)
    .map(({ utxo, outputContext, nullifier, spent }) => ({
      id: toHex(outputContext.hash),
      nullifier: toHex(nullifier),
      commitmentHash: toHex(outputContext.hash),
      amount: formatAmount(utxo.amount, 9),
      spent,
      leafIndex: Number(outputContext.leafIndex),
    }));
}

function base64Bytes(encoded: string): Uint8Array {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function sendWithWallet(
  session: SprSession,
  transaction: Parameters<typeof getBase64EncodedWireTransaction>[0],
): Promise<string> {
  const provider = detectSolana(session.walletId);
  if (!provider?.signTransaction) {
    throw new Error("This wallet does not support Solana transaction signing.");
  }

  const unsigned = VersionedTransaction.deserialize(
    base64Bytes(getBase64EncodedWireTransaction(transaction)),
  );
  const signedValue = await provider.signTransaction(unsigned);
  if (!signedValue || typeof signedValue !== "object" || !("serialize" in signedValue)) {
    throw new Error("Wallet returned an invalid signed transaction.");
  }
  const raw = (signedValue as VersionedTransaction).serialize();
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "zolius-spr-send",
      method: "sendTransaction",
      params: [encodeBase64(raw), { encoding: "base64", preflightCommitment: "confirmed" }],
    }),
  });
  if (!response.ok) throw new Error(`Devnet RPC returned HTTP ${response.status}`);
  const result = (await response.json()) as { result?: string; error?: { message?: string } };
  if (result.error) throw new Error(result.error.message || "Devnet rejected the transaction.");
  if (!result.result) throw new Error("Devnet did not return a transaction signature.");
  return result.result;
}

async function openSession(stored: StoredWallet): Promise<SprSession> {
  const provider = detectSolana(stored.id);
  if (!provider?.signMessage || !provider.signTransaction) {
    throw new Error("Reconnect a Solana wallet that supports message and transaction signing.");
  }
  let currentAddress = provider.publicKey?.toBase58();
  if (!currentAddress) {
    try {
      const trusted = await provider.connect({ onlyIfTrusted: true });
      currentAddress = trusted.publicKey?.toBase58();
    } catch {
      // A wallet may need an explicit reconnect before it can derive its private identity.
    }
  }
  if (!currentAddress || currentAddress !== stored.address) {
    throw new Error("The connected wallet changed. Reconnect the wallet before continuing.");
  }

  const client = await createSprClient({
    solanaRpcUrl: RPC_URL,
    indexerUrl: INDEXER_URL,
    proverUrl: PROVER_URL,
    proverTee: SignedTeePolicy.forNetwork("devnet"),
  });
  const ownerBytes = new PublicKey(stored.address).toBytes();
  const message = ed25519DerivationMessage(ownerBytes as Bytes32);
  const signedMessage = await provider.signMessage(message, "utf8");
  const derivationSeed =
    signedMessage instanceof Uint8Array
      ? signedMessage
      : (signedMessage as { signature: Uint8Array }).signature;
  if (!(derivationSeed instanceof Uint8Array) || derivationSeed.length !== 64) {
    throw new Error("Wallet returned an invalid privacy-key derivation signature.");
  }

  let keys: LocalKeys;
  try {
    keys = LocalKeys.fromDerivationSeed(
      {
        solanaPublicKey: stored.address as Address,
        derivationSeed: derivationSeed as Bytes32,
      },
      client.proofService,
    );
  } finally {
    derivationSeed.fill(0);
  }

  return {
    client,
    wallet: new Wallet({ identity: keys.address() }),
    keys,
    address: stored.address,
    walletId: stored.id,
  };
}

async function syncSession(session: SprSession): Promise<void> {
  await syncWallet({ client: session.client, wallet: session.wallet, keys: session.keys });
}

async function ensureRegistered(session: SprSession): Promise<void> {
  if (await isWalletRegistered({ rpc: session.client, owner: session.address as Address })) return;
  const registration = await buildRegistrationTransaction({
    client: session.client,
    owner: session.address as Address,
    address: session.keys.address(),
    payer: session.address as Address,
  });
  if (!registration) return;
  const signature = await sendWithWallet(session, registration);
  await session.client.confirmTransaction(signature as Signature);
}

export async function shieldSol(
  stored: StoredWallet,
  amountLamports: bigint,
  memo?: string,
): Promise<{ signature: string; balanceLamports: bigint; notes: SyncedSolNote[] }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    await ensureRegistered(session);
    const transaction = await buildDepositTransaction({
      client: session.client,
      feePayer: session.address as Address,
      depositor: session.address as Address,
      recipient: session.wallet.identity,
      asset: SOL_MINT,
      amount: amountLamports,
      ...(memo ? { memo: new TextEncoder().encode(memo) } : {}),
    });
    const signature = await sendWithWallet(session, transaction);
    const slot = await session.client.confirmTransaction(signature as Signature);
    await syncWallet({
      client: session.client,
      wallet: session.wallet,
      keys: session.keys,
      config: { requireSlot: slot },
    });
    await session.client.confirmPrivateTransaction(signature as Signature);
    return {
      signature,
      balanceLamports: session.wallet.balance(SOL_MINT).amount,
      notes: solNotes(session),
    };
  } finally {
    session.keys.destroy();
  }
}

export async function transferPrivateSol(
  stored: StoredWallet,
  recipient: string,
  amountLamports: bigint,
): Promise<{ signature: string; balanceLamports: bigint; notes: SyncedSolNote[] }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    await ensureRegistered(session);
    if (session.wallet.balance(SOL_MINT).amount < amountLamports) {
      throw new Error("Insufficient private SOL balance. Sync or shield SOL first.");
    }
    const transaction = await buildTransferTransaction({
      client: session.client,
      wallet: session.wallet,
      keys: session.keys,
      feePayer: session.address as Address,
      recipient: new PublicKey(recipient).toBase58() as Address,
      asset: SOL_MINT,
      amount: amountLamports,
    });
    const signature = await sendWithWallet(session, transaction);
    const slot = await session.client.confirmTransaction(signature as Signature);
    await syncWallet({
      client: session.client,
      wallet: session.wallet,
      keys: session.keys,
      config: { requireSlot: slot },
    });
    await session.client.confirmPrivateTransaction(signature as Signature);
    return {
      signature,
      balanceLamports: session.wallet.balance(SOL_MINT).amount,
      notes: solNotes(session),
    };
  } finally {
    session.keys.destroy();
  }
}

export async function withdrawSol(
  stored: StoredWallet,
  recipient: string,
  amountLamports: bigint,
): Promise<{ signature: string; balanceLamports: bigint; notes: SyncedSolNote[] }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    if (session.wallet.balance(SOL_MINT).amount < amountLamports) {
      throw new Error("Insufficient private SOL balance. Sync or shield SOL first.");
    }
    const transaction = await buildWithdrawalTransaction({
      client: session.client,
      wallet: session.wallet,
      keys: session.keys,
      feePayer: session.address as Address,
      recipient: new PublicKey(recipient).toBase58() as Address,
      asset: SOL_MINT,
      amount: amountLamports,
    });
    const signature = await sendWithWallet(session, transaction);
    const slot = await session.client.confirmTransaction(signature as Signature);
    await syncWallet({
      client: session.client,
      wallet: session.wallet,
      keys: session.keys,
      config: { requireSlot: slot },
    });
    await session.client.confirmPrivateTransaction(signature as Signature);
    return {
      signature,
      balanceLamports: session.wallet.balance(SOL_MINT).amount,
      notes: solNotes(session),
    };
  } finally {
    session.keys.destroy();
  }
}

export async function readPrivateSolBalance(
  stored: StoredWallet,
): Promise<{ balanceLamports: bigint; notes: SyncedSolNote[] }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    return {
      balanceLamports: session.wallet.balance(SOL_MINT).amount,
      notes: solNotes(session),
    };
  } finally {
    session.keys.destroy();
  }
}
