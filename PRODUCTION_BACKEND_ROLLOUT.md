# Production backend rollout — VeloQuest 0.8.9

This runbook is non-executing. Production mutation requires explicit approval, a backup/restore owner and a reviewed maintenance window.

## Verified source

- Code commit: `dc9b8ce9929d15dddf868958e60783a11c0c0245`
- Quality #178: https://github.com/SSSemyon/VeloQuest/actions/runs/31878680960
- Migration delta: `20260814230000_auth_achievements_0_8_9.sql`
- Changed/dependent functions: `vk-auth-start`, `vk-auth-callback`, `vk-auth-finish`, `ride-processor`, `strava-sync`.

## Free-plan preparation

Use the local Supabase stack on the self-hosted Mac. Do not create a paid hosted preview branch.

```bash
npm ci
npm run check:release
npx --yes supabase@2.113.0 start
npx --yes supabase@2.113.0 db reset --local
npx --yes supabase@2.113.0 db reset --local
npx --yes supabase@2.113.0 test db
npx --yes supabase@2.113.0 stop --no-backup
```

The automated equivalent passed in quality #178.

## Mandatory preconditions

1. Capture a restorable database backup plus Auth URL/provider settings, Edge secrets inventory, webhook settings and deployed function hashes.
2. Record live `migration list`, schema diff, security/performance advisors and current production function hashes.
3. Rehearse the in-place upgrade against a local restore of the production snapshot; a clean bootstrap alone is insufficient.
4. Resolve migration history explicitly. Never replay the full baseline or mark it applied without object-level parity evidence.
5. `db push --linked --dry-run` must show only reviewed forward migrations. Any unknown, remote-only or baseline migration is STOP.
6. Configure exact redirect URIs from `OAUTH_PROVIDER_SETUP_0_8_9.md`.
7. Generate independent backend-only `VK_BRIDGE_ENCRYPTION_KEY` and `RIDE_CONNECTOR_ATTESTATION_KEY`; never place them in Expo/source/logs.
8. Record the previous known-good commit and a deployable rollback bundle.

## Controlled order after explicit approval

1. Link to the expected project ref and verify operator identity.
2. Capture pre-change backup, migration list, advisors and function hashes.
3. Run reviewed linked dry-run.
4. Apply only the verified forward migration set, ending with `20260814230000_auth_achievements_0_8_9.sql`.
5. Set provider/backend secrets and Auth redirect configuration.
6. Deploy the three VK functions plus `ride-processor` and `strava-sync` from the same approved commit, preserving committed auth modes.
7. Run two-user RLS, forged-source/XP, duplicate, historical/manual, GPS-spike, idempotency and concurrency smokes.
8. Run real Google/VK provider E2E.
9. Capture post-change advisors, schema diff and source hashes; remove temporary users/data.
10. Observe errors and latency through the maintenance window.

## Rollback triggers

- Cross-user visibility or mutation.
- Duplicate or untrusted XP/achievement/cosmetic reward.
- OAuth replay, account-link conflict bypass or secret exposure.
- Unexpected migration, advisor regression or Edge availability loss.

On a trigger, stop rollout, restore previous Edge versions and use the recorded backup/settings bundle. Do not reverse schema blindly.

## Current status

Automated credential-independent preflight is GREEN. Provider E2E and physical-device QA remain open. Production has not been changed.
