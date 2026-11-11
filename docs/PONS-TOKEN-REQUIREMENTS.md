# Canonical VEIL Token Requirements (for the launching team)

Veil protocol consumes the canonical VEIL inside onchain pools and
contracts. These constraints are load-bearing — a token that violates a
MUST cannot be wired in, and redeploying pools around a bad token costs
real funds. Please confirm each item before launch.

## MUST (wiring fails otherwise)

1. **ERC-20, 18 decimals.** UI formatting, pool math, and fixed
   denominations assume 18. Other decimals need a code migration first.
2. **Zero transfer tax/fee.** Privacy pools and Uniswap v4 pools settle
   exact amounts; any tax-on-transfer breaks deposits, swaps, and relays
   (funds lock or txs revert). Launch with 0% tax and no post-launch
   tax setter, or none at all.
3. **No blacklist, no pause, no per-address limits.** Pools must be able
   to receive from / send to any address (routers, helpers, fresh user
   wallets). Blacklist/pause roles brick the protocol if ever used.
4. **`burn(uint256)` callable by anyone (or by VeilTreasury).**
   The flywheel calls `IBurnableToken(veilToken).burn(amount)` from the
   treasury permissionlessly._current temp token exposes it; the canonical
   one must too, or `executeBurn` reverts and the burn leg is dead._
   Alternatives if burn is impossible: say so NOW — we redesign the
   treasury leg before pools are built, not after.
5. **Fixed supply, no mint role live at handoff** (mint finished or
   renounced). Pools cannot price an inflating supply safely.

## SHOULD (strongly requested)

6. **Creator/fee wallet = VeilTreasury (`0xb68c3d25e5e9902363e8e10d5c0a471e65be8152`)**
   at launch if the launchpad allows it. Otherwise route first fees
   manually right after launch.
7. **Renounced ownership** (or ownership = audited timelock). At minimum:
   no hidden owner mint/tax/pause after handoff.
8. **No dev-wallet dumps scheduled against pool launch day** — coordinate
   timing so seeding	txs don't land inside a sell wall.

## Handoff to dev (required contents)

- Canonical CA (contract address) + launch tx hash.
- Decimals, total supply, confirmation of items 1–5 (short "yes" each).
- Seed allocation for pools (amount + tx): the protocol must seed one
  plain + one gated v4 pool and one privacy pool. Options: (a) team sends
  canonical VEIL to operator `0xCAB1E4df4FBD2EF6F73cB03519Ec33cba08879e6`,
  (b) operator buys on Pons (needs ETH budget — confirm who funds).

## What dev does after handoff (no action needed from launch team)

1. Verify 1–5 onchain (read-only; aborts the wiring if any MUST fails).
2. `setVeilToken(canonical)` on VeilTreasury (owner tx).
3. Deploy canonical VEIL privacy pool + activate + register + ASP.
4. Init canonical plain + hooked v4 pools + 30d gate + seed.
5. Cut over env (local + Vercel), redeploy UI, full end-to-end test.
