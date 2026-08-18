import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = process.argv[2] || 'vq_target_smoke';
const privateSchema = `${schema}_private`;
if (!/^vq_[a-z0-9_]+$/.test(schema)) throw new Error('scratch schema must start with vq_');

const migrations = [
  '20260811000000_veloquest_full_baseline.sql',
  '20260811190000_release_hardening.sql',
  '20260812170000_catalog_enrichment_catchup_waves_17_19.sql',
  '20260814190000_catalog_hagen_complete.sql',
];

const transform = (input) => input
  .replaceAll('auth.users', `${schema}.auth_users`)
  .replaceAll('public.', `${schema}.`)
  .replaceAll('private.', `${privateSchema}.`)
  .replaceAll('create schema if not exists private;', `create schema if not exists ${privateSchema};`)
  .replaceAll('on schema private', `on schema ${privateSchema}`)
  .replaceAll('search_path = public, extensions', `search_path = ${schema}, extensions`)
  .replaceAll('search_path = public, pg_temp', `search_path = ${schema}, pg_temp`)
  .replaceAll('search_path = public', `search_path = ${schema}`)
  .replaceAll('on schema public', `on schema ${schema}`);

const migrationSql = migrations
  .map((file) => transform(fs.readFileSync(path.join(root, 'supabase/migrations', file), 'utf8')))
  .join('\n');

