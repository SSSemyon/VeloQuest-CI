# Garage Evidence-Backed No-Upgrade Outcomes — Design

## Goal
Represent a verified manufacturer-backed conclusion that an upgrade is not recommended or no supported useful alternative exists, without confusing it with unknown compatibility or component incompatibility.

## Product contract
- Unknown remains default-deny and means evidence is insufficient.
- `no_upgrade` is a positive evidence state: it requires an exact bike identity plus official HTTPS evidence URL, evidence date and explanatory notes.
- `no_upgrade` must never be inferred from absence of compatibility rows, high component tier, price, ride data, or model naming.
- Real Bike and VeloQuest Bike remain separate.
- No production outcome row is added merely to improve coverage.

## Data model
Create `public.garage_recommendation_outcomes` keyed by exact `bike_id`, `scope_key` and `outcome_type`. Each row stores `outcome_type='no_upgrade'`, title, notes, official evidence URL/date and enabled flag. Read access follows the existing authenticated Garage catalog pattern; client writes are forbidden.

The capability migration intentionally contains zero evidence rows. Future enrichment waves may insert outcomes only when official exact-product evidence supports the conclusion.

## Client behavior
`GarageRecommendation` carries optional `outcomeType: 'no_upgrade'`. The existing `locked` presentation is reused as the neutral non-compatibility visual state: it is already distinct from compatible/conditional/incompatible and from unknown. The visible title/detail and official-source link come from the evidence row.

For an exact catalog bike, `loadGarageRecommendations` loads outcome rows before component-graph fallback, so an explicit no-upgrade conclusion survives even when no compatible alternative exists. A missing outcomes relation on the still-live 0.8.8 backend (`42P01`/`PGRST205`) is treated as “feature not rolled out yet”; other backend errors are not swallowed.

## Coverage audit
A small outcome parser validates HTTPS evidence, ISO evidence date, scope, title/notes and duplicate identities. `check-enrichment-queue.mjs`, which is already part of `check:catalog`, overlays valid outcomes onto the existing queue: a bike contributes to recommendation/outcome coverage when it already had an approved/graph path or gains a verified no-upgrade outcome. Invalid outcome evidence fails the release catalog gate.

A standalone `audit-garage-outcomes.mjs` reports rows, bikes covered and invalid outcomes. The database foreign key enforces exact bike references at reset/runtime.

## Migration strategy
Add one forward schema source and generated migration `20260817092000_garage_no_upgrade_outcomes.sql` after the unreleased 0.8.9 auth/achievements migration. Production 0.8.8 remains through the Hagen migration only. Do not rewrite production baseline history and do not mutate production until an explicitly approved controlled rollout.

## Verification
The contract test was established RED before implementation. Pure outcome parser/validation/coverage logic is executable without the full mobile toolchain and must pass locally. Full `npm run check:release`, double reset/RLS and native build remain required on the existing free self-hosted Mac before this branch is merged into the release candidate.
