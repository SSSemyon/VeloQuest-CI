# Restore and rollback procedure

Rollback decision owner: Project owner (User).
Execution operator: authorized release operator.

## Database restore

The pre-rollout production project has zero user/auth data. Its application-owned state is reproduced by the full baseline migration; this was verified twice in clean isolated schemas on the same PostgreSQL 17 production cluster.

1. Create or select a fresh Supabase project with the same PostgreSQL major and installed `pg_trgm` extension.
2. Run `pre-rollout-snapshot.sql` from the root of this bundle using `psql` with `ON_ERROR_STOP`.
3. Verify: 25 RLS-enabled application tables, 668 total / 663 enabled catalogue rows, 43 enabled brands, 41 components, 14 compatibility rules and 50 fitments.
4. Reapply hosted Auth redirect URLs and Edge secrets from the operator-owned settings inventory; secrets are intentionally not stored in this bundle.
5. Deploy the exact previous Edge sources from `edge-rollback/` with the recorded `verify_jwt` values.
6. Recheck Security Advisor, auth provisioning and zero user-row counts before switching the client endpoint.

## Rollback triggers

- Any cross-user visibility or mutation.
- Forged, historical or duplicate ride awarding XP.
- Privacy-mask regression.
- Unknown migration/object drift.
- Security Advisor blocker or route-generation outage.

Schema rollback on the current project must not be attempted by reversing DDL. For a triggered rollback, restore application state into a fresh project from this logical bundle and redeploy the exact Edge rollback sources.
