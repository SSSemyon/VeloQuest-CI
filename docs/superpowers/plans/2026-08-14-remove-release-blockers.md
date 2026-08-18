# VeloQuest Release Blockers Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every release blocker that can be safely closed from the current environment, reach Production GO only after green evidence, and leave only physical actions that require the user's Mac or devices.

**Architecture:** Treat the release as three irreversible gates: evidence capture, database/Edge rollout, and runtime validation. Read-only inspection and disposable/local validation happen first; production DDL and function deployment are allowed only when a restorable rollback artifact and reward/RLS tests are green. Device artifacts are rebuilt only from the resulting approved source.

**Tech Stack:** Expo SDK 57, React Native, TypeScript, Supabase Postgres/Auth/Edge Functions, pgTAP, Supabase CLI 2.113.0, Xcode Personal Team.

## Global Constraints

- Never replay `20260811000000_veloquest_full_baseline.sql` blindly on production.
- Production mutations require green BE-02/BE-03 evidence and an exact rollback target.
- XP, quest, H3 and canonical Ride stay server-authoritative.
- Manual/historical GPX/FIT and cross-source duplicates must award zero additional XP.
- Unknown compatibility remains default-deny; no guessed catalogue data.
- Use free tooling unless the user explicitly approves a paid service.
- Preserve the current empty-production data window; stop immediately if user data counts are no longer zero.

---

### Task 1: Runtime and production inventory

**Files:**
- Create: `evidence/0.8.7/blocker-removal/runtime-inventory.md`
- Modify: none

**Interfaces:**
- Consumes: production project `rvqiptyzsjcunzjhofid` and RC 0.8.7 files.
- Produces: immutable inventory of available runtimes, migrations, schema, functions, advisors and row counts.

- [ ] Check Docker, Supabase CLI, Deno, GitHub CLI and safe environment-variable names without printing values.
- [ ] Fetch production project, migrations, public/private tables, Edge Functions, extensions and advisors through read-only Supabase tools.
- [ ] Query row counts and reward-trust function signatures without mutating production.
- [ ] Write the evidence file and identify the exact environmental root cause of each blocker.

### Task 2: Restorable rollback evidence

**Files:**
- Create: `evidence/0.8.7/blocker-removal/pre-rollout-snapshot.sql`
- Create: `evidence/0.8.7/blocker-removal/restore-procedure.md`
- Create: `evidence/0.8.7/blocker-removal/edge-rollback/`

**Interfaces:**
- Consumes: live schema/function definitions and current Edge sources.
- Produces: reviewable pre-change logical snapshot plus exact Edge rollback bundle.

- [ ] Export all live user-table data in restorable SQL form; require zero rows before continuing.
- [ ] Export live custom functions, policies, constraints, indexes, triggers and migration history needed to reconstruct the pre-change state.
- [ ] Save all seven deployed Edge Function source bundles and metadata.
- [ ] Verify snapshot completeness by comparing exported object counts with live inventory.
- [ ] Record restore order, rollback triggers and owner.

### Task 3: Reproducible database and reward-trust preflight

**Files:**
- Modify only if a reproducible defect is found: `supabase/migrations/*.sql`, `supabase/tests/database/*.sql`, `tests/*.test.mjs`
- Create: `evidence/0.8.7/blocker-removal/preflight-results.md`

**Interfaces:**
- Consumes: six generated migrations and database tests.
- Produces: two independent reset results plus RLS/reward-trust evidence.

- [ ] Prefer a local Docker/Supabase CLI stack; if unavailable, use a free authenticated CI runner or safe disposable database.
- [ ] Run clean reset #1 and #2 from the same source.
- [ ] Run pgTAP database tests.
- [ ] Run two-user RLS isolation, forged legacy XP, duplicate reward and historical/manual GPX/FIT zero-reward smokes.
- [ ] If any behavior fails, add a failing regression first, implement the smallest fix, then repeat all checks.

### Task 4: Controlled production database rollout

**Files:**
- Create: `evidence/0.8.7/blocker-removal/production-rollout.md`

**Interfaces:**
- Consumes: green Tasks 1–3 evidence.
- Produces: production schema at the approved 0.8.7 forward state.

- [ ] Reconfirm zero user-data counts and migration history immediately before change.
- [ ] Prove object-by-object baseline parity; mark baseline history only when every object is accounted for.
- [ ] Confirm pending sequence is exactly release hardening, catalogue catch-up and Hagen catalogue.
- [ ] Apply only those three forward migrations in order.
- [ ] Recheck schema contracts, migrations, advisors and row counts.

### Task 5: Controlled Edge rollout and production smoke

**Files:**
- Modify only if a tested defect is found: `supabase/functions/**`
- Append: `evidence/0.8.7/blocker-removal/production-rollout.md`

**Interfaces:**
- Consumes: green database rollout and approved 0.8.7 function sources.
- Produces: deployed Edge parity and production smoke evidence.

- [ ] Deploy `migrate-local-alpha`, `ride-processor`, `route-generator` and `strava-sync` with their existing JWT settings.
- [ ] Compare deployed source hashes with local source hashes.
- [ ] Execute auth/RLS/quest/import/privacy/route quota/forged-XP/duplicate/historical reward smoke with isolated test users.
- [ ] Clean up test data and rerun security/performance advisors and logs.
- [ ] Observe for errors and set Production GO only when no P0/P1 regression appears.

### Task 6: Fresh device artifacts and remaining physical gates

**Files:**
- Modify: `RC_0_8_7.md`, `PRE_DEVICE_QA.md`
- Create: fresh release ZIP/APK when the required platform runner is available.

**Interfaces:**
- Consumes: Production GO source.
- Produces: device-installable builds and a precise physical QA checklist.

- [ ] Rebuild the iOS Xcode source bundle after Production GO and verify native metadata.
- [ ] Build a fresh Android APK through the free build path.
- [ ] Run physical iPhone/iPad/Android phone/tablet E2E with screenshots.
- [ ] Fix every reproduced P0/P1 test-first and repeat the complete E2E.
- [ ] Update Tasks, `00 ACTIVE` and Iteration Archive with evidence and the next exact action.
