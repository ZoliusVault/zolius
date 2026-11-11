# Zolius Vault

> **Self-Custodial Confidential Vault & Transfers on Solana Privacy Rings**
> *Built on open protocols. Protected by post-quantum ML-KEM-768 viewing keys.*

[![Solana Mainnet-Beta](https://img.shields.io/badge/Network-Solana%20Mainnet--Beta-9945FF?style=flat-square&logo=solana)](https://solscan.io)
[![Privacy Rings](https://img.shields.io/badge/Privacy-Solana%20Privacy%20Rings-FF8C00?style=flat-square)](https://www.helius.dev/docs/privacy)
[![Audited](https://img.shields.io/badge/Audits-Certora%20·%20OtterSec%20·%20zkSecurity-10B981?style=flat-square)](app/contracts/page.tsx)
[![Cryptography](https://img.shields.io/badge/Post--Quantum-ML--KEM--768%20(X--Wing)-3B82F6?style=flat-square)](app/quantum/page.tsx)

---

## ⚡ Overview

Zolius Vault brings institutional-grade zero-knowledge privacy and post-quantum viewing key protection directly to Solana:

1. **Deposit & Shield**: Blind public SOL and SPL tokens into the Solana Privacy Program (`ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW`). State updates in a 26-level LeanIMT Poseidon Merkle tree.
2. **Confidential ZK Swap**: Exchange shielded assets via Cross-Program Invocation (CPI) to DEX liquidity without exposing transaction amounts on-chain.
3. **Confidential Timelock Escrow**: Time-locked confidential transfers and vesting with deterministic clock release and sender revocation controls.
4. **Decoupled Unshielding / Withdraw**: Client-side Groth16 witness generation breaks all linkability to deposit history upon withdrawal to fresh recipient addresses.
5. **Quantum-Ready Viewing Keys**: Off-chain viewing keys, memos, and vault backups derived deterministically (`ZOLIUS/vault/v1`) and encrypted with ML-KEM-768 (X-Wing hybrid lattice encryption).

---

## 🏛️ Verified Solana Program Registry

| Program / Resource | On-Chain Identifier | Audit & Verification Status |
| :--- | :--- | :--- |
| **Solana Privacy Program (Canonical Ring)** | `ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW` | Audited by **Certora**, **OtterSec**, and **zkSecurity** |
| **Zolius Swap Escrow (CPI)** | `zolSwap111111111111111111111111111111111111` | Verifiable build: `solana-verify` |
| **Zolius Lock Program (Timelock)** | `zolLock111111111111111111111111111111111111` | Verifiable build: `solana-verify` |
| **Helius Privacy Gateway** | `https://api.helius.xyz/v0/privacy` | High-throughput enterprise RPC & witness generation proxy |
| **Quantum Vault Viewing Keys** | `ZOLIUS/vault/v1` message signature | Hybrid X25519 + ML-KEM-768 lattice encryption |

---

## 🔐 Supported Solana Wallets

- **Phantom** (`window.phantom.solana`)
- **Solflare** (`window.solflare`)
- **Backpack** (`window.backpack`)
- **OKX Wallet** (`window.okxwallet.solana`)

---

## 🚀 Development & Build

```bash
# Install dependencies
pnpm install

# Start local development server
pnpm dev

# Run test suite
pnpm test

# Build production bundle
pnpm build
```

---

## 📄 License
MIT License. Built on open Solana protocols.
