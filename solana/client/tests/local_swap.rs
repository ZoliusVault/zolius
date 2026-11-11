#![cfg(feature = "localnet")]
use anyhow::{anyhow, ensure, Context as _, Result};
use solana_address::Address;
use solana_keypair::{read_keypair_file, Keypair};
use solana_signer::Signer;
use spr_client::{
    ClientError, IndexerRpcConfig, ProofAuthority, ProofDataSource, ProverClient, Rpc, SolanaRpc,
    SprClient, SprIndexer, TransferInput,
};
use spr_keypair::ShieldedKeypair;
use spr_program::{
    instruction::{AssetDeposit, Deposit, DepositAsset},
    ProgramOwner, ProgramProofInputs,
};
use spr_transaction::{decrypt_spendable, AssetRegistry, SOL_MINT};
use std::{
    str::FromStr,
    time::{SystemTime, UNIX_EPOCH},
};
use zolius_client::prepare_swap::{
    open_orders, prepare_make, prepare_take, MakeParams, TakeParams,
};
use zolius_client::{build_instruction, Action, Context};

fn app_proof(name: &str, inputs: ProgramProofInputs) -> Result<spr_program::CompressedProof> {
    let path = std::path::PathBuf::from(std::env::var("ZOLIUS_SWAP_ZK_DIR")?).join(name);
    let proof = xark::prover::circuit_at(&path)
        .prove(inputs)
        .map_err(|e| anyhow!("{e:?}"))?;
    spr_program::proof::compressed_proof(&proof.proof).map_err(|e| anyhow!("{e:?}"))
}

struct BothOwners<'a>(&'a dyn ProofAuthority, &'a dyn ProofAuthority);
impl ProofAuthority for BothOwners<'_> {
    fn complete_inputs(
        &self,
        inputs: &mut [TransferInput],
    ) -> std::result::Result<(), ClientError> {
        self.0
            .complete_inputs(inputs)
            .or_else(|_| self.1.complete_inputs(inputs))
    }
}

