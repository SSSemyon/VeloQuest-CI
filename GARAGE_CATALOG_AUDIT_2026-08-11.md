# VeloQuest Garage / Bike Catalog — maximum-criteria audit

> Superseded by the 0.8.3 gates in `RC_0_8_3.md`. This file retains the original audit evidence for traceability.

Date: 2026-08-11  
Scope: local checkpoint only; no live Supabase or Notion writes.

## Post-audit remediation in RC 0.8.2

The measurements below remain the raw evidence baseline. After this independent
audit, RC 0.8.2 added server-validated `catalog_verified`, factory-fitment
hydration for all 10 Garage fields, manual per-slot default-deny evaluation,
compatible/incompatible rendering and ride-context sorting. It also added two
explicit incompatible rules, deterministic category/model-year normalization,
browse-without-query, and automated release contracts. These changes improve
correctness and UX; they do not raise the low photo/spec/fitment coverage.

## Verdict

The Garage architecture is safety-oriented and the broad catalog is real, but the content is **not maximum-criteria complete**. The release catalog has 663 enabled identities across 43 brands, while evidence-backed depth is limited to a small minority: 12 bikes have a remote image, 23 have an exact component fitment, 5 have any recommendation path, and 6 populate all 10 Garage display fields.

The correct release posture is therefore: **catalog breadth passes; Garage depth and recommendation usefulness block a “fully complete” claim.**

## Reproducible evidence

Commands run:

```bash
npm run check:catalog
npm run typecheck
node scripts/audit-garage-catalog.mjs
node scripts/build-supabase-migrations.mjs --check
```

- `npm run check:catalog`: passed (477 batch models; manifest 663 models / 43 brands).
- TypeScript: passed.
- All 13 configured image URLs returned HTTP 200 with an `image/*` content type on 2026-08-11.
- Migration `--check`: passed after Waves 14–16 were embedded deterministically in the generated baseline.

## Exact master metrics

| Metric | Result | Coverage |
|---|---:|---:|
| Enabled bicycles | 663 | 100% |
| Brands | 43 | — |
| Unique enabled identities | 663 | 100% |
| Model years | 2020–2026 | 0 pre-2020 |
| SQL-schema bicycles | 186 | 28.05% |
| Wave 14–16 batch bicycles | 477 | 71.95% |
| HTTPS manufacturer URL | 663 | 100% |
| Evidence check date | 663 | 100% |
| Explicit `model_year_evidence` | 628 | 94.72% |
| Category present | 593 | 89.44% |
| Frame material | 140 | 21.12% |
| Wheel size | 69 | 10.41% |
| Drivetrain searchable | 148 | 22.32% |
| Brakes searchable | 65 | 9.80% |
| Suspension detail | 63 | 9.50% |
| All five finder facets populated | 27 | 4.07% |
| At least one of 10 Garage fields | 163 | 24.59% |
| All 10 Garage display fields | 6 | 0.90% |
| Bikes with a remote image | 12 | 1.81% |
| Bikes with an exact fitment | 23 | 3.47% |
| Bikes with any recommendation path | 5 | 0.75% |

Missing categories are concentrated in FOCUS (6), Marin (15), Mondraker (23), NS Bikes (11), Polygon (1), Propain (8), Rocky Mountain (5), and Specialized (1).

Missing explicit model-year evidence is concentrated in COMMENCAL (2), Giant (6), Haibike (2), Kellys (1), Liv (4), Merida (5), Specialized (7), and Trek (8).

The taxonomy currently contains 51 raw categories. Closely related values are fragmented (for example `mountain`, `trail`, `trail_hardtail`, `mountain_full_suspension`, `trail_full_suspension`, `xc_trail_full_suspension`), but the UI exposes a free-text category filter.

## Media

