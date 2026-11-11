use solana_address::Address;
use solana_keypair::Keypair;
use spr_keypair::ShieldedKeypair;
use spr_transaction::{utxo::Utxo, Data, Mint, WalletUtxo};
use zolius_client::prepare_lock::{lock_input, open_locks, prepare_create, prepare_release, CreateParams, ReleaseAction, ReleaseParams};

fn key(seed: u8) -> ShieldedKeypair {
    ShieldedKeypair::from_keypair(&Keypair::new_from_array([seed; 32])).unwrap()
}

fn wallet(owner: &ShieldedKeypair, amount: u64) -> WalletUtxo {
    let utxo = Utxo { owner: owner.signing_pubkey(), asset: Mint::new(Address::new_from_array([3; 32]), 2), amount, blinding: [5; 32], ring_program_id: None, data: Data::default() };
    let nullifier_pubkey = owner.nullifier_key.pubkey().unwrap();
    let utxo_hash = utxo.hash(&nullifier_pubkey, &[0; 32], &[0; 32], 1).unwrap();
    let nullifier = owner.nullifier_key.nullifier(&utxo_hash, &utxo.blinding).unwrap();
    WalletUtxo { utxo, nullifier_pubkey, utxo_hash, nullifier, tx_viewing_key: None, data_hash: None, ring_data_hash: None, tree_id: 1, leaf_index: 0, latest_tree_id: None, slot: 0, tx_signature: Default::default(), slot_index: 0 }
}

#[test]
fn creates_output_and_recipient_marker() {
    let creator = key(1); let recipient = key(2);
    let address = creator.shielded_address().unwrap().solana_address().unwrap();
    let params = CreateParams { program_id: Address::new_from_array([7; 32]), payer: address, source: wallet(&creator, 10), beneficiary: recipient.shielded_address().unwrap(), amount: 4, unlock: 100, cancelable: true };
    let prepared = prepare_create(&creator, params).unwrap();
    assert_eq!(prepared.lock_output.amount, 4);
    assert_eq!(prepared.spp_inputs.external_data.messages.len(), 1);
    assert_eq!(&prepared.spp_inputs.external_data.messages[0].data[32..], address.as_array());
    assert_eq!(prepared.private_tx_hash, prepared.spp_inputs.padding_independent_private_tx_hash().unwrap());
}

#[test]
fn rejects_source_owned_by_another_wallet() {
    let creator = key(1); let other = key(3); let recipient = key(2);
    let address = creator.shielded_address().unwrap().solana_address().unwrap();
    let params = CreateParams { program_id: Address::new_from_array([7; 32]), payer: address, source: wallet(&other, 10), beneficiary: recipient.shielded_address().unwrap(), amount: 4, unlock: 100, cancelable: true };
    assert!(prepare_create(&creator, params).is_err());
}

#[test]
fn prepares_claim_and_optional_cancellation() {
    let creator = key(1); let recipient = key(2); let stranger = key(3);
    let actor = creator.shielded_address().unwrap().solana_address().unwrap();
    let program_id = Address::new_from_array([7; 32]);
    let params = CreateParams { program_id, payer: actor, source: wallet(&creator, 10), beneficiary: recipient.shielded_address().unwrap(), amount: 4, unlock: 100, cancelable: true };
    let created = prepare_create(&creator, params).unwrap();
    let input = lock_input(program_id, actor, &created.lock_output, 1, 0).unwrap();
    let claim = prepare_release(&recipient, ReleaseParams { program_id, creator: actor, payer: actor, escrow: input.clone(), action: ReleaseAction::Claim }).unwrap();
    assert_eq!(claim.unlock, 100);
    assert_eq!(claim.private_tx_hash, claim.spp_inputs.padding_independent_private_tx_hash().unwrap());
    assert!(prepare_release(&creator, ReleaseParams { program_id, creator: actor, payer: actor, escrow: input.clone(), action: ReleaseAction::Cancel }).is_ok());
    assert!(prepare_release(&stranger, ReleaseParams { program_id, creator: actor, payer: actor, escrow: input.clone(), action: ReleaseAction::Claim }).is_err());
    assert!(prepare_release(&recipient, ReleaseParams { program_id, creator: actor, payer: actor, escrow: input, action: ReleaseAction::Cancel }).is_err());
}

