# Garage Self-Hosted Closure Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one free self-hosted workflow invocation advance repeated verified Garage evidence/compatibility batches until 100% acceptance, bounded exhaustion, or no progress, without relying on recursive push triggers.

**Architecture:** Keep `agent/release-closure-0.8.9` isolated from `main`. Add one bounded shell orchestrator that runs the existing product-evidence, URL-resolution, compatibility, deferral, migration, audit, and manual-resolution commands in sequence. Each pass is verified and persisted before the next pass; stale remote-head detection prevents overwriting external changes. The existing Garage evidence workflow becomes the sole automatic closure workflow; the compatibility workflow remains manually dispatchable for focused diagnostics.

**Tech Stack:** GitHub Actions self-hosted macOS, Bash, Node.js/npm, existing VeloQuest Garage scripts, Git/GitHub `GITHUB_TOKEN`.

**Spec:** `docs/superpowers/plans/2026-08-17-release-closure-0.8.9.md`

## Global Constraints

- Use only free/self-hosted execution; no GitHub-hosted runners, PAT, GitHub App, or paid service.
- Preserve the strict 100/100/100/100 denominator over all active catalog models.
- Never infer manufacturer-approved upgrades or no-upgrade outcomes from generic compatibility evidence.
- Unresolved/manual evidence remains a blocking gap; no exclusions from the denominator.
- Never deploy or push Supabase production changes from the closure workflow.
- Every persisted pass must pass tests, catalog/core checks, Garage checks, SQL checks, and deterministic migration parity.

---

### Task 1: Define bounded-loop safety contract

**Files:**
- Create: `tests/garage-closure-loop-contract.test.mjs`
- Create: `scripts/run-garage-closure-loop.sh`

**Interfaces:**
- Consumes: existing npm scripts for Garage evidence/compatibility and `agent/release-closure-0.8.9` remote branch.
- Produces: one shell command that performs repeated verified closure passes and updates `WORK_HEAD` after each own push.

- [x] Write a static contract test requiring a bounded pass count, start/end maximum checks, all three evidence paths, no-progress break, strict verification before push, stale-head guard, and no production/deploy commands.
- [x] Add the shell orchestrator with default maximum 8 passes and hard cap 12.
- [x] Ensure each pass rebuilds the 100% queue before selecting work and refreshes it between evidence paths.
- [x] Run exact-product, archive→exact-product, and compatibility paths conditionally when candidates exist.
- [x] Update deferrals/manual queue and deterministic migrations every pass; stale run JSON is removed before every pass.
- [x] Verify `npm test`, `check:catalog`, `check:garage`, `check:sql`, and `check:migrations` before persisting a pass.
- [x] Compare remote branch head to `WORK_HEAD` before each push; after own push set `WORK_HEAD` to the new local head.
- [x] Break when maximum is reached or when the deterministic closure-state digest does not change.

### Task 2: Make Garage evidence workflow the automatic orchestrator

**Files:**
- Modify: `.github/workflows/garage-evidence-batch.yml`
- Modify: `tests/garage-evidence-workflow.test.mjs`

**Interfaces:**
- Consumes: `scripts/run-garage-closure-loop.sh`.
- Produces: automatic self-hosted closure execution on the feature branch, with local provenance capture and final 100% gate.

- [x] Replace duplicated one-pass workflow logic with setup + bounded-loop invocation + provenance + final maximum gate.
- [x] Keep `runs-on: [self-hosted, macOS]`, shared Garage concurrency group, and no production commands.
- [x] Preserve branch synchronization before loop execution.
- [x] Update workflow contract tests to require the loop script and strict migration contract.
- [x] Make fresh external triggers supersede stale Garage runs; internal `GITHUB_TOKEN` pushes do not recursively trigger the workflow.
- [x] Verify the final bot head with `check:release`, committed-state drift guard, clean local Supabase replay and DB tests after the 100% gate.

### Task 3: Remove duplicate automatic compatibility execution

**Files:**
- Modify: `.github/workflows/garage-compatibility-research.yml`
- Modify: `tests/garage-compatibility-research-workflow.test.mjs`

**Interfaces:**
- Consumes: same existing compatibility commands for focused diagnostics.
- Produces: manual-only compatibility workflow; automatic compatibility closure is owned by Task 2.

- [x] Remove `push` trigger from compatibility research workflow; retain `workflow_dispatch`.
- [x] Keep it self-hosted, fail-closed, reversible, strict-migration aware and read-only.
- [x] Update tests to assert manual-only triggering and no competing automatic Garage loop.

### Task 4: Verification and retrigger

**Files:**
- Modify: `.github/run-self-hosted`

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: one fresh external push trigger at the latest branch head.

- [x] Re-read changed workflow/script contracts for stale direct migration calls, stale retry reuse, competing automatic compatibility execution and paid runners.
- [x] Update `.github/run-self-hosted` with Attempt 13: bounded Garage closure loop + final release/local DB replay.
- [x] Query commit status without interpreting absent status contexts as success.
- [ ] Record runtime results only when the self-hosted runner actually reports them.

**Current runtime state:** Attempt 13 trigger commit `11b9a3f235c9f4482c99de583fede5303146079e` has been created. Combined status currently exposes no status contexts; this is **not** GREEN/FAIL evidence. Runtime verification remains pending.
