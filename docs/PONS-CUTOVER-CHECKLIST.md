# Pons Cutover Master Checklist (run on canonical CA handoff)

Status ledger for the temp→canonical VEIL migration. Check boxes in order;
no step starts until the previous one's proof is recorded.

## 0. Intake (from launching team)

- [ ] Canonical CA + launch tx hash received.
- [ ] Decimals / supply / tax / blacklist / burn confirmations received
      (see `docs/PONS-TOKEN-REQUIREMENTS.md` MUST 1–5).
- [ ] Seed funding settled: who sends canonical VEIL + ETH for pools
      (team allocation tx OR operator-buy budget confirmed).

## 1. Verify token (read-only, abort everything on ANY fail)

- [ ] `decimals()` == 18.
- [ ] Static transfer test: no tax, no blacklist, no pause
      (sim transferFrom/transfer of dust via eth_call).
- [ ] `burn(uint256)` exists and succeeds on dust (sim; do NOT burn yet).
- [ ] Fixed supply: no live mint role (read owner/minter slots or
      verified source).
- [ ] Owner renounced or timelock (record who holds what).

## 2. Fund check (abort if short — do not strand half-built pools)

Budget at 0.02 gwei (measured from migration ledger):
- Pool deploy ~1.74M + activate ~28k + register ~160k ≈ **3.9e-5 ETH**.
- ASP publish ~150k ≈ **3e-6**. setVeilToken ~50k ≈ **1e-6**.
- v4 plain init+seed + hooked init+gate+seed gas ≈ **2e-5**.
- Total gas ≈ **6e-5 ETH** — operator holds ~1.18e-4 (covers gas).
- Seed VALUES (extra!): ~0.0005–0.001 ETH + proportional canonical
  VEIL (amount set by launch price). Operator does NOT hold this —
  funding must land first (see §0).
- [ ] Operator ETH ≥ 0.0002 (gas + margin).
- [ ] Seed ETH + canonical VEIL in operator wallet (confirmed onchain).

## 3. Wire treasury

- [ ] `setVeilToken(canonical)` (owner tx) + read-back `veilToken()`.
- [ ] Confirm `buybackShareBps` still 7000 (no change needed).

## 4. Deploy canonical pools (pattern: migrate script steps, new asset)

- [ ] Deploy canonical VEIL privacy pool (audited 0xbow code, same
      bytecode family as temp pool) → `activateDeposits`.
- [ ] `registerPool(canonical, pool, 0.0001, 0, 100)` (same floors as temp).
- [ ] ASP publish (union all pools + sentinel) + verify `latestRoot`.
- [ ] Init canonical plain v4 pool (3000/60/no-hook) at market price.
- [ ] Init canonical hooked v4 pool + 30d gate (`setPoolGating`).
- [ ] Seed both via helper-v2 `0xb419…` (key-agnostic, recoverable).
      Set `SEED_PRICE_VEIL_PER_ETH` env first (decimal VEIL per ETH —
      scripts now derive init price + VEIL caps from it; NEVER seed a
      hardcoded 2000 against a foreign price).
      Keep seed txs + Ls in the deployment doc.

## 5. Cut over app + env

- [ ] `.env.local` + `.env.mainnet.local`: `NEXT_PUBLIC_VEIL_TOKEN=<canonical>`.
- [ ] Manifest: record `veilTokenCanonical` (+ canonical pool entries);
      `setup-vercel-env.mjs` prefers it automatically (never reverts).
- [ ] Vercel: same key (Production) + redeploy.
- [ ] Code: `KNOWN_ASSETS` canonical entry (lib/note-format.ts),
      TokenLogos canonical address (components/TokenLogos.tsx).
- [ ] Manifest: append canonical pool/token entries (keep temp entries
      as history; tests stay green — additive only).
- [ ] Docs: this file + MAINNET-DEPLOYMENT new section + README if needed.

## 6. Prove it (same battery as temp, free sims first)

- [ ] Shield canonical 0.001 → note.
- [ ] Full-ZK single (relay→swap→note) + invariant re-run.
- [ ] Withdraw to fresh + direct payout leg.
- [ ] Gated swap (attested) + fee → treasury.
- [ ] Quote checks + tsc + vitest + commit.

## 7. Retire temp (only after §6 green)

- [ ] `removeLiquidity` v2 temp position (funds home).
- [ ] v1 temp POL stays (unrecoverable by design, harmless).
- [ ] Announce canonical CA everywhere (docs, UI footer if shown).

## Rollback

Any step reverts → funds stay (guards), pools simply don't exist yet.
Temp pools keep running untouched until §6 passes — never pause temp
before canonical proves live. No user migration needed (zero live notes
at time of writing).
