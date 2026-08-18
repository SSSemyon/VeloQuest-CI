# Garage No-Upgrade Outcomes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a distinct evidence-backed `no_upgrade` recommendation outcome to Real Bike Garage and count it in outcome coverage without weakening default-deny compatibility.

**Architecture:** Store exact-bike outcomes in a separate read-only catalog table, load them alongside existing fitment/compatibility evidence, reuse the existing neutral `locked` visual state with explicit `outcomeType`, and overlay valid outcomes onto the release enrichment queue. A forward migration is generated separately from historical baselines.

**Tech Stack:** PostgreSQL/Supabase SQL, React Native/TypeScript, Node test runner, existing catalog audit scripts.

## Global Constraints

- Evidence-only: no inferred or guessed no-upgrade rows.
- Unknown remains default-deny.
- Production Supabase is not mutated in this implementation branch.
- Existing 0.8.9 auth/achievement behavior must remain unchanged.
- Client remains compatible with production 0.8.8 before the new relation is rolled out.

---

### Task 1: Contract test

**Files:**
- Create: `tests/garage-no-upgrade-contracts.test.mjs`
- Create: `scripts/garage-outcomes-core.mjs`

- [x] Establish RED contract for missing schema/client/coverage capability.
- [x] Add executable synthetic parser/validation/coverage test.
- [x] Verify pure core logic GREEN locally.

### Task 2: Database and migration wiring

**Files:**
- Create: `supabase/schema/garage_recommendation_outcomes.sql`
- Modify: `scripts/build-supabase-migrations.mjs`
- Create: `supabase/migrations/20260817092000_garage_no_upgrade_outcomes.sql`
- Modify: `scripts/audit-backend-repro.mjs`

- [x] Add exact-bike table, evidence constraints, RLS, authenticated SELECT and no client writes.
- [x] Add a generated forward migration after auth/achievements.
- [x] Keep production runbook expectations through Hagen only; both unreleased 0.8.9 migrations remain pending.
- [x] Add no seed/outcome rows without explicit official evidence.

### Task 3: Client loading and presentation

**Files:**
- Modify: `src/backend/garageCatalog.ts`

- [x] Add `outcomeType?: 'no_upgrade'` without treating it as component compatibility.
- [x] Load enabled exact-bike outcomes before the no-evidence early return.
- [x] Map them to existing neutral `locked` presentation with title/detail/evidence URL/date.
- [x] Keep explicit outcomes when the component graph is empty.
- [x] Treat missing pre-rollout relation (`42P01`/`PGRST205`) as no outcomes; do not hide unrelated backend errors.

### Task 4: Coverage audit

**Files:**
- Create: `scripts/audit-garage-outcomes.mjs`
- Create: `scripts/apply-garage-outcomes-to-enrichment-queue.mjs`
- Modify: `catalog-harvester/check-enrichment-queue.mjs`

- [x] Parse evidence rows across schema sources.
- [x] Validate HTTPS URL, ISO date, scope, title/notes, enabled state and duplicate identities.
- [x] Count only valid outcomes toward recommendation/outcome coverage.
- [x] Preserve existing recommendation cohort ordering after removing covered bikes.
- [x] Keep missing evidence as a queue gap.

### Task 5: Verification

- [x] Pure parser/validation/coverage unit path GREEN locally.
- [x] Static repository contract updated for schema, migration, client fallback and release audit wiring.
- [ ] Run full `node --test tests/garage-no-upgrade-contracts.test.mjs` from a complete checkout.
- [ ] Run `npm run build:supabase-migrations && npm run check:release` on the free self-hosted Mac before merge.
- [ ] Update Notion GA-04 from In Progress to Done only after full release verification.
