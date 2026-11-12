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
import { resolveRegisteredAddress } from "@heliuslabs/spr/wallet";
import { ed25519DerivationMessage, poseidon } from "@heliuslabs/spr/keypair";
import { ViewingKey, solanaOwnerIdentity } from "@heliuslabs/spr/keypair";
import { createExternalData, Mint, SppProofInputs } from "@heliuslabs/spr/transaction";
import { EncryptedScheme, TransactionError, decodeConfidential, decodeOutputData } from "@heliuslabs/spr/transaction";
import { bindProgramTransaction, ProgramOwner, toProgramWalletUtxo, transactCpiAccounts } from "@heliuslabs/spr/program";
import { encodeTransactInstructionData } from "@heliuslabs/spr/interface";
import { treeAddress } from "@heliuslabs/spr/internal";
import { NullifierKeyProofAuthority, SignedTeePolicy } from "@heliuslabs/spr/client";
import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  compileTransaction,
  getBase64EncodedWireTransaction,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageConfig,
} from "@solana/kit";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { detectSolana, type SolanaWalletId, type StoredWallet } from "@/lib/wallets";
import { lockCreate, lockRelease, swapCancel, swapMake, swapTake } from "../solana/ts/wire.mjs";

const privacyServiceUrl = () => new URL("/api/solana/privacy/v1/spr", window.location.origin).toString();
const proverServiceUrl = privacyServiceUrl;
type SprSession = {
  client: Awaited<ReturnType<typeof createSprClient>>;
  wallet: Wallet;
  keys: LocalKeys;
  viewingKey: ViewingKey;
  address: string;
  walletId: SolanaWalletId;
};

type ZkProgramKind = "lock" | "swap";
type ZkProgramModule = {
  default: (input?: { module_or_path?: URL }) => Promise<unknown>;
  ProvingSession: new (circuit: Uint8Array, provingKey: Uint8Array, sources?: string | null) => {
    prove(inputs: unknown, options: unknown): { proof: Uint8Array; publicInputs: Uint8Array; free(): void };
    free(): void;
  };
  VerifyingKey: new (bytes: Uint8Array) => { verify(proof: Uint8Array, inputs: Uint8Array): boolean; free(): void };
  programProof(proof: Uint8Array, inputs: Uint8Array, expectedHash: Uint8Array): { compressedProof: { a: Uint8Array; b: Uint8Array; c: Uint8Array }; publicInputs: Uint8Array[] };
  createLockTransaction?: (inputs: unknown, sender: Uint8Array, payer: string) => ProgramTransactionLike;
  claimLockTransaction?: (inputs: unknown, sender: Uint8Array, payer: string) => ProgramTransactionLike;
  makeOrderTransaction?: (inputs: unknown, sender: Uint8Array, payer: string) => ProgramTransactionLike;
  takeOrderTransaction?: (inputs: unknown, sender: Uint8Array, payer: string) => ProgramTransactionLike;
  cancelOrderTransaction?: (inputs: unknown, sender: Uint8Array, payer: string) => ProgramTransactionLike;
  lockTermsDataUtxo?: (utxo: unknown) => unknown;
  orderTermsDataUtxo?: (utxo: unknown) => unknown;
};
type ProgramTransactionLike = {
  transaction: {
    inputs: readonly { treeId: number }[];
    outputTreeId: number;
    outputHashes: readonly Uint8Array[];
    resolvedOwnerTags: readonly Bytes32[];
    encryptWithKeys(keys: ViewingKey): Parameters<Awaited<ReturnType<typeof createSprClient>>["proveTransact"]>[0];
  };
  proofInputs: Uint8Array;
  publicHash: Uint8Array;
};

const LOCK_PROGRAM_ID = (process.env.NEXT_PUBLIC_SOLANA_LOCK_PROGRAM_ID || "HQivDD6KFxHNbbk5m3pjwzxnQ2qLuSVo9ARtu39eumwX") as Address;
const SWAP_PROGRAM_ID = (process.env.NEXT_PUBLIC_SOLANA_SWAP_PROGRAM_ID || "FnvxfnARsXAEVFCtppdfGUrTWxsLFWTQF16S6h1ysopS") as Address;
const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<ZkProgramModule>;

function serializeProofAssignment<T extends (...args: any[]) => ProgramTransactionLike>(builder: T): T {
  return ((...args: Parameters<T>) => {
    const transaction = builder(...args);
    return {
      ...transaction,
      proofInputs: new TextEncoder().encode(JSON.stringify(transaction.proofInputs)),
    };
  }) as T;
}

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

