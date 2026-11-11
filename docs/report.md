# Veil — Project Report & Architecture Overview

**Zero-Knowledge privacy layer for Uniswap v4 on Solana (EVM mainnet 4663)**

- **Web Application:** https://www.veilpools.tech (apex `veilpools.tech` → 308 redirect)
- **Trade Terminal:** https://www.veilpools.tech/trade (Shield · ZK Swap · Withdraw · Gated Pool · Vault)
- **Treasury & Burn Ledger:** https://www.veilpools.tech/burn
- **Verified Contracts Registry:** https://www.veilpools.tech/contracts
- **Chain & Pool Health:** https://www.veilpools.tech/status
- **Docs:** https://www.veilpools.tech/docs/asp-policy · https://www.veilpools.tech/docs/decisions
- **GitHub Repository:** https://github.com/veilpools/veil (branch `main`)
- **X:** https://x.com/veilpools

---

## 1. Project Description

**Veil** is a non-custodial zero-knowledge privacy layer for Uniswap v4, deployed natively on **Solana (EVM mainnet 4663)**. It lets users shield funds into fixed-denomination (`0.001`) privacy notes, swap while shielded through an atomic relay → swap → re-shield flow, and withdraw to fresh decoupled addresses — with Groth16 ZK-SNARK proofs verified onchain for every exit.

Two rails share one protocol:

1. **Privacy rail (Shield → Swap → Withdraw):**
   Fixed `0.001` ETH/VEIL notes in audited 0xbow v1.2.1 privacy pools. The `VeilZkRouter` executes atomic single-note, multi-note (max 8), and direct-payout flows: relay exit chains fund-to-fund into an exact-input v4 swap, the output funds a fresh note (or pays out visibly, honestly labeled). Router invariant-0: it never retains a wei. Self-relay is the supported path through F5 — no hosted relayer, no custody, no fallback needed.
2. **Flywheel rail (Attest → Gated Swap → Burn):**
   Permissionless self-attestation unlocks the ZK-gated v4 pool (30-day launch window). Every gated swap pays a 30 bps hook fee into `VeilTreasury`; 70% is bought back and burned via `burn()` (supply shrinks, never dead-address theater).

All contracts are live on mainnet 4663, Sourcify-verified 10/10, with Uniswap v4 integration on the canonical PoolManager.

---

## 2. Core Value Proposition & Problem Solved

### The Problem

- **Naked AMM trails:** every Uniswap swap permanently links wallet → amount → counterparty on a public explorer.
- **Mixer stigma & risk:** legacy mixers are custodial, freezable, and legally toxic.
- **Fee waste:** standard AMM fees enrich passive LPs instead of reinforcing the protocol users chose.
- **Bot-infested launches:** snipers eat retail fills in the first blocks of every pool.

### The Veil Solution

- **Fixed-denomination unlinkability:**
  Every note is exactly `0.001` — uniform notes are unfingerprintable. Rigidity is the privacy source.
- **Atomic full-ZK swap (`VeilZkRouter`):**
  Relay → swap → re-shield in ONE transaction (transient stage guard + invariant-0 + events). Any leg failing reverts everything; dust above note value refunds instantly; below-denomination outputs settle visibly (labeled, never stranded).
- **Withdrawals that cannot be blocked:**
  No pause switch, no guardian, no allowlist on any withdraw path — by code, proven live.
- **Autonomous 30/70 flywheel (`VeilHook` → `VeilTreasury`):**
  30 bps per gated swap → treasury → 70% `burn()` + 30% ops. Burns proven onchain with `TokensBurned` events.
- **Gated launch windows:**
  Open self-attestation (EIP-191, no eligibility, no owner) unlocks the gated pool during its window — anti-bot speedbump without permission.

---

## 3. End-to-End Application Flow

