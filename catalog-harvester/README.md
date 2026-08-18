# VeloQuest Catalog Harvester v1.2

Evidence-first ingestion pipeline for the Garage bicycle catalogue.

## Safety contract

- Bicycle model year must be explicit and within `2020..2026`.
- Evidence URL must be HTTPS and belong to an allow-listed manufacturer host.
- Missing/ambiguous fields remain unknown; no compatibility is inferred from similar names.
- Crawl rate is limited per host; `429` honors `Retry-After` and retries use exponential backoff.
- Raw HTML and image binaries are never written to Supabase.
- Import is idempotent on `(brand, model, model_year, trim, market)` and preserves deeper existing `specs`.
- Generated IDs include a normalized non-empty trim, and validation rejects both duplicate identities and duplicate IDs before SQL is emitted.
- Supabase SQL is emitted in chunks of at most 100 rows. The production orchestrator must check DB size before and after each chunk and stop at the configured hard limit.

## Commands

```bash
node catalog-harvester/build-wave16.mjs
node catalog-harvester/harvest.mjs validate catalog-harvester/batches/wave16.json
node catalog-harvester/harvest.mjs sql catalog-harvester/batches/wave16.json 0
node catalog-harvester/harvest.mjs crawl Haro https://archive.harobikes.com/mtb/2021
node catalog-harvester/harvest.mjs media Specialized https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503
npm run build:garage:enrichment-queue
node catalog-harvester/check-enrichment-queue.mjs
```

The final argument to `sql` is the zero-based chunk index. `validate` reports the number of chunks required by `batchSize`.

`crawl` is discovery-only: it emits candidates to stdout. `media` extracts HTTPS
product-image candidates only from an allow-listed manufacturer product page and
keeps that page as provenance. Production data still has to pass normalization,
HTTP content-type and evidence validation before batch upsert.

## Exact-product evidence workflow

Use the product-evidence pipeline when the catalog already has a bike identity and an exact manufacturer product/archive URL.

1. Rebuild the deterministic Garage enrichment queue, then generate a prioritized exact-product manifest automatically:

```bash
npm run build:garage:enrichment-queue
npm run garage:evidence:manifest -- \
  catalog-harvester/manifests/product-evidence.json \
  100
```

The manifest builder keeps only `product_candidate` rows whose manufacturer URL belongs to the configured official host allow-list and whose gaps can actually be proven from a product page (`photo`, core fields or exact factory fitment). Recommendation-only gaps are intentionally excluded.

2. Fetch and parse the pages into a reviewable evidence run:

```bash
npm run garage:evidence:extract -- \
  catalog-harvester/manifests/product-evidence.json \
  catalog-harvester/runs/product-evidence-2026-08-17.json
```

3. Review every result. Only entries with `status: ok` are compile-eligible; `ambiguous`, `insufficient`, and `fetch_error` are fail-closed.
4. Compile the reviewed evidence run into a deterministic source SQL wave:

```bash
npm run garage:evidence:compile -- \
  catalog-harvester/runs/product-evidence-2026-08-17.json \
  supabase/schema/catalog_enrichment_wave_35_exact_product_2026_08_17.sql
```

5. Run the normal migration generator/audits before any rollout.

The exact-product compiler may write explicit bike core specs, official product media, reusable components, and `factory_installed` fitments when the exact product page explicitly names the component. It **does not create `garage_compatibility`**, does not create `manufacturer_approved` fitments, and **does not create `no_upgrade`** outcomes. Compatibility must come from separate official component-manufacturer compatibility evidence; `no_upgrade` requires an explicit manufacturer statement.

The enrichment queue is a deterministic coverage plan generated from the full
release catalog. It records current counts, exact row shortfalls to each accepted
threshold, and one priority cohort per metric. `evidence_scope` describes how
specific the registered official URL appears; `product_candidate` is a research
priority, not a claim that the page already proves every requested field. Rebuild
and validate the queue after every evidence-backed enrichment wave.

The source registry intentionally spans many manufacturers; adapters can be deepened incrementally without changing the database schema.

## Live checkpoint — Wave 16

On 2026-08-09, Waves 15 and 16 expanded the live catalogue from 374 models / 38 represented brands to 663 models / 43 represented brands. The run kept the `2020+` gate and duplicate-identity count at zero. Detailed, reproducible run metadata is in `runs/wave15-2026-08-09.json` and `runs/wave16-2026-08-09.json`.
