//! Builds Solana instructions from an already-proved Privacy Rings transaction.
//! Proof construction, encryption, UTXO discovery and transaction signing are
//! separate steps and are not implemented by this crate.
pub mod prepare_lock;
pub mod prepare_swap;
use solana_address::Address;
use solana_instruction::{AccountMeta, Instruction};
use spr_interface::instruction::instruction_data::transact::TransactIxData;
use spr_program::{instruction::Transact, CompressedProof};
use zolius_wire::{LockCreate, LockRelease, SwapCancel, SwapMake, SwapTake};

pub struct Context {
    pub program_id: Address,
    pub actor: Address,
    pub payer: Address,
    pub input_trees: Vec<Address>,
    pub output_tree: Address,
    pub owner_signers: Vec<Address>,
    pub spp: TransactIxData,
}

pub enum Action {
    LockCreate {
        proof: CompressedProof,
        viewing_pubkey: [u8; 33],
    },
    LockClaim {
        proof: CompressedProof,
        creator: Address,
        unlock: u64,
    },
    LockCancel {
        proof: CompressedProof,
        unlock: u64,
    },
    SwapMake {
        proof: CompressedProof,
        viewing_pubkey: [u8; 33],
    },
    SwapTake {
        proof: CompressedProof,
        maker: Address,
    },
    SwapCancel {
        proof: CompressedProof,
    },
}

#[derive(Debug, PartialEq, Eq)]
pub enum Error {
    TreeCount,
    InvalidTreeIndex,
    InterfaceTransfers,
    Marker,
    OwnerSigner,
    Serialization,
}

fn marker_matches(spp: &TransactIxData, actor: &Address) -> bool {
    let Some(output) = spp.outputs.get(1) else {
        return false;
    };
    let [marker] = spp.messages.as_slice() else {
        return false;
    };
    let Some((hash, key)) = marker.data.split_at_checked(32) else {
        return false;
    };
    hash == output.utxo_hash && key == actor.as_array()
}

/// Combines the application proof with the SPP instruction and derives its CPI
/// accounts. The client must independently construct and verify both proofs.
pub fn build_instruction(ctx: Context, action: Action) -> Result<Instruction, Error> {
    if ctx.input_trees.len() != ctx.spp.tree_contexts.len() {
        return Err(Error::TreeCount);
    }
    if ctx
        .spp
        .inputs
        .iter()
        .any(|input| usize::from(input.tree_index) >= ctx.input_trees.len())
    {
        return Err(Error::InvalidTreeIndex);
    }
    if !ctx.spp.interface_transfers.is_empty() {
        return Err(Error::InterfaceTransfers);
    }
    let needs_marker = matches!(action, Action::LockCreate { .. } | Action::SwapMake { .. });
    if needs_marker && !marker_matches(&ctx.spp, &ctx.actor) {
        return Err(Error::Marker);
    }
    let needs_owner = matches!(
        action,
        Action::LockCreate { .. } | Action::SwapMake { .. } | Action::SwapTake { .. }
    );
    if needs_owner && !ctx.owner_signers.contains(&ctx.actor) {
        return Err(Error::OwnerSigner);
    }
    let (seed, creator) = match &action {
        Action::LockCreate { .. } | Action::LockCancel { .. } => {
            (b"zolius_lock".as_slice(), ctx.actor)
        }
        Action::LockClaim { creator, .. } => (b"zolius_lock".as_slice(), *creator),
        Action::SwapMake { .. } | Action::SwapCancel { .. } => {
            (b"zolius_order".as_slice(), ctx.actor)
        }
        Action::SwapTake { maker, .. } => (b"zolius_order".as_slice(), *maker),
    };
    let (pda, bump) = Address::find_program_address(&[seed, creator.as_array()], &ctx.program_id);
    if ctx.owner_signers.contains(&pda) {
        return Err(Error::OwnerSigner);
    }
    let spp_bytes = ctx.spp.serialize().map_err(|_| Error::Serialization)?;
    let signer_start = 4 + ctx.input_trees.len() + ctx.spp.inputs.len();
    let data = match action {
        Action::LockCreate {
            proof,
            viewing_pubkey,
        } => zolius_wire::encode_lock_create(
            &LockCreate {
                proof,
                viewing_pubkey,
                bump,
            },
            &spp_bytes,
        ),
        Action::LockClaim {
            proof,
            creator,
            unlock,
        } => zolius_wire::encode_lock_release(
            1,
            &LockRelease {
                proof,
                creator: *creator.as_array(),
                unlock,
                bump,
            },
            &spp_bytes,
        ),
        Action::LockCancel { proof, unlock } => zolius_wire::encode_lock_release(
            2,
            &LockRelease {
                proof,
                creator: *ctx.actor.as_array(),
                unlock,
                bump,
            },
            &spp_bytes,
        ),
        Action::SwapMake {
            proof,
            viewing_pubkey,
        } => zolius_wire::encode_swap_make(
            &SwapMake {
                proof,
                viewing_pubkey,
                bump,
            },
            &spp_bytes,
        ),
        Action::SwapTake { proof, maker } => zolius_wire::encode_swap_take(
            &SwapTake {
                proof,
                maker: *maker.as_array(),
                bump,
            },
            &spp_bytes,
        ),
        Action::SwapCancel { proof } => {
            zolius_wire::encode_swap_cancel(&SwapCancel { proof, bump }, &spp_bytes)
        }
    }
    .map_err(|_| Error::Serialization)?;
    let transact = Transact {
        payer: ctx.payer,
        input_trees: ctx.input_trees,
        output_tree: ctx.output_tree,
        owner_signers: ctx.owner_signers,
        interface_transfer_accounts: vec![],
        data: ctx.spp,
    };
    let mut accounts = vec![AccountMeta::new_readonly(ctx.actor, true)];
    let mut cpi_accounts = transact.cpi_accounts(&[pda]);
    // SPP commits owner signer order in first-occurrence input order. A Swap
    // take spends the PDA-owned order first, then the taker's wallet input;
    // the PDA signer must therefore precede the external signer in its CPI
    // account list. The SDK helper normally appends program PDAs after users.
    if matches!(&action, Action::SwapTake { .. }) {
        if let Some(position) = cpi_accounts
            .iter()
            .enumerate()
            .skip(signer_start)
            .find_map(|(index, account)| (account.pubkey == pda).then_some(index))
        {
            let pda_account = cpi_accounts.remove(position);
            cpi_accounts.insert(signer_start, pda_account);
        }
    }
    accounts.extend(cpi_accounts);
    Ok(Instruction {
        program_id: ctx.program_id,
        accounts,
        data,
    })
}
