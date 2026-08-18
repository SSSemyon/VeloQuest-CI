# VeloQuest 0.8.9 Release Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one exact VeloQuest 0.8.9 source checkpoint that implements the full agreed product scope, enforces all release contracts, reaches the Garage 80/80/60/60 acceptance thresholds from evidence-only data, and builds installable iOS/Android device candidates without production mutation.

**Architecture:** Keep the current Expo/React Native + Supabase architecture. All progression remains server-authoritative, compatibility remains evidence-only/default-deny, and release truth is tied to a single commit SHA. Autonomous work is separated into release contracts, mobile/security, backend replay, Garage evidence, native build, and documentation convergence, but all gates converge on the same SHA.

**Tech Stack:** Expo 57, React Native 0.86, TypeScript 6, Supabase/Postgres/Edge Functions, Node test runner, H3, MapLibre, HealthKit, Health Connect, GitHub Actions self-hosted macOS.

## Global Constraints

- No functional scope reduction.
- No production Supabase mutation before controlled rollout approval.
- No paid Apple Developer/TestFlight requirement; iOS QA uses Xcode Personal Team.
- Use free tooling paths only unless explicit financial approval is later given.
- Server-authoritative XP / quest / H3 / canonical Ride.
- Cross-source duplicates cannot mint extra XP.
- Historical/manual GPX/FIT cannot farm rewards.
- Privacy masking is mandatory.
- Real Bike and VeloQuest Bike remain separate concepts.
- Compatibility and upgrade outcomes require evidence; unknown is default deny; guessed compatibility = 0.
- Bike model years remain 2020+.
- Garage denominator remains 718 enabled models; release thresholds remain 575 photos, 575 core-spec cards, 431 exact-fitment bikes, 431 recommendation/outcome bikes.
- Release completion requires fresh verification evidence on one exact SHA.

---

### Task 1: Make release truth fail closed

**Files:**
- Create: `tests/release-closure-contracts.test.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`
- Modify: `.github/workflows/ios-device-candidate.yml`
- Modify: `.github/workflows/android-device-candidate.yml`
- Modify: `.github/workflows/garage-evidence-batch.yml`

**Interfaces:**
- Consumes: existing `check:garage:maximum`, deterministic migration/reset/RLS jobs.
- Produces: one canonical branch whose quality gate cannot pass below Garage maximum acceptance.

- [x] **Step 1: Write failing release regression contract.**
- [x] **Step 2: Confirm failure by source inspection:** prior `check:release` omitted `check:garage:maximum`; prior workflows omitted `agent/release-closure-0.8.9`.
- [x] **Step 3: Add maximum Garage gate to `check:release`.**
- [x] **Step 4: Add closure branch to quality/iOS/Android/evidence workflow filters.**
- [ ] **Step 5: Execute `npm test` and `npm run check:release` on a network-capable checkout; require exit 0 only after Garage thresholds are actually met.**

### Task 2: Mobile and security contract audit

**Files:**
- Inspect/modify as required: `App.tsx`, `src/**`, `app.json`, `tests/**`, `supabase/functions/**`.

**Interfaces:**
- Consumes: current auth/ride/achievement/Garage contracts.
- Produces: no silent no-op, no client-authoritative progression, no stale provider/deep-link/device permissions.

- [ ] **Step 1: Inventory all user-facing flows against the agreed concept.**
- [ ] **Step 2: Add a failing contract for every concrete defect found before changing production code.**
- [ ] **Step 3: Fix each root cause independently and keep existing security invariants.**
- [ ] **Step 4: Run TypeScript + Node + Edge checks.**

### Task 3: Backend deterministic replay and security

**Files:**
- Inspect/modify as required: `supabase/schema/**`, `supabase/migrations/**`, `supabase/tests/**`, `scripts/build-supabase-migrations.mjs`, `scripts/audit-backend-repro.mjs`.

**Interfaces:**
- Consumes: committed schema source order.
- Produces: deterministic migrations, reset ×2, two-user RLS, achievement concurrency/idempotency.

- [ ] **Step 1: Verify generated migration set exactly matches schema sources.**
- [ ] **Step 2: Reset local Supabase twice.**
- [ ] **Step 3: Run pgTAP/two-user RLS tests.**
- [ ] **Step 4: Run concurrent achievement processing test.**
- [ ] **Step 5: Record exact SHA and evidence; do not mutate production.**

### Task 4: Garage evidence completion

**Files:**
- Inspect/modify: `catalog-harvester/**`, `scripts/audit-garage-*.mjs`, `supabase/schema/catalog_enrichment_wave_*.sql`, generated migrations.

**Interfaces:**
- Consumes: 718-model enrichment queue, official manufacturer URLs/hosts, evidence parser/compiler.
- Produces: evidence-backed rows sufficient for 575/575/431/431 without guessed compatibility.

- [ ] **Step 1: Rebuild the enrichment queue from the exact closure SHA.**
- [ ] **Step 2: Extract official exact-product evidence in deterministic batches until photo/core/exact-fitment deficits are exhausted or a product is explicitly unresolvable.**
- [ ] **Step 3: Compile only fail-closed manufacturer evidence; compiler must not invent compatibility or no-upgrade outcomes.**
- [ ] **Step 4: Add evidence-backed compatibility/recommendation/no-upgrade outcomes only when literal manufacturer/component evidence supports them.**
- [ ] **Step 5: Rebuild migrations and run strict audit.**
- [ ] **Step 6: Require `check:garage:maximum` current >= required for all four metrics.**

### Task 5: Native candidate builds

**Files:**
- Inspect/modify: `app.json`, native contract tests, iOS/Android workflows.

**Interfaces:**
- Consumes: exact release SHA after Tasks 1–4.
- Produces: fresh unsigned iOS device candidate ZIP + Android debug QA APK, each with SHA-256.

- [ ] **Step 1: Clean Expo prebuild for iOS and Android.**
- [ ] **Step 2: Verify native identity, permissions, deep links, HealthKit/Health Connect contracts.**
- [ ] **Step 3: Build unsigned iPhoneOS Release.**
- [ ] **Step 4: Build installable Android debug APK.**
- [ ] **Step 5: Record artifact paths and hashes against the exact source SHA.**

### Task 6: Release convergence and adversarial review

**Files:**
- Modify: release documentation and Notion source of truth only after technical evidence exists.

**Interfaces:**
- Consumes: exact-SHA quality/backend/Garage/iOS/Android evidence.
- Produces: one unambiguous install target and no stale checkpoints.

- [ ] **Step 1: Re-run full release checklist on the exact final SHA with no code commits afterward.**
- [ ] **Step 2: Search for stale SHA, old current markers, mock/placeholder/no-op paths and inconsistent release claims.**
- [ ] **Step 3: Update PR and Notion ACTIVE/Tasks so only the final SHA is current.**
- [ ] **Step 4: Keep production rollout and physical provider/device E2E explicitly separate until executed.**
