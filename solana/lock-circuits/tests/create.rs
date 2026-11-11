use spr_program::{circuit::Utxo, checked, Field, ShieldedAddress, TxContext, UtxoOwner};
use zolius_lock_circuits::circuits::{CreateLock, CreateLockPrivate, CreateLockPublic};

fn create(amount: u64, cancelable: u64) -> CreateLock {
    let owner = UtxoOwner::default();
    let mut source = Utxo::default();
    source.owner = owner;
    source.asset = [7; 32];
    source.amount = 10;
    source.meta.nullifier = Field::from(1u64);
    CreateLock {
        private: CreateLockPrivate {
            tx_context: TxContext { blinding_seed: Field::from(5u64), output_tree_id: 1, uses_output_tree_id: true },
            source,
            beneficiary_hash: [1; 32],
            amount,
            unlock: 100,
            cancelable,
        },
        public: CreateLockPublic {
            creator_identity: owner.key().identity().unwrap(),
            escrow_owner: ShieldedAddress::default(),
        },
    }
}

#[test]
fn creation_rejects_zero_amount_and_invalid_cancel_flag() {
    assert!(checked(|| create(0, 0).execute()).is_err());
    assert!(checked(|| create(1, 2).execute()).is_err());
}

#[test]
fn creation_rejects_a_different_signer_identity() {
    let mut input = create(1, 1);
    input.public.creator_identity = Field::from(42u64);
    assert!(checked(|| input.execute()).is_err());
}

#[test]
fn valid_creation_builds_a_confidential_transaction() {
    assert!(checked(|| create(1, 1).execute()).is_ok());
}

#[cfg(feature = "onchain")]
#[test]
#[ignore = "requires generated development proof artifacts"]
fn create_proof_matches_generated_verifier() {
    use spr_program::{proof::compressed_proof, to_bytes, ProgramProofInputs};
    use zolius_lock_circuits::verifier::create_lock;
    let input = create(1, 1);
    let transaction = checked(|| input.execute()).unwrap();
    let proof_inputs = ProgramProofInputs::new(&input, *transaction.public_hash());
    let dir = std::env::var("ZOLIUS_LOCK_ZK_DIR").expect("set ZOLIUS_LOCK_ZK_DIR");
    let circuit_dir = std::path::Path::new(&dir).join("create_lock");
    let circuit = xark::prover::circuit_at(&circuit_dir);
    let proven = circuit.prove(proof_inputs).expect("generate proof");
    let proof = compressed_proof(&proven.proof).unwrap();
    let private_tx_hash = to_bytes(transaction.private_tx_hash());
    let mut public_inputs = create_lock::PublicInputs {
        creator_identity: to_bytes(&input.public.creator_identity),
        escrow_owner: to_bytes(&input.public.escrow_owner.hash().unwrap()),
    };
    create_lock::Verifier { proof: &proof, public_inputs, private_tx_hash: &private_tx_hash, transfers: &[] }.verify().expect("verify generated proof");
    public_inputs = create_lock::PublicInputs { creator_identity: [42; 32], escrow_owner: to_bytes(&input.public.escrow_owner.hash().unwrap()) };
    assert!(create_lock::Verifier { proof: &proof, public_inputs, private_tx_hash: &private_tx_hash, transfers: &[] }.verify().is_err());
}