#[test]
fn beneficiary_can_recover_encrypted_lock_from_transaction() {
    use spr_keypair::X25519Pubkey;
    use spr_transaction::{AssetRegistry, OutputContext, OutputSlot, ShieldedTransaction};
    let creator = key(1); let recipient = key(2); let stranger = key(3);
    let actor = creator.shielded_address().unwrap().solana_address().unwrap();
    let program_id = Address::new_from_array([7; 32]);
    let created = prepare_create(&creator, CreateParams { program_id, payer: actor, source: wallet(&creator, 10), beneficiary: recipient.shielded_address().unwrap(), amount: 4, unlock: 100, cancelable: true }).unwrap();
    let external = &created.spp_inputs.external_data;
    let output_slots = external.outputs.iter().zip(&external.resolved_owner_tags).enumerate().map(|(index, (output, tag))| OutputSlot {
        view_tag: *tag,
        output_context: OutputContext { hash: output.utxo_hash, tree_id: 1, leaf_index: index as u64 },
        payload: output.data.clone().unwrap(),
    }).collect();
    let transaction = ShieldedTransaction { slot: 1, tx_signature: Default::default(), event_index: Some(0), tx_viewing_pk: Some(X25519Pubkey::from_bytes(external.tx_viewing_pk).unwrap()), salt: Some(external.salt), output_slots, messages: external.messages.clone(), nullifiers: vec![], proofless: false, ring_config: None, ring_program_id: None };
    let assets = AssetRegistry::new([(2, Address::new_from_array([3; 32]))]).unwrap();
    let found = open_locks(program_id, actor, &recipient, &[transaction.clone()], &assets).unwrap();
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].utxo.utxo.amount, 4);
    assert!(open_locks(program_id, actor, &stranger, &[transaction], &assets).unwrap().is_empty());
}

#[cfg(feature = "test-prover")]
#[test]
#[ignore = "requires generated development proof artifacts"]
fn prepared_transaction_proves_against_lock_verifier() {
    use zolius_lock_circuits::verifier::create_lock;
    let creator = key(1); let recipient = key(2);
    let recipient_address = recipient.shielded_address().unwrap();
    let actor = creator.shielded_address().unwrap().solana_address().unwrap();
    let program_id = Address::new_from_array([7; 32]);
    let params = CreateParams { program_id, payer: actor, source: wallet(&creator, 10), beneficiary: recipient_address, amount: 4, unlock: 100, cancelable: true };
    let prepared = prepare_create(&creator, params).unwrap();
    let path = std::path::PathBuf::from(std::env::var("ZOLIUS_LOCK_ZK_DIR").unwrap()).join("create_lock");
    let result = xark::prover::circuit_at(&path).prove(prepared.program_inputs).unwrap();
    let proof = spr_program::proof::compressed_proof(&result.proof).unwrap();
    let owner = spr_program::ProgramOwner::find(&[b"zolius_lock", actor.as_array()], &program_id).address(recipient_address.viewing_pubkey).unwrap();
    let public_inputs = create_lock::PublicInputs { creator_identity: spr_hasher::primitives::solana_owner_identity(actor.as_array()).unwrap(), escrow_owner: owner.address_hash().unwrap() };
    create_lock::Verifier { proof: &proof, public_inputs, private_tx_hash: &prepared.private_tx_hash, transfers: &[] }.verify().unwrap();
}

#[cfg(feature = "test-prover")]
#[test]
#[ignore = "requires generated development proof artifacts"]
fn prepared_claim_and_cancel_prove_against_lock_verifiers() {
    use zolius_lock_circuits::verifier::{cancel_lock, claim_lock};
    let creator = key(1); let recipient = key(2);
    let actor = creator.shielded_address().unwrap().solana_address().unwrap();
    let recipient_actor = recipient.shielded_address().unwrap().solana_address().unwrap();
    let program_id = Address::new_from_array([7; 32]);
    let created = prepare_create(&creator, CreateParams { program_id, payer: actor, source: wallet(&creator, 10), beneficiary: recipient.shielded_address().unwrap(), amount: 4, unlock: 100, cancelable: true }).unwrap();
    let input = lock_input(program_id, actor, &created.lock_output, 1, 0).unwrap();
    let claim = prepare_release(&recipient, ReleaseParams { program_id, creator: actor, payer: actor, escrow: input.clone(), action: ReleaseAction::Claim }).unwrap();
    let cancel = prepare_release(&creator, ReleaseParams { program_id, creator: actor, payer: actor, escrow: input, action: ReleaseAction::Cancel }).unwrap();
    let base = std::path::PathBuf::from(std::env::var("ZOLIUS_LOCK_ZK_DIR").unwrap());
    let proof = xark::prover::circuit_at(&base.join("claim_lock")).prove(claim.program_inputs).unwrap();
    let proof = spr_program::proof::compressed_proof(&proof.proof).unwrap();
    let identity = spr_hasher::primitives::solana_owner_identity(recipient_actor.as_array()).unwrap();
    claim_lock::Verifier { proof: &proof, public_inputs: claim_lock::PublicInputs { unlock: 100, signer_identity: identity }, private_tx_hash: &claim.private_tx_hash, transfers: &[] }.verify().unwrap();
    let proof = xark::prover::circuit_at(&base.join("cancel_lock")).prove(cancel.program_inputs).unwrap();
    let proof = spr_program::proof::compressed_proof(&proof.proof).unwrap();
    let identity = spr_hasher::primitives::solana_owner_identity(actor.as_array()).unwrap();
    cancel_lock::Verifier { proof: &proof, public_inputs: cancel_lock::PublicInputs { unlock: 100, signer_identity: identity }, private_tx_hash: &cancel.private_tx_hash, transfers: &[] }.verify().unwrap();
}