- 13 image rows cover 12 bikes; all are marked `manufacturer`.
- All use HTTPS and currently return a valid image.
- Hosts: Specialized Assets (5), Salsa (2), Santa Cruz (2), Marin (2), Rocky Mountain/Bikes.com (1), Widen CDN for Cannondale (1).
- `RemoteBikeImage` correctly falls through to the next URL or local fallback on failure (`src/components/RemoteBikeImage.tsx:14-46`).
- The finder/garage cannot meet the earlier “model image” expectation at 1.81% coverage; most users see a generic icon or illustration (`App.tsx:1347-1349`, `App.tsx:1487-1491`).

## Search and selection

Implemented:

- Free text, brand, category, year-from, frame, wheel, drivetrain and brake controls (`App.tsx:1471-1495`).
- Server-side pagination and a 50-row per-call cap (`src/backend/garageCatalog.ts:106-136`).
- Server RPC applies 2020+, category/spec filters, FTS and trigram-backed search (`supabase/schema/bike_catalog.sql:93-163`).
- Selecting a catalog bike prefills 10 Garage component fields when strings exist (`App.tsx:853-873`).
- Manual entry remains available when the catalog is incomplete (`App.tsx:1497-1528`).

Gaps:

- A catalog cannot be browsed without typing a query/filter; `yearFrom` alone does not trigger search (`App.tsx:368-381`).
- General search indexes only a subset of specs and omits cassette, crankset, fork, shock, hubs, wheelset and tires (`supabase/schema/bike_catalog.sql:14-22`).
- The brake filter tests only `brake_type`, not the human-readable `brakes` field (`supabase/schema/bike_catalog.sql:147`).
- No facets, normalized category vocabulary, brand picker, exact-year upper bound in UI, or typo-tolerant relevance test suite exists.
- Selecting a catalog bicycle stores `catalogBikeId`, but `saveBikeToCloud` does not set `catalog_verified=true`; the database row remains false by default (`src/backend/localMigration.ts:225-256`, `supabase/schema/000_core_schema.sql:32-47`).

## Real and virtual Garage

Implemented:

- Real and virtual layers are separate in UI, and the copy explicitly says game rewards are not real parts (`App.tsx:1188-1200`, `App.tsx:1339-1417`).
- One active real bike is persisted locally and in the user-owned `bikes` row with 10 component fields (`src/backend/localMigration.ts:225-256`).
- Cloud hydration restores the bike and components (`src/backend/localMigration.ts:136-223`).
- Six virtual items span frame/wheels/cockpit/badge and are server-gated by level (`supabase/schema/functional_completion_0_8.sql:60-144`).

Gaps:

- The client exposes one current real bike, not a multi-bike user garage; saving updates the active row (`src/backend/localMigration.ts:250-255`).
- There is no delete/archive/switch flow for multiple real bikes.
- Catalog provenance is stored as a URL inside untyped `configuration`, without a foreign key from a user bike to `bike_catalog_models`.

## Components, compatibility and recommendations

| Metric | Result |
|---|---:|
| Components | 41 |
| Component brands | 10 |
| Component categories represented | 12 |
| Compatibility rules | 16 |
| `compatible` rules | 14 |
| `incompatible` rules | 2 |
| Bike-component fitments | 50 |
| Factory-installed fitments | 44 |
| Manufacturer-approved fitments | 6 |
| Bikes with fitments | 23 |
| Bikes with recommendation path | 5 |

What is sound:

- Missing fitment returns `unknown`; the client does not infer compatibility from a similar bike name (`src/backend/garageCatalog.ts:166-200`).
- Recommendations include rule/fitment explanation, official evidence URL, and check date (`src/backend/garageCatalog.ts:202-250`, `App.tsx:1384-1394`).
- RLS allows authenticated read of enabled catalog/component evidence only (`supabase/schema/bike_catalog.sql:48-88`, `supabase/schema/catalog_enrichment_wave_08_bmc_factory_fitment_2026_08_07.sql:18-36`).
- All local references in the 50 fitments and 16 rules resolve to existing components/bikes.

What is incomplete:

