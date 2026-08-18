# Production parity preflight results

Date: 2026-08-14

## Reproducibility

- Clean isolated baseline replay #1: PASS.
- Clean isolated baseline replay #2: PASS.
- Each replay created 25 application tables, enabled RLS on all 25 and produced 668 total / 663 enabled catalogue rows across 43 brands.
- Every scratch schema was explicitly removed; post-check confirmed no scratch objects, auth users remained zero and live catalogue remained 668 total / 663 enabled.

## Target migration smoke

Applied in a fresh isolated schema:

1. full baseline;
2. release hardening;
3. catalogue enrichment catch-up;
4. Hagen catalogue.

Result: PASS.

- 723 total / 718 enabled catalogue rows.
- 44 enabled brands.
- 55 Hagen identities.
- 45 components, 20 compatibility rules and 61 fitments.
- Two-user RLS select/insert/update/delete isolation: PASS.
- Server quest activation: PASS.
- Route quota first/second allowed and third denied for limit 2: PASS.
- Historical GPX/FIT: zero XP and historical canonical ride: PASS.
- Same-source duplicate: zero XP: PASS.
- Cross-source duplicate: zero XP: PASS.
- XP ledger unchanged by historical/duplicate cases: PASS.

## Source verification after fixes

- TypeScript (`tsc --noEmit`): PASS.
- Node regression suite: 36/36 PASS.
- Generated migration reproducibility: PASS (6/6 migrations current).
- SQL parser: PASS (6 migrations and DB test parsed).
- Backend reproducibility/RLS audit: PASS (25 RLS-covered tables, 7 Edge Functions).
- Catalogue integrity: PASS (718 enabled models, 44 brands, years 2020–2026).
- Garage strict audit: PASS (45 components, 20 rules, 61 fitments; no broken references).
- Enrichment queue validation: PASS (714 evidence work items).
- Legacy migration ignores forged `payload.totalXp` and always returns `earnedXp: 0`: PASS.
- Manual GPX/FIT adapters force `rewardEligible: false`: PASS.
