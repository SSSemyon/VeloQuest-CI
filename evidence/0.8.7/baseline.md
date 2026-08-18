# VeloQuest 0.8.7 baseline

Date: 2026-08-14

Source: VeloQuest 0.8.6 archive, SHA-256 `272baa104cf432902a0dadd6737aa21c167959e8d621854afdc7c44e666be3c7`.

Dependency evidence: the reused dependency tree has the same `package-lock.json` SHA-256 as this source: `4b9e78d5bc34eb8594c1932de963899fcbe9b497215e995bf5e60e7463bf8089`.

## Results

- TypeScript `tsc --noEmit`: PASS.
- Node tests: 28/28 PASS.
- SQL parser/build check: PASS; 5 migrations and `rls_bikes.test.sql` parsed.
- Backend reproducibility audit: PASS; 25 RLS-covered public tables and 7 Edge Functions.
- Catalog integrity: PASS; 663 models, 43 brands, model years 2020–2026.
- Strict Garage audit and deterministic enrichment queue: PASS.
- Enrichment queue validation: PASS; 659 entries.
- Fresh iOS Expo export: PASS; 923 modules.
- Clean iOS prebuild without dependency installation: PASS.

## Environment diagnostic

An initial Expo command failed before application evaluation because telemetry attempted to create `/root/.expo`, which is not writable in this sandbox. Root cause is the execution environment, not VeloQuest. Running the supported `EXPO_NO_TELEMETRY=1 CI=1` mode removed that write and both export and prebuild completed.

## Defect inventory

No new reproducible source P0/P1 was found by the baseline gates. Existing production drift and unexecuted Docker/physical-device gates remain release blockers and are not reclassified as source defects.
