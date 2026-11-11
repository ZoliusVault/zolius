# Zolius Solana implementation notes

Research snapshot: 2026-11-11. No programs have been deployed from this directory.

## Reference versions

- Helius Privacy Rings examples: `helius-labs/privacy-ring-examples`, commit `7222208b7776beea7c267be09412934670752c19`.
- The examples' Xark workspaces pin Privacy Rings SDK revision `ca4cf4f6f0c83c0b225342e4bc6f16b3da83eb08`. Treat this as an example compatibility pin, not a claim that it is the latest release.
- Helius documents mainnet Privacy Program ID `ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW`. Verify program IDs separately for each cluster and immediately before deployment.

## Program requirements

The reference swap uses a maker-specific PDA as owner of a confidential order UTXO. Its make, take and cancel instructions verify rule-specific proofs bound to the Privacy Rings transaction hash and invoke the Privacy Program. The example only refunds after expiry. Zolius requires its own order and client implementation, including its chosen cancel semantics. Check which fields are public at every instruction, not only the default transfer visibility table.

The reference timelock uses a creator-specific PDA and binds the private UTXO, unlock time and creator identity in a proof. Its withdraw returns funds to the creator. Zolius Lock must additionally bind the beneficiary, cancelability and both release paths to the committed terms and Privacy Rings transaction. A timestamp check alone does not enforce the confidential payout recipient.

The reference programs contain public-seed test verification keys and explicitly say proofs can be forged. They are unsuitable for funds. These examples are not Zolius programs or deployment artifacts.

## Privacy and integration

Default Ring transfer hides asset, amount and memo, while sender and recipient remain public. Public deposits and withdrawals expose asset and amount. The official prover currently requires transaction plaintext and nullifier keys inside its attested enclave; local proving is described as coming later. A proxy must not log these inputs, and its actual data flow and trust model must be described accurately.

The fixed-message wallet signature is derivation material for the viewing and nullifier keys and must be protected as a secret. A shared viewing key cannot be made unknown to a recipient who already received it merely by disabling an app link or setting an expiry.

## Verification completed and still needed

- Built both SBF programs with local development verifiers. Native tests and generated-verifier Groth16 proofs cover all six application actions.
- Isolated localnet exercised Lock deposit/create/CPI/index/claim and Swap deposit/make/CPI/index/recover/take/CPI against the pinned Helius Privacy Rings program.
- Still needed for launch: non-test proving/verifying artifacts, deployment with cluster-specific program IDs and upgrade authority, and devnet configuration. Swap cancel CPI and exact expiry-boundary behavior have not been exercised end to end.
- These localnet runs do not establish deployed behavior. `zolana zk compile --test` keys are public and forgeable; they cannot protect funds.

Sources: https://www.helius.dev/docs/privacy/sdk ; https://www.helius.dev/docs/privacy/addresses ; https://www.helius.dev/docs/privacy/integration/wallet ; https://github.com/helius-labs/privacy-ring-examples