#[test]
#[ignore = "requires isolated localnet and publicly reproducible test keys"]
fn maker_posts_and_taker_fills_private_order() -> Result<()> {
    let rpc_url = std::env::var("ZOLIUS_LOCALNET_RPC")?;
    let indexer_url = std::env::var("ZOLIUS_LOCALNET_INDEXER")?;
    let prover_url = std::env::var("ZOLIUS_LOCALNET_PROVER")?;
    for url in [&rpc_url, &indexer_url, &prover_url] {
        ensure!(url.starts_with("http://127.0.0.1:"), "localnet test only");
    }
    let payer =
        read_keypair_file(std::env::var("ZOLIUS_TEST_PAYER")?).map_err(|e| anyhow!("{e}"))?;
    let maker = ShieldedKeypair::from_keypair(&payer)?;
    let taker_key = Keypair::new();
    let mut rpc = SolanaRpc::new(rpc_url.clone());
    rpc.airdrop(&taker_key.pubkey(), 20_000_000)?;
    let taker = ShieldedKeypair::from_keypair(&taker_key)?;
    let client = SprClient::new(
        rpc,
        SprIndexer::new(&indexer_url),
        ProverClient::new(prover_url),
    )
    .with_proof_data_source(ProofDataSource::Prover);
    let tree = spr_interface::pda::tree(0);
    let program_id = Address::from_str("HQioSDqtsHSz2LzdHZXYShA8Jgi19Sxxh92M2rKVMC7u")?;
    let payer_address = payer.pubkey();
    let maker_address = maker.shielded_address()?;
    let taker_address = taker.shielded_address()?;
    let assets = AssetRegistry::default();

    let maker_deposit = Deposit {
        tree,
        depositor: payer_address,
        deposits: vec![AssetDeposit {
            asset: DepositAsset::Sol,
            view_tag: maker_address.confidential_view_tag()?,
            owner: maker_address.owner_hash()?,
            amount: 8_000_000,
            memo: None,
        }],
    }
    .instruction()?;
    let signature = client
        .create_and_send_transaction(
            &[maker_deposit],
            payer_address,
            &[&payer],
            client.compute_budget(),
        )
        .context("submit maker deposit")?;
    let slot = client
        .get_signature_statuses(vec![signature])?
        .first()
        .and_then(|v| v.as_ref())
        .ok_or_else(|| anyhow!("maker deposit status missing"))?
        .slot;
    let history = client
        .get_shielded_transactions_by_signature(signature, Some(IndexerRpcConfig::at_slot(slot)))?
        .transactions
        .into_iter()
        .map(|tx| tx.transaction)
        .collect::<Vec<_>>();
    let maker_funds = decrypt_spendable(&maker, &history, &assets)
        .map_err(|e| anyhow!("{e:?}"))
        .context("decrypt maker deposit")?
        .balances
        .get_balance(SOL_MINT)
        .and_then(|b| b.utxos.first())
        .ok_or_else(|| anyhow!("maker deposit not indexed"))?
        .clone();

    let taker_deposit = Deposit {
        tree,
        depositor: taker_key.pubkey(),
        deposits: vec![AssetDeposit {
            asset: DepositAsset::Sol,
            view_tag: taker_address.confidential_view_tag()?,
            owner: taker_address.owner_hash()?,
            amount: 2_000_000,
            memo: None,
        }],
    }
    .instruction()?;
    let signature = client
        .create_and_send_transaction(
            &[taker_deposit],
            payer_address,
            &[&payer, &taker_key],
            client.compute_budget(),
        )
        .context("submit taker deposit")?;
    let slot = client
        .get_signature_statuses(vec![signature])?
        .first()
        .and_then(|v| v.as_ref())
        .ok_or_else(|| anyhow!("taker deposit status missing"))?
        .slot;
    let history = client
        .get_shielded_transactions_by_signature(signature, Some(IndexerRpcConfig::at_slot(slot)))?
        .transactions
        .into_iter()
        .map(|tx| tx.transaction)
        .collect::<Vec<_>>();
    let taker_funds = decrypt_spendable(&taker, &history, &assets)
        .map_err(|e| anyhow!("{e:?}"))
        .context("decrypt taker deposit")?
        .balances
        .get_balance(SOL_MINT)
        .and_then(|b| b.utxos.first())
        .ok_or_else(|| anyhow!("taker deposit not indexed"))?
        .clone();
    ensure!(
        maker_funds.utxo.amount == 8_000_000 && taker_funds.utxo.amount == 2_000_000,
        "local deposits must produce exact test amounts"
    );

    let requested_mint = maker_funds.utxo.asset;
    let made = prepare_make(
        &maker,
        MakeParams {
            program_id,
            payer: payer_address,
            source: maker_funds,
            amount: 3_000_000,
            requested_mint,
            requested_amount: 2_000_000,
            expiry: SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() + 3_600,
            taker: taker_address,
            restrict_taker: true,
        },
    )
    .context("prepare order")?;
    let make_proof = app_proof("make_order", made.program_inputs)?;
    let spp = client.prove_transact(made.spp_inputs, None, &maker)?;
    ensure!(
        spp.private_tx_hash == made.private_tx_hash,
        "make proof hash mismatch"
    );
    let trees = vec![tree; spp.tree_contexts.len()];
    let ix = build_instruction(
        Context {
            program_id,
            actor: payer_address,
            payer: payer_address,
            input_trees: trees,
            output_tree: tree,
            owner_signers: vec![payer_address],
            spp,
        },
        Action::SwapMake {
            proof: make_proof,
            viewing_pubkey: made.viewing_pubkey,
        },
    )
    .map_err(|e| anyhow!("{e:?}"))?;
    let signature = client
        .create_and_send_transaction(&[ix], payer_address, &[&payer], client.compute_budget())
        .context("submit private make instruction")?;
    let slot = client
        .get_signature_statuses(vec![signature])?
        .first()
        .and_then(|v| v.as_ref())
        .ok_or_else(|| anyhow!("make status missing"))?
        .slot;
    let order_history = client
        .get_shielded_transactions_by_signature(signature, Some(IndexerRpcConfig::at_slot(slot)))?
        .transactions
        .into_iter()
        .map(|tx| tx.transaction)
        .collect::<Vec<_>>();
    let orders = open_orders(program_id, &taker, &order_history, &assets)
        .context("recover order from indexer")?;
    let order = orders
        .into_iter()
        .next()
        .ok_or_else(|| anyhow!("taker could not recover maker order"))?;
    ensure!(order.utxo.utxo.amount == 3_000_000, "order amount mismatch");

    let taken = prepare_take(
        &taker,
        TakeParams {
            program_id,
            payer: payer_address,
            maker: maker_address,
            order,
            payment: taker_funds,
        },
    )
    .context("prepare order take")?;
    let take_proof = app_proof("take_order", taken.program_inputs)?;
    let program_nullifier = ProgramOwner::nullifier_key();
    let authority = BothOwners(&program_nullifier, &taker);
    let spp = client.prove_transact(taken.spp_inputs, None, &authority)?;
    ensure!(
        spp.private_tx_hash == taken.private_tx_hash,
        "take proof hash mismatch"
    );
    let trees = vec![tree; spp.tree_contexts.len()];
    let ix = build_instruction(
        Context {
            program_id,
            actor: taker_key.pubkey(),
            payer: payer_address,
            input_trees: trees,
            output_tree: tree,
            owner_signers: vec![taker_key.pubkey()],
            spp,
        },
        Action::SwapTake {
            proof: take_proof,
            maker: payer_address,
        },
    )
    .map_err(|e| anyhow!("{e:?}"))?;
    let signature = client
        .create_and_send_transaction(
            &[ix],
            payer_address,
            &[&payer, &taker_key],
            client.compute_budget(),
        )
        .context("submit private take instruction")?;
    let slot = client
        .get_signature_statuses(vec![signature])?
        .first()
        .and_then(|v| v.as_ref())
        .ok_or_else(|| anyhow!("take status missing"))?
        .slot;
    let take_history = client
        .get_shielded_transactions_by_signature(signature, Some(IndexerRpcConfig::at_slot(slot)))?
        .transactions
        .into_iter()
        .map(|tx| tx.transaction)
        .collect::<Vec<_>>();
    let taker_balance = decrypt_spendable(&taker, &take_history, &assets)
        .map_err(|e| anyhow!("{e:?}"))?
        .balances;
    let maker_balance = decrypt_spendable(&maker, &take_history, &assets)
        .map_err(|e| anyhow!("{e:?}"))?
        .balances;
    assert_eq!(
        taker_balance.get_balance(SOL_MINT).map(|b| b.amount),
        Some(3_000_000)
    );
    assert_eq!(
        maker_balance.get_balance(SOL_MINT).map(|b| b.amount),
        Some(2_000_000)
    );
    Ok(())
}
