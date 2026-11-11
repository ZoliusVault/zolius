use solana_address::Address;
use solana_keypair::Keypair;
use spr_keypair::ShieldedKeypair;
use spr_transaction::{utxo::Utxo, Data, Mint, WalletUtxo};
use zolius_client::prepare_swap::{
    open_orders, order_input, prepare_cancel, prepare_make, prepare_take, CancelParams, MakeParams,
    TakeParams,
};

fn key(seed: u8) -> ShieldedKeypair {
    ShieldedKeypair::from_keypair(&Keypair::new_from_array([seed; 32])).unwrap()
}
fn wallet(owner: &ShieldedKeypair, amount: u64, mint: Mint) -> WalletUtxo {
    let utxo = Utxo {
        owner: owner.signing_pubkey(),
        asset: mint,
        amount,
        blinding: [5; 32],
        ring_program_id: None,
        data: Data::default(),
    };
    let nullifier_pubkey = owner.nullifier_key.pubkey().unwrap();
    let utxo_hash = utxo.hash(&nullifier_pubkey, &[0; 32], &[0; 32], 1).unwrap();
    let nullifier = owner
        .nullifier_key
        .nullifier(&utxo_hash, &utxo.blinding)
        .unwrap();
    WalletUtxo {
        utxo,
        nullifier_pubkey,
        utxo_hash,
        nullifier,
        tx_viewing_key: None,
        data_hash: None,
        ring_data_hash: None,
        tree_id: 1,
        leaf_index: 0,
        latest_tree_id: None,
        slot: 0,
        tx_signature: Default::default(),
        slot_index: 0,
    }
}

#[test]
fn creates_order_prepares_take_and_cancel() {
    let maker = key(4);
    let taker = key(5);
    let stranger = key(6);
    let maker_address = maker.shielded_address().unwrap();
    let payer = maker_address.solana_address().unwrap();
    let program_id = Address::new_from_array([7; 32]);
    let source_mint = Mint::new(Address::new_from_array([3; 32]), 2);
    let requested_mint = Mint::new(Address::new_from_array([4; 32]), 3);
    let made = prepare_make(
        &maker,
        MakeParams {
            program_id,
            payer,
            source: wallet(&maker, 10, source_mint),
            amount: 6,
            requested_mint,
            requested_amount: 4,
            expiry: 100,
            taker: taker.shielded_address().unwrap(),
            restrict_taker: true,
        },
    )
    .unwrap();
    assert_eq!(made.order_output.amount, 6);
    assert_eq!(made.spp_inputs.external_data.messages.len(), 1);
    let order = order_input(program_id, payer, &made.order_output, 1, 0).unwrap();
    let taken = prepare_take(
        &taker,
        TakeParams {
            program_id,
            payer,
            maker: maker_address,
            order: order.clone(),
            payment: wallet(&taker, 4, requested_mint),
        },
    )
    .unwrap();
    assert_eq!(taken.spp_inputs.external_data.expiry_unix_ts, 100);
    assert_eq!(
        taken.private_tx_hash,
        taken
            .spp_inputs
            .padding_independent_private_tx_hash()
            .unwrap()
    );
    assert!(prepare_take(
        &stranger,
        TakeParams {
            program_id,
            payer,
            maker: maker_address,
            order: order.clone(),
            payment: wallet(&stranger, 4, requested_mint)
        }
    )
    .is_err());
    assert!(prepare_cancel(
        &maker,
        CancelParams {
            program_id,
            payer,
            order: order.clone(),
            requested_mint
        }
    )
    .is_ok());
    assert!(prepare_cancel(
        &stranger,
        CancelParams {
            program_id,
            payer,
            order,
            requested_mint
        }
    )
    .is_err());
}