- With only 5 recommendation-ready bicycles, the expected result for at least 99.25% of exact catalog identities is `unknown`/no upgrade.
- Remediated after the initial audit: two explicit incompatible rules now exist, and the client can represent and render negative evidence-backed outcomes. Conditional coverage remains open.
- Rules are pairwise; no full-system constraint solver checks speed count, freehub, chain, chainline, axle, mount, travel, rotor/adapter, tire clearance, frame size, or e-bike system together.
- The ride signal appends “priority increased” text at distance/elevation thresholds but does not sort recommendations, so the stated prioritization is not actually applied (`src/backend/garageCatalog.ts:225-244`).
- Recommendation value is not quantified (weight, range, braking, reliability, cost, trade-off), and there is no reason-not-to-upgrade explanation.
- Field-level specs usually carry prose inside JSON, not normalized evidence rows tied to each field.

## Gap matrix

| Priority | Gap | Required closure |
|---|---|---|
| P0 | Garage depth does not match the “maximum criteria” promise: 1.81% photo, 3.47% fitment, 0.75% recommendation path, 0.90% full Garage fields | Define release coverage thresholds; enrich the priority brands/models until they pass; do not label the catalog complete before then |
| P1 | Catalog-selected user bike remains `catalog_verified=false` | Set/validate catalog verification server-side from `catalogBikeId`; do not trust a client boolean |
| P1 | No negative compatibility capability in UI/data despite schema support | Add explicit incompatible/conditional rules and an `incompatible`/`conditional` result with evidence |
| P1 | Pairwise graph is not a complete compatibility engine | Introduce normalized interface constraints and a default-deny evaluator with explainable failing predicates |
| P1 | “Ride priority increased” is displayed without changing ordering | Compute a score, sort by it, and expose the exact signal contribution |
| P1 | 70 missing categories and 51 fragmented raw category labels undermine filters | Add canonical taxonomy + aliases; backfill missing category values |
| P1 | 35 models lack explicit model-year evidence | Add evidence or disable until verified under the same rule as Wave batches |
| P1 | Existing integrity check deeply validates only the 477 batch rows; the master manifest mostly proves IDs/counts | Run the same host/year/identity/spec/media/reference checks across all 663 reconstructed rows |
| P1 | No automated Garage/search/recommendation tests | Add deterministic tests for search facets, pagination, catalog selection, default-deny, incompatibility, evidence display, manual fallback and account isolation |
| P2 | Search cannot browse all/facet and omits many component fields | Add browse mode, normalized facets and wider spec index |
| P2 | Single real-bike flow only | Add list/switch/archive if multi-bike ownership is part of MVP acceptance |
| P2 | Hotlinks have no periodic health/licensing metadata | Track last HTTP result, content type, attribution/licensing note and fallback order |
| P2 | Inline image source arrays can cause avoidable `RemoteBikeImage` reset churn in finder rows | Memoize the source list or key reset by URL content |

## Recommended release gates

The exact numeric targets were not encoded in the checkpoint, so these are proposed acceptance gates, not prior agreements:

1. 100%: identity, 2020+, category, manufacturer URL, explicit model-year evidence.
2. 100%: integrity validator covers all master rows and generated migrations are deterministic.
3. Priority-model tier: image + all required Garage fields + exact fitments + compatibility outcome.
4. Catalog-wide minimum before “complete”: image ≥80%, searchable core specs ≥80%, exact fitment ≥60%, recommendation or explicit evidence-backed no-upgrade outcome ≥60%.
5. 100%: every recommendation/denial shows the evidence, checked date and predicates used.
6. 0: broken references, duplicate identities, pre-2020 enabled models, guessed compatibility, unresolved P0/P1 Garage tests.

Until these targets are accepted and met, the honest product status is **broad alpha catalog with evidence-backed deep coverage for a small pilot subset**, not a finished maximum-criteria velopark.

## Closed during this audit cycle

- Waves 14–16 are now embedded in migration generation before their fitment enrichments.
- Batch `generated_at` is now used deterministically as the row evidence date and canonical-hash fallback.
- Both generated migrations now pass `node scripts/build-supabase-migrations.mjs --check`.