function requestedProgramMint(value: unknown, session: SprSession): Address {
  if (typeof value === "string") return new PublicKey(value).toBase58() as Address;
  if (value instanceof Uint8Array || Array.isArray(value)) {
    const bytes = value instanceof Uint8Array ? value : Uint8Array.from(value as number[]);
    if (bytes.length !== 32) throw new Error("The private OTC order has an invalid requested-asset field.");
    if (bytes.every((byte) => byte === 0)) return SOL_MINT;
    const mint = session.wallet.registry.addressForField(bytes as Bytes32);
    if (mint) return mint;
  }
  if (typeof value === "object" && value !== null && "asset" in value && typeof value.asset === "string") {
    return new PublicKey(value.asset).toBase58() as Address;
  }
  throw new Error("The private OTC order requests an asset that is not registered in this wallet.");
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
    destroySession(session);
  }
}

export async function ensurePrivacyWalletRegistered(stored: StoredWallet): Promise<void> {
  const session = await openSession(stored);
  try {
    await ensureRegistered(session);
  } finally {
    destroySession(session);
  }
}

export async function readPrivateVaultAccess(stored: StoredWallet): Promise<{
  portfolio: PrivatePortfolio;
  viewingKey: string;
}> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    return {
      portfolio: await portfolioForSession(session),
      viewingKey: toHex(session.viewingKey.secretBytes()),
    };
  } finally {
    destroySession(session);
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
    destroySession(session);
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
    destroySession(session);
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
    destroySession(session);
  }
}

function amountForMint(amountText: string, decimals: number): bigint {
  return parseTokenAmount(amountText, decimals);
}

function signerIdentity(addressValue: string): { bytes: Uint8Array; field: string } {
  const bytes = solanaOwnerIdentity(new PublicKey(addressValue).toBytes());
  return { bytes, field: BigInt(`0x${toHex(bytes)}`).toString() };
}

function spendableProgramInput(session: SprSession, mint: string, amount: bigint, exact = false) {
  const entry = session.wallet.utxos().find(
    (candidate) => !candidate.spent && candidate.utxo.asset === mint && (exact ? candidate.utxo.amount === amount : candidate.utxo.amount >= amount),
  );
  if (!entry) throw new Error(exact ? "No spendable note exactly matches the OTC requested amount. Split or merge private notes to match the maker’s terms." : "No single spendable private note covers this amount. Deposit or merge notes first.");
  return toProgramWalletUtxo(entry, {
    nullifierPublicKey: session.wallet.identity.nullifierPublicKey,
    treeId: session.client.treeId,
    assets: session.wallet.registry,
  });
}

type RecoveredProgramOutput = {
  id: string;
  utxo: Record<string, any>;
  data: Record<string, any>;
  amount: bigint;
  mint: string;
};

async function recoverProgramOutputs(
  session: SprSession,
  creatorValue: string,
  kind: "lock" | "swap",
): Promise<RecoveredProgramOutput[]> {
  const creator = new PublicKey(creatorValue.trim()).toBase58() as Address;
  const program = kind === "lock" ? LOCK_PROGRAM_ID : SWAP_PROGRAM_ID;
  const seed = kind === "lock" ? "zolius_lock" : "zolius_order";
  const authority = await ProgramOwner.find([seed, new PublicKey(creator).toBytes()], program);
  const module = await loadProgramWasm(kind);
  const convert = kind === "lock" ? module.lockTermsDataUtxo : module.orderTermsDataUtxo;
  if (!convert) throw new Error(`The ${kind} recovery helper is missing from the generated WASM module.`);
  const response = await session.client.getShieldedTransactionsByTags({
    tags: [session.wallet.identity.confidentialViewTag(), authority.ownerTag()],
    limit: 100,
  });
  const transactions = response.data.flatMap((item) => item.events);
  const spent = new Set(transactions.flatMap((transaction) => transaction.nullifiers.map(toHex)));
  const recipientKey = session.viewingKey.publicKey().toBytes();
  const owner = authority.publicKey().toBytes();
  const nullifierPubkey = ProgramOwner.nullifierPublicKey();
  const nullifierKey = ProgramOwner.nullifierKey();
  const outputs = new Map<string, RecoveredProgramOutput>();
  try {
    for (const transaction of transactions) {
      const { txViewingPublicKey, salt } = transaction;
      if (!txViewingPublicKey || !salt) continue;
      transaction.outputSlots.forEach((slot, slotIndex) => {
        if (toHex(slot.viewTag) !== toHex(authority.ownerTag())) return;
        let frame: ReturnType<typeof decodeOutputData>;
        try {
          frame = decodeOutputData(slot.payload);
        } catch (error) {
          if (error instanceof TransactionError && ["TRANSACTION_DESERIALIZE", "TRANSACTION_TRAILING_BYTES", "TRANSACTION_BAD_DISCRIMINATOR", "TRANSACTION_INVALID_LENGTH"].includes(error.code)) return;
          throw error;
        }
        if (frame.encoding !== "encrypted" || frame.scheme !== EncryptedScheme.confidential) return;
        if (toHex(frame.body.slice(0, recipientKey.length)) !== toHex(recipientKey)) return;
        let plaintext;
        try {
          plaintext = decodeConfidential(session.viewingKey.decryptUtxo(frame.body.slice(recipientKey.length), txViewingPublicKey, salt, slotIndex));
        } catch {
          return;
        }
        const utxoHash = slot.outputContext.hash;
        const candidate = {
          utxo: {
            owner,
            asset: { asset: session.wallet.registry.resolve(plaintext.assetId), assetId: plaintext.assetId },
            amount: plaintext.amount,
            blinding: plaintext.blinding,
            data: { records: [...plaintext.data.records()] },
          },
          nullifierPubkey,
          utxoHash,
          nullifier: nullifierKey.nullifier(utxoHash, plaintext.blinding),
          treeId: session.client.treeId,
          leafIndex: slot.outputContext.leafIndex,
        };
        const recovered = convert(candidate) as { utxo: { utxoHash: Uint8Array; nullifier: Uint8Array; utxo: { amount: bigint; asset: { asset: string } } }; data: Record<string, any> };
        const id = toHex(recovered.utxo.utxoHash);
        if (spent.has(toHex(recovered.utxo.nullifier))) return;
        outputs.set(id, {
          id,
          utxo: recovered.utxo as unknown as Record<string, any>,
          data: recovered.data,
          amount: recovered.utxo.utxo.amount,
          mint: recovered.utxo.utxo.asset.asset,
        });
      });
    }
  } finally {
    nullifierKey.destroy();
  }
  return [...outputs.values()];
}

