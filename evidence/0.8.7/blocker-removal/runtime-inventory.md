# Runtime and production inventory

Captured: 2026-08-14
Project: `rvqiptyzsjcunzjhofid`

## Runtime

- Local Docker: unavailable.
- Local Supabase CLI: unavailable.
- Local Deno: unavailable.
- Local GitHub CLI: unavailable.
- Connected GitHub installation: no VeloQuest repository exists.
- Supabase hosted branch: rejected because the current quoted cost is USD 0.01344/hour.
- Selected free runtime: isolated schemas on the production PostgreSQL 17 cluster, with no references to `public` or live `auth.users`, followed by explicit schema deletion.

## Production before rollout

- Project status: `ACTIVE_HEALTHY`.
- PostgreSQL: 17.6.1.155.
- Migration history: only `20260806190230` and `20260809105149` history stubs.
- Auth users, profiles, bikes, rides, ride imports, XP ledger, quest runs, client events and Strava credentials: all zero.
- Live catalogue: 668 total / 663 enabled, 43 brands, no Hagen rows.
- Security Advisor: zero findings.
- Performance Advisor: four expected missing FK indexes plus unused-index informational notices.
- Seven Edge Functions active; exact previous source bundle is stored in `evidence/production-preflight-2026-08-14/edge-rollback/` outside this source tree.

## Root causes removed

1. Docker absence was bypassed with isolated-schema replay on the exact production PostgreSQL engine.
2. `activate_quest_alpha` had a PostgreSQL 17 ambiguous `code` reference; the template alias is now explicit.
3. `consume_route_generation_quota` counted a newly inserted request twice; a successful insert now returns immediately.
4. Catalogue metrics distinguish 723 total rows from 718 enabled rows after Hagen. Five retained legacy rows are disabled.
