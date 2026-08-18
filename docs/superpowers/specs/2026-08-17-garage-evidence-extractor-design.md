# Garage Evidence Extractor Design

## Goal

Scale VeloQuest Garage enrichment from manual SQL waves to a deterministic evidence pipeline that can close photo, core-spec and exact factory-fitment gaps while preserving default-deny compatibility semantics.

## Release acceptance

Maximum Garage is complete only at **100/100/100/100** across the entire active catalog:

- official photo coverage = 100%;
- core finder specs = 100%;
- exact factory fitment = 100%;
- recommendation or evidence-backed no-upgrade outcome = 100%.

The denominator may not be reduced merely to pass the gate. Guessed compatibility, synthetic values and unknown outcomes never count as coverage.

## Constraints

- Only HTTPS pages on the brand allow-list in `catalog-harvester/config.json` are evidence sources.
- Enabled bike model years remain 2020–2026.
- The extractor never creates `garage_compatibility`, `manufacturer_approved` fitment or `no_upgrade` outcomes from a factory specification page.
- Missing/ambiguous fields remain unknown and therefore remain an open 100% coverage gap.
- Product extraction never mutates production. It writes reviewable candidate artifacts and deterministic source SQL only.
- Component fitment is `factory_installed` only when the exact component value is published on the exact bike product/archive page.
- Official image discovery uses Product JSON-LD / OpenGraph metadata and the exact source page.
- Existing free/self-hosted release tooling remains the verification path.
- Each evidence materialization wave contains at most 100 catalog models.

## Architecture

### 1. Pure evidence parser

`catalog-harvester/product-evidence-core.mjs` parses supplied HTML without network access. It extracts:

- Product JSON-LD and OpenGraph media;
- explicit label/value pairs from JSON-LD `additionalProperty`, tables and definition lists;
- canonical evidence candidates for `frame_material`, `wheel_size`, drivetrain and brakes;
- exact rear-derailleur/brake component candidates when a published value is sufficiently specific.

Every candidate retains `source_label`, `source_value` and `source_page_url` so the transformation is auditable.

### 2. Strict canonicalization

`catalog-harvester/product-evidence-rules.mjs` contains deterministic aliases and normalization only. Material is normalized only when an explicit Frame/Frame Material value states carbon/aluminium/alloy/steel/chromoly/titanium. Wheel size is accepted only from explicit wheel-size labels. Drivetrain and brake values are accepted only from explicit drivetrain/groupset/derailleur/brake labels.

Brand overrides may tighten aliases; they may not infer missing values.

### 3. Network runner

`catalog-harvester/extract-product-evidence.mjs` reuses the official-host registry, user agent, retry policy and per-host throttle. It consumes exact `manufacturer_url` values from an input manifest or enrichment queue, fetches each page, and writes JSON evidence candidates. Different official hosts may execute concurrently up to `maxConcurrentHosts`; requests to the same host remain sequential. It never writes SQL directly.

### 4. Deterministic compiler

`catalog-harvester/compile-product-evidence.mjs` converts validated candidate JSON into one source SQL wave:

- `bike_catalog_models.specs` updates only explicit canonical fields;
- `bike_catalog_images` rows for official product media;
- `garage_components` + `bike_catalog_component_fitments` for exact factory-installed rear derailleur/brake components;
- no compatibility or recommendation rows.

The compiler fails closed on unknown bike IDs, non-official hosts, missing evidence dates, duplicate identities or unsupported candidate status.

### 5. Compatibility is a separate evidence stream

Recommendation coverage is not derived from product specs. A separate registry maps installed component models to compatible/conditional/incompatible targets using official component-manufacturer compatibility documents. `no_upgrade` remains a separate explicit manufacturer-evidence outcome.

## Data flow

`enrichment queue / manifest → official product page → pure parser → reviewable JSON candidate → strict compiler → source SQL wave → generated migration → static audit → Supabase replay/RLS → controlled rollout`

## Failure handling

- 403/404/429/vendor HTML changes: record fetch/extraction failure; no partial trusted row.
- Multiple conflicting values for one canonical field: mark field ambiguous and omit it.
- Non-official image/source host: reject.
- Generic archive/index page instead of exact product page: candidate is not compile-eligible.
- Component value without a stable model-like token: keep the text in bike specs but do not create a reusable Garage component.
- A failed/insufficient model remains in the completion queue until an alternative exact official source is resolved; it is never silently removed from the denominator.

## Testing

- Pure parser fixtures cover JSON-LD, table and definition-list extraction.
- Tests prove ambiguous fields stay unknown.
- Tests prove non-official sources are rejected.
- Compiler tests prove only factory-installed fitment is emitted and no compatibility/outcome SQL can appear.
- Manifest tests prove each wave is capped at 100 models.
- Runner tests prove cross-host concurrency does not create same-host concurrency or nondeterministic output ordering.
- Release audit requires actual **100/100/100/100** after deterministic replay.
