use spr_program::{
    checked, poseidon, to_bytes, Field, ShieldedAddress, TxContext, UtxoOwner,
    circuit::{DataHash, Utxo},
};
use zolius_swap_circuits::circuits::{
    CancelOrder, CancelPrivate, CancelPublic, MakeOrder, MakePrivate, MakePublic,
    OrderTerms, TakeOrder, TakePrivate, TakePublic,
};

fn context(seed: Field) -> TxContext {
    TxContext { blinding_seed: seed, output_tree_id: 1, uses_output_tree_id: true }
}

fn make(amount: u64, price: u64) -> MakeOrder {
    let owner = UtxoOwner::default();
    let mut source = Utxo::default();
    source.owner = owner;
    source.asset = [7; 32];
    source.amount = 10;
    source.meta.nullifier = Field::from(1u64);
    MakeOrder {
        private: MakePrivate { tx_context: context(Field::from(5u64)), source, source_amount: amount, requested_mint: [8; 32], requested_amount: price, expiry: 100, taker_identity: [0; 32] },
        public: MakePublic { maker_identity: owner.key().identity().unwrap(), order_owner: ShieldedAddress::default() },
    }
}

fn order() -> (Utxo, OrderTerms) {
    let owner = UtxoOwner::default();
    let terms = OrderTerms { maker: owner, requested_mint: [8; 32], requested_amount: 4, expiry: 100, taker_identity: [0; 32] };
    let mut order = Utxo::default();
    order.owner = owner;
    order.asset = [7; 32];
    order.amount = 10;
    order.blinding = Field::from(9u64);
    order.meta.nullifier = Field::from(1u64);
    order.data_hash = poseidon(&[Field::from(u32::from_be_bytes(*b"DATA")), terms.hash().unwrap()]).unwrap();
    (order, terms)
}

fn take() -> TakeOrder {
    let (order, terms) = order();
    let mut taker_input = Utxo::default();
    taker_input.owner = UtxoOwner::default();
    taker_input.asset = [8; 32];
    taker_input.amount = 4;
    taker_input.meta.nullifier = Field::from(2u64);
    let seed = poseidon(&[Field::from(u32::from_be_bytes(*b"SWTX")), order.blinding]).unwrap();
    TakeOrder {
        private: TakePrivate { tx_context: context(seed), order, terms, taker_input, maker_address: ShieldedAddress::default() },
        public: TakePublic { expiry: 100, first_nullifier: Field::from(1u64) },
    }
}

#[test]
fn make_requires_positive_amounts_and_maker_identity() {
    assert!(checked(|| make(4, 3).execute()).is_ok());
    assert!(checked(|| make(0, 3).execute()).is_err());
    assert!(checked(|| make(4, 0).execute()).is_err());
    let mut input = make(4, 3);
    input.public.maker_identity = Field::from(42u64);
    assert!(checked(|| input.execute()).is_err());
}

#[test]
fn take_binds_price_asset_expiry_and_blinding() {
    assert!(checked(|| take().execute()).is_ok());
    let mut input = take(); input.private.taker_input.asset = [9; 32];
    assert!(checked(|| input.execute()).is_err());
    let mut input = take(); input.private.taker_input.amount = 3;
    assert!(checked(|| input.execute()).is_err());
    let mut input = take(); input.public.expiry += 1;
    assert!(checked(|| input.execute()).is_err());
    let mut input = take(); input.private.tx_context.blinding_seed = Field::from(7u64);
    assert!(checked(|| input.execute()).is_err());
}

#[test]
fn take_respects_designated_taker() {
    let mut allowed = take();
    allowed.private.terms.taker_identity = to_bytes(&allowed.private.taker_input.owner.key().identity().unwrap());
    allowed.private.order.data_hash = poseidon(&[Field::from(u32::from_be_bytes(*b"DATA")), allowed.private.terms.hash().unwrap()]).unwrap();
    assert!(checked(|| allowed.execute()).is_ok());
    let mut rejected = take();
    rejected.private.terms.taker_identity = to_bytes(&Field::from(42u64));
    rejected.private.order.data_hash = poseidon(&[Field::from(u32::from_be_bytes(*b"DATA")), rejected.private.terms.hash().unwrap()]).unwrap();
    assert!(checked(|| rejected.execute()).is_err());
}

