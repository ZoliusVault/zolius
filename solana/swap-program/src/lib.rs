//! In-progress Zolius Swap SPP program; not a deployable release.
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
use zolius_swap_circuits::verifier::{cancel_order, make_order, take_order};
use zolius_wire::{SwapCancel as CancelArgs, SwapMake as MakeArgs, SwapTake as TakeArgs};

pinocchio::address::declare_id!("HQioSDqtsHSz2LzdHZXYShA8Jgi19Sxxh92M2rKVMC7u");
const AUTHORITY_SEED: &[u8] = b"zolius_order";
#[cfg(feature = "bpf-entrypoint")]
pinocchio::entrypoint!(process_instruction);

fn authority(maker: &Address, bump: u8) -> Result<Address, ProgramError> {
    Address::create_program_address(&[AUTHORITY_SEED, maker.as_array(), &[bump]], &ID)
        .map_err(|_| ProgramError::InvalidSeeds)
}

fn invoke_spp(accounts: &[AccountView], bytes: &[u8], maker: &Address, bump: u8) -> ProgramResult {
    let owner = authority(maker, bump)?;
    let signer_pdas = [&owner];
    let spp = SppTransactAccounts::new(accounts, &signer_pdas)
        .map_err(|_| ProgramError::InvalidAccountData)?;
    let bump_bytes = [bump];
    let seeds = [
        Seed::from(AUTHORITY_SEED),
        Seed::from(maker.as_array()),
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
    match tag {
        0 => {
            let args: MakeArgs = wincode::deserialize_from(&mut bytes)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            let tx = TransactIxDataRef::from_bytes(bytes)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            if !tx.interface_transfers.is_empty() { return Err(ProgramError::InvalidInstructionData); }
            let order_hash = tx
                .outputs
                .get(1)
                .ok_or(ProgramError::InvalidInstructionData)?
                .utxo_hash;
            let [marker] = tx.messages.as_slice() else {
                return Err(ProgramError::InvalidInstructionData);
            };
            let (hash, maker) = marker
                .data
                .split_at_checked(32)
                .ok_or(ProgramError::InvalidInstructionData)?;
            if hash != order_hash.as_slice() || maker != signer.as_array() {
                return Err(ProgramError::InvalidInstructionData);
            }
            let pda = authority(&signer, args.bump)?;
            let owner = PdaOwner::new(&pda).map_err(|_| ProgramError::InvalidSeeds)?;
            let order_owner = address_hash(owner.owner_hash(), &args.viewing_pubkey)
                .map_err(|_| ProgramError::InvalidArgument)?;
            let maker_identity = solana_owner_identity(signer.as_array())
                .map_err(|_| ProgramError::InvalidArgument)?;
            make_order::Verifier {
                proof: &args.proof,
                public_inputs: make_order::PublicInputs {
                    maker_identity,
                    order_owner,
                },
                private_tx_hash: tx.private_tx_hash,
                transfers: &[],
            }
            .verify()
            .map_err(|_| ProgramError::InvalidInstructionData)?;
            invoke_spp(accounts.remaining()?, bytes, &signer, args.bump)
        }
        1 => {
            let args: TakeArgs = wincode::deserialize_from(&mut bytes)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            let tx = TransactIxDataRef::from_bytes(bytes)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            if !tx.interface_transfers.is_empty() { return Err(ProgramError::InvalidInstructionData); }
            let now = u64::try_from(Clock::get()?.unix_timestamp)
                .map_err(|_| ProgramError::InvalidArgument)?;
            if now >= tx.expiry_unix_ts {
                return Err(ProgramError::InvalidArgument);
            }
            let first_nullifier = tx
                .inputs
                .first()
                .ok_or(ProgramError::InvalidInstructionData)?
                .nullifier_hash;
            take_order::Verifier {
                proof: &args.proof,
                public_inputs: take_order::PublicInputs {
                    expiry: tx.expiry_unix_ts,
                    first_nullifier,
                },
                private_tx_hash: tx.private_tx_hash,
                transfers: &[],
            }
            .verify()
            .map_err(|_| ProgramError::InvalidInstructionData)?;
            invoke_spp(
                accounts.remaining()?,
                bytes,
                &Address::new_from_array(args.maker),
                args.bump,
            )
        }
        2 => {
            let args: CancelArgs = wincode::deserialize_from(&mut bytes)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            let tx = TransactIxDataRef::from_bytes(bytes)
                .map_err(|_| ProgramError::InvalidInstructionData)?;
            if !tx.interface_transfers.is_empty() { return Err(ProgramError::InvalidInstructionData); }
            let maker_identity = solana_owner_identity(signer.as_array())
                .map_err(|_| ProgramError::InvalidArgument)?;
            cancel_order::Verifier {
                proof: &args.proof,
                public_inputs: cancel_order::PublicInputs { maker_identity },
                private_tx_hash: tx.private_tx_hash,
                transfers: &[],
            }
            .verify()
            .map_err(|_| ProgramError::InvalidInstructionData)?;
            invoke_spp(accounts.remaining()?, bytes, &signer, args.bump)
        }
        _ => Err(ProgramError::InvalidInstructionData),
    }
}
