# Zolius Solana programs

This directory contains experimental Devnet programs and clients, not a production-ready release.

- `lock-circuits`: proposed create, beneficiary claim and optional creator cancellation circuits.
- `lock-program`: proposed on-chain verifier, time checks and Privacy Rings CPI.
- `swap-circuits`: proposed fixed-price OTC make, take and cancel circuits.
- `swap-program`: proposed on-chain verifier, order marker, deadline and Privacy Rings CPI.
- `wire`: shared Rust instruction argument layouts and encoders used by both programs.
- `client`: Rust instruction builder for already-proved SPP transactions and CPI accounts, plus Lock create/claim/cancel and fixed-price Swap make/take/cancel preparation. Beneficiaries and takers can recover addressed outputs from indexed history. It does not provide production proof orchestration.
- `ts/wire.mjs`: TypeScript-compatible instruction data encoders for the same layouts; this is not a complete Privacy Rings transaction/proof SDK.
- `policy`: host-only boundary tests; these checks do not replace the proof or program.
- `RESEARCH.md`: SDK revision and protocol notes.

The Lock and Swap IDs in source were observed as executable Devnet programs through the configured RPC on 2026-11-11. That account check does not prove the deployed binaries match this checkout. Do not treat these Devnet programs as Mainnet deployments.

Both SBF programs build with the development test verifiers. All six application proofs have passed generated-verifier checks. Lock deposit/create/CPI/claim and Swap deposit/make/index/recover/take/CPI have passed isolated localnet flows against Helius Privacy Rings. Test setup keys generated with `zolana zk compile --test` are publicly reproducible and cannot protect real funds.

The web app connects Privacy Rings deposit, private transfer, withdrawal, balances and history, and generates Lock create/beneficiary-claim plus fixed-price OTC make/take proofs in the browser. Quantum Vault provides encrypted local backup files, expiring history shares, and encrypted transaction notes. Browser circuit proving keys are shipped as static assets and use the development test verifier setup, so these Lock/Swap flows are Devnet experiments only. Browser cancellation of creator locks and maker orders is not exposed; use the Rust client preparation flows only for local development.

Lock and Swap outputs are encrypted for their recipients. The Lock creator and Swap maker must preserve the prepared output opening and confirmed tree location securely to recover their optional cancellation inputs after restart; app-level encrypted backup/recovery is not implemented yet. Recipient recovery helpers require complete relevant transaction history, including spends.
