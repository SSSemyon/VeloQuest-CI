\set ON_ERROR_STOP on

-- Application-owned logical restore for the empty-user production snapshot.
-- Run from the root of the restore bundle with psql against a fresh Supabase project.
\ir supabase/migrations/20260811000000_veloquest_full_baseline.sql

-- Restore the exact pre-rollout migration history after verifying object counts.
insert into supabase_migrations.schema_migrations(version, name, statements)
values
  ('20260806190230', 'bike_catalog_search_and_filters', array['-- history compatibility stub']),
  ('20260809105149', 'catalog_performance_indexes_wave_16_2026_08_09', array['-- history compatibility stub']),
  ('20260811000000', 'veloquest_full_baseline', array['-- restored from verified full baseline'])
on conflict (version) do nothing;