#[test]
fn cancel_requires_maker_identity() {
    let (locked, terms) = order();
    let identity = terms.maker.key().identity().unwrap();
    let input = CancelOrder { private: CancelPrivate { tx_context: context(Field::from(5u64)), order: locked, terms }, public: CancelPublic { maker_identity: identity } };
    assert!(checked(|| input.execute()).is_ok());
    let (order, terms) = order();
    let input = CancelOrder { private: CancelPrivate { tx_context: context(Field::from(5u64)), order, terms }, public: CancelPublic { maker_identity: Field::from(42u64) } };
    assert!(checked(|| input.execute()).is_err());
}

#[cfg(feature = "onchain")]
fn prove(name: &str, inputs: spr_program::ProgramProofInputs) -> spr_program::CompressedProof {
    let path = std::path::PathBuf::from(std::env::var("ZOLIUS_SWAP_ZK_DIR").unwrap()).join(name);
    let result = xark::prover::circuit_at(&path).prove(inputs).unwrap();
    spr_program::proof::compressed_proof(&result.proof).unwrap()
}

#[cfg(feature = "onchain")]
#[test]
#[ignore = "requires generated development proof artifacts"]
fn make_proof_matches_generated_verifier() {
    use spr_program::ProgramProofInputs;
    use zolius_swap_circuits::verifier::make_order;
    let input = make(4, 3);
    let transaction = checked(|| input.execute()).unwrap();
    let proof = prove("make_order", ProgramProofInputs::new(&input, *transaction.public_hash()));
    let hash = to_bytes(transaction.private_tx_hash());
    let owner = to_bytes(&input.public.order_owner.hash().unwrap());
    let maker = to_bytes(&input.public.maker_identity);
    make_order::Verifier { proof: &proof, public_inputs: make_order::PublicInputs { maker_identity: maker, order_owner: owner }, private_tx_hash: &hash, transfers: &[] }.verify().unwrap();
    assert!(make_order::Verifier { proof: &proof, public_inputs: make_order::PublicInputs { maker_identity: [42; 32], order_owner: owner }, private_tx_hash: &hash, transfers: &[] }.verify().is_err());
}

#[cfg(feature = "onchain")]
#[test]
#[ignore = "requires generated development proof artifacts"]
fn take_proof_matches_generated_verifier() {
    use spr_program::ProgramProofInputs;
    use zolius_swap_circuits::verifier::take_order;
    let input = take();
    let transaction = checked(|| input.execute()).unwrap();
    let proof = prove("take_order", ProgramProofInputs::new(&input, *transaction.public_hash()));
    let hash = to_bytes(transaction.private_tx_hash());
    let nullifier = to_bytes(&input.public.first_nullifier);
    take_order::Verifier { proof: &proof, public_inputs: take_order::PublicInputs { expiry: 100, first_nullifier: nullifier }, private_tx_hash: &hash, transfers: &[] }.verify().unwrap();
    assert!(take_order::Verifier { proof: &proof, public_inputs: take_order::PublicInputs { expiry: 101, first_nullifier: nullifier }, private_tx_hash: &hash, transfers: &[] }.verify().is_err());
}

#[cfg(feature = "onchain")]
#[test]
#[ignore = "requires generated development proof artifacts"]
fn cancel_proof_matches_generated_verifier() {
    use spr_program::ProgramProofInputs;
    use zolius_swap_circuits::verifier::cancel_order;
    let (order, terms) = order();
    let maker_identity = terms.maker.key().identity().unwrap();
    let input = CancelOrder { private: CancelPrivate { tx_context: context(Field::from(5u64)), order, terms }, public: CancelPublic { maker_identity } };
    let transaction = checked(|| input.execute()).unwrap();
    let proof = prove("cancel_order", ProgramProofInputs::new(&input, *transaction.public_hash()));
    let hash = to_bytes(transaction.private_tx_hash());
    let maker = to_bytes(&input.public.maker_identity);
    cancel_order::Verifier { proof: &proof, public_inputs: cancel_order::PublicInputs { maker_identity: maker }, private_tx_hash: &hash, transfers: &[] }.verify().unwrap();
    assert!(cancel_order::Verifier { proof: &proof, public_inputs: cancel_order::PublicInputs { maker_identity: [42; 32] }, private_tx_hash: &hash, transfers: &[] }.verify().is_err());
}