```
[User with ETH/VEIL wallet]
        │
        ▼
1. Web Portal (www.veilpools.tech/trade)
    ├── Shield    → fixed 0.001 deposit via 0xbow Entrypoint, note in vault
    ├── ZK Swap   → free quote sims → executeFullZkFlow (single/multi/direct)
    ├── Withdraw  → Groth16 prove in browser → relay to clean address
    ├── Trade     → self-attest once → gated VEIL→ETH swap with fee
    └── Vault     → encrypted notes, backup/export, spend tracking
        │
        ▼
2. Wallet & Client Layer
    ├── Viem 2.57.3 (strict EVM JSON-RPC, chain 4663)
    ├── Real slippage bounds + fail-closed guards (nothing sends on doubt)
    └── Browser vault (PBKDF2-SHA256 310k + AES-256-GCM), secrets never leave device
        │
        ▼
3. Execution Branches
    ├── [A. Shield]   → Entrypoint.deposit → commitment in LeanIMT tree
    ├── [B. Full-ZK]  → entrypoint.relay → v4 swap → fresh 0.001 note / dust / payout
    ├── [C. Withdraw] → entrypoint.relay → clean recipient, nullifier spent
    └── [D. Gated]    → hook verifies attestation + signature → swap + 30bps fee
        │
        ▼
4. Settlement & Telemetry
    ├── Blockscout verification (Sourcify 10/10 complete; explorer marks follow)
    ├── Live /burn ledger (totalBurned reads chain), /contracts registry, /status health
    └── Fee → treasury → burn loop compounding scarcity
```

---

## 4. Key Architectural Components

### A. Smart Contracts (`contracts/`)

- **`VeilZkRouter.sol` (`0x0fb4…9b4c`):**
  Atomic relay → swap → deposit/direct executor. Single, multi (max 8), direct-payout entries. Transient `_stage` machine + `nonReentrant` + invariant-0 on every exit. Proof verification delegated to the audited 0xbow Entrypoint (B1: atomicity, not re-checks).
- **`VeilHook.sol` (`0xf95f…20c4`, CREATE2 salt `…4b7d`, flags `0x20C4`):**
  `beforeInitialize | beforeSwap | afterSwap | afterSwapReturnDelta`. ZK-gated launch windows (attestation + EIP-191 signature check) + 30 bps fee via `poolManager.take()` to treasury.
- **`VeilAttestationRegistry.sol` (`0xd1f1…8add1d`):**
  Permissionless `selfAttest` (EIP-191 nonce + deadline, no owner, no attester). Owner keeps indefinite control (no renounce schedule).
- **`VeilTreasury.sol` (`0xb68c…8152`):**
  Fee accumulator. Permissionless `executeBurn` (capped at balance), owner-only `rescue`, `buybackShareBps = 7000`, `setVeilToken` for the canonical Pons token.
- **`VeilShieldRouter.sol` (`0x3db4…22a55c`):**
  Legacy 1-tx Swap-to-Shield + ShieldedSwap with the R1 `PoolManager.settle{value}` fix. Provisional paths exit-only.
- **`MainnetLiquidityHelper.sol` (`0xb419…2e9b0b`) / `MainnetSwapHelper.sol` (`0x08b1…19a58`):**
  Recoverable v4 seeding (unlock-routed removal) + exact-input gated swaps. No PositionManager needed.
- **0xbow core (vendored, audited v1.2.1, never modified):**
  `Entrypoint` (UUPS proxy `0x96cb…50b1`), ETH pool `0x10c1…1932`, VEIL pool `0xdb9f…90d1` (both fixed `0.001`), Groth16 verifiers, Poseidon, LeanIMT.

### B. Frontend (`app/`, `components/`)

- Trade terminal with guided 1-2-3-4 journey, chain-aware copy (no testnet leakage on mainnet), per-tab fail-closed guards, backup-gated withdrawals, live telemetry + Merkle root, Merkle/ASP freshness gates before every send.
- `/burn` (live `totalBurned` + event ledger), `/contracts` (live registry + Sourcify/Blockscout honesty note), `/status` (pool health), `/docs/*`, `/privacy`, `/terms` live.

---

## 5. Technology Stack

- **Smart Contract Language:** Solidity `0.8.37` (Cancun, viaIR)
- **AMM Framework:** Uniswap V4 Core (`1.0.2`) + Uniswap V4 Periphery (`1.0.3`)
- **Blockchain Network:** Solana Mainnet-Beta (`Chain ID: 4663`)
- **RPC & Web3 SDK:** `viem 2.57.3` (EVM)
- **Frontend Framework:** Next.js `16.3.8` (App Router), React `19.2.8`, TypeScript `5.x`
- **ZK Stack:** 0xbow Privacy Pools core v1.2.1 (audited) — Groth16 + Poseidon + LeanIMT, snarkjs WASM proving in-browser, pinned artifacts hash-checked
- **Testing Framework:** Vitest (39 files, 239 tests, all green) + `tsc --noEmit` clean
- **Hosting:** Vercel production (`www.veilpools.tech`, apex 308 redirect), 24 env keys

---

## 6. Live Mainnet Contract Addresses (Solana 4663)

