#![cfg(feature = "localnet")]
use anyhow::{anyhow, ensure, Result};
use solana_address::Address;
use solana_keypair::{read_keypair_file, Keypair};
use solana_signer::Signer;
use spr_client::{IndexerRpcConfig, ProofDataSource, ProverClient, Rpc, SolanaRpc, SprClient, SprIndexer};
use spr_keypair::ShieldedKeypair;
use spr_program::{instruction::{AssetDeposit, Deposit, DepositAsset}, ProgramOwner, ProgramProofInputs};
use spr_transaction::{decrypt_spendable, AssetRegistry, SOL_MINT};
use std::str::FromStr;
use zolius_client::{build_instruction, Action, Context};
use zolius_client::prepare_lock::{open_locks, prepare_create, prepare_release, CreateParams, ReleaseAction, ReleaseParams};

fn proof(name: &str, input: ProgramProofInputs) -> Result<spr_program::CompressedProof> {
    let dir = std::path::PathBuf::from(std::env::var("ZOLIUS_LOCK_ZK_DIR")?).join(name);
    let proof = xark::prover::circuit_at(&dir).prove(input).map_err(|e| anyhow!("{e:?}"))?;
    spr_program::proof::compressed_proof(&proof.proof).map_err(|e| anyhow!("{e:?}"))
}

#[test]
#[ignore = "requires isolated localnet and publicly reproducible test keys"]
fn deposit_create_and_claim_lock() -> Result<()> {
    let rpc = std::env::var("ZOLIUS_LOCALNET_RPC")?;
    let indexer = std::env::var("ZOLIUS_LOCALNET_INDEXER")?;
    let prover = std::env::var("ZOLIUS_LOCALNET_PROVER")?;
    for url in [&rpc, &indexer, &prover] { ensure!(url.starts_with("http://127.0.0.1:"), "localnet test only"); }
    let keyfile = std::env::var("ZOLIUS_TEST_PAYER")?;
    let payer = read_keypair_file(keyfile).map_err(|e| anyhow!("{e}"))?;
    let creator = ShieldedKeypair::from_keypair(&payer)?;
    let recipient = ShieldedKeypair::from_keypair(&Keypair::new())?;
    let client = SprClient::new(SolanaRpc::new(rpc), SprIndexer::new(&indexer), ProverClient::new(prover)).with_proof_data_source(ProofDataSource::Prover);
    let tree = spr_interface::pda::tree(0);
    let program_id = Address::from_str("AJok8ztWjxcbeFDLAWRmY11fCvp8mJJpbrvpUs3UmoZP")?;
    let payer_address = payer.pubkey();
    let sender = creator.shielded_address()?;
    let assets = AssetRegistry::default();
    let deposit = Deposit { tree, depositor: payer_address, deposits: vec![AssetDeposit { asset: DepositAsset::Sol, view_tag: sender.confidential_view_tag()?, owner: sender.owner_hash()?, amount: 10_000_000, memo: None }] }.instruction()?;
    let sig = client.create_and_send_transaction(&[deposit], payer_address, &[&payer], client.compute_budget())?;
    let slot = client.get_signature_statuses(vec![sig])?.first().and_then(|v| v.as_ref()).ok_or_else(|| anyhow!("deposit status missing"))?.slot;
    let txs = client.get_shielded_transactions_by_signature(sig, Some(IndexerRpcConfig::at_slot(slot)))?.transactions.into_iter().map(|tx| tx.transaction).collect::<Vec<_>>();
    let balances = decrypt_spendable(&creator, &txs, &assets).map_err(|e| anyhow!("{e:?}"))?.balances;
    let input = balances.get_balance(SOL_MINT).and_then(|balance| balance.utxos.first()).ok_or_else(|| anyhow!("deposit not indexed"))?.clone();
    let prepared = prepare_create(&creator, CreateParams { program_id, payer: payer_address, source: input, beneficiary: recipient.shielded_address()?, amount: 4_000_000, unlock: 1, cancelable: true })?;
    let app_proof = proof("create_lock", prepared.program_inputs)?;
    let spp = client.prove_transact(prepared.spp_inputs, None, &creator)?;
    ensure!(spp.private_tx_hash == prepared.private_tx_hash, "SPP proof mismatch");
    let input_trees = vec![tree; spp.tree_contexts.len()];
    let ix = build_instruction(Context { program_id, actor: payer_address, payer: payer_address, input_trees, output_tree: tree, owner_signers: vec![payer_address], spp }, Action::LockCreate { proof: app_proof, viewing_pubkey: prepared.viewing_pubkey }).map_err(|e| anyhow!("{e:?}"))?;
    let sig = client.create_and_send_transaction(&[ix], payer_address, &[&payer], client.compute_budget())?;
    let slot = client.get_signature_statuses(vec![sig])?.first().and_then(|v| v.as_ref()).ok_or_else(|| anyhow!("create status missing"))?.slot;
    let txs = client.get_shielded_transactions_by_signature(sig, Some(IndexerRpcConfig::at_slot(slot)))?.transactions.into_iter().map(|tx| tx.transaction).collect::<Vec<_>>();
    let locks = open_locks(program_id, payer_address, &recipient, &txs, &assets)?;
    let escrow = locks.into_iter().next().ok_or_else(|| anyhow!("beneficiary could not find lock"))?;
    let release = prepare_release(&recipient, ReleaseParams { program_id, creator: payer_address, payer: payer_address, escrow, action: ReleaseAction::Claim })?;
    let app_proof = proof("claim_lock", release.program_inputs)?;
    let spp = client.prove_transact(release.spp_inputs, None, &ProgramOwner::nullifier_key())?;
    ensure!(spp.private_tx_hash == release.private_tx_hash, "SPP proof mismatch");
    let input_trees = vec![tree; spp.tree_contexts.len()];
    let ix = build_instruction(Context { program_id, actor: recipient.pubkey(), payer: payer_address, input_trees, output_tree: tree, owner_signers: vec![], spp }, Action::LockClaim { proof: app_proof, creator: payer_address, unlock: release.unlock }).map_err(|e| anyhow!("{e:?}"))?;
    let sig = client.create_and_send_transaction(&[ix], payer_address, &[&payer, &recipient], client.compute_budget())?;
    let slot = client.get_signature_statuses(vec![sig])?.first().and_then(|v| v.as_ref()).ok_or_else(|| anyhow!("claim status missing"))?.slot;
    let txs = client.get_shielded_transactions_by_signature(sig, Some(IndexerRpcConfig::at_slot(slot)))?.transactions.into_iter().map(|tx| tx.transaction).collect::<Vec<_>>();
    let balances = decrypt_spendable(&recipient, &txs, &assets).map_err(|e| anyhow!("{e:?}"))?.balances;
    assert_eq!(balances.get_balance(SOL_MINT).map(|balance| balance.amount), Some(4_000_000));
    Ok(())
}
