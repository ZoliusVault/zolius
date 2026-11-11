# Development instruction interface

This describes the current experimental Rust programs. It is not a stable public SDK, and the listed development program IDs have not been deployed. Generated verifying keys are for local test proofs only.

Each instruction is a one-byte tag, followed by its `wincode`-encoded argument struct and the complete serialized Privacy Rings `TransactIxData`. The application proof has three compressed components: `a: [u8; 32]`, `b: [u8; 64]`, `c: [u8; 32]`. Use the Rust types and serializer as the source of truth; do not infer variable-length SPP encoding from this table.

For every instruction the first account is the actor signer, followed by all accounts expected by the Privacy Rings `transact` CPI in its required order. Include required SPP signers and payer again in that forwarded list as appropriate. Both programs reject interface transfers, so these instructions only move value inside the private SPP transaction.

## Lock

Development program ID: `AJok8ztWjxcbeFDLAWRmY11fCvp8mJJpbrvpUs3UmoZP`. Authority PDA seeds: `b"zolius_lock"`, creator public key, bump.

| Tag | Actor | Arguments after proof | Meaning |
| --- | --- | --- | --- |
| 0 | creator | viewing pubkey `[u8;33]`, bump `u8` | Create a confidential lock. |
| 1 | beneficiary | creator `[u8;32]`, unlock `u64`, bump `u8` | Claim at or after unlock. |
| 2 | creator | creator `[u8;32]`, unlock `u64`, bump `u8` | Cancel before unlock only if terms permit. |

Create requires exactly one SPP message with 64 bytes of data: the second output's commitment followed by the creator's public key. Its view tag and encryption must be constructed so the beneficiary can discover and decrypt the lock. Building, sharing and recovering that data is not implemented yet.

## Swap

Development program ID: `HQioSDqtsHSz2LzdHZXYShA8Jgi19Sxxh92M2rKVMC7u`. Authority PDA seeds: `b"zolius_order"`, maker public key, bump.

| Tag | Actor | Arguments after proof | Meaning |
| --- | --- | --- | --- |
| 0 | maker | viewing pubkey `[u8;33]`, bump `u8` | Create the private fixed-price order. |
| 1 | fee-paying signer | maker `[u8;32]`, bump `u8` | Take before the transaction's committed expiry. SPP must also receive the taker's input-owner signer. |
| 2 | maker | bump `u8` | Cancel at any time while unspent. |

Make requires one SPP marker message whose 64 bytes are the second output's commitment followed by the maker public key. The current take circuit closes the taker's input: it must contain exactly the requested amount. Splitting, discovery, payout recovery, encryption and transaction construction still require client implementation.

## Boundaries

Circuit proof inputs bind the private transaction hash, but the programs also rely on the real Privacy Rings program to validate its proof, nullifiers, owner signatures and value conservation. The CPI account validation, signer wiring, encrypted output discovery and deployment IDs must be exercised together in localnet or devnet. A native proof test alone does not establish this end-to-end behavior.
