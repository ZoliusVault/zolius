//! Client-side preparation for fixed-price private OTC orders.
//! Proof generation, SPP proving, signing and submission remain caller-owned.
use anyhow::{anyhow, ensure, Result};
use solana_address::Address;
use spr_hasher::primitives::solana_owner_identity;
use spr_keypair::{ShieldedAddress, ShieldedKeypair};
use spr_program::{
    poseidon, DataUtxo, Field, InputRecords, ProgramOwner, ProgramProofInputs, TransactionOptions,
};
use spr_transaction::{
    instructions::transact::SppProofInputs, AssetRegistry, Mint, ShieldedTransaction,
    SppProofOutputUtxo, WalletUtxo,
};
use zolius_swap_circuits::circuits::{
    CancelOrderClient, CancelPrivateClient, CancelPublicClient, MakeOrderClient, MakePrivateClient,
    MakePublicClient, OrderTerms, OrderTermsClient, TakeOrderClient, TakePrivateClient,
    TakePublicClient,
};

fn err(error: impl core::fmt::Debug) -> anyhow::Error {
    anyhow!("{error:?}")
}

pub struct MakeParams {
    pub program_id: Address,
    pub payer: Address,
    pub source: WalletUtxo,
    pub amount: u64,
    pub requested_mint: Mint,
    pub requested_amount: u64,
    pub expiry: u64,
    pub taker: ShieldedAddress,
    pub restrict_taker: bool,
}

/// Contains private proof inputs. Persist the order output and confirmed leaf
/// location securely if the maker needs to cancel after restarting the client.
pub struct PreparedMake {
    pub maker: Address,
    pub viewing_pubkey: [u8; 33],
    pub spp_inputs: SppProofInputs,
    pub program_inputs: ProgramProofInputs,
    pub private_tx_hash: [u8; 32],
    pub order_output: SppProofOutputUtxo,
    pub change_blinding: [u8; 32],
}

pub fn prepare_make(maker: &ShieldedKeypair, params: MakeParams) -> Result<PreparedMake> {
    ensure!(
        params.amount != 0 && params.amount <= params.source.utxo.amount,
        "invalid order amount"
    );
    ensure!(
        params.requested_amount != 0,
        "requested amount must be positive"
    );
    ensure!(
        params.source.utxo.owner == maker.signing_pubkey(),
        "source does not belong to maker"
    );
    let sender = maker.shielded_address().map_err(err)?;
    let maker_address = sender.solana_address().map_err(err)?;
    let identity = solana_owner_identity(maker_address.as_array()).map_err(err)?;
    let taker_identity = if params.restrict_taker {
        solana_owner_identity(params.taker.solana_address().map_err(err)?.as_array())
            .map_err(err)?
    } else {
        [0; 32]
    };
    let tree_id = params.source.tree_id;
    let viewing_pubkey = *params.taker.viewing_pubkey.as_bytes();
    let authority = ProgramOwner::find(
        &[b"zolius_order", maker_address.as_array()],
        &params.program_id,
    );
    let owner = authority
        .address(params.taker.viewing_pubkey)
        .map_err(err)?;
    let prepared = MakeOrderClient {
        private: MakePrivateClient {
            tx_context: TransactionOptions {
                blinding_seed: None,
                output_tree_id: Some(tree_id),
            },
            source: params.source,
            source_amount: params.amount,
            requested_mint: params.requested_mint,
            requested_amount: params.requested_amount,
            expiry: params.expiry,
            taker_identity,
        },
        public: MakePublicClient {
            maker_identity: spr_program::from_bytes(&identity).map_err(err)?,
            order_owner: owner,
        },
    }
    .prepare(&sender, params.payer)
    .map_err(err)?;
    let outputs = prepared.finalized.output_utxos();
    let change = outputs
        .first()
        .ok_or_else(|| anyhow!("missing change output"))?;
    let order_output = outputs
        .get(1)
        .ok_or_else(|| anyhow!("missing order output"))?
        .clone();
    let change_blinding = change.blinding;
    let output_hash = order_output.hash(tree_id).map_err(err)?;
    let private_tx_hash = prepared
        .finalized
        .padding_independent_private_tx_hash()
        .map_err(err)?;
    let viewing_key = maker
        .get_transaction_viewing_key(&prepared.finalized.first_nullifier().map_err(err)?)
        .map_err(err)?;
    let mut spp_inputs = prepared
        .finalized
        .encrypt_with_viewing_key(&viewing_key)
        .map_err(err)?;
    let mut data = Vec::with_capacity(64);
    data.extend_from_slice(&output_hash);
    data.extend_from_slice(maker_address.as_array());
    spp_inputs.external_data.messages.push(
        spr_interface::instruction::instruction_data::transact::MessageData {
            view_tag: params.taker.confidential_view_tag().map_err(err)?,
            data,
        },
    );
    ensure!(
        spp_inputs
            .padding_independent_private_tx_hash()
            .map_err(err)?
            == private_tx_hash,
        "SPP and program inputs disagree"
    );
    Ok(PreparedMake {
        maker: maker_address,
        viewing_pubkey,
        spp_inputs,
        program_inputs: prepared.proof_inputs,
        private_tx_hash,
        order_output,
        change_blinding,
    })
}

