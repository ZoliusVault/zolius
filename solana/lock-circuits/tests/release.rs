use spr_program::{
    checked, poseidon, to_bytes, Field, TxContext, UtxoOwner,
    circuit::{DataHash, Utxo},
};
use zolius_lock_circuits::circuits::{
    CancelLock, ClaimLock, LockTerms, ReleasePrivate, ReleasePublic,
};

fn inputs(cancelable: u64) -> (ReleasePrivate, ReleasePublic) {
    let owner = UtxoOwner::default();
    let terms = LockTerms {
        creator: owner,
        beneficiary_hash: to_bytes(&owner.hash().unwrap()),
        unlock: 100,
        cancelable,
    };
    let mut escrow = Utxo::default();
    escrow.owner = owner;
    escrow.asset = [7; 32];
    escrow.amount = 10;
    escrow.meta.nullifier = Field::from(1u64);
    escrow.data_hash = poseidon(&[Field::from(u32::from_be_bytes(*b"DATA")), terms.hash().unwrap()]).unwrap();
    (
        ReleasePrivate {
            tx_context: TxContext { blinding_seed: Field::from(5u64), output_tree_id: 1, uses_output_tree_id: true },
            escrow,
            terms,
            beneficiary: owner,
        },
        ReleasePublic { unlock: 100, signer_identity: owner.key().identity().unwrap() },
    )
}

#[test]
fn claim_binds_the_committed_beneficiary_unlock_and_signer() {
    let (private, public) = inputs(1);
    assert!(checked(|| ClaimLock { private, public }.execute()).is_ok());
    let (private, mut public) = inputs(1);
    public.signer_identity = Field::from(42u64);
    assert!(checked(|| ClaimLock { private, public }.execute()).is_err());
    let (private, mut public) = inputs(1);
    public.unlock += 1;
    assert!(checked(|| ClaimLock { private, public }.execute()).is_err());
    let (mut private, public) = inputs(1);
    private.terms.beneficiary_hash = [42; 32];
    assert!(checked(|| ClaimLock { private, public }.execute()).is_err());
    let (mut private, public) = inputs(1);
    private.beneficiary = UtxoOwner::new(*private.beneficiary.key(), Field::from(2u64));
    assert!(checked(|| ClaimLock { private, public }.execute()).is_err());
}

#[test]
fn cancellation_requires_committed_permission_and_creator() {
    let (private, public) = inputs(1);
    assert!(checked(|| CancelLock { private, public }.execute()).is_ok());
    let (private, public) = inputs(0);
    assert!(checked(|| CancelLock { private, public }.execute()).is_err());
    let (private, mut public) = inputs(1);
    public.signer_identity = Field::from(42u64);
    assert!(checked(|| CancelLock { private, public }.execute()).is_err());
}

#[cfg(feature = "onchain")]
#[test]
#[ignore = "requires generated development proof artifacts"]
fn claim_proof_matches_generated_verifier() {
    use spr_program::{proof::compressed_proof, ProgramProofInputs};
    use zolius_lock_circuits::verifier::claim_lock;
    let (private, public) = inputs(1);
    let input = ClaimLock { private, public };
    let transaction = checked(|| input.execute()).unwrap();
    let proof_inputs = ProgramProofInputs::new(&input, *transaction.public_hash());
    let dir = std::path::PathBuf::from(std::env::var("ZOLIUS_LOCK_ZK_DIR").unwrap()).join("claim_lock");
    let proven = xark::prover::circuit_at(&dir).prove(proof_inputs).unwrap();
    let proof = compressed_proof(&proven.proof).unwrap();
    let hash = to_bytes(transaction.private_tx_hash());
    let identity = to_bytes(&input.public.signer_identity);
    claim_lock::Verifier { proof: &proof, public_inputs: claim_lock::PublicInputs { unlock: 100, signer_identity: identity }, private_tx_hash: &hash, transfers: &[] }.verify().unwrap();
    assert!(claim_lock::Verifier { proof: &proof, public_inputs: claim_lock::PublicInputs { unlock: 101, signer_identity: identity }, private_tx_hash: &hash, transfers: &[] }.verify().is_err());
}

#[cfg(feature = "onchain")]
#[test]
#[ignore = "requires generated development proof artifacts"]
fn cancel_proof_matches_generated_verifier() {
    use spr_program::{proof::compressed_proof, ProgramProofInputs};
    use zolius_lock_circuits::verifier::cancel_lock;
    let (private, public) = inputs(1);
    let input = CancelLock { private, public };
    let transaction = checked(|| input.execute()).unwrap();
    let proof_inputs = ProgramProofInputs::new(&input, *transaction.public_hash());
    let dir = std::path::PathBuf::from(std::env::var("ZOLIUS_LOCK_ZK_DIR").unwrap()).join("cancel_lock");
    let proven = xark::prover::circuit_at(&dir).prove(proof_inputs).unwrap();
    let proof = compressed_proof(&proven.proof).unwrap();
    let hash = to_bytes(transaction.private_tx_hash());
    let identity = to_bytes(&input.public.signer_identity);
    cancel_lock::Verifier { proof: &proof, public_inputs: cancel_lock::PublicInputs { unlock: 100, signer_identity: identity }, private_tx_hash: &hash, transfers: &[] }.verify().unwrap();
    assert!(cancel_lock::Verifier { proof: &proof, public_inputs: cancel_lock::PublicInputs { unlock: 101, signer_identity: identity }, private_tx_hash: &hash, transfers: &[] }.verify().is_err());
}
