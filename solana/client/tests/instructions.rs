use solana_address::Address;
use spr_interface::instruction::instruction_data::transact::{
    MessageData, OwnerTag, TransactOutput,
};
use spr_interface::instruction::{CircuitId, TransactIxData, TransactProof};
use spr_program::CompressedProof;
use zolius_client::{build_instruction, Action, Context, Error};

fn proof() -> CompressedProof {
    CompressedProof {
        a: [1; 32],
        b: [2; 64],
        c: [3; 32],
    }
}
fn spp() -> TransactIxData {
    TransactIxData {
        expiry_unix_ts: 100,
        tx_viewing_pk: [0; 33],
        salt: [0; 16],
        interface_transfers: vec![],
        data_hash: None,
        ring_data_hash: None,
        outputs: vec![],
        messages: vec![],
        private_tx_hash: [0; 32],
        circuit: CircuitId::ConfidentialSigner(1, 2, 0),
        proof: TransactProof::zeroed(),
        inputs: vec![],
        tree_contexts: vec![],
    }
}
fn context() -> Context {
    Context {
        program_id: Address::new_from_array([7; 32]),
        actor: Address::new_from_array([8; 32]),
        payer: Address::new_from_array([9; 32]),
        input_trees: vec![],
        output_tree: Address::new_from_array([10; 32]),
        owner_signers: vec![],
        spp: spp(),
    }
}

#[test]
fn cancellation_builds_actor_and_privacy_program_accounts() {
    let ctx = context();
    let actor = ctx.actor;
    let program = ctx.program_id;
    let instruction = build_instruction(ctx, Action::SwapCancel { proof: proof() }).unwrap();
    assert_eq!(instruction.program_id, program);
    assert_eq!(instruction.accounts[0].pubkey, actor);
    assert!(instruction.accounts[0].is_signer);
    assert_eq!(instruction.data[0], 2);
    assert!(instruction.accounts.len() >= 6);
}

#[test]
fn malformed_context_is_rejected_before_instruction() {
    let mut ctx = context();
    ctx.input_trees.push(Address::new_from_array([2; 32]));
    assert_eq!(
        build_instruction(ctx, Action::SwapCancel { proof: proof() }).unwrap_err(),
        Error::TreeCount
    );
    let ctx = context();
    assert_eq!(
        build_instruction(
            ctx,
            Action::SwapMake {
                proof: proof(),
                viewing_pubkey: [0; 33]
            }
        )
        .unwrap_err(),
        Error::Marker
    );
}

#[test]
fn order_creation_requires_marker_and_source_owner_signer() {
    let mut ctx = context();
    let actor = ctx.actor;
    let output = TransactOutput {
        utxo_hash: [4; 32],
        owner_tag: OwnerTag::Inline([0; 32]),
        data: None,
    };
    ctx.spp.outputs = vec![output.clone(), output];
    let mut marker = vec![4; 32];
    marker.extend_from_slice(actor.as_array());
    ctx.spp.messages = vec![MessageData {
        view_tag: [0; 32],
        data: marker,
    }];
    assert_eq!(
        build_instruction(
            ctx,
            Action::SwapMake {
                proof: proof(),
                viewing_pubkey: [0; 33]
            }
        )
        .unwrap_err(),
        Error::OwnerSigner
    );
    let mut ctx = context();
    let actor = ctx.actor;
    let output = TransactOutput {
        utxo_hash: [4; 32],
        owner_tag: OwnerTag::Inline([0; 32]),
        data: None,
    };
    ctx.spp.outputs = vec![output.clone(), output];
    let mut marker = vec![4; 32];
    marker.extend_from_slice(actor.as_array());
    ctx.spp.messages = vec![MessageData {
        view_tag: [0; 32],
        data: marker,
    }];
    ctx.owner_signers.push(actor);
    let instruction = build_instruction(
        ctx,
        Action::SwapMake {
            proof: proof(),
            viewing_pubkey: [0; 33],
        },
    )
    .unwrap();
    assert_eq!(instruction.data[0], 0);
    assert!(
        instruction
            .accounts
            .iter()
            .filter(|account| account.pubkey == actor && account.is_signer)
            .count()
            >= 2
    );
}

#[test]
fn order_take_orders_program_pda_before_taker_signer() {
    let mut ctx = context();
    let actor = ctx.actor;
    let maker = Address::new_from_array([11; 32]);
    ctx.owner_signers.push(actor);
    let pda =
        Address::find_program_address(&[b"zolius_order", maker.as_array()], &ctx.program_id).0;
    let instruction = build_instruction(
        ctx,
        Action::SwapTake {
            proof: proof(),
            maker,
        },
    )
    .unwrap();
    // Outer actor is account 0. SPP's four fixed accounts follow, then owner
    // signers; the order PDA must precede the taker's wallet signer.
    assert_eq!(instruction.accounts[5].pubkey, pda);
    assert_eq!(instruction.accounts[6].pubkey, actor);
    assert!(!instruction.accounts[5].is_signer);
    assert!(instruction.accounts[6].is_signer);
}
