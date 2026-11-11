# Zolius Solana programs

This directory contains work in progress, not a deployed or production-ready release.

- `lock-circuits`: proposed create, beneficiary claim and optional creator cancellation circuits.
- `lock-program`: proposed on-chain verifier, time checks and Privacy Rings CPI.
- `swap-circuits`: proposed fixed-price OTC make, take and cancel circuits.
- `swap-program`: proposed on-chain verifier, order marker, deadline and Privacy Rings CPI.
- `wire`: shared Rust instruction argument layouts and encoders used by both programs.
- `client`: Rust instruction builder for already-proved SPP transactions and CPI accounts, plus Lock create/claim/cancel and fixed-price Swap make/take/cancel preparation. Beneficiaries and takers can recover addressed outputs from indexed history. It does not provide production proof orchestration.
- `ts/wire.mjs`: TypeScript-compatible instruction data encoders for the same layouts; this is not a complete Privacy Rings transaction/proof SDK.
- `policy`: host-only boundary tests; these checks do not replace the proof or program.
- `RESEARCH.md`: SDK revision and protocol notes.

Both program IDs in source are development IDs. The corresponding local development keypairs are stored outside this workspace under the WSL user's `~/.config/zolius-dev/`; they have not been deployed. Never commit those keypairs.

Both SBF programs build with the development test verifiers. All six application proofs have passed generated-verifier checks, and Lock create/claim has passed a full isolated localnet run against Helius Privacy Rings. Swap make/take/cancel client builders and proof-verifier flows are implemented; the full SPP CPI swap has not yet been run end to end. Test setup keys generated with `zolana zk compile --test` are publicly reproducible and cannot protect real funds.

Lock and Swap outputs are encrypted for their recipients. The Lock creator and Swap maker must preserve the prepared output opening and confirmed tree location securely to recover their optional cancellation inputs after restart; app-level encrypted backup/recovery is not implemented yet. Recipient recovery helpers require complete relevant transaction history, including spends.
