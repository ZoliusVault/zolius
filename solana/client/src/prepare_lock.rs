//! Prepare a private Lock creation; no network request or signing is done here.
use anyhow::{anyhow, ensure, Result};
use solana_address::Address;
use spr_hasher::primitives::solana_owner_identity;
use spr_interface::instruction::instruction_data::transact::MessageData;
use spr_keypair::{ShieldedAddress, ShieldedKeypair};
use spr_program::{DataUtxo, InputRecords, ProgramOwner, ProgramProofInputs, TransactionOptions};
use spr_transaction::{
    instructions::transact::SppProofInputs, AssetRegistry, ShieldedTransaction, SppProofOutputUtxo,
    WalletUtxo,
};
use zolius_lock_circuits::circuits::{
    CancelLockClient, ClaimLockClient, CreateLockClient, CreateLockPrivateClient,
    CreateLockPublicClient, LockTerms, ReleasePrivateClient, ReleasePublicClient,
};

fn err(error: impl core::fmt::Debug) -> anyhow::Error {
    anyhow!("{error:?}")
}

pub struct CreateParams {
    pub program_id: Address,
    pub payer: Address,
    pub source: WalletUtxo,
    pub beneficiary: ShieldedAddress,
    pub amount: u64,
    pub unlock: u64,
    pub cancelable: bool,
}

/// Contains private proof inputs. Do not log or send them to an untrusted party.
pub struct PreparedCreate {
    pub creator: Address,
    pub viewing_pubkey: [u8; 33],
    pub spp_inputs: SppProofInputs,
    pub program_inputs: ProgramProofInputs,
    pub private_tx_hash: [u8; 32],
    pub lock_output: SppProofOutputUtxo,
    pub change_blinding: [u8; 32],
}

pub fn prepare_create(creator: &ShieldedKeypair, params: CreateParams) -> Result<PreparedCreate> {
    ensure!(
        params.amount != 0 && params.amount <= params.source.utxo.amount,
        "invalid lock amount"
    );
    ensure!(
        params.source.utxo.owner == creator.signing_pubkey(),
        "source does not belong to creator"
    );
    let sender = creator.shielded_address().map_err(err)?;
    let creator_address = sender.solana_address().map_err(err)?;
    let owner_identity = solana_owner_identity(creator_address.as_array()).map_err(err)?;
    let tree_id = params.source.tree_id;
    let beneficiary_hash = params.beneficiary.owner_hash().map_err(err)?;
    let viewing_pubkey = *params.beneficiary.viewing_pubkey.as_bytes();
    let authority = ProgramOwner::find(
        &[b"zolius_lock", creator_address.as_array()],
        &params.program_id,
    );
    let owner = authority
        .address(params.beneficiary.viewing_pubkey)
        .map_err(err)?;
    let prepared = CreateLockClient {
        private: CreateLockPrivateClient {
            tx_context: TransactionOptions {
                blinding_seed: None,
                output_tree_id: Some(tree_id),
            },
            source: params.source,
            beneficiary_hash,
            amount: params.amount,
            unlock: params.unlock,
            cancelable: u64::from(params.cancelable),
        },
        public: CreateLockPublicClient {
            creator_identity: spr_program::from_bytes(&owner_identity).map_err(err)?,
            escrow_owner: owner,
        },
    }
    .prepare(&sender, params.payer)
    .map_err(err)?;
    let outputs = prepared.finalized.output_utxos();
    let change = outputs
        .first()
        .ok_or_else(|| anyhow!("missing change output"))?;
    let lock_output = outputs
        .get(1)
        .ok_or_else(|| anyhow!("missing lock output"))?
        .clone();
    let change_blinding = change.blinding;
    let output_hash = lock_output.hash(tree_id).map_err(err)?;
    let private_tx_hash = prepared
        .finalized
        .padding_independent_private_tx_hash()
        .map_err(err)?;
    let viewing_key = creator
        .get_transaction_viewing_key(&prepared.finalized.first_nullifier().map_err(err)?)
        .map_err(err)?;
    let mut spp_inputs = prepared
        .finalized
        .encrypt_with_viewing_key(&viewing_key)
        .map_err(err)?;
    let mut data = Vec::with_capacity(64);
    data.extend_from_slice(&output_hash);
    data.extend_from_slice(creator_address.as_array());
    spp_inputs.external_data.messages.push(MessageData {
        view_tag: params.beneficiary.confidential_view_tag().map_err(err)?,
        data,
    });
    ensure!(
        spp_inputs
            .padding_independent_private_tx_hash()
            .map_err(err)?
            == private_tx_hash,
        "SPP and program inputs disagree"
    );
    Ok(PreparedCreate {
        creator: creator_address,
        viewing_pubkey,
        spp_inputs,
        program_inputs: prepared.proof_inputs,
        private_tx_hash,
        lock_output,
        change_blinding,
    })
}

pub type LockUtxo = DataUtxo<LockTerms>;