export type PrivateLockSummary = { id: string; creator: string; mint: string; amount: string; unlockAt: number; claimable: boolean };
export type PrivateSwapSummary = { id: string; maker: string; offerMint: string; offerAmount: string; requestMint: string; requestAmount: string; expiresAt: number };

export async function readPrivateLocks(stored: StoredWallet, creator: string): Promise<PrivateLockSummary[]> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    const outputs = await recoverProgramOutputs(session, creator, "lock");
    const metadata = new AssetMetadataCache(session.client);
    return await Promise.all(outputs.map(async (output) => {
      const details = await metadata.get(output.mint as Address);
      return {
        id: output.id,
        creator: new PublicKey(creator.trim()).toBase58(),
        mint: output.mint,
        amount: formatTokenAmount(output.amount, details.decimals),
        unlockAt: Number(output.data.unlock),
        claimable: Number(output.data.unlock) <= Math.floor(Date.now() / 1000),
      };
    }));
  } finally {
    destroySession(session);
  }
}

export async function readPrivateSwapOrders(stored: StoredWallet, maker: string): Promise<PrivateSwapSummary[]> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    const outputs = await recoverProgramOutputs(session, maker, "swap");
    const metadata = new AssetMetadataCache(session.client);
    return await Promise.all(outputs.map(async (output) => {
      const requestedMint = requestedProgramMint(output.data.requestedMint, session);
      const [offerDetails, requestDetails] = await Promise.all([
        metadata.get(output.mint as Address),
        metadata.get(requestedMint as Address),
      ]);
      return {
        id: output.id,
        maker: new PublicKey(maker.trim()).toBase58(),
        offerMint: output.mint,
        offerAmount: formatTokenAmount(output.amount, offerDetails.decimals),
        requestMint: requestedMint,
        requestAmount: formatTokenAmount(BigInt(output.data.requestedAmount), requestDetails.decimals),
        expiresAt: Number(output.data.expiry),
      };
    }));
  } finally {
    destroySession(session);
  }
}