pub type OrderUtxo = DataUtxo<OrderTerms>;

/// Convert an order output into a spendable input using its confirmed location.
pub fn order_input(
    program_id: Address,
    maker: Address,
    output: &SppProofOutputUtxo,
    tree_id: u16,
    leaf_index: u64,
) -> Result<OrderUtxo> {
    let owner = ProgramOwner::find(&[b"zolius_order", maker.as_array()], &program_id);
    OrderUtxo::try_from(owner.input(output, tree_id, leaf_index).map_err(err)?).map_err(err)
}

/// Recover orders addressed to a taker from indexed history. The make marker
/// carries the maker PDA seed so the taker can derive the encrypted data owner.
pub fn open_orders(
    program_id: Address,
    taker: &ShieldedKeypair,
    transactions: &[ShieldedTransaction],
    assets: &AssetRegistry,
) -> Result<Vec<OrderUtxo>> {
    let address = taker.shielded_address().map_err(err)?;
    let tag = address.confidential_view_tag().map_err(err)?;
    let identity =
        solana_owner_identity(address.solana_address().map_err(err)?.as_array()).map_err(err)?;
    let mut makers = std::collections::BTreeSet::new();
    for transaction in transactions {
        for message in &transaction.messages {
            if message.view_tag == tag && message.data.len() == 64 {
                makers.insert(Address::new_from_array(
                    message.data[32..].try_into().map_err(err)?,
                ));
            }
        }
    }
    let mut orders = Vec::new();
    let mut seen = std::collections::BTreeSet::new();
    for maker in makers {
        let owner = ProgramOwner::find(&[b"zolius_order", maker.as_array()], &program_id);
        let decrypted = owner
            .decrypt_data_utxos::<OrderTerms>(&taker.viewing_key, transactions, assets)
            .map_err(err)?;
        for order in decrypted {
            if (order.data.taker_identity == [0; 32] || order.data.taker_identity == identity)
                && seen.insert(order.utxo.nullifier)
            {
                orders.push(order);
            }
        }
    }
    Ok(orders)
}

pub struct TakeParams {
    pub program_id: Address,
    pub payer: Address,
    pub maker: ShieldedAddress,
    pub order: OrderUtxo,
    pub payment: WalletUtxo,
}

pub struct PreparedTake {
    pub taker: Address,
    pub maker: Address,
    pub expiry: u64,
    pub first_nullifier: [u8; 32],
    pub spp_inputs: SppProofInputs,
    pub program_inputs: ProgramProofInputs,
    pub private_tx_hash: [u8; 32],
    pub change_blinding: [u8; 32],
}

pub fn prepare_take(taker: &ShieldedKeypair, params: TakeParams) -> Result<PreparedTake> {
    let sender = taker.shielded_address().map_err(err)?;
    let taker_address = sender.solana_address().map_err(err)?;
    ensure!(
        params.payment.utxo.owner == taker.signing_pubkey(),
        "payment does not belong to taker"
    );
    let authority = ProgramOwner::find(
        &[
            b"zolius_order",
            params.maker.solana_address().map_err(err)?.as_array(),
        ],
        &params.program_id,
    );
    ensure!(
        params.order.utxo.utxo.owner == authority.public_key(),
        "order belongs to another program authority"
    );
    ensure!(
        params.order.utxo.nullifier_pubkey == ProgramOwner::nullifier_pubkey().map_err(err)?,
        "wrong program nullifier key"
    );
    let maker_owner = *InputRecords::new()
        .address(&params.maker)
        .map_err(err)?
        .owner();
    ensure!(
        params.order.data.maker == maker_owner,
        "maker does not match committed order"
    );
    ensure!(
        params.payment.utxo.amount == params.order.data.requested_amount,
        "payment must exactly match order price"
    );
    ensure!(
        *params.payment.utxo.asset.asset.as_array() == params.order.data.requested_mint,
        "payment mint does not match order"
    );
    ensure!(
        params.payment.tree_id == params.order.utxo.tree_id,
        "order and payment must use the same tree"
    );
    let taker_identity = solana_owner_identity(taker_address.as_array()).map_err(err)?;
    if params.order.data.taker_identity != [0; 32] {
        ensure!(
            params.order.data.taker_identity == taker_identity,
            "order is restricted to another taker"
        );
    }
    let first_nullifier = params.order.utxo.nullifier;
    let terms = OrderTermsClient {
        maker: params.order.data.maker,
        requested_mint: params.payment.utxo.asset,
        requested_amount: params.order.data.requested_amount,
        expiry: params.order.data.expiry,
        taker_identity: params.order.data.taker_identity,
    };
    let blinding_seed = poseidon(&[
        Field::from(u32::from_be_bytes(*b"SWTX")),
        spr_program::from_bytes(&params.order.utxo.utxo.blinding).map_err(err)?,
    ])
    .map_err(err)?;
    let expiry = params.order.data.expiry;
    let prepared = TakeOrderClient {
        private: TakePrivateClient {
            tx_context: TransactionOptions {
                blinding_seed: Some(spr_program::to_bytes(&blinding_seed)),
                output_tree_id: Some(params.payment.tree_id),
            },
            order: params.order.utxo,
            terms,
            taker_input: params.payment,
            maker_address: params.maker,
        },
        public: TakePublicClient {
            expiry: params.order.data.expiry,
            first_nullifier: spr_program::from_bytes(&first_nullifier).map_err(err)?,
        },
    }
    .prepare(&sender, params.payer)
    .map_err(err)?;
    let change_blinding = prepared
        .finalized
        .output_utxos()
        .first()
        .ok_or_else(|| anyhow!("missing change output"))?
        .blinding;
    let finalized = prepared.finalized.with_expiry_unix_ts(expiry);
    let private_tx_hash = finalized
        .padding_independent_private_tx_hash()
        .map_err(err)?;
    let viewing_key = taker
        .get_transaction_viewing_key(&finalized.first_nullifier().map_err(err)?)
        .map_err(err)?;
    let spp_inputs = finalized
        .encrypt_with_viewing_key(&viewing_key)
        .map_err(err)?;
    ensure!(
        spp_inputs
            .padding_independent_private_tx_hash()
            .map_err(err)?
            == private_tx_hash,
        "SPP and program inputs disagree"
    );
    Ok(PreparedTake {
        taker: taker_address,
        maker: params.maker.solana_address().map_err(err)?,
        expiry,
        first_nullifier,
        spp_inputs,
        program_inputs: prepared.proof_inputs,
        private_tx_hash,
        change_blinding,
    })
}