| Contract Name | Deployed Address | Transaction Hash | Block Number |
|---|---|---|---|
| **0xbow Entrypoint (proxy)** | `0x96cb8b1836d341a6f5f1f54428bd6696c8b950b1` | `0x4c075711fcb3f7bbf35816f7a3a8de44fb02d7f77b36fb9791e944dc91971344` | 86334089 |
| **0xbow ETH Pool (0.001)** | `0x10c17b7538e13c63b890fea52708846e88bb1932` | `0x510013dbeb7a2dd92a69a06239390f4cd747b538dd3d3b664b16bfcfacb40215` | 86334136 |
| **0xbow VEIL Pool (0.001)** | `0xdb9f182670da2cc6c5ddd432ec98a45e4f2290d1` | `0xcd91b03c04306b05e734cc52bebba958763014980e718fb6a88474468a3a59e5` | 86334185 |
| **VeilZkRouter (single+multi+direct)** | `0x0fb48c9552154ea028cbd812430e1ea3465a9b4c` | `0xcf51d62476e1618193a301de7d446d8b3fd2daa74ad02945923d6202c6208aa5` | 86334911 |
| **VeilHook v2 (0x20C4, 30bps)** | `0xf95f041462ee34c2ea7b953a879838133ef820c4` | `0xae8ca8cf175a0a0c00d2e6b536a0556bbacef1bc92c8a6fa35c63db34ca37048` | hook deploy |
| **VeilAttestationRegistry v2** | `0xd1f17c70067f1cc2b478606b3f0faa18ee8add1d` | `0xb74ef01945acb222681715915a3a81e603d0f0a63fe09e02e62379b9371718f2` | 86334674 |
| **VeilTreasury (70% burn)** | `0xb68c3d25e5e9902363e8e10d5c0a471e65be8152` | `0x2166a1ef7803003347277a98f864bd81a8cf028425f19208d46b231642fe2106` | 86334474 |
| **VeilShieldRouter (fixed R1)** | `0x3db4ae3429f1507aa0cd31c740a0fd276e22a55c` | `0x877e3c8d3089c2bb62d45d34ac021da52cb1c2fb9cddc1eb5d3f0c570ad748ed` | 86334766 |
| **MainnetLiquidityHelper v2** | `0xb4194deb8a51b69118e5d5414d7d08326a2e9b0b` | `0xf42074984647e1f0173f406020ec53f1535042505babf79647d50fbad26176a8` | 87186428 |
| **MainnetSwapHelper** | `0x08b11d4d5fc78789e305e8437c45c52488a19a58` | `0x6dce7d20cd022adf8f1cc1bcd780973f61f81149c683e93c9156f846c3cb17d1` | 86863742 |
| **Temp VEIL Token (pre-Pons)** | `0xe0e11ec0d62eda12de796d025d6334fadfe5ab2a` | (migrated) | — |
| **Legacy pools (exit-only)** | `0x15f7e3…`, `0x493f64…`, `0x3783db…` | (migrated) | — |

Full 23-transaction deploy ledger: `deployments/mainnet-deploy-txs-2026-10-12.json` (blocks 86333824–86334911, all success).

---

## 7. Security, Trust & Risk Controls

1. **Non-Custodial Architecture:**
   App and servers never hold private keys or escrow funds. Notes live only in the browser vault (PBKDF2-SHA256 + AES-256-GCM); every transaction is signed in the user's wallet.
2. **Invariant-0 + Atomicity:**
   Every router exit asserts zero retained balance; relay → swap → deposit runs in one transaction or reverts entirely (proven live, zero residue repeatedly).
3. **Unblockable Withdrawals:**
   No pause switch, no guardian, no allowlist on any withdraw path — by code, proven live (ETH notes ×3, VEIL notes ×1, fresh recipients).
4. **Fail-Closed UI:**
   Chain gates, denomination gates, allowance gates, ASP/state freshness gates, spent pre-checks, exact-calldata pre-send simulations. No quote = no execution button.
5. **Audited-Circuit Reuse Only:**
   Full-ZK exclusively on audited 0xbow v1.2.1 circuits — no novel crypto, no new ceremony. External audit permanently waived by owner decision with residual accepted; internal audit PASS WITH CONDITIONS.
6. **Verified Sources:**
   Sourcify 10/10 on chain 4663. Blockscout checkmarks follow their verifier's solc 0.8.37 support (honestly disclosed on /contracts).
7. **Open Association Sets:**
   Every label ever deposited plus genesis sentinel, published mechanically, no human allow/deny. Policy public at /docs/asp-policy.

