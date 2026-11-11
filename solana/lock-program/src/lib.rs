//! Zolius Lock's in-progress SPP program. Do not deploy until its generated
//! verifier, program ID, client builders, and end-to-end tests are finalized.
#[cfg(not(feature = "dev-test-keys"))]
compile_error!("Only test verifier keys are being generated; enable dev-test-keys for development builds only.");
use pinocchio::{
    address::address_eq,
    cpi::{Seed, Signer},
    error::ProgramError,
    sysvars::{clock::Clock, Sysvar},
    AccountView, Address, ProgramResult,
};
use spr_account_checks::AccountIterator;
use spr_hasher::primitives::solana_owner_identity;
use spr_interface::instruction::instruction_data::transact::TransactIxDataRef;
use spr_program::{cpi::SppTransactAccounts, program::PdaOwner, verifier::address_hash};
use zolius_lock_circuits::verifier::{cancel_lock, claim_lock, create_lock};
use zolius_wire::{LockCreate as CreateArgs, LockRelease as ReleaseArgs};

pinocchio::address::declare_id!("AJok8ztWjxcbeFDLAWRmY11fCvp8mJJpbrvpUs3UmoZP");
const AUTHORITY_SEED: &[u8] = b"zolius_lock";

#[cfg(feature = "bpf-entrypoint")]
pinocchio::entrypoint!(process_instruction);

fn authority(creator: &Address, bump: u8) -> Result<Address, ProgramError> {
    Address::create_program_address(&[AUTHORITY_SEED, creator.as_array(), &[bump]], &ID)
        .map_err(|_| ProgramError::InvalidSeeds)
}

fn invoke_spp(
    accounts: &[AccountView],
    bytes: &[u8],
    creator: &Address,
    bump: u8,
) -> ProgramResult {
    let owner = authority(creator, bump)?;
    let signer_pdas = [&owner];
    let spp = SppTransactAccounts::new(accounts, &signer_pdas)
        .map_err(|_| ProgramError::InvalidAccountData)?;
    let bump_bytes = [bump];
    let seeds = [
        Seed::from(AUTHORITY_SEED),
        Seed::from(creator.as_array()),
        Seed::from(&bump_bytes),
    ];
    spp.invoke::<16>(bytes, &[Signer::from(&seeds)])
}

pub fn process_instruction(
    program_id: &Address,
    accounts: &mut [AccountView],
    data: &[u8],
) -> ProgramResult {
    if !address_eq(program_id, &ID) {
        return Err(ProgramError::IncorrectProgramId);
    }
    let (&tag, mut bytes) = data
        .split_first()
        .ok_or(ProgramError::InvalidInstructionData)?;
    let mut accounts = AccountIterator::new(accounts);
    let signer = *accounts.next_signer("signer")?.address();
    let identity =
        solana_owner_identity(signer.as_array()).map_err(|_| ProgramError::InvalidArgument)?;
    match tag {
        0 => {
            let args: CreateArgs = wincode::deserialize_from(&mut bytes)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            let transaction = TransactIxDataRef::from_bytes(bytes)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            if !transaction.interface_transfers.is_empty() { return Err(ProgramError::InvalidInstructionData); }
            let lock_hash = transaction
                .outputs
                .get(1)
                .ok_or(ProgramError::InvalidInstructionData)?
                .utxo_hash;
            let [marker] = transaction.messages.as_slice() else {
                return Err(ProgramError::InvalidInstructionData);
            };
            let (hash, creator) = marker
                .data
                .split_at_checked(32)
                .ok_or(ProgramError::InvalidInstructionData)?;
            if hash != lock_hash.as_slice() || creator != signer.as_array() {
                return Err(ProgramError::InvalidInstructionData);
            }
            let pda = authority(&signer, args.bump)?;
            let owner = PdaOwner::new(&pda).map_err(|_| ProgramError::InvalidSeeds)?;
            let escrow_owner = address_hash(owner.owner_hash(), &args.viewing_pubkey)
                .map_err(|_| ProgramError::InvalidArgument)?;
            create_lock::Verifier {
                proof: &args.proof,
                public_inputs: create_lock::PublicInputs {
                    creator_identity: identity,
                    escrow_owner,
                },
                private_tx_hash: transaction.private_tx_hash,
                transfers: &[],
            }
            .verify()
            .map_err(|_| ProgramError::InvalidInstructionData)?;
            invoke_spp(accounts.remaining()?, bytes, &signer, args.bump)
        }
        1 | 2 => {
            let args: ReleaseArgs = wincode::deserialize_from(&mut bytes)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            let transaction = TransactIxDataRef::from_bytes(bytes)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            if !transaction.interface_transfers.is_empty() { return Err(ProgramError::InvalidInstructionData); }
            let now = u64::try_from(Clock::get()?.unix_timestamp)
                .map_err(|_| ProgramError::InvalidArgument)?;
            let creator = Address::new_from_array(args.creator);
            if tag == 1 {
                if now < args.unlock {
                    return Err(ProgramError::InvalidArgument);
                }
                claim_lock::Verifier {
                    proof: &args.proof,
                    public_inputs: claim_lock::PublicInputs {
                        unlock: args.unlock,
                        signer_identity: identity,
                    },
                    private_tx_hash: transaction.private_tx_hash,
                    transfers: &[],
                }
                .verify()
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            } else {
                if now >= args.unlock {
                    return Err(ProgramError::InvalidArgument);
                }
                cancel_lock::Verifier {
                    proof: &args.proof,
                    public_inputs: cancel_lock::PublicInputs {
                        unlock: args.unlock,
                        signer_identity: identity,
                    },
                    private_tx_hash: transaction.private_tx_hash,
                    transfers: &[],
                }
                .verify()
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            }
            invoke_spp(accounts.remaining()?, bytes, &creator, args.bump)
        }
        _ => Err(ProgramError::InvalidInstructionData),
    }
}
