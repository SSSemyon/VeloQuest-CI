# Controlled production rollout

Date: 2026-08-14
Project: `rvqiptyzsjcunzjhofid`

## Database

- Pre-mutation guard: zero auth/users/application data and zero scratch schemas.
- Baseline SQL was not replayed. Version `20260811000000` was repaired in history only.
- Applied forward delta: `release_hardening`, `catalog_enrichment_catchup_waves_17_19`, `catalog_hagen_complete`.
- Final history uses the exact source versions through `20260814190000`.
- Final catalogue: 723 total / 718 enabled, 44 brands, 55 Hagen identities.
- Garage: 45 components, 20 evidence-backed rules, 61 fitments.

## Live database smoke

Temporary users were created inside a controlled transaction and deleted after verification. Result: 17/17 PASS.

- two-user RLS select/insert/update/delete isolation;
- server quest activation;
- route quota first and second request allowed, third denied for limit two;
- historical GPX/FIT zero XP and historical canonical ride;
- same-source and cross-source duplicate zero XP;
- XP ledger unchanged;
- cleanup returned auth, profiles, rides and XP to zero.

## Edge Functions

- `migrate-local-alpha`: exact source parity, ACTIVE, JWT required.
- `ride-processor` plus shared metrics: exact source parity, ACTIVE, JWT required.
- `strava-sync`: exact source parity, ACTIVE, JWT required.
- `route-generator`: v4 ACTIVE, JWT required. Deployment was explicitly authorized by the project owner after disclosure that exact start coordinates are sent to public BRouter/Overpass. Deployed source is an exact byte match with the local candidate (27,662 bytes; SHA-256 `f4fd373c1db5ee73bdff23b4f050c20610e183fafe78dca6d1f084579e1ede9d`).
- Post-deployment observation: Edge logs remained empty; PostgreSQL logs contained no new route-generator ERROR and no FATAL/PANIC.

## Advisors

- Performance: only unused-index INFO notices immediately after deployment; the four missing-FK-index notices are resolved.
- Security: one INFO for the intentionally inaccessible private quota table and two WARN notices for intentionally authenticated SECURITY DEFINER RPCs (`activate_quest_alpha`, `consume_route_generation_quota`). Both functions validate `auth.uid()`, expose narrow operations and passed live isolation/quota smoke. No ERROR-level finding.

## Release decision

Database parity: GO.
Edge parity: GO.
Controlled production parity rollout: GO.
Physical-device QA is not claimed and remains the next release gate.
