//! Experimental private-lock circuits. They are not an executable program:
//! an on-chain verifier, timestamp checks and SPP CPI are still required.

use borsh::{BorshDeserialize, BorshSerialize};
use spr_program::{
    circuit::{CheckedTransaction, ConfidentialTransaction, DataUtxo, PublicInputs, TokenUtxos, Utxo, UtxoTrait},
    input, require, require_eq, CircuitError, ClientInputs, Field, ShieldedAddress, TxContext,
    UtxoOwner, UtxoState, ZkProgram,
};

#[input]
#[derive(Default, PartialEq, Eq, BorshSerialize, BorshDeserialize, UtxoState, ClientInputs)]
pub struct LockTerms {
    pub creator: UtxoOwner,
    /// The recipient's registered owner hash, known to the sender.
    pub beneficiary_hash: [u8; 32],
    pub unlock: u64,
    /// 0 means irrevocable; 1 means the creator may cancel before unlock.
    pub cancelable: u64,
}

#[input]
#[derive(ZkProgram)]
pub struct CreateLock {
    pub private: CreateLockPrivate,
    pub public: CreateLockPublic,
}

#[input]
#[derive(ClientInputs)]
pub struct CreateLockPrivate {
    pub tx_context: TxContext,
    pub source: Utxo,
    pub beneficiary_hash: [u8; 32],
    pub amount: u64,
    pub unlock: u64,
    pub cancelable: u64,
}

#[input]
#[derive(PublicInputs)]
pub struct CreateLockPublic {
    pub creator_identity: Field,
    pub escrow_owner: ShieldedAddress,
}

impl CreateLock {
    pub fn execute(&self) -> Result<CheckedTransaction, CircuitError> {
        let p = &self.private;
        require(p.amount != 0);
        require(p.cancelable <= 1);
        let mut source = TokenUtxos::new_mut(core::array::from_ref(&p.source))?;
        require_eq(source.owner().key().identity()?, self.public.creator_identity);
        let mut escrow = DataUtxo::<LockTerms>::new_init(&self.public.escrow_owner)
            .with_asset(&source.asset())?;
        source.transfer(&mut escrow, &p.amount)?;
        escrow.creator = source.owner();
        escrow.beneficiary_hash = p.beneficiary_hash;
        escrow.unlock = p.unlock;
        escrow.cancelable = p.cancelable;
        ConfidentialTransaction::new(&p.tx_context, &self.public)
            .with(source)
            .with(escrow)
            .check()
    }
}

#[input]
#[derive(ZkProgram)]
pub struct ClaimLock {
    pub private: ReleasePrivate,
    pub public: ReleasePublic,
}

#[input]
#[derive(ZkProgram)]
pub struct CancelLock {
    pub private: ReleasePrivate,
    pub public: ReleasePublic,
}

#[input]
#[derive(ClientInputs)]
pub struct ReleasePrivate {
    pub tx_context: TxContext,
    pub escrow: Utxo,
    pub terms: LockTerms,
    /// The claimant supplies their owner preimage; the sender only needs its hash.
    pub beneficiary: UtxoOwner,
}

#[input]
#[derive(PublicInputs)]
pub struct ReleasePublic {
    /// Must be checked against the Clock sysvar by the calling program.
    pub unlock: u64,
    /// Must be derived by the calling program from the transaction signer.
    pub signer_identity: Field,
}

impl ClaimLock {
    pub fn execute(&self) -> Result<CheckedTransaction, CircuitError> {
        let p = &self.private;
        let mut escrow = DataUtxo::new_mut(&p.escrow, &p.terms)?.close();
        require(escrow.amount()? != 0);
        require_eq(escrow.unlock, self.public.unlock);
        let mut beneficiary_hash = Field::zero();
        for byte in escrow.beneficiary_hash.iter() {
            beneficiary_hash = beneficiary_hash * Field::from(256u64) + Field::from(*byte);
        }
        require_eq(p.beneficiary.hash()?, beneficiary_hash);
        require_eq(p.beneficiary.key().identity()?, self.public.signer_identity);
        let mut payout = TokenUtxos::new_init(&p.beneficiary, &escrow.asset());
        escrow.transfer_all(&mut payout)?;
        ConfidentialTransaction::new(&p.tx_context, &self.public)
            .with(escrow)
            .with(payout)
            .check()
    }
}

impl CancelLock {
    pub fn execute(&self) -> Result<CheckedTransaction, CircuitError> {
        let p = &self.private;
        let mut escrow = DataUtxo::new_mut(&p.escrow, &p.terms)?.close();
        require(escrow.amount()? != 0);
        require_eq(escrow.unlock, self.public.unlock);
        require_eq(escrow.cancelable, 1);
        require_eq(escrow.creator.key().identity()?, self.public.signer_identity);
        let mut payout = TokenUtxos::new_init(&escrow.creator, &escrow.asset());
        escrow.transfer_all(&mut payout)?;
        ConfidentialTransaction::new(&p.tx_context, &self.public)
            .with(escrow)
            .with(payout)
            .check()
    }
}