const smokeSql = `
grant usage on schema ${schema} to authenticated;
create table ${schema}.smoke_results(name text primary key, passed boolean not null, detail text);
grant insert, select on ${schema}.smoke_results to authenticated;

insert into ${schema}.auth_users(id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner-a@veloquest.test'),
  ('22222222-2222-4222-8222-222222222222', 'owner-b@veloquest.test');
insert into ${schema}.bikes(id, user_id, mode, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'real', 'Owner A bike'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '22222222-2222-4222-8222-222222222222', 'real', 'Owner B bike');

create or replace function ${schema}.forbidden_cross_user_insert_blocked()
returns boolean language plpgsql security invoker set search_path = '' as $fn$
begin
  insert into ${schema}.bikes(user_id, mode, name)
  values ('22222222-2222-4222-8222-222222222222', 'veloquest', 'Forbidden');
  return false;
exception when insufficient_privilege then return true;
end $fn$;
grant execute on function ${schema}.forbidden_cross_user_insert_blocked() to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
insert into ${schema}.smoke_results values
  ('rls_select_isolation', (select count(*) = 1 from ${schema}.bikes), 'A sees only A bike'),
  ('rls_cross_insert_blocked', ${schema}.forbidden_cross_user_insert_blocked(), 'A cannot insert B bike');
with changed as (
  update ${schema}.bikes set name = 'blocked'
  where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' returning 1
)
insert into ${schema}.smoke_results
select 'rls_cross_update_hidden', count(*) = 0, 'A cannot update B bike' from changed;
with removed as (
  delete from ${schema}.bikes
  where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' returning 1
)
insert into ${schema}.smoke_results
select 'rls_cross_delete_hidden', count(*) = 0, 'A cannot delete B bike' from removed;
insert into ${schema}.smoke_results
select 'quest_activation', code = 'new_land', 'server quest activation'
from ${schema}.activate_quest_alpha('new_land', false);
insert into ${schema}.smoke_results values
  ('route_quota_first', ${schema}.consume_route_generation_quota(2, 60), 'first allowed');
insert into ${schema}.smoke_results values
  ('route_quota_second', ${schema}.consume_route_generation_quota(2, 60), 'second allowed');
insert into ${schema}.smoke_results values
  ('route_quota_denied', not ${schema}.consume_route_generation_quota(2, 60), 'third denied');
reset role;

do $smoke$
declare r1 jsonb; r2 jsonb; r3 jsonb;
begin
  r1 := ${schema}.process_ride_alpha(
    '11111111-1111-4111-8111-111111111111', 'gpx_fit', 'manual-1', 'source-manual-1', 'cross-1',
    now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 3600, 20000, 100, 5.5,
    '{"type":"LineString","coordinates":[[0,0],[0.1,0.1]]}'::jsonb, array['881']::text[], 'new_land', 0, false);
  insert into ${schema}.smoke_results values
    ('historical_zero_xp', coalesce((r1->>'xpAwarded')::int, -1) = 0
      and coalesce((r1->'quest'->>'rewardEligible')::boolean, true) = false, 'manual historical-only');
  r2 := ${schema}.process_ride_alpha(
    '11111111-1111-4111-8111-111111111111', 'gpx_fit', 'manual-1-dup', 'source-manual-1', 'cross-1',
    now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 3600, 20000, 100, 5.5,
    '{"type":"LineString","coordinates":[[0,0],[0.1,0.1]]}'::jsonb, array['881']::text[], 'new_land', 0, true);
  insert into ${schema}.smoke_results values
    ('same_source_duplicate_zero_xp', coalesce((r2->>'duplicate')::boolean, false)
      and coalesce((r2->>'xpAwarded')::int, -1) = 0, 'same-source duplicate protected');
  r3 := ${schema}.process_ride_alpha(
    '11111111-1111-4111-8111-111111111111', 'strava', 'strava-dup', 'source-strava-dup', 'cross-1',
    now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 3600, 20000, 100, 5.5,
    '{"type":"LineString","coordinates":[[0,0],[0.1,0.1]]}'::jsonb, array['881']::text[], 'new_land', 0, true);
  insert into ${schema}.smoke_results values
    ('cross_source_duplicate_zero_xp', coalesce((r3->>'duplicate')::boolean, false)
      and coalesce((r3->>'xpAwarded')::int, -1) = 0, 'cross-source duplicate protected');
  insert into ${schema}.smoke_results values
    ('xp_ledger_unchanged', (select count(*) = 0 from ${schema}.xp_ledger), 'no reward ledger rows'),
    ('historical_flag', (select bool_and(is_historical) from ${schema}.rides), 'canonical historical flag');
end $smoke$;

do $verify$
declare failed text;
begin
  select string_agg(name, ', ' order by name) into failed from ${schema}.smoke_results where not passed;
  if failed is not null then raise exception 'smoke failures: %', failed; end if;
  if (select count(*) from ${schema}.bike_catalog_models where enabled) <> 718 then raise exception 'target enabled models mismatch'; end if;
  if (select count(distinct brand) from ${schema}.bike_catalog_models where enabled) <> 44 then raise exception 'target brands mismatch'; end if;
  if (select count(*) from ${schema}.bike_catalog_models where lower(brand) = 'hagen') <> 55 then raise exception 'Hagen mismatch'; end if;
  if (select count(*) from ${schema}.garage_components) <> 45 then raise exception 'component mismatch'; end if;
  if (select count(*) from ${schema}.garage_compatibility) <> 20 then raise exception 'compatibility mismatch'; end if;
  if (select count(*) from ${schema}.bike_catalog_component_fitments) <> 61 then raise exception 'fitment mismatch'; end if;
end $verify$;

select jsonb_build_object(
  'result', 'target_smoke_pass',
  'checks', (select jsonb_object_agg(name, passed order by name) from ${schema}.smoke_results),
  'totalModels', (select count(*) from ${schema}.bike_catalog_models),
  'enabledModels', (select count(*) from ${schema}.bike_catalog_models where enabled),
  'brands', (select count(distinct brand) from ${schema}.bike_catalog_models where enabled),
  'hagen', (select count(*) from ${schema}.bike_catalog_models where lower(brand) = 'hagen'),
  'components', (select count(*) from ${schema}.garage_components),
  'compatibility', (select count(*) from ${schema}.garage_compatibility),
  'fitments', (select count(*) from ${schema}.bike_catalog_component_fitments)
) as evidence;
drop schema ${schema} cascade;
drop schema ${privateSchema} cascade;
`;

process.stdout.write(`create schema ${schema};\ncreate table ${schema}.auth_users(id uuid primary key, email text);\n${migrationSql}\n${smokeSql}`);
