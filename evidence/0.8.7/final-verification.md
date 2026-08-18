# VeloQuest 0.8.7 final verification

Date: 2026-08-14

## Green checks

- `tsc --noEmit`: pass.
- `node --test tests/*.test.mjs`: 34/34 pass.
- migration generator drift check: pass; six migrations.
- SQL parser/database-test discovery: pass.
- backend reproducibility audit: pass; 25 RLS-covered tables and seven Edge Functions statically audited.
- expected pending sequence after baseline history repair: release hardening, catalogue catch-up, Hagen catalogue.
- Hagen evidence checker: pass; 55 model-year identities, 2024–2026, six official families.
- catalogue integrity: pass; 718 models and 44 brands.
- strict Garage and enrichment queue validation: pass.
- fresh iOS Expo export: pass; 923 modules.
- fresh clean iOS prebuild: pass.
- generated native iOS contract: pass; version 0.8.7/build 7, HealthKit, iPhone/iPad, bundle ID and deep-link scheme.

## Edge source continuity

The Edge Functions were not changed in 0.8.7. A fresh Deno type-check was unavailable because this environment has no Deno runtime; the source hashes remain:

- `_shared/rideMetrics.ts`: `1ac8f396a80de14d724faee01bc101128409d7ce57606035af2dc4f66a2647c0`
- `migrate-local-alpha/index.ts`: `27659c7085b41bc3af618ff562cd072cf6b504340e0bfe69d4d26a5661affaf5`
- `ride-processor/index.ts`: `40ab0a678502100f306148347d7da123b85b89152664f8155412192b764b50ff`
- `route-generator/index.ts`: `3a74e5a41647959284072e216dbeb2756e5c9fe5e5771137ddf196beb6bceb0e`
- `strava-sync/index.ts`: `e100119e611cfec0fdd52a91458145672385fedda9fb27887f5c3e2af8a75529`
- `strava-webhook/index.ts`: `28ccd0f963396c23851ca90621f2756f3455d9a89ac2c2ef67a4a2e077f0d5bd`
- `strava-oauth/index.ts`: `d15cda9b6f0f2705ff3b399030f37f2db6ba7939148e0b56c02df84aff6b9be0`
- `delete-account/index.ts`: `dd2d652824d9ab7d1b14aa6b2250ccc523ec491cebc1d0c52a865a169d2714d9`

## Unclosed external gates

- Production Supabase was not mutated and remains HOLD.
- BE-02/BE-03 runtime evidence is incomplete because no Docker/Supabase runtime or restorable production backup evidence is available in this workspace.
- Physical-device E2E and screenshots remain pending.