export async function createPrivateLock(
  stored: StoredWallet,
  input: { mint: string; amount: string; beneficiary: string; unlockAt: number; cancelable?: boolean },
): Promise<{ signature: string; unlockAt: number }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    const beneficiary = new PublicKey(input.beneficiary.trim()).toBase58() as Address;
    const recipient = await resolveRegisteredAddress({ rpc: session.client, owner: beneficiary });
    if (!recipient) throw new Error("The beneficiary must connect to Zolius and register a Privacy Rings address first.");
    const metadata = await new AssetMetadataCache(session.client).get(input.mint.trim() as Address);
    const amount = amountForMint(input.amount, metadata.decimals);
    if (amount <= 0n) throw new Error("Lock amount must be positive.");
    const module = await loadProgramWasm("lock");
    if (!module.createLockTransaction) throw new Error("Lock transaction builder is missing from the generated WASM module.");
    const authority = await ProgramOwner.find(["zolius_lock", new PublicKey(session.address).toBytes()], LOCK_PROGRAM_ID);
    const identity = signerIdentity(session.address);
    const build = bindProgramTransaction(serializeProofAssignment(module.createLockTransaction), { assets: session.wallet.registry });
    const prepared = await build({
      private: {
        txContext: { outputTreeId: session.client.treeId },
        source: spendableProgramInput(session, input.mint.trim(), amount),
        beneficiaryHash: Array.from(recipient.address.ownerHash()),
        amount,
        unlock: BigInt(input.unlockAt),
        cancelable: input.cancelable ? 1n : 0n,
      },
      public: {
        creatorIdentity: identity.field,
        escrowOwner: authority.address(recipient.address.viewingPublicKey).toBytes(),
      },
    }, session.wallet.identity.toBytes(), session.address as Address);
    const { proof } = await proveProgramAction("lock", "create_lock", prepared);
    const signature = await submitProgramTransaction({
      session,
      program: LOCK_PROGRAM_ID,
      pdaSeed: "zolius_lock",
      action: "lock-create",
      prepared,
      proof,
      viewingPubkey: recipient.address.viewingPublicKey.toBytes(),
      ownerSigners: true,
    });
    return { signature, unlockAt: input.unlockAt };
  } finally {
    destroySession(session);
  }
}

export async function createPrivateSwapOrder(
  stored: StoredWallet,
  input: { offerMint: string; offerAmount: string; requestMint: string; requestAmount: string; taker: string; expiresAt: number },
): Promise<{ signature: string; expiresAt: number; id: string }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    const takerAddress = new PublicKey(input.taker.trim()).toBase58() as Address;
    const recipient = await resolveRegisteredAddress({ rpc: session.client, owner: takerAddress });
    if (!recipient) throw new Error("The taker must connect to Zolius and register a Privacy Rings address first.");
    const metadata = new AssetMetadataCache(session.client);
    const [offerDetails, requestDetails] = await Promise.all([
      metadata.get(input.offerMint.trim() as Address),
      metadata.get(input.requestMint.trim() as Address),
    ]);
    const offerAmount = amountForMint(input.offerAmount, offerDetails.decimals);
    const requestAmount = amountForMint(input.requestAmount, requestDetails.decimals);
    if (offerAmount <= 0n || requestAmount <= 0n) throw new Error("Both OTC amounts must be positive.");
    const module = await loadProgramWasm("swap");
    if (!module.makeOrderTransaction) throw new Error("Swap transaction builder is missing from the generated WASM module.");
    const authority = await ProgramOwner.find(["zolius_order", new PublicKey(session.address).toBytes()], SWAP_PROGRAM_ID);
    const identity = signerIdentity(session.address);
    const build = bindProgramTransaction(serializeProofAssignment(module.makeOrderTransaction), { assets: session.wallet.registry });
    const prepared = await build({
      private: {
        txContext: { outputTreeId: session.client.treeId },
        source: spendableProgramInput(session, input.offerMint.trim(), offerAmount),
        sourceAmount: offerAmount,
        requestedMint: Mint.fromRegistry(session.wallet.registry, input.requestMint.trim() as Address),
        requestedAmount: requestAmount,
        expiry: BigInt(input.expiresAt),
        takerIdentity: Array.from(signerIdentity(takerAddress).bytes),
      },
      public: {
        makerIdentity: identity.field,
        orderOwner: authority.address(recipient.address.viewingPublicKey).toBytes(),
      },
    }, session.wallet.identity.toBytes(), session.address as Address);
    const { proof } = await proveProgramAction("swap", "make_order", prepared);
    const signature = await submitProgramTransaction({
      session,
      program: SWAP_PROGRAM_ID,
      pdaSeed: "zolius_order",
      action: "swap-make",
      prepared,
      proof,
      expiresAt: BigInt(input.expiresAt),
      viewingPubkey: recipient.address.viewingPublicKey.toBytes(),
      ownerSigners: true,
    });
    const orderHash = prepared.transaction.outputHashes[0];
    if (!orderHash) throw new Error("The private order commitment is missing from the prepared transaction.");
    return { signature, expiresAt: input.expiresAt, id: toHex(orderHash) };
  } finally {
    destroySession(session);
  }
}

