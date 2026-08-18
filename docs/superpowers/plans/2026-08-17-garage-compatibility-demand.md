# Garage Compatibility Demand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the remaining 100% recommendation/outcome gap into a deterministic, evidence-only component research queue ranked by how many uncovered bikes each official compatibility verdict can close.

**Architecture:** Parse the existing Garage SQL graph without mutating it, canonicalize installed OEM components through reviewed aliases, identify active bikes that still lack recommendation/outcome coverage, and rank source components by uncovered-bike impact. The planner produces research demand only; a compatibility verdict continues to require explicit official component-manufacturer evidence before SQL is authored.

**Tech Stack:** Node.js ESM, built-in `node:test`, existing Garage SQL sources and recommendation coverage core.

## Global Constraints

- Maximum Garage acceptance remains 100/100/100/100 across the full active catalog.
- Unknown compatibility remains default-deny and uncovered.
- The demand planner never creates `garage_compatibility`, `manufacturer_approved`, or `no_upgrade` rows.
- Official product/component evidence remains mandatory for every persisted verdict.
- No production mutation.

---

### Task 1: Pure compatibility demand core

**Files:**
- Create: `scripts/garage-compatibility-demand-core.mjs`
- Test: `tests/garage-compatibility-demand.test.mjs`

**Interfaces:**
- Consumes: `{ activeModelIds, fitments, aliases, compatibility, explicitOutcomeBikeIds, components }`.
- Produces: `{ uncoveredBikeIds, demand[] }`, where each demand item contains exact/canonical component identity, category, affected bikes and impact count.

- [ ] Write tests proving already-covered bikes disappear from demand.
- [ ] Write tests proving aliases aggregate OEM identities under one canonical component.
- [ ] Write tests proving demand is ranked by number of uncovered bikes, then stable component ID.
- [ ] Implement pure planner without creating verdicts.

### Task 2: SQL inventory parser and CLI

**Files:**
- Create: `scripts/build-garage-compatibility-demand.mjs`
- Modify: `package.json`
- Test: `tests/garage-compatibility-demand-cli-contract.test.mjs`

**Interfaces:**
- Reads all Garage schema SQL, the deterministic enrichment queue, and validated no-upgrade outcomes.
- Writes deterministic JSON research demand to `catalog-harvester/compatibility-demand.json` or stdout.

- [ ] Parse component, fitment, alias and compatibility rows from schema SQL using fail-closed tuple parsing.
- [ ] Restrict demand to active catalog IDs and recommendation-outcome gaps.
- [ ] Add `garage:compatibility:demand` package script.
- [ ] Add a static contract test that output is a planner only and contains no SQL mutation path.

### Task 3: Release integration

**Files:**
- Modify: `catalog-harvester/check-enrichment-queue.mjs`
- Modify: `.github/workflows/garage-evidence-batch.yml`

- [ ] Build the compatibility demand artifact after each queue rebuild.
- [ ] Save it beside evidence provenance on the self-hosted runner.
- [ ] Report uncovered recommendation bikes and top component demands without treating the report as coverage.
- [ ] Keep final `check-garage-maximum` fail-closed until actual 100% evidence exists.