#[test]
fn taker_recovers_designated_order_from_indexed_history() {
    use spr_keypair::X25519Pubkey;
    use spr_transaction::{AssetRegistry, OutputContext, OutputSlot, ShieldedTransaction};
    let maker = key(24);
    let taker = key(25);
    let stranger = key(26);
    let maker_address = maker.shielded_address().unwrap().solana_address().unwrap();
    let taker_address = taker.shielded_address().unwrap();
    let program_id = Address::new_from_array([27; 32]);
    let mint = Mint::new(Address::new_from_array([28; 32]), 2);
    let made = prepare_make(
        &maker,
        MakeParams {
            program_id,
            payer: maker_address,
            source: wallet(&maker, 10, mint),
            amount: 6,
            requested_mint: mint,
            requested_amount: 4,
            expiry: 100,
            taker: taker_address,
            restrict_taker: true,
        },
    )
    .unwrap();
    let external = &made.spp_inputs.external_data;
    let output_slots = external
        .outputs
        .iter()
        .zip(&external.resolved_owner_tags)
        .enumerate()
        .map(|(index, (output, tag))| OutputSlot {
            view_tag: *tag,
            output_context: OutputContext {
                hash: output.utxo_hash,
                tree_id: 1,
                leaf_index: index as u64,
            },
            payload: output.data.clone().unwrap(),
        })
        .collect();
    let transaction = ShieldedTransaction {
        slot: 1,
        tx_signature: Default::default(),
        event_index: Some(0),
        tx_viewing_pk: Some(X25519Pubkey::from_bytes(external.tx_viewing_pk).unwrap()),
        salt: Some(external.salt),
        output_slots,
        messages: external.messages.clone(),
        nullifiers: vec![],
        proofless: false,
        ring_config: None,
        ring_program_id: None,
    };
    let assets = AssetRegistry::new([(2, Address::new_from_array([28; 32]))]).unwrap();
    let found = open_orders(program_id, &taker, &[transaction.clone()], &assets).unwrap();
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].utxo.utxo.amount, 6);
    assert!(open_orders(program_id, &stranger, &[transaction], &assets)
        .unwrap()
        .is_empty());
}

#[cfg(feature = "test-prover")]
#[test]
#[ignore = "requires generated development proof artifacts"]
fn prepared_make_take_and_cancel_prove_against_generated_verifiers() {
    use zolius_swap_circuits::verifier::{cancel_order, make_order as make_vk, take_order};
    let maker = key(14);
    let taker = key(15);
    let maker_address = maker.shielded_address().unwrap();
    let taker_address = taker.shielded_address().unwrap();
    let payer = maker_address.solana_address().unwrap();
    let program_id = Address::new_from_array([17; 32]);
    let requested_mint = Mint::new(Address::new_from_array([19; 32]), 3);
    let made = prepare_make(
        &maker,
        MakeParams {
            program_id,
            payer,
            source: wallet(&maker, 10, Mint::new(Address::new_from_array([18; 32]), 2)),
            amount: 6,
            requested_mint,
            requested_amount: 4,
            expiry: 100,
            taker: taker_address.clone(),
            restrict_taker: true,
        },
    )
    .unwrap();
    let base = std::path::PathBuf::from(std::env::var("ZOLIUS_SWAP_ZK_DIR").unwrap());
    let prove = |name: &str, inputs| {
        let proof = xark::prover::circuit_at(&base.join(name))
            .prove(inputs)
            .unwrap();
        spr_program::proof::compressed_proof(&proof.proof).unwrap()
    };
    let proof = prove("make_order", made.program_inputs);
    let order_owner =
        spr_program::ProgramOwner::find(&[b"zolius_order", payer.as_array()], &program_id)
            .address(taker_address.viewing_pubkey)
            .unwrap();
    let maker_identity = spr_hasher::primitives::solana_owner_identity(payer.as_array()).unwrap();
    make_vk::Verifier {
        proof: &proof,
        public_inputs: make_vk::PublicInputs {
            maker_identity,
            order_owner: order_owner.address_hash().unwrap(),
        },
        private_tx_hash: &made.private_tx_hash,
        transfers: &[],
    }
    .verify()
    .unwrap();

    let order = order_input(program_id, payer, &made.order_output, 1, 0).unwrap();
    let taken = prepare_take(
        &taker,
        TakeParams {
            program_id,
            payer,
            maker: maker_address,
            order: order.clone(),
            payment: wallet(&taker, 4, requested_mint),
        },
    )
    .unwrap();
    let proof = prove("take_order", taken.program_inputs);
    take_order::Verifier {
        proof: &proof,
        public_inputs: take_order::PublicInputs {
            expiry: 100,
            first_nullifier: taken.first_nullifier,
        },
        private_tx_hash: &taken.private_tx_hash,
        transfers: &[],
    }
    .verify()
    .unwrap();

    let cancelled = prepare_cancel(
        &maker,
        CancelParams {
            program_id,
            payer,
            order,
            requested_mint,
        },
    )
    .unwrap();
    let proof = prove("cancel_order", cancelled.program_inputs);
    cancel_order::Verifier {
        proof: &proof,
        public_inputs: cancel_order::PublicInputs { maker_identity },
        private_tx_hash: &cancelled.private_tx_hash,
        transfers: &[],
    }
    .verify()
    .unwrap();
}
