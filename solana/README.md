# Zolius Solana programs

Lock and Swap are prepared for Solana Mainnet but are not deployed yet. Production verifier keys are checked into the program source; corresponding proving and verifying artifacts are shipped to the browser. The feature flag remains off until both programs are deployed and verified.

- `lock-circuits`: proposed create, beneficiary claim and optional creator cancellation circuits.
- `lock-program`: proposed on-chain verifier, time checks and Privacy Rings CPI.
- `swap-circuits`: proposed fixed-price OTC make, take and cancel circuits.
- `swap-program`: proposed on-chain verifier, order marker, deadline and Privacy Rings CPI.
- `wire`: shared Rust instruction argument layouts and encoders used by both programs.
- `client`: Rust instruction builder for already-proved SPP transactions and CPI accounts, plus Lock create/claim/cancel and fixed-price Swap make/take/cancel preparation. Beneficiaries and takers can recover addressed outputs from indexed history. It does not provide production proof orchestration.
- `ts/wire.mjs`: TypeScript-compatible instruction data encoders for the same layouts; this is not a complete Privacy Rings transaction/proof SDK.
- `policy`: host-only boundary tests; these checks do not replace the proof or program.
- `RESEARCH.md`: SDK revision and protocol notes.

The current IDs in source are fresh Mainnet program IDs derived from local program keypairs. They have not been deployed. The old IDs in the Devnet changelog are historical and are not used by the Mainnet app.

Both SBF programs build with production verifier keys generated from the pinned circuit sources. The six verifier keys pass `zolana vks check` against their manifests and program binaries, and circuit tests pass. The key ceremony uses the PSE Perpetual Powers of Tau phase-one transcript and a single local phase-two contribution; the phase-two seed is not retained by the generator. This is not a multi-party phase-two ceremony.

The web app connects Privacy Rings deposit, private transfer, withdrawal, balances and history, and generates Lock create/beneficiary-claim plus fixed-price OTC make/take proofs in the browser. Quantum Vault provides encrypted local backup files, expiring history shares, and encrypted transaction notes. Browser cancellation of creator locks and maker orders is not exposed. Enable `NEXT_PUBLIC_SOLANA_ZOLIUS_PROGRAMS_ENABLED` only after both Mainnet programs are deployed and checked executable.

Lock and Swap outputs are encrypted for their recipients. The Lock creator and Swap maker must preserve the prepared output opening and confirmed tree location securely to recover their optional cancellation inputs after restart; app-level encrypted backup/recovery is not implemented yet. Recipient recovery helpers require complete relevant transaction history, including spends.