/// Recover a beneficiary's open locks from indexed transactions. The caller
/// must supply complete relevant history including transactions that spend locks.
pub fn open_locks(
    program_id: Address,
    creator: Address,
    beneficiary: &ShieldedKeypair,
    transactions: &[ShieldedTransaction],
    assets: &AssetRegistry,
) -> Result<Vec<LockUtxo>> {
    let owner = ProgramOwner::find(&[b"zolius_lock", creator.as_array()], &program_id);
    let beneficiary_hash = beneficiary
        .shielded_address()
        .map_err(err)?
        .owner_hash()
        .map_err(err)?;
    let locks = owner
        .decrypt_data_utxos::<LockTerms>(&beneficiary.viewing_key, transactions, assets)
        .map_err(err)?;
    Ok(locks
        .into_iter()
        .filter(|lock| lock.data.beneficiary_hash == beneficiary_hash)
        .collect())
}

/// Convert a confirmed output into a spendable input. The caller must provide
/// its actual tree and leaf location as reported by the indexer.
pub fn lock_input(
    program_id: Address,
    creator: Address,
    output: &SppProofOutputUtxo,
    tree_id: u16,
    leaf_index: u64,
) -> Result<LockUtxo> {
    let owner = ProgramOwner::find(&[b"zolius_lock", creator.as_array()], &program_id);
    LockUtxo::try_from(owner.input(output, tree_id, leaf_index).map_err(err)?).map_err(err)
}

#[derive(Clone, Copy)]
pub enum ReleaseAction {
    Claim,
    Cancel,
}

pub struct ReleaseParams {
    pub program_id: Address,
    pub creator: Address,
    pub payer: Address,
    pub escrow: LockUtxo,
    pub action: ReleaseAction,
}

/// Contains private proof inputs. The program enforces the time boundary.
pub struct PreparedRelease {
    pub actor: Address,
    pub creator: Address,
    pub unlock: u64,
    pub action: ReleaseAction,
    pub spp_inputs: SppProofInputs,
    pub program_inputs: ProgramProofInputs,
    pub private_tx_hash: [u8; 32],
    pub payout_blinding: [u8; 32],
}

pub fn prepare_release(actor: &ShieldedKeypair, params: ReleaseParams) -> Result<PreparedRelease> {
    let sender = actor.shielded_address().map_err(err)?;
    let actor_address = sender.solana_address().map_err(err)?;
    let owner = *InputRecords::new().address(&sender).map_err(err)?.owner();
    let authority = ProgramOwner::find(
        &[b"zolius_lock", params.creator.as_array()],
        &params.program_id,
    );
    ensure!(
        params.escrow.utxo.utxo.owner == authority.public_key(),
        "lock belongs to another program authority"
    );
    ensure!(
        params.escrow.utxo.nullifier_pubkey == ProgramOwner::nullifier_pubkey().map_err(err)?,
        "wrong program nullifier key"
    );
    let creator_identity = solana_owner_identity(params.creator.as_array()).map_err(err)?;
    ensure!(
        spr_program::to_bytes(&params.escrow.data.creator.key().identity().map_err(err)?)
            == creator_identity,
        "creator does not match committed terms"
    );
    match params.action {
        ReleaseAction::Claim => ensure!(
            spr_program::to_bytes(&owner.hash().map_err(err)?)
                == params.escrow.data.beneficiary_hash,
            "actor is not the beneficiary"
        ),
        ReleaseAction::Cancel => {
            ensure!(
                params.escrow.data.creator == owner,
                "actor is not the creator"
            );
            ensure!(params.escrow.data.cancelable == 1, "lock is irrevocable");
        }
    }
    let unlock = params.escrow.data.unlock;
    let tree_id = params.escrow.utxo.tree_id;
    let actor_identity = solana_owner_identity(actor_address.as_array()).map_err(err)?;
    let private = ReleasePrivateClient {
        tx_context: TransactionOptions {
            blinding_seed: None,
            output_tree_id: Some(tree_id),
        },
        escrow: params.escrow.utxo,
        terms: params.escrow.data.into(),
        beneficiary: owner,
    };
    let public = ReleasePublicClient {
        unlock,
        signer_identity: spr_program::from_bytes(&actor_identity).map_err(err)?,
    };
    let prepared = match params.action {
        ReleaseAction::Claim => ClaimLockClient { private, public }.prepare(&sender, params.payer),
        ReleaseAction::Cancel => {
            CancelLockClient { private, public }.prepare(&sender, params.payer)
        }
    }
    .map_err(err)?;
    let payout_blinding = prepared
        .finalized
        .output_utxos()
        .first()
        .ok_or_else(|| anyhow!("missing payout"))?
        .blinding;
    let private_tx_hash = prepared
        .finalized
        .padding_independent_private_tx_hash()
        .map_err(err)?;
    let viewing_key = actor
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
    Ok(PreparedRelease {
        actor: actor_address,
        creator: params.creator,
        unlock,
        action: params.action,
        spp_inputs,
        program_inputs: prepared.proof_inputs,
        private_tx_hash,
        payout_blinding,
    })
}