export async function claimPrivateLock(
  stored: StoredWallet,
  input: { creator: string; id: string },
): Promise<{ signature: string }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    const outputs = await recoverProgramOutputs(session, input.creator, "lock");
    const lock = outputs.find((output) => output.id === input.id);
    if (!lock) throw new Error("This private lock is already claimed or is not addressed to this wallet.");
    const unlockAt = Number(lock.data.unlock);
    if (!Number.isSafeInteger(unlockAt) || unlockAt > Math.floor(Date.now() / 1000)) {
      throw new Error("This timelock has not unlocked yet.");
    }
    const module = await loadProgramWasm("lock");
    if (!module.claimLockTransaction) throw new Error("Lock claim builder is missing from the generated WASM module.");
    const beneficiary = {
      key: { tag: "S".charCodeAt(0), bytes: new PublicKey(session.address).toBytes() },
      nullifierPk: BigInt(`0x${toHex(session.wallet.identity.nullifierPublicKey)}`).toString(),
    };
    const build = bindProgramTransaction(serializeProofAssignment(module.claimLockTransaction), { assets: session.wallet.registry });
    const prepared = await build({
      private: {
        txContext: { outputTreeId: lock.utxo.treeId },
        escrow: lock.utxo,
        terms: lock.data,
        beneficiary,
      },
      public: {
        unlock: BigInt(unlockAt),
        signerIdentity: signerIdentity(session.address).field,
      },
    }, session.wallet.identity.toBytes(), session.address as Address);
    const { proof } = await proveProgramAction("lock", "claim_lock", prepared);
    const signature = await submitProgramTransaction({
      session,
      program: LOCK_PROGRAM_ID,
      pdaSeed: "zolius_lock",
      pdaOwner: new PublicKey(input.creator.trim()).toBase58(),
      action: "lock-claim",
      prepared,
      proof,
      viewingPubkey: session.wallet.identity.viewingPublicKey.toBytes(),
      ownerSigners: false,
      release: { creator: new PublicKey(input.creator.trim()).toBytes(), unlock: BigInt(unlockAt) },
    });
    return { signature };
  } finally {
    destroySession(session);
  }
}

export async function takePrivateSwapOrder(
  stored: StoredWallet,
  input: { maker: string; id: string },
): Promise<{ signature: string }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    const outputs = await recoverProgramOutputs(session, input.maker, "swap");
    const order = outputs.find((output) => output.id === input.id);
    if (!order) throw new Error("This private OTC order is already taken or is not addressed to this wallet.");
    const expiresAt = Number(order.data.expiry);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
      throw new Error("This OTC order has expired.");
    }
    const requestMint = requestedProgramMint(order.data.requestedMint, session);
    const requestAmount = BigInt(order.data.requestedAmount);
    const payment = spendableProgramInput(session, requestMint, requestAmount, true);
    if (payment.treeId !== order.utxo.treeId) {
      throw new Error("The order and exact payment note must be in the same Privacy Rings tree. Merge or refresh private notes, then retry.");
    }
    const makerAddress = new PublicKey(input.maker.trim()).toBase58() as Address;
    const maker = await resolveRegisteredAddress({ rpc: session.client, owner: makerAddress });
    if (!maker) throw new Error("The maker's registered Privacy Rings address could not be resolved.");
    const module = await loadProgramWasm("swap");
    if (!module.takeOrderTransaction) throw new Error("Swap take builder is missing from the generated WASM module.");
    const requestedMint = Mint.fromRegistry(session.wallet.registry, requestMint);
    const build = bindProgramTransaction(serializeProofAssignment(module.takeOrderTransaction), { assets: session.wallet.registry });
    const prepared = await build({
      private: {
        txContext: {
          outputTreeId: order.utxo.treeId,
          blindingSeed: poseidon([unsignedBigIntBytes(0x53575458n), order.utxo.utxo.blinding]),
        },
        order: order.utxo,
        terms: {
          ...order.data,
          requestedMint,
          requestedAmount: requestAmount,
          expiry: BigInt(expiresAt),
          takerIdentity: Array.from(order.data.takerIdentity as Uint8Array),
        },
        takerInput: payment,
        makerAddress: maker.address.toBytes(),
      },
      public: {
        expiry: BigInt(expiresAt),
        firstNullifier: BigInt(`0x${toHex(order.utxo.nullifier)}`).toString(),
      },
    }, session.wallet.identity.toBytes(), session.address as Address);
    const { proof } = await proveProgramAction("swap", "take_order", prepared);
    const signature = await submitProgramTransaction({
      session,
      program: SWAP_PROGRAM_ID,
      pdaSeed: "zolius_order",
      pdaOwner: makerAddress,
      action: "swap-take",
      prepared,
      proof,
      expiresAt: BigInt(expiresAt),
      viewingPubkey: maker.address.viewingPublicKey.toBytes(),
      ownerSigners: true,
      maker: new PublicKey(makerAddress).toBytes(),
    });
    return { signature };
  } finally {
    destroySession(session);
  }
}