pub struct CancelParams {
    pub program_id: Address,
    pub payer: Address,
    pub order: OrderUtxo,
    pub requested_mint: Mint,
}

pub struct PreparedCancel {
    pub maker: Address,
    pub spp_inputs: SppProofInputs,
    pub program_inputs: ProgramProofInputs,
    pub private_tx_hash: [u8; 32],
    pub payout_blinding: [u8; 32],
}

pub fn prepare_cancel(maker: &ShieldedKeypair, params: CancelParams) -> Result<PreparedCancel> {
    let sender = maker.shielded_address().map_err(err)?;
    let maker_address = sender.solana_address().map_err(err)?;
    ensure!(
        params.order.data.maker == *InputRecords::new().address(&sender).map_err(err)?.owner(),
        "actor is not the order maker"
    );
    ensure!(
        params.order.data.requested_mint == *params.requested_mint.asset.as_array(),
        "requested mint does not match order"
    );
    let authority = ProgramOwner::find(
        &[b"zolius_order", maker_address.as_array()],
        &params.program_id,
    );
    ensure!(
        params.order.utxo.utxo.owner == authority.public_key(),
        "order belongs to another program authority"
    );
    ensure!(
        params.order.utxo.nullifier_pubkey == ProgramOwner::nullifier_pubkey().map_err(err)?,
        "wrong program nullifier key"
    );
    let terms = OrderTermsClient {
        maker: params.order.data.maker,
        requested_mint: params.requested_mint,
        requested_amount: params.order.data.requested_amount,
        expiry: params.order.data.expiry,
        taker_identity: params.order.data.taker_identity,
    };
    let prepared = CancelOrderClient {
        private: CancelPrivateClient {
            tx_context: TransactionOptions {
                blinding_seed: None,
                output_tree_id: Some(params.order.utxo.tree_id),
            },
            order: params.order.utxo,
            terms,
        },
        public: CancelPublicClient {
            maker_identity: spr_program::from_bytes(
                &solana_owner_identity(maker_address.as_array()).map_err(err)?,
            )
            .map_err(err)?,
        },
    }
    .prepare(&sender, params.payer)
    .map_err(err)?;
    let payout_blinding = prepared
        .finalized
        .output_utxos()
        .first()
        .ok_or_else(|| anyhow!("missing refund output"))?
        .blinding;
    let private_tx_hash = prepared
        .finalized
        .padding_independent_private_tx_hash()
        .map_err(err)?;
    let viewing_key = maker
        .get_transaction_viewing_key(&prepared.finalized.first_nullifier().map_err(err)?)
        .map_err(err)?;
    let spp_inputs = prepared
        .finalized
        .encrypt_with_viewing_key(&viewing_key)
        .map_err(err)?;
    ensure!(
        spp_inputs
            .padding_independent_private_tx_hash()
            .map_err(err)?
            == private_tx_hash,
        "SPP and program inputs disagree"
    );
    Ok(PreparedCancel {
        maker: maker_address,
        spp_inputs,
        program_inputs: prepared.proof_inputs,
        private_tx_hash,
        payout_blinding,
    })
}
