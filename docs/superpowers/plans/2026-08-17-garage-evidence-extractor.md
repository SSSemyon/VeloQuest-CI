# Garage Evidence Extractor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic official-product evidence pipeline that scales Garage photo/core/factory-fitment enrichment without creating inferred compatibility or recommendation outcomes.

**Architecture:** Keep parsing pure and testable, network fetching separate, and SQL compilation fail-closed. Product pages may create specs/media/factory fitment only; compatibility remains a separate evidence stream.

**Tech Stack:** Node.js ESM, built-in `node:test`, existing VeloQuest harvester config, SQL source waves, Supabase migration generator.

## Global Constraints

- Official HTTPS brand hosts only.
- Model years 2020–2026.
- No inferred `garage_compatibility`, `manufacturer_approved` or `no_upgrade` from bike product pages.
- Missing or conflicting evidence remains unknown.
- No production mutation in this implementation plan.

---

### Task 1: Pure product evidence parser

**Files:**
- Create: `catalog-harvester/product-evidence-core.mjs`
- Test: `tests/product-evidence-core.test.mjs`

**Interfaces:**
- Produces: `parseProductEvidence({ brand, sourcePageUrl, html }) -> { media, properties, canonical, components, ambiguities }`

- [ ] Write failing fixture tests for Product JSON-LD image, table/dl label-value extraction, explicit frame material, explicit wheel size, drivetrain/brakes, and ambiguous duplicate values.
- [ ] Run the focused Node test and verify RED because the parser module does not exist.
- [ ] Implement the minimal parser with HTML entity cleanup and exact label matching.
- [ ] Run focused tests and verify GREEN.
- [ ] Commit.

### Task 2: Official-source validation and normalization rules

**Files:**
- Create: `catalog-harvester/product-evidence-rules.mjs`
- Modify: `catalog-harvester/product-evidence-core.mjs`
- Test: `tests/product-evidence-rules.test.mjs`

**Interfaces:**
- Produces: `isOfficialEvidenceUrl(brand, url, config)`, `canonicalizeEvidence(properties)`.

- [ ] Write failing tests for official-host allow-list, material normalization and conflicting fields.
- [ ] Verify RED.
- [ ] Implement strict aliases/normalizers; no inference from unrelated text.
- [ ] Verify GREEN.
- [ ] Commit.

### Task 3: Network extractor

**Files:**
- Create: `catalog-harvester/extract-product-evidence.mjs`
- Test: `tests/product-evidence-runner.test.mjs`

**Interfaces:**
- Consumes: manifest JSON `{ bike_id, brand, manufacturer_url }[]`.
- Produces: evidence-run JSON with per-bike `ok|fetch_error|ambiguous|insufficient` status.

- [ ] Write failing tests around manifest validation and deterministic output using injected fetch fixtures.
- [ ] Verify RED.
- [ ] Implement throttled fetch using existing config limits and parser.
- [ ] Verify GREEN without external network.
- [ ] Commit.

### Task 4: Fail-closed SQL compiler

**Files:**
- Create: `catalog-harvester/compile-product-evidence.mjs`
- Test: `tests/product-evidence-compiler.test.mjs`

**Interfaces:**
- Consumes: evidence-run JSON.
- Produces: source SQL for model specs, official image and `factory_installed` component fitments.

- [ ] Write failing tests proving exact SQL output and proving forbidden compatibility/outcome tokens never appear.
- [ ] Verify RED.
- [ ] Implement deterministic identifiers and SQL escaping.
- [ ] Verify GREEN.
- [ ] Commit.

### Task 5: Integrate with Garage workflow

**Files:**
- Modify: `package.json`
- Modify: `catalog-harvester/README.md`
- Test: `tests/product-evidence-workflow-contract.test.mjs`

**Interfaces:**
- Produces scripts for extraction, compilation and validation; existing migration discovery picks up compiled Wave34+ SQL automatically.

- [ ] Add failing workflow-contract test.
- [ ] Verify RED.
- [ ] Add package scripts and concise runbook.
- [ ] Verify GREEN.
- [ ] Commit.

### Task 6: First automated evidence batch

**Files:**
- Create: `catalog-harvester/manifests/wave34-product-pages.json`
- Create: `catalog-harvester/runs/wave34-2026-08-17.json`
- Create: `supabase/schema/catalog_enrichment_wave_34_*.sql`
- Create: `tests/garage-wave34-*.test.mjs`

**Interfaces:**
- Uses only exact official product URLs already present in the catalog/queue or independently verified manufacturer pages.

- [ ] Select a high-yield brand cohort with exact pages.
- [ ] Generate evidence-run candidates.
- [ ] Compile only unambiguous fields.
- [ ] Add regression test and generated migration.
- [ ] Re-run release/maximum audits when execution environment is available.