export async function cancelPrivateSwapOrder(
  stored: StoredWallet,
  input: { id: string },
): Promise<{ signature: string }> {
  const session = await openSession(stored);
  try {
    await syncSession(session);
    const outputs = await recoverProgramOutputs(session, session.address, "swap");
    const order = outputs.find((output) => output.id === input.id);
    if (!order) throw new Error("This OTC order is already settled or cannot be recovered by this wallet.");
    const requestMint = requestedProgramMint(order.data.requestedMint, session);
    const module = await loadProgramWasm("swap");
    if (!module.cancelOrderTransaction) throw new Error("Swap refund builder is missing from the generated WASM module.");
    const terms = {
      ...order.data,
      requestedMint: Mint.fromRegistry(session.wallet.registry, requestMint),
      requestedAmount: BigInt(order.data.requestedAmount),
      expiry: BigInt(order.data.expiry),
      takerIdentity: Array.from(order.data.takerIdentity as Uint8Array),
    };
    const build = bindProgramTransaction(serializeProofAssignment(module.cancelOrderTransaction), { assets: session.wallet.registry });
    const prepared = await build({
      private: { txContext: { outputTreeId: order.utxo.treeId }, order: order.utxo, terms },
      public: { makerIdentity: signerIdentity(session.address).field },
    }, session.wallet.identity.toBytes(), session.address as Address);
    const { proof } = await proveProgramAction("swap", "cancel_order", prepared);
    const signature = await submitProgramTransaction({
      session,
      program: SWAP_PROGRAM_ID,
      pdaSeed: "zolius_order",
      action: "swap-cancel",
      prepared,
      proof,
      viewingPubkey: session.wallet.identity.viewingPublicKey.toBytes(),
      ownerSigners: true,
    });
    return { signature };
  } finally {
    destroySession(session);
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

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

function unsignedBigIntBytes(value: bigint, length = 32): Uint8Array {
  const bytes = new Uint8Array(length);
  let remaining = value;
  for (let index = length - 1; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  if (remaining !== 0n) throw new Error("Integer does not fit in the requested byte width.");
  return bytes;
}

function readProgramArtifact(kind: ZkProgramKind, action: string, file: string): Promise<Uint8Array> {
  return fetch(`/zk/${kind}/${action}/${file}`, { cache: "force-cache" }).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load ${kind} ${action} proof artifact (${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  });
}

async function loadProgramWasm(kind: ZkProgramKind): Promise<ZkProgramModule> {
  const moduleName = kind === "lock" ? "zolius_lock_circuits" : "zolius_swap_circuits";
  const module = await dynamicImport(`/zk/${kind}/wasm/${moduleName}.js`);
  await module.default({ module_or_path: new URL(`/zk/${kind}/wasm/${moduleName}_bg.wasm`, window.location.origin) });
  return module;
}

async function proveProgramAction(
  kind: ZkProgramKind,
  action: string,
  transaction: ProgramTransactionLike,
): Promise<{ module: ZkProgramModule; proof: { a: Uint8Array; b: Uint8Array; c: Uint8Array } }> {
  const [module, circuit, provingKey, verifyingKey, sourcesResponse] = await Promise.all([
    loadProgramWasm(kind),
    readProgramArtifact(kind, action, "circuit.xbc"),
    readProgramArtifact(kind, action, "pk.bin"),
    readProgramArtifact(kind, action, "vk.bin"),
    fetch(`/zk/${kind}/${action}/sources.json`, { cache: "force-cache" }),
  ]);
  if (!sourcesResponse.ok) throw new Error(`Could not load ${kind} circuit source metadata.`);
  const sources = await sourcesResponse.text();
  const session = new module.ProvingSession(circuit, provingKey, sources);
  const verifier = new module.VerifyingKey(verifyingKey);
  try {
    let assignment: unknown;
    try {
      assignment = JSON.parse(new TextDecoder().decode(transaction.proofInputs));
    } catch {
      throw new Error(`${kind} WASM returned invalid proof assignment data.`);
    }
    const bundle = session.prove(assignment, {});
    try {
      if (!verifier.verify(bundle.proof, bundle.publicInputs)) {
        throw new Error(`${kind} proof failed local verification; no transaction was sent.`);
      }
      const proof = module.programProof(bundle.proof, bundle.publicInputs, transaction.publicHash).compressedProof;
      return { module, proof };
    } finally {
      bundle.free();
    }
  } finally {
    verifier.free();
    session.free();
  }
}

async function submitProgramTransaction(input: {
  session: SprSession;
  program: Address;
  pdaSeed: string;
  action: "lock-create" | "lock-claim" | "swap-make" | "swap-take" | "swap-cancel";
  pdaOwner?: string;
  prepared: ProgramTransactionLike;
  proof: { a: Uint8Array; b: Uint8Array; c: Uint8Array };
  viewingPubkey: Uint8Array;
  ownerSigners: boolean;
  release?: { creator: Uint8Array; unlock: bigint };
  maker?: Uint8Array;
  expiresAt?: bigint;
}): Promise<string> {
  const { session, program, pdaSeed, action, pdaOwner, prepared, proof, viewingPubkey, ownerSigners, release, maker } = input;
  const actor = session.address as Address;
  const pdaActor = (pdaOwner || actor) as Address;
  const [authority, bump] = await PublicKey.findProgramAddress(
    [new TextEncoder().encode(pdaSeed), new PublicKey(pdaActor).toBytes()],
    new PublicKey(program),
  );
  const encryptedInputs = prepared.transaction.encryptWithKeys(session.viewingKey);
  const sppInputs = action === "lock-create" || action === "swap-make" || input.expiresAt !== undefined
    ? (() => {
        const addMarker = action === "lock-create" || action === "swap-make";
        const markerOutputHash = addMarker ? prepared.transaction.outputHashes[1] : undefined;
        const markerViewTag = addMarker ? prepared.transaction.resolvedOwnerTags[1] : undefined;
        if (addMarker && (!markerOutputHash || !markerViewTag)) {
          throw new Error("The private program output needed for its recipient marker is missing.");
        }
        const externalData = createExternalData({
          expiryUnixTs: input.expiresAt ?? encryptedInputs.externalData.expiryUnixTs,
          interfaceTransfers: encryptedInputs.externalData.interfaceTransfers,
          ...(encryptedInputs.externalData.dataHash === undefined
            ? {}
            : { dataHash: encryptedInputs.externalData.dataHash }),
          ...(encryptedInputs.externalData.ringDataHash === undefined
            ? {}
            : { ringDataHash: encryptedInputs.externalData.ringDataHash }),
          txViewingPublicKey: encryptedInputs.externalData.txViewingPublicKey,
          salt: encryptedInputs.externalData.salt,
          outputs: encryptedInputs.externalData.outputs,
          resolvedOwnerTags: encryptedInputs.externalData.resolvedOwnerTags,
          messages: addMarker ? [{
            viewTag: markerViewTag!,
            data: concatBytes(markerOutputHash!, new PublicKey(actor).toBytes()),
          }] : encryptedInputs.externalData.messages,
        });
        return new SppProofInputs({
          payer: encryptedInputs.payer,
          inputUtxos: encryptedInputs.inputUtxos,
          outputs: encryptedInputs.outputs,
          externalData,
          blindingSeed: encryptedInputs.blindingSeed,
          outputTreeId: encryptedInputs.outputTreeId,
          cacheAccounts: encryptedInputs.cacheAccounts,
        });
      })()
    : encryptedInputs;
  let transact: Awaited<ReturnType<typeof session.client.proveTransact>>;
  if (action === "lock-claim") {
    const programNullifierKey = ProgramOwner.nullifierKey();
    const authority = new NullifierKeyProofAuthority(programNullifierKey, session.client.proofService);
    try {
      transact = await session.client.proveTransact(sppInputs, authority);
    } finally {
      authority.destroy();
      programNullifierKey.destroy();
    }
  } else if (action === "swap-take" || action === "swap-cancel") {
    const programNullifierKey = ProgramOwner.nullifierKey();
    const programOwner = await ProgramOwner.find([pdaSeed, new PublicKey(pdaActor).toBytes()], program);
    const ownerHash = BigInt(`0x${toHex(programOwner.publicKey().ownerProofInputHash())}`);
    const secretBytes = programNullifierKey.secretBytes();
    const ownerSecret = BigInt(`0x${toHex(secretBytes)}`);
    secretBytes.fill(0);
    programNullifierKey.destroy();
    const completeProgramOwnerInput = <T extends { ownerPublicKeyHash: bigint; nullifierSecret?: bigint }>(value: T): T =>
      value.ownerPublicKeyHash === ownerHash && value.nullifierSecret === undefined
        ? { ...value, nullifierSecret: ownerSecret }
        : value;
    const authority: any = {
      prove: (inputs: Parameters<typeof session.keys.prove>[0], context?: Parameters<typeof session.keys.prove>[1]) =>
        session.keys.prove({
          ...inputs,
          payload: { ...inputs.payload, inputs: inputs.payload.inputs.map(completeProgramOwnerInput) },
        } as any, context),
      proveMerge: (inputs: Parameters<typeof session.keys.proveMerge>[0], context?: Parameters<typeof session.keys.proveMerge>[1]) =>
        session.keys.proveMerge(inputs, context),
      proveIndexed: (request: Parameters<typeof session.keys.proveIndexed>[0], context?: Parameters<typeof session.keys.proveIndexed>[1]) =>
        session.keys.proveIndexed({
          ...request,
          payload: { ...request.payload, inputs: request.payload.inputs.map(completeProgramOwnerInput) },
        } as any, context),
    };
    transact = await session.client.proveTransact(sppInputs, authority);
  } else {
    transact = await session.client.proveTransact(sppInputs, session.keys);
  }
  const [inputTreeId] = prepared.transaction.inputs.map((utxo) => utxo.treeId);
  if (inputTreeId === undefined) throw new Error("The private transaction has no input tree.");
  const actorSigner = { address: actor } as Parameters<typeof transactCpiAccounts>[0]["payer"];
  const cpiAccounts = [...await transactCpiAccounts({
    payer: actorSigner,
    inputTree: treeAddress(inputTreeId),
    outputTree: treeAddress(prepared.transaction.outputTreeId),
    ownerSigners: ownerSigners ? [actorSigner] : [],
    data: transact,
    signerPdas: [authority.toBase58() as Address],
  })];
  if (action === "swap-take") {
    const signerStart = 4 + 1 + prepared.transaction.inputs.length;
    const authorityIndex = cpiAccounts.findIndex((account, index) => index >= signerStart && account.address === authority.toBase58());
    if (authorityIndex >= 0 && authorityIndex !== signerStart) {
      const [pdaMeta] = cpiAccounts.splice(authorityIndex, 1);
      if (pdaMeta) cpiAccounts.splice(signerStart, 0, pdaMeta);
    }
  }
  const spp = encodeTransactInstructionData(transact);
  const data = action === "lock-create"
    ? lockCreate({ proof, viewingPubkey, bump, spp })
    : action === "lock-claim"
      ? lockRelease({ action: "claim", proof, creator: release?.creator || new Uint8Array(32), unlock: release?.unlock || 0n, bump, spp })
      : action === "swap-make"
        ? swapMake({ proof, viewingPubkey, bump, spp })
        : action === "swap-cancel"
          ? swapCancel({ proof, bump, spp })
          : swapTake({ proof, maker: maker || new Uint8Array(32), bump, spp });
  const instruction = {
    programAddress: program,
    accounts: [
      { address: actor, role: AccountRole.READONLY_SIGNER, signer: actorSigner },
      ...cpiAccounts,
    ],
    data,
  };
  const lifetime = await session.client.getLatestBlockhash();
  const message = appendTransactionMessageInstructions(
    [instruction],
    setTransactionMessageLifetimeUsingBlockhash(
      lifetime,
      setTransactionMessageConfig(
        { computeUnitLimit: 1_400_000, loadedAccountsDataSizeLimit: 64 * 1024 * 1024 },
        setTransactionMessageFeePayer(actor, createTransactionMessage({ version: 1 })),
      ),
    ),
  );
  const tx = await sendWithWallet(session, compileTransaction(message) as Parameters<typeof getBase64EncodedWireTransaction>[0]);
  const slot = await session.client.confirmTransaction(tx as Signature);
  await syncWallet({ client: session.client, wallet: session.wallet, keys: session.keys, config: { requireSlot: slot } });
  await session.client.confirmPrivateTransaction(tx as Signature);
  return tx;
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
  const response = await fetch("/api/solana/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "zolius-spr-send",
      method: "sendTransaction",
      params: [encodeBase64(raw), { encoding: "base64", preflightCommitment: "confirmed" }],
    }),
  });
  if (!response.ok) throw new Error(`Solana RPC returned HTTP ${response.status}`);
  const result = (await response.json()) as { result?: string; error?: { message?: string } };
  if (result.error) throw new Error(result.error.message || "Mainnet rejected the transaction.");
  if (!result.result) throw new Error("Mainnet did not return a transaction signature.");
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
    solanaRpcUrl: new URL("/api/solana/rpc", window.location.origin).toString(),
    indexerUrl: privacyServiceUrl(),
    proverUrl: proverServiceUrl(),
    proverTee: SignedTeePolicy.forNetwork("mainnet"),
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
  let viewingKey: ViewingKey;
  try {
    viewingKey = ViewingKey.fromDerivationSeed(derivationSeed);
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
    viewingKey,
    address: stored.address,
    walletId: stored.id,
  };
}

async function syncSession(session: SprSession): Promise<void> {
  await syncWallet({ client: session.client, wallet: session.wallet, keys: session.keys });
}

function destroySession(session: SprSession): void {
  session.keys.destroy();
  session.viewingKey.destroy();
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
    destroySession(session);
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
    destroySession(session);
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
    destroySession(session);
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
    destroySession(session);
  }
}
