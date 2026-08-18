-- SOURCE: supabase/schema/000_core_schema.sql
-- VeloQuest core schema baseline reconstructed from the active project.
-- Apply before every other file in this directory.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  avatar_url text,
  privacy_zone_radius_m integer not null default 250 check (privacy_zone_radius_m between 0 and 2000),
  privacy_zone_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('healthkit', 'health_connect', 'gpx_fit', 'strava')),
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'error')),
  external_account_id text,
  sync_enabled boolean not null default true,
  historical_import_days integer not null default 30 check (historical_import_days between 0 and 30),
  last_synced_at timestamptz,
  sync_cursor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind)
);

create table if not exists public.bikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('real', 'veloquest')),
  name text not null check (char_length(name) between 1 and 100),
  brand text,
  model text,
  model_year integer check (model_year is null or model_year between 1900 and 2100),
  bike_type text,
  photo_uri text,
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  catalog_verified boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bikes_one_active_per_user_idx on public.bikes(user_id) where is_active;
create index if not exists bikes_user_idx on public.bikes(user_id);

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bike_id uuid references public.bikes(id) on delete set null,
  cross_source_fingerprint text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null check (ended_at >= started_at),
  moving_time_seconds integer not null check (moving_time_seconds >= 0),
  distance_meters double precision not null check (distance_meters >= 0),
  elevation_gain_meters double precision check (elevation_gain_meters is null or elevation_gain_meters >= 0),
  average_speed_mps double precision check (average_speed_mps is null or average_speed_mps >= 0),
  route_geojson jsonb check (route_geojson is null or jsonb_typeof(route_geojson) = 'object'),
  is_historical boolean not null default false,
  processing_status text not null default 'ready' check (processing_status in ('pending', 'ready', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  unique (user_id, cross_source_fingerprint)
);

create index if not exists rides_bike_idx on public.rides(bike_id);
create index if not exists rides_user_started_idx on public.rides(user_id, started_at desc);

create table if not exists public.ride_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_connection_id uuid references public.source_connections(id) on delete cascade,
  canonical_ride_id uuid references public.rides(id) on delete set null,
  source_kind text not null check (source_kind in ('healthkit', 'health_connect', 'gpx_fit', 'strava')),
  external_ride_id text,
  source_fingerprint text not null,
  cross_source_fingerprint text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null check (ended_at >= started_at),
  moving_time_seconds integer not null check (moving_time_seconds >= 0),
  distance_meters double precision not null check (distance_meters >= 0),
  elevation_gain_meters double precision check (elevation_gain_meters is null or elevation_gain_meters >= 0),
  average_speed_mps double precision check (average_speed_mps is null or average_speed_mps >= 0),
  route_geojson jsonb check (route_geojson is null or jsonb_typeof(route_geojson) = 'object'),
  samples jsonb check (samples is null or jsonb_typeof(samples) in ('object', 'array')),
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata) = 'object'),
  processing_status text not null default 'pending' check (processing_status in ('pending', 'processed', 'duplicate', 'rejected')),
  rejection_reason text,
  imported_at timestamptz not null default now(),
  unique (user_id, source_kind, source_fingerprint)
);

create index if not exists ride_imports_canonical_ride_idx on public.ride_imports(canonical_ride_id);
create index if not exists ride_imports_cross_fingerprint_idx on public.ride_imports(user_id, cross_source_fingerprint);
create index if not exists ride_imports_source_connection_idx on public.ride_imports(source_connection_id);
create index if not exists ride_imports_user_status_idx on public.ride_imports(user_id, processing_status, imported_at desc);

create table if not exists public.explored_cells (
  user_id uuid not null references auth.users(id) on delete cascade,
  h3_index text not null,
  h3_resolution smallint not null check (h3_resolution between 0 and 15),
  first_ride_id uuid references public.rides(id) on delete set null,
  first_explored_at timestamptz not null default now(),
  origin text not null default 'earned' check (origin in ('earned', 'historical')),
  primary key (user_id, h3_index)
);

create index if not exists explored_cells_first_ride_idx on public.explored_cells(first_ride_id);
create index if not exists explored_cells_user_time_idx on public.explored_cells(user_id, first_explored_at desc);

create table if not exists public.quest_templates (
  code text primary key,
  name text not null,
  description text not null,
  metric text not null check (metric in ('new_cells', 'moving_minutes', 'elevation_meters', 'loop')),
  default_target numeric not null check (default_target > 0),
  reward_xp integer not null check (reward_xp >= 0),
  enabled boolean not null default true,
  sort_order integer not null default 0
);

insert into public.quest_templates (code, name, description, metric, default_target, reward_xp, sort_order)
values
  ('new_land', 'Новая земля', 'Открой 20 новых клеток', 'new_cells', 20, 200, 10),
  ('long_ride', 'Дальний путь', '60 минут в движении', 'moving_minutes', 60, 200, 20),
  ('high_route', 'Высокий маршрут', 'Набери 500 м высоты', 'elevation_meters', 500, 200, 30),
  ('close_the_loop', 'Замкнуть круг', 'Финишируй рядом со стартом после 5 км', 'loop', 1, 200, 40)
on conflict (code) do update set
  name = excluded.name, description = excluded.description, metric = excluded.metric,
  default_target = excluded.default_target, reward_xp = excluded.reward_xp,
  enabled = true, sort_order = excluded.sort_order;

create table if not exists public.quest_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_code text not null references public.quest_templates(code),
  target_value numeric not null check (target_value > 0),
  progress_value numeric not null default 0 check (progress_value >= 0),
  reward_xp integer not null check (reward_xp >= 0),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by_ride_id uuid references public.rides(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create unique index if not exists quest_runs_one_active_per_user_idx on public.quest_runs(user_id) where status = 'active';
create index if not exists quest_runs_completed_by_ride_idx on public.quest_runs(completed_by_ride_id);
create index if not exists quest_runs_template_idx on public.quest_runs(template_code);
create index if not exists quest_runs_user_status_idx on public.quest_runs(user_id, status, started_at desc);

create table if not exists public.xp_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ride_id uuid references public.rides(id) on delete set null,
  quest_run_id uuid references public.quest_runs(id) on delete set null,
  entry_type text not null check (entry_type in ('ride', 'quest', 'season', 'migration', 'correction')),
  delta integer not null check (delta <> 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists xp_ledger_one_migration_award_idx on public.xp_ledger(user_id, entry_type, reason) where entry_type = 'migration';
create unique index if not exists xp_ledger_one_quest_award_idx on public.xp_ledger(user_id, quest_run_id, entry_type) where quest_run_id is not null and entry_type = 'quest';
create unique index if not exists xp_ledger_one_ride_award_idx on public.xp_ledger(user_id, ride_id, entry_type) where ride_id is not null and entry_type = 'ride';
create index if not exists xp_ledger_quest_run_idx on public.xp_ledger(quest_run_id);
create index if not exists xp_ledger_ride_idx on public.xp_ledger(ride_id);
create index if not exists xp_ledger_user_created_idx on public.xp_ledger(user_id, created_at desc);

create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  adventure_xp integer not null default 0 check (adventure_xp >= 0),
  level smallint not null default 1 check (level between 1 and 10),
  specialization text check (specialization is null or specialization in ('explorer', 'climber', 'stayer')),
  specialization_changed_at timestamptz,
  specialization_changes_used smallint not null default 0 check (specialization_changes_used between 0 and 1),
  season_id text not null default 'alpha-1',
  season_xp integer not null default 0 check (season_xp >= 0),
  updated_at timestamptz not null default now()
);

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.player_progress (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
drop trigger if exists source_connections_set_updated_at on public.source_connections;
create trigger source_connections_set_updated_at before update on public.source_connections for each row execute function private.set_updated_at();
drop trigger if exists bikes_set_updated_at on public.bikes;
create trigger bikes_set_updated_at before update on public.bikes for each row execute function private.set_updated_at();
drop trigger if exists veloquest_on_auth_user_created on auth.users;
create trigger veloquest_on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.source_connections enable row level security;
alter table public.bikes enable row level security;
alter table public.rides enable row level security;
alter table public.ride_imports enable row level security;
alter table public.explored_cells enable row level security;
alter table public.quest_templates enable row level security;
alter table public.quest_runs enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.player_progress enable row level security;

revoke all on public.profiles, public.source_connections, public.bikes, public.rides,
  public.ride_imports, public.explored_cells, public.quest_templates, public.quest_runs,
  public.xp_ledger, public.player_progress from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.source_connections, public.bikes to authenticated;
grant select, delete on public.rides, public.explored_cells to authenticated;
grant select, insert, delete on public.ride_imports to authenticated;
grant select on public.quest_templates, public.quest_runs, public.xp_ledger to authenticated;
grant select, update (specialization) on public.player_progress to authenticated;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
drop policy if exists source_connections_select_own on public.source_connections;
drop policy if exists source_connections_insert_own on public.source_connections;
drop policy if exists source_connections_update_own on public.source_connections;
drop policy if exists source_connections_delete_own on public.source_connections;
drop policy if exists bikes_select_own on public.bikes;
drop policy if exists bikes_insert_own on public.bikes;
drop policy if exists bikes_update_own on public.bikes;
drop policy if exists bikes_delete_own on public.bikes;
drop policy if exists rides_select_own on public.rides;
drop policy if exists rides_delete_own on public.rides;
drop policy if exists ride_imports_select_own on public.ride_imports;
drop policy if exists ride_imports_insert_own on public.ride_imports;
drop policy if exists ride_imports_delete_own on public.ride_imports;
drop policy if exists explored_cells_select_own on public.explored_cells;
drop policy if exists explored_cells_delete_own on public.explored_cells;
drop policy if exists quest_templates_select_authenticated on public.quest_templates;
drop policy if exists quest_runs_select_own on public.quest_runs;
drop policy if exists xp_ledger_select_own on public.xp_ledger;
drop policy if exists player_progress_select_own on public.player_progress;
drop policy if exists player_progress_update_specialization_own on public.player_progress;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);
create policy source_connections_select_own on public.source_connections for select to authenticated using ((select auth.uid()) = user_id);
create policy source_connections_insert_own on public.source_connections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy source_connections_update_own on public.source_connections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy source_connections_delete_own on public.source_connections for delete to authenticated using ((select auth.uid()) = user_id);
create policy bikes_select_own on public.bikes for select to authenticated using ((select auth.uid()) = user_id);
create policy bikes_insert_own on public.bikes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy bikes_update_own on public.bikes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy bikes_delete_own on public.bikes for delete to authenticated using ((select auth.uid()) = user_id);
create policy rides_select_own on public.rides for select to authenticated using ((select auth.uid()) = user_id);
create policy rides_delete_own on public.rides for delete to authenticated using ((select auth.uid()) = user_id);
create policy ride_imports_select_own on public.ride_imports for select to authenticated using ((select auth.uid()) = user_id);
create policy ride_imports_insert_own on public.ride_imports for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ride_imports_delete_own on public.ride_imports for delete to authenticated using ((select auth.uid()) = user_id);
create policy explored_cells_select_own on public.explored_cells for select to authenticated using ((select auth.uid()) = user_id);
create policy explored_cells_delete_own on public.explored_cells for delete to authenticated using ((select auth.uid()) = user_id);
create policy quest_templates_select_authenticated on public.quest_templates for select to authenticated using (true);
create policy quest_runs_select_own on public.quest_runs for select to authenticated using ((select auth.uid()) = user_id);
create policy xp_ledger_select_own on public.xp_ledger for select to authenticated using ((select auth.uid()) = user_id);
create policy player_progress_select_own on public.player_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy player_progress_update_specialization_own on public.player_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- SOURCE: supabase/schema/client_migration_gate.sql
create table if not exists public.client_migrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  migration_key text not null,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, migration_key)
);

alter table public.client_migrations enable row level security;
revoke all on table public.client_migrations from anon, authenticated;
grant select on table public.client_migrations to authenticated;

drop policy if exists client_migrations_select_own on public.client_migrations;
create policy client_migrations_select_own
on public.client_migrations for select
to authenticated
using ((select auth.uid()) = user_id);

create unique index if not exists xp_ledger_one_migration_award_idx
on public.xp_ledger (user_id, entry_type, reason)
where entry_type = 'migration';

-- SOURCE: supabase/schema/client_diagnostics.sql
create table if not exists public.client_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in (
    'cloud_hydration_failed',
    'ride_sync_succeeded',
    'ride_sync_failed',
    'source_disconnected',
    'account_delete_requested',
    'bike_cache_write_failed'
  )),
  severity text not null default 'info' check (severity in ('info', 'warning', 'error')),
  source_kind text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.client_events enable row level security;
revoke all on table public.client_events from anon, authenticated;
grant select, insert on table public.client_events to authenticated;
grant usage on sequence public.client_events_id_seq to authenticated;

drop policy if exists client_events_select_own on public.client_events;
create policy client_events_select_own
on public.client_events for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists client_events_insert_own on public.client_events;
create policy client_events_insert_own
on public.client_events for insert
to authenticated
with check ((select auth.uid()) = user_id);

create index if not exists client_events_user_created_idx
on public.client_events (user_id, created_at desc);

-- SOURCE: supabase/schema/garage_catalog.sql
create table if not exists public.garage_components (
  id text primary key,
  brand text not null,
  model text not null,
  category text not null check (category in (
    'rear_derailleur','front_derailleur','cassette','chain','crankset','chainring',
    'bottom_bracket','shifter','brake_caliper','brake_lever','brake_adapter','rotor','wheelset',
    'hub','tire','fork','rear_shock','seatpost','dropper_post','saddle','handlebar',
    'stem','pedal','e_bike_system','motor','battery','range_extender','controller'
  )),
  display_name text not null,
  specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  unlock_level smallint not null default 1 check (unlock_level between 1 and 10),
  evidence_url text not null,
  evidence_checked_at date not null,
  enabled boolean not null default true
);

create table if not exists public.garage_compatibility (
  source_component_id text not null references public.garage_components(id) on delete cascade,
  target_component_id text not null references public.garage_components(id) on delete cascade,
  status text not null check (status in ('compatible', 'conditional', 'incompatible')),
  rule_summary text not null,
  evidence_url text not null,
  evidence_checked_at date not null,
  primary key (source_component_id, target_component_id)
);

alter table public.garage_components enable row level security;
alter table public.garage_compatibility enable row level security;
revoke all on table public.garage_components, public.garage_compatibility from anon, authenticated;
grant select on table public.garage_components, public.garage_compatibility to authenticated;

drop policy if exists garage_components_read on public.garage_components;
create policy garage_components_read on public.garage_components
for select to authenticated using (enabled = true);

drop policy if exists garage_compatibility_read on public.garage_compatibility;
create policy garage_compatibility_read on public.garage_compatibility
for select to authenticated using (true);

insert into public.garage_components (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('shimano-rd-m6100-sgs', 'Shimano', 'RD-M6100-SGS', 'rear_derailleur', 'DEORE RD-M6100-SGS', '{"speeds":12,"drivetrain":"1x12"}'::jsonb, 1, 'https://productinfo.shimano.com/en/lineup/deore-1x12', '2026-08-05'),
  ('shimano-cs-m6100-12', 'Shimano', 'CS-M6100-12', 'cassette', 'DEORE CS-M6100-12 10-51T', '{"speeds":12,"range":"10-51T","freehub":"MICRO SPLINE"}'::jsonb, 3, 'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-05'),
  ('sram-rd-gx-1-b2', 'SRAM', 'RD-GX-1-B2', 'rear_derailleur', 'GX Eagle Rear Derailleur', '{"speeds":12,"max_cassette":"52T"}'::jsonb, 1, 'https://www.sram.com/en/sram/models/rd-gx-1-b2', '2026-08-05'),
  ('sram-cs-xg-1275-b1', 'SRAM', 'CS-XG-1275-B1', 'cassette', 'XG-1275 Eagle 10-52T', '{"speeds":12,"range":"10-52T","freehub":"XD"}'::jsonb, 3, 'https://www.sram.com/en/sram/models/cs-xg-1275-b1', '2026-08-05')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.garage_compatibility (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('shimano-rd-m6100-sgs', 'shimano-cs-m6100-12', 'compatible', 'Shimano 1x12 MTB compatibility lists RD-M6100-SGS with CS-M6100-12 10-51T.', 'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-05'),
  ('sram-rd-gx-1-b2', 'sram-cs-xg-1275-b1', 'compatible', 'GX Eagle RD-GX-1-B2 supports 10-52T Eagle cassettes; XG-1275 is a 12-speed 10-52T Eagle cassette.', 'https://www.sram.com/en/sram/models/rd-gx-1-b2', '2026-08-05')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

-- SOURCE: supabase/schema/bike_catalog.sql
-- Manufacturer-first Garage catalog. Product rows are deliberately limited to
-- model year 2020+; older bikes may still exist in a user's private bikes row.

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.bike_catalog_models (
  id text primary key,
  brand text not null,
  model text not null,
  model_year integer not null check (model_year >= 2020 and model_year <= 2100),
  trim text not null default '',
  category text,
  market text not null default 'global',
  specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  manufacturer_url text not null check (manufacturer_url ~ '^https://'),
  evidence_checked_at date not null,
  enabled boolean not null default true,
  search_text text generated always as (
    lower(
      brand || ' ' || model || ' ' || trim || ' ' || coalesce(category, '') || ' ' ||
      coalesce(specs->>'frame_material', '') || ' ' || coalesce(specs->>'wheel_size', '') || ' ' ||
      coalesce(specs->>'drivetrain_brand', '') || ' ' || coalesce(specs->>'drivetrain', '') || ' ' ||
      coalesce(specs->>'groupset', '') || ' ' || coalesce(specs->>'brake_type', '') || ' ' ||
      coalesce(specs->>'brakes', '') || ' ' || coalesce(specs->>'suspension_brand', '') || ' ' ||
      coalesce(specs->>'fork', '') || ' ' || coalesce(specs->>'rear_shock', '') || ' ' ||
      coalesce(specs->>'cassette', '') || ' ' || coalesce(specs->>'crankset', '') || ' ' ||
      coalesce(specs->>'bottom_bracket', '') || ' ' || coalesce(specs->>'hubs', '') || ' ' ||
      coalesce(specs->>'hub', '') || ' ' || coalesce(specs->>'wheelset', '') || ' ' ||
      coalesce(specs->>'wheels', '') || ' ' || coalesce(specs->>'tires', '') || ' ' ||
      coalesce(specs->>'tyres', '') || ' ' || coalesce(specs->>'motor', '')
    )
  ) stored,
  unique (brand, model, model_year, trim, market)
);

alter table public.bike_catalog_models
add column if not exists search_text text generated always as (
  lower(
    brand || ' ' || model || ' ' || trim || ' ' || coalesce(category, '') || ' ' ||
    coalesce(specs->>'frame_material', '') || ' ' || coalesce(specs->>'wheel_size', '') || ' ' ||
    coalesce(specs->>'drivetrain_brand', '') || ' ' || coalesce(specs->>'drivetrain', '') || ' ' ||
    coalesce(specs->>'groupset', '') || ' ' || coalesce(specs->>'brake_type', '') || ' ' ||
    coalesce(specs->>'brakes', '') || ' ' || coalesce(specs->>'suspension_brand', '') || ' ' ||
    coalesce(specs->>'fork', '') || ' ' || coalesce(specs->>'rear_shock', '') || ' ' ||
    coalesce(specs->>'cassette', '') || ' ' || coalesce(specs->>'crankset', '') || ' ' ||
    coalesce(specs->>'bottom_bracket', '') || ' ' || coalesce(specs->>'hubs', '') || ' ' ||
    coalesce(specs->>'hub', '') || ' ' || coalesce(specs->>'wheelset', '') || ' ' ||
    coalesce(specs->>'wheels', '') || ' ' || coalesce(specs->>'tires', '') || ' ' ||
    coalesce(specs->>'tyres', '') || ' ' || coalesce(specs->>'motor', '')
  )
) stored;

create table if not exists public.bike_catalog_images (
  id bigint generated always as identity primary key,
  bike_id text not null references public.bike_catalog_models(id) on delete cascade,
  image_url text not null check (image_url ~ '^https://'),
  source_type text not null check (source_type in ('manufacturer', 'authorized_retailer', 'major_retailer')),
  source_name text not null,
  source_page_url text not null check (source_page_url ~ '^https://'),
  priority smallint not null default 100 check (priority between 1 and 1000),
  checked_at date not null,
  enabled boolean not null default true,
  unique (bike_id, image_url)
);

create index if not exists bike_catalog_models_lookup_idx
on public.bike_catalog_models (lower(brand), lower(model), model_year desc)
where enabled = true;

create index if not exists bike_catalog_models_search_trgm_idx
on public.bike_catalog_models using gin (search_text extensions.gin_trgm_ops)
where enabled = true;

create index if not exists bike_catalog_models_search_fts_idx
on public.bike_catalog_models using gin (to_tsvector('simple'::regconfig, search_text))
where enabled = true;

create index if not exists bike_catalog_images_lookup_idx
on public.bike_catalog_images (bike_id, priority)
where enabled = true;

alter table public.bike_catalog_models enable row level security;
alter table public.bike_catalog_images enable row level security;

revoke all on table public.bike_catalog_models, public.bike_catalog_images from anon, authenticated;
grant select on table public.bike_catalog_models, public.bike_catalog_images to authenticated;

drop policy if exists bike_catalog_models_read on public.bike_catalog_models;
create policy bike_catalog_models_read on public.bike_catalog_models
for select to authenticated using (enabled = true and model_year >= 2020);

drop policy if exists bike_catalog_images_read on public.bike_catalog_images;
create policy bike_catalog_images_read on public.bike_catalog_images
for select to authenticated using (
  enabled = true
  and exists (
    select 1 from public.bike_catalog_models model
    where model.id = bike_id and model.enabled = true and model.model_year >= 2020
  )
);

comment on table public.bike_catalog_images is
'External image URLs only. VeloQuest does not copy or store manufacturer/retailer image binaries.';

create or replace function public.search_bike_catalog(
  p_query text default null,
  p_brand text default null,
  p_category text default null,
  p_year_from integer default 2020,
  p_year_to integer default 2100,
  p_frame_material text default null,
  p_wheel_size text default null,
  p_drivetrain_brand text default null,
  p_brake_type text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id text,
  brand text,
  model text,
  model_year integer,
  bike_trim text,
  category text,
  market text,
  specs jsonb,
  manufacturer_url text,
  image_url text,
  image_source text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    b.id, b.brand, b.model, b.model_year, b.trim as bike_trim, b.category, b.market, b.specs, b.manufacturer_url,
    image.image_url, image.source_name as image_source
  from public.bike_catalog_models b
  left join lateral (
    select i.image_url, i.source_name
    from public.bike_catalog_images i
    where i.bike_id = b.id and i.enabled = true
    order by i.priority asc, i.id asc
    limit 1
  ) image on true
  where b.enabled = true
    and b.model_year >= greatest(2020, coalesce(p_year_from, 2020))
    and b.model_year <= least(2100, coalesce(p_year_to, 2100))
    and (nullif(trim(p_brand), '') is null or b.brand ilike '%' || trim(p_brand) || '%')
    and (nullif(trim(p_category), '') is null or coalesce(b.category, '') ilike '%' || trim(p_category) || '%')
    and (nullif(trim(p_frame_material), '') is null or coalesce(b.specs->>'frame_material', '') ilike '%' || trim(p_frame_material) || '%')
    and (nullif(trim(p_wheel_size), '') is null or coalesce(b.specs->>'wheel_size', '') ilike '%' || trim(p_wheel_size) || '%')
    and (nullif(trim(p_drivetrain_brand), '') is null or (
      coalesce(b.specs->>'drivetrain_brand', '') ilike '%' || trim(p_drivetrain_brand) || '%'
      or coalesce(b.specs->>'drivetrain', '') ilike '%' || trim(p_drivetrain_brand) || '%'
      or coalesce(b.specs->>'groupset', '') ilike '%' || trim(p_drivetrain_brand) || '%'
    ))
    and (nullif(trim(p_brake_type), '') is null or (
      coalesce(b.specs->>'brake_type', '') ilike '%' || trim(p_brake_type) || '%'
      or coalesce(b.specs->>'brakes', '') ilike '%' || trim(p_brake_type) || '%'
    ))
    and (
      nullif(trim(p_query), '') is null
      or b.search_text ilike '%' || lower(trim(p_query)) || '%'
      or to_tsvector('simple'::regconfig, b.search_text) @@ websearch_to_tsquery('simple'::regconfig, trim(p_query))
    )
  order by
    case when nullif(trim(p_query), '') is null then 0
      else ts_rank(to_tsvector('simple'::regconfig, b.search_text), websearch_to_tsquery('simple'::regconfig, trim(p_query)))
    end desc,
    lower(b.brand), lower(b.model), b.model_year desc, b.id
  limit least(50, greatest(1, coalesce(p_limit, 20)))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke execute on function public.search_bike_catalog(text, text, text, integer, integer, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.search_bike_catalog(text, text, text, integer, integer, text, text, text, text, integer, integer) to authenticated;

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  (
    'giant-defy-advanced-2-2026-us', 'Giant', 'Defy Advanced 2', 2026, 'road_endurance', 'US',
    '{"frame_material":"Advanced-grade composite","max_tire_clearance_mm":38}'::jsonb,
    'https://www.giant-bicycles.com/us/defy-advanced-2', '2026-08-06'
  ),
  (
    'haibike-lyke-cf-10-2025-global', 'Haibike', 'LYKE CF 10', 2025, 'emtb_light_full_suspension', 'global',
    '{"motor":"FAZUA RIDE 60","motor_rated_power_w":250,"motor_torque_nm":60,"battery_wh":480,"wheel_size":"29","front_travel_mm":140,"rear_travel_mm":140,"suspension_brand":"RockShox","drivetrain_brand":"SRAM"}'::jsonb,
    'https://haibike.com/en-es/pages/lyke', '2026-08-06'
  ),
  (
    'haibike-lyke-cf-11-2025-global', 'Haibike', 'LYKE CF 11', 2025, 'emtb_light_full_suspension', 'global',
    '{"motor":"FAZUA RIDE 60","motor_rated_power_w":250,"motor_torque_nm":60,"battery_wh":480,"wheel_size":"29","front_travel_mm":140,"rear_travel_mm":140,"suspension_brand":"FOX","drivetrain_brand":"Shimano"}'::jsonb,
    'https://haibike.com/en-es/pages/lyke', '2026-08-06'
  ),
  (
    'kellys-theos-rs90-p-royal-purple-2026-global', 'Kellys', 'THEOS RS90 P ROYAL PURPLE', 2026, 'emtb_full_suspension', 'global',
    '{"motor":"PANASONIC GXM AMXXPRO","motor_torque_nm":105,"motor_weight_kg":2.56,"battery_wh":900,"wheel_size":"29/27.5"}'::jsonb,
    'https://kellysbike.com/e-fullsuspension/theos-rs90-p-royal-purple-29-27-5-900-wh_11011', '2026-08-06'
  )
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- SOURCE: supabase/schema/catalog_ingestion_wave_2026_08_06.sql
-- VeloQuest manufacturer-first catalog ingestion wave.
-- Only bicycle model years 2020+ are eligible for bike_catalog_models.
-- Evidence comes from first-party manufacturer pages checked 2026-08-06.

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  ('giant-defy-advanced-sl-0-2026-us', 'Giant', 'Defy Advanced SL 0', 2026, 'road_endurance', 'US',
   '{"frame_material":"Advanced SL-grade composite","max_tire_clearance_mm":38}'::jsonb,
   'https://www.giant-bicycles.com/us/defy-advanced-sl-0', '2026-08-06'),
  ('giant-defy-advanced-eplus-elite-1-2026-us', 'Giant', 'Defy Advanced E+ Elite 1', 2026, 'electric_road_endurance', 'US',
   '{"frame_material":"Advanced-grade composite","wheel_size":"700C","motor":"SyncDrive Move Plus","motor_torque_nm":30,"battery_wh":400,"drivetrain_brand":"SRAM","drivetrain":"Force AXS","brake_type":"hydraulic_disc","front_axle":"12x100","rear_axle":"12x145"}'::jsonb,
   'https://www.giant-bicycles.com/us/defy-advanced-eplus-elite-1', '2026-08-06'),
  ('giant-defy-advanced-pro-2-2026-gb', 'Giant', 'Defy Advanced Pro 2', 2026, 'road_endurance', 'GB',
   '{"frame_material":"Advanced-grade composite","max_tire_clearance_mm":38}'::jsonb,
   'https://www.giant-bicycles.com/gb/defy-advanced-pro-2', '2026-08-06'),
  ('giant-defy-advanced-pro-1-2026-ca', 'Giant', 'Defy Advanced Pro 1', 2026, 'road_endurance', 'CA',
   '{"frame_material":"Advanced-grade composite"}'::jsonb,
   'https://www.giant-bicycles.com/ca/defy-advanced-pro-1', '2026-08-06'),
  ('giant-defy-advanced-0-2026-ba', 'Giant', 'Defy Advanced 0', 2026, 'road_endurance', 'BA',
   '{"frame_material":"Advanced-grade composite","max_tire_clearance_mm":38}'::jsonb,
   'https://www.giant-bicycles.com/ba/defy-advanced-0', '2026-08-06'),

  ('liv-langma-advanced-sl-0-2026-is', 'Liv', 'Langma Advanced SL 0', 2026, 'road_race', 'IS',
   '{"frame_material":"composite"}'::jsonb,
   'https://www.liv-cycling.com/is/langma-advanced-sl-0', '2026-08-06'),
  ('liv-langma-advanced-1-qom-2026-is', 'Liv', 'Langma Advanced 1 QOM', 2026, 'road_race', 'IS',
   '{"frame_material":"composite"}'::jsonb,
   'https://www.liv-cycling.com/is/langma-advanced-1-qom', '2026-08-06'),
  ('liv-langma-advanced-pro-1-pro-compact-2026-is', 'Liv', 'Langma Advanced Pro 1 (Pro Compact)', 2026, 'road_race', 'IS',
   '{"frame_material":"composite"}'::jsonb,
   'https://www.liv-cycling.com/is/langma-advanced-pro-1--pro-compact-', '2026-08-06'),
  ('liv-langma-advanced-2-qom-2026-is', 'Liv', 'Langma Advanced 2 QOM', 2026, 'road_race', 'IS',
   '{"frame_material":"composite"}'::jsonb,
   'https://www.liv-cycling.com/is/langma-advanced-2-qom', '2026-08-06'),

  ('trek-madone-slr-9-axs-gen-8-2026-us', 'Trek', 'Madone SLR 9 AXS Gen 8', 2026, 'road_race_aero', 'US',
   '{"drivetrain_brand":"SRAM","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/madone-slr-9-axs-gen-8--2026-medium/p/69689/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/madone-slr/madone-slr-9-axs-1x-gen-8/p/5344417/', '2026-08-06'),
  ('trek-madone-slr-7-axs-gen-8-2026-us', 'Trek', 'Madone SLR 7 AXS Gen 8', 2026, 'road_race_aero', 'US',
   '{"drivetrain_brand":"SRAM","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/madone-slr-7-axs-gen-8--2026-x-small/p/80453/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/f/F213/', '2026-08-06'),
  ('trek-madone-sl-7-gen-8-2026-us', 'Trek', 'Madone SL 7 Gen 8', 2026, 'road_race_aero', 'US',
   '{"model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/madone-sl-7-gen-8--2026-medium/p/80424/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/madone-sl/madone-sl-7-gen-8/p/46220/', '2026-08-06'),
  ('trek-madone-sl-6-gen-8-2026-us', 'Trek', 'Madone SL 6 Gen 8', 2026, 'road_race_aero', 'US',
   '{"model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/madone-sl-6-gen-8--2026-medium/p/85650/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/f/F213/', '2026-08-06'),
  ('trek-domane-sl-7-gen-4-2026-us', 'Trek', 'Domane SL 7 Gen 4', 2026, 'road_endurance', 'US',
   '{"frame_material":"OCLV Carbon","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-sl-7-gen-4--2026-56cm/p/78701/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/domane/', '2026-08-06'),
  ('trek-domane-sl-6-gen-4-2026-us', 'Trek', 'Domane SL 6 Gen 4', 2026, 'road_endurance', 'US',
   '{"frame_material":"OCLV Carbon","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-sl-6-gen-4--2026-56cm/p/79196/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/domane/', '2026-08-06'),
  ('trek-domane-al-5-gen-4-2026-us', 'Trek', 'Domane AL 5 Gen 4', 2026, 'road_endurance', 'US',
   '{"frame_material":"aluminium","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-al-5-gen-4--2026-56cm/p/71834/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/domane/domane-al/f/F221-5/', '2026-08-06'),
  ('trek-domane-al-4-gen-4-2026-us', 'Trek', 'Domane AL 4 Gen 4', 2026, 'road_endurance', 'US',
   '{"frame_material":"aluminium","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-al-4-gen-4--2026-56cm/p/70588/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/domane/domane-al/f/F221-5/domane-al-4-gen-4/41607/5301530/', '2026-08-06'),

  ('bmc-fourstroke-r-01-one-2026-us', 'BMC', 'Fourstroke R 01 ONE', 2026, 'xc_full_suspension', 'US',
   '{"frame_material":"carbon","model_year_evidence_url":"https://us.bmc-switzerland.com/collections/mountain-bikes"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/mountain-bikes', '2026-08-06'),
  ('bmc-twostroke-01-one-2026-us', 'BMC', 'Twostroke 01 ONE', 2026, 'xc_hardtail', 'US',
   '{"frame_material":"carbon","fork_travel_mm":100,"chainline_mm":55,"chainring_range":"26T-38T","drivetrain_ecosystems":["AXS","Di2","mechanical"],"model_year_evidence_url":"https://us.bmc-switzerland.com/collections/mountain-bikes"}'::jsonb,
   'https://us.bmc-switzerland.com/products/twostroke-01-one-bikes-bmc-27a-000054', '2026-08-06'),
  ('bmc-teammachine-slr-four-2026-us', 'BMC', 'Teammachine SLR FOUR', 2026, 'road_race', 'US',
   '{"frame_material":"carbon","drivetrain_brand":"Shimano","groupset":"105","model_year_evidence_url":"https://bmc-switzerland.com/collections/teammachine-slr-series"}'::jsonb,
   'https://us.bmc-switzerland.com/products/teammachine-slr-four-bikes-bmc-26a-000022', '2026-08-06'),
  ('bmc-kaius-01-one-2026-us', 'BMC', 'Kaius 01 ONE', 2026, 'gravel_race', 'US',
   '{"frame_material":"carbon","model_year_evidence_url":"https://bmc-switzerland.com/collections/kaius-series"}'::jsonb,
   'https://us.bmc-switzerland.com/products/kaius-01-one-bikes-bmc-27a-000072', '2026-08-06'),
  ('bmc-kaius-01-three-2026-us', 'BMC', 'Kaius 01 THREE', 2026, 'gravel_race', 'US',
   '{"frame_material":"carbon","model_year_evidence_url":"https://bmc-switzerland.com/collections/kaius-series"}'::jsonb,
   'https://us.bmc-switzerland.com/products/kaius-01-three-bikes-bmc-26a-000001', '2026-08-06'),

  ('merida-etmo-800-2026-global', 'Merida', 'ETMO 800', 2026, 'electric_mtb', 'global',
   '{"suspension_brand":"Marzocchi","model_year_evidence_url":"https://www.merida-bikes.com/en/bikefinder/tag/2026-354"}'::jsonb,
   'https://www.merida-bikes.com/en/bikefinder/tag/2026-354', '2026-08-06'),
  ('merida-etmo-700-2026-global', 'Merida', 'ETMO 700', 2026, 'electric_mtb', 'global',
   '{"suspension_brand":"RockShox","model_year_evidence_url":"https://www.merida-bikes.com/en/bikefinder/tag/2026-354"}'::jsonb,
   'https://www.merida-bikes.com/en/bikefinder/tag/2026-354', '2026-08-06'),
  ('merida-etmo-500-2026-global', 'Merida', 'ETMO 500', 2026, 'electric_mtb', 'global',
   '{"model_year_evidence_url":"https://www.merida-bikes.com/en/bikefinder/tag/2026-354"}'::jsonb,
   'https://www.merida-bikes.com/en/bikefinder/tag/2026-354', '2026-08-06'),
  ('merida-mission-10k-2026-global', 'Merida', 'MISSION 10K', 2026, 'gravel_race', 'global',
   '{"frame_material":"carbon","model_year_evidence_url":"https://www.merida-bikes.com/en/bikefinder/tag/2026-354"}'::jsonb,
   'https://www.merida-bikes.com/en/bike/5657/mission-10k', '2026-08-06'),
  ('merida-mission-7000-2026-global', 'Merida', 'MISSION 7000', 2026, 'gravel_race', 'global',
   '{"frame_material":"carbon","model_year_evidence_url":"https://www.merida-bikes.com/en/bikefinder/tag/2026-354"}'::jsonb,
   'https://www.merida-bikes.com/en/bike/5659/mission-7000', '2026-08-06')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- The original seed only allowed five component types. Manufacturer ingestion
-- requires the broader set below so Garage can eventually reason about real
-- upgrade paths instead of drivetrain-only compatibility.
alter table public.garage_components
  drop constraint if exists garage_components_category_check;

alter table public.garage_components
  add constraint garage_components_category_check check (category in (
    'rear_derailleur','front_derailleur','cassette','chain','crankset','chainring',
    'bottom_bracket','shifter','brake_caliper','brake_lever','brake_adapter','rotor','wheelset',
    'hub','tire','fork','rear_shock','seatpost','dropper_post','saddle','handlebar',
    'stem','pedal','e_bike_system','motor','battery','range_extender','controller'
  ));

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('hope-pro-5-148-boost-rear', 'Hope', 'Pro 5 148mm Boost Rear', 'hub', 'Hope Pro 5 148mm Boost Rear',
   '{"rear_axle":"12x148 Boost","rotor_interfaces":["Center Lock","6-bolt"]}'::jsonb, 3,
   'https://www.hopetech.com/products/hubs/mountain-bike/pro-5-148mm-boost-rear/', '2026-08-06'),
  ('mahle-x20', 'MAHLE SmartBike Systems', 'X20', 'e_bike_system', 'MAHLE X20',
   '{"system_architecture":"rear_hub_motor","peak_power_w":275,"torque_nm_equivalent":65,"udh_compatible":true,"battery_options_wh":[236,350],"range_extender_wh":171}'::jsonb, 4,
   'https://mahle-smartbike.com/x20/', '2026-08-06'),
  ('pirelli-p-zero-road', 'Pirelli', 'P ZERO Road', 'tire', 'Pirelli P ZERO Road',
   '{"construction":"tube-type clincher","casing_tpi_options":[120,60,26]}'::jsonb, 2,
   'https://www.pirelli.com/tyres/en-ww/bike/tyres/catalogue/p-zero-road', '2026-08-06'),
  ('garbaruk-12s-10-44-xd-xdr', 'Garbaruk', '12-speed 10-44T Gravel cassette', 'cassette', 'Garbaruk 12-speed 10-44T Gravel Cassette',
   '{"speeds":12,"range":"10-44T","freehub":"SRAM XD/XDR","chain_compatibility":["SRAM 12-speed Flattop","SRAM T-Type Flattop"],"chain_incompatibility":["SRAM Eagle","Shimano","KMC","YBN"]}'::jsonb, 4,
   'https://www.garbaruk.com/shop/12-speed-10-44t-gravel-cassette-sram-xd-xdr-freehub-800', '2026-08-06')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- SOURCE: supabase/schema/catalog_ingestion_wave_02_bmc_archive_2026_08_06.sql
-- VeloQuest BMC archive ingestion wave.
-- Archive index labels model years explicitly; this is preferred over inferring
-- model year from current-product URLs or SKU prefixes.

-- These current BMC records were initially classified as 2026 from collection
-- context, but the individual product pages do not expose a sufficiently explicit
-- model-year field. Keep them for provenance, but remove them from Bike Finder
-- until the year is confirmed at product level.
update public.bike_catalog_models
set enabled = false
where id in (
  'bmc-fourstroke-r-01-one-2026-us',
  'bmc-twostroke-01-one-2026-us',
  'bmc-teammachine-slr-four-2026-us',
  'bmc-kaius-01-one-2026-us',
  'bmc-kaius-01-three-2026-us'
);

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  ('bmc-257-amp-al-speed-one-usa-2025-us', 'BMC', '257 AMP AL SPEED ONE USA', 2025, 'urban_fitness', 'US',
   '{"model_year_evidence":"official BMC Bike Archive lists 2025 Edition"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-urs-al-one-2025-us', 'BMC', 'URS AL ONE', 2025, 'gravel', 'US',
   '{"frame_material":"aluminium","model_year_evidence":"official BMC Bike Archive lists 2025 Edition"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-alpenchallenge-al-two-2025-us', 'BMC', 'Alpenchallenge AL TWO', 2025, 'urban_fitness', 'US',
   '{"frame_material":"aluminium","model_year_evidence":"official BMC Bike Archive lists 2025 Edition"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-alpenchallenge-al-three-2025-us', 'BMC', 'Alpenchallenge AL THREE', 2025, 'urban_fitness', 'US',
   '{"frame_material":"aluminium","model_year_evidence":"official BMC Bike Archive lists 2025 Edition"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-alpenchallenge-al-four-2025-us', 'BMC', 'Alpenchallenge AL FOUR', 2025, 'urban_fitness', 'US',
   '{"frame_material":"aluminium","model_year_evidence":"official BMC Bike Archive lists 2025 Edition"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),

  ('bmc-speedmachine-01-ltd-2024-us', 'BMC', 'Speedmachine 01 LTD', 2024, 'triathlon', 'US',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Bike Archive lists 2024"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-speedmachine-01-one-2024-us', 'BMC', 'Speedmachine 01 ONE', 2024, 'triathlon', 'US',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Bike Archive lists 2024"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-teammachine-r-01-one-2024-us', 'BMC', 'Teammachine R 01 ONE', 2024, 'road_race', 'US',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Bike Archive lists 2024"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),

  ('bmc-fourstroke-01-team-2024-global', 'BMC', 'Fourstroke 01 TEAM', 2024, 'xc_full_suspension', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-01-ltd-2024-global', 'BMC', 'Fourstroke 01 LTD', 2024, 'xc_full_suspension', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-lt-ltd-2024-global', 'BMC', 'Fourstroke LT LTD', 2024, 'trail_full_suspension', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-01-one-2024-global', 'BMC', 'Fourstroke 01 ONE', 2024, 'xc_full_suspension', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-01-two-2024-global', 'BMC', 'Fourstroke 01 TWO', 2024, 'xc_full_suspension', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-one-2024-global', 'BMC', 'Fourstroke ONE', 2024, 'xc_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-two-2024-global', 'BMC', 'Fourstroke TWO', 2024, 'xc_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-lt-one-2024-global', 'BMC', 'Fourstroke LT ONE', 2024, 'trail_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-twostroke-01-one-2024-global', 'BMC', 'Twostroke 01 ONE', 2024, 'xc_hardtail', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-three-2024-global', 'BMC', 'Fourstroke THREE', 2024, 'xc_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-four-2024-global', 'BMC', 'Fourstroke FOUR', 2024, 'xc_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-lt-two-2024-global', 'BMC', 'Fourstroke LT TWO', 2024, 'trail_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-twostroke-01-two-2024-global', 'BMC', 'Twostroke 01 TWO', 2024, 'xc_hardtail', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- SOURCE: supabase/schema/catalog_ingestion_wave_03_brand_expansion_2026_08_06.sql
-- VeloQuest verified brand-expansion wave.
-- All rows require an explicit first-party model-year 2020+ signal.

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  ('argon18-anti-matter-frameset-2026-us', 'Argon 18', 'Anti Matter Frameset', 2026, 'gravel_race', 'US',
   '{"frame_material":"carbon","model_year_evidence":"official lineup explicitly labels Anti Matter frameset (2026)","model_year_evidence_url":"https://www.argon18.com/en-us/bikes"}'::jsonb,
   'https://www.argon18.com/en-us/bikes', '2026-08-06'),

  ('bh-igravelx-2026-global', 'BH', 'iGRAVELX', 2026, 'electric_gravel', 'global',
   '{"model_year_evidence":"official BH iGRAVELX user manual identifies 2026","model_year_evidence_url":"https://www.bhbikes.com/download/bancorecursos/manuales/ENG/2026/2026_iGRAVELX_ENG_USER_MANUAL.pdf"}'::jsonb,
   'https://www.bhbikes.com/download/bancorecursos/manuales/ENG/2026/2026_iGRAVELX_ENG_USER_MANUAL.pdf', '2026-08-06'),

  ('ktm-macina-prowler-exonic-2026-global', 'KTM', 'Macina Prowler Exonic', 2026, 'electric_enduro', 'global',
   '{"model_year_evidence":"official KTM MY2026 page names model for 2026","motor":"Bosch Performance Line CX-R"}'::jsonb,
   'https://www.ktm-bikes.at/my2025/my2026', '2026-08-06'),
  ('ktm-macina-prowler-prestige-2026-global', 'KTM', 'Macina Prowler Prestige', 2026, 'electric_enduro', 'global',
   '{"model_year_evidence":"official KTM MY2026 page names model for 2026"}'::jsonb,
   'https://www.ktm-bikes.at/my2025/my2026', '2026-08-06'),
  ('ktm-macina-kapoho-exonic-2026-global', 'KTM', 'Macina Kapoho Exonic', 2026, 'electric_all_mountain', 'global',
   '{"model_year_evidence":"official KTM MY2026 page names model for 2026","motor":"Bosch Performance Line CX-R"}'::jsonb,
   'https://www.ktm-bikes.at/my2025/my2026', '2026-08-06'),
  ('ktm-macina-kapoho-pro-ltd-2026-global', 'KTM', 'Macina Kapoho Pro LTD', 2026, 'electric_all_mountain', 'global',
   '{"model_year_evidence":"official KTM MY2026 page lists new Kapoho model","frame_material":"carbon main triangle / aluminium rear triangle"}'::jsonb,
   'https://www.ktm-bikes.at/my2025/my2026', '2026-08-06'),
  ('ktm-macina-kapoho-comp-ltd-2026-global', 'KTM', 'Macina Kapoho Comp LTD', 2026, 'electric_all_mountain', 'global',
   '{"model_year_evidence":"official KTM MY2026 page lists new Kapoho model","frame_material":"carbon main triangle / aluminium rear triangle"}'::jsonb,
   'https://www.ktm-bikes.at/my2025/my2026', '2026-08-06'),
  ('ktm-macina-tour-px-810-2026-global', 'KTM', 'Macina Tour PX 810', 2026, 'electric_trekking', 'global',
   '{"motor":"Bosch Performance Line PX","motor_torque_nm":90,"battery_wh":800,"model_year_evidence":"official KTM MY2026 page names model"}'::jsonb,
   'https://www.ktm-bikes.at/my2025/my2026', '2026-08-06'),
  ('ktm-macina-tour-px-610-2026-global', 'KTM', 'Macina Tour PX 610', 2026, 'electric_trekking', 'global',
   '{"motor":"Bosch Performance Line PX","motor_torque_nm":90,"battery_wh":600,"model_year_evidence":"official KTM MY2026 page names model"}'::jsonb,
   'https://www.ktm-bikes.at/my2025/my2026', '2026-08-06'),
  ('ktm-macina-fold-2026-global', 'KTM', 'Macina Fold', 2026, 'electric_folding', 'global',
   '{"motor":"Bosch Performance Line PX","battery_wh":500,"drivetrain":"Nexus belt 1x8","model_year_evidence":"official KTM MY2026 page names model"}'::jsonb,
   'https://www.ktm-bikes.at/my2025/my2026', '2026-08-06'),
  ('ktm-gravelator-exonic-2026-global', 'KTM', 'Gravelator Exonic', 2026, 'gravel', 'global',
   '{"model_year_evidence":"official product page explicitly states model year 2026","drivetrain":"SRAM RED XPLR AXS 1x13"}'::jsonb,
   'https://www.ktm-bikes.at/bikes/detail/mx1260460115-gravelator-exonic-m-55-mx1260460115-gravelator-exonic-spotted-white-ornge-blk-grey-1x13-sram-red-xplr-axs-2026', '2026-08-06'),

  ('stevens-camino-rs-2026-de', 'STEVENS', 'Camino RS', 2026, 'gravel_race', 'DE',
   '{"max_tire_clearance_mm":45,"model_year_evidence":"official STEVENS Collection 2026"}'::jsonb,
   'https://www.stevensbikes.de/en/de/highlights-collection-2026/', '2026-08-06'),
  ('stevens-camino-pro-di2-2026-de', 'STEVENS', 'Camino Pro Di2', 2026, 'gravel', 'DE',
   '{"frame_material":"carbon","max_tire_clearance_mm":45,"drivetrain":"Shimano GRX 825 Di2 2x12","model_year_evidence":"official STEVENS Collection 2026"}'::jsonb,
   'https://www.stevensbikes.de/en/de/gravel/gravel/camino-pro-di2/', '2026-08-06'),
  ('stevens-gavere-pro-feq-2026-de', 'STEVENS', 'Gavere Pro FEQ', 2026, 'gravel_commuter', 'DE',
   '{"frame_material":"aluminium","drivetrain":"SRAM Apex AXS 1x12","wheels":"DT Swiss G 1800","model_year_evidence":"official product page Highlights 2026"}'::jsonb,
   'https://www.stevensbikes.de/en/de/gravel/gravel/gavere-pro-feq/', '2026-08-06'),
  ('stevens-colorado-401-2026-de', 'STEVENS', 'Colorado 401', 2026, 'xc_hardtail', 'DE',
   '{"frame_material":"aluminium","fork":"Fox 32 Float Rhythm","drivetrain":"Shimano Deore XT/SLX 1x12","model_year_evidence":"official product page Highlights 2026"}'::jsonb,
   'https://www.stevensbikes.de/en/de/mtb/colorado-401/', '2026-08-06'),
  ('stevens-caleta-7-2-lt-2026-de', 'STEVENS', 'Caleta 7.2 LT', 2026, 'urban_trekking', 'DE',
   '{"frame_material":"aluminium","drivetrain":"Shimano Alfine 11 belt","brake_type":"hydraulic_disc","model_year_evidence":"official product page Highlights 2026"}'::jsonb,
   'https://www.stevensbikes.de/en/de/allround/caleta-7.2-lt', '2026-08-06'),
  ('stevens-amant-5-2-forma-2026-de', 'STEVENS', 'Amant 5.2 Forma', 2026, 'urban', 'DE',
   '{"drivetrain":"Shimano Nexus 8","brake_type":"hydraulic_disc","model_year_evidence":"official product page Highlights 2026"}'::jsonb,
   'https://www.stevensbikes.de/en/de/urban/amant-5.2-forma', '2026-08-06'),

  ('riese-muller-delite5-2026-global', 'Riese & Müller', 'Delite5', 2026, 'electric_trekking_full_suspension', 'global',
   '{"drive_options":["Bosch Performance Line CX","Bosch Performance Line Speed","Pinion MGU"],"model_year_evidence":"official press release explicitly states 2026 model year"}'::jsonb,
   'https://www.r-m.de/en-en/press/press-releases/e-bike-updates-at-riese-muller-delite5-superdelite5-and-swing5/', '2026-08-06'),
  ('riese-muller-superdelite5-2026-global', 'Riese & Müller', 'Superdelite5', 2026, 'electric_trekking_full_suspension', 'global',
   '{"battery_capacity_wh_max":1200,"model_year_evidence":"official press release explicitly states 2026 model year"}'::jsonb,
   'https://www.r-m.de/en-en/press/press-releases/e-bike-updates-at-riese-muller-delite5-superdelite5-and-swing5/', '2026-08-06'),
  ('riese-muller-swing5-2026-global', 'Riese & Müller', 'Swing5', 2026, 'electric_city', 'global',
   '{"motor":"Bosch Performance Line","model_year_evidence":"official press release explicitly states 2026 model year"}'::jsonb,
   'https://www.r-m.de/en-en/press/press-releases/e-bike-updates-at-riese-muller-delite5-superdelite5-and-swing5/', '2026-08-06'),

  ('gazelle-ultimate-c380-plus-2026-us', 'Gazelle', 'Ultimate C380+', 2026, 'electric_city', 'US',
   '{"motor":"Bosch Performance Line Sport","motor_torque_nm":90,"battery_wh":540,"drivetrain":"Enviolo stepless","assist_speed_mph":28,"model_year_evidence":"official Gazelle Summer Class of 2026"}'::jsonb,
   'https://www.gazellebikes.com/en-us/latest-models', '2026-08-06')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- SOURCE: supabase/schema/catalog_ingestion_wave_04_major_brands_2026_08_06.sql
-- VeloQuest verified major-brand expansion wave.
-- Every row has an explicit first-party model-year signal and satisfies model_year >= 2020.

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  ('specialized-crux-comp-2025-us', 'Specialized', 'Crux Comp', 2025, 'gravel', 'US',
   '{"model_year_evidence":"official Specialized Bike Archive lists 2025 Crux Comp","model_year_evidence_url":"https://www.specialized.com/us/en/bike-archive"}'::jsonb,
   'https://www.specialized.com/us/en/bike-archive', '2026-08-06'),

  ('cube-agree-c62-2025-global', 'CUBE', 'Agree C:62', 2025, 'road_race', 'global',
   '{"family_level":true,"frame_material":"carbon","model_year_evidence":"official CUBE product-safety notice explicitly identifies Agree C:62 bikes from model years 2025 and 2026","model_year_evidence_url":"https://www.cube.eu/support/customer-support/safety-recalls/product-safety-recall-agree-c-62-models-2025-2026"}'::jsonb,
   'https://www.cube.eu/support/customer-support/safety-recalls/product-safety-recall-agree-c-62-models-2025-2026', '2026-08-06'),

  ('orbea-orca-m20i-ltd-2025-global', 'Orbea', 'Orca M20i LTD', 2025, 'road_race', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official Orbea story states the M20i LTD replica edition is new for 2025","model_year_evidence_url":"https://stories.orbea.com/en/new-year-new-goals-and-new-orbea-bikes-for-lotto/"}'::jsonb,
   'https://stories.orbea.com/en/new-year-new-goals-and-new-orbea-bikes-for-lotto/', '2026-08-06'),
  ('orbea-orca-aero-m20i-ltd-2025-global', 'Orbea', 'Orca Aero M20i LTD', 2025, 'road_aero', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official Orbea story states the M20i LTD replica edition is new for 2025","model_year_evidence_url":"https://stories.orbea.com/en/new-year-new-goals-and-new-orbea-bikes-for-lotto/"}'::jsonb,
   'https://stories.orbea.com/en/new-year-new-goals-and-new-orbea-bikes-for-lotto/', '2026-08-06'),

  ('cannondale-superx-3-2025-us', 'Cannondale', 'SuperX 3', 2025, 'gravel_race', 'US',
   '{"model_year_evidence":"official Cannondale product URL identifies SuperX 3 as 2025","model_year_evidence_url":"https://www.cannondale.com/en-us/bikes/road/gravel/superx/superx-3/2025"}'::jsonb,
   'https://www.cannondale.com/en-us/bikes/road/gravel/superx/superx-3/2025', '2026-08-06'),
  ('cannondale-supersix-evo-lab71-team-2025-global', 'Cannondale', 'SuperSix EVO LAB71 Team', 2025, 'road_race', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official Cannondale page identifies the bike as a replica of the 2025 team bike","model_year_evidence_url":"https://www.cannondale.com/en/bikes/road/race/supersix-evo/supersix-evo-lab71-team"}'::jsonb,
   'https://www.cannondale.com/en/bikes/road/race/supersix-evo/supersix-evo-lab71-team', '2026-08-06'),

  ('scott-addict-rc-2025-global', 'SCOTT', 'Addict RC', 2025, 'road_race', 'global',
   '{"frame_material":"carbon","family_level":true,"model_year_evidence":"official SCOTT press page is titled New SCOTT Addict RC 2025","model_year_evidence_url":"https://www.scott-sports.com/us/en/press/bike/sco-bike-product-press-gran-fondo-magazine-addict-rc-031224"}'::jsonb,
   'https://www.scott-sports.com/us/en/press/bike/sco-bike-product-press-gran-fondo-magazine-addict-rc-031224', '2026-08-06'),

  ('santa-cruz-hightower-s-2025-us', 'Santa Cruz', 'Hightower S', 2025, 'trail', 'US',
   '{"model_year_evidence":"official Santa Cruz product URL identifies Hightower S as 2025","model_year_evidence_url":"https://www.santacruzbicycles.com/products/hightower-s-2025"}'::jsonb,
   'https://www.santacruzbicycles.com/products/hightower-s-2025', '2026-08-06'),
  ('santa-cruz-v10-dh-x01-2025-us', 'Santa Cruz', 'V10 DH X01', 2025, 'downhill', 'US',
   '{"model_year_evidence":"official Santa Cruz product URL identifies V10 DH X01 as 2025","model_year_evidence_url":"https://www.santacruzbicycles.com/products/v-10-dh-x-01-2025"}'::jsonb,
   'https://www.santacruzbicycles.com/products/v-10-dh-x-01-2025', '2026-08-06'),
  ('santa-cruz-blur-xx-axs-tr-rsv-2025-us', 'Santa Cruz', 'Blur XX AXS Trail RSV', 2025, 'xc_full_suspension', 'US',
   '{"model_year_evidence":"official Santa Cruz product URL identifies Blur XX AXS Trail RSV as 2025","model_year_evidence_url":"https://www.santacruzbicycles.com/collections/blur/products/blur-xx-axs-tr-rsv-2025"}'::jsonb,
   'https://www.santacruzbicycles.com/collections/blur/products/blur-xx-axs-tr-rsv-2025', '2026-08-06'),

  ('pinarello-dogma-f-2025-global', 'Pinarello', 'DOGMA F', 2025, 'road_race', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official Pinarello story explicitly identifies The New DOGMA F 2025","model_year_evidence_url":"https://pinarello.com/europe/en/news/the-new-dogma-f-2025"}'::jsonb,
   'https://pinarello.com/europe/en/news/the-new-dogma-f-2025', '2026-08-06'),
  ('pinarello-dogma-x-2025-global', 'Pinarello', 'DOGMA X', 2025, 'road_endurance', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official Pinarello news index labels DOGMA X MY25","model_year_evidence_url":"https://pinarello.com/global/en/news"}'::jsonb,
   'https://pinarello.com/global/en/news', '2026-08-06')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- SOURCE: supabase/schema/catalog_ingestion_wave_05_archives_media_2026_08_06.sql
-- VeloQuest verified archive + remote-media wave.
-- Every bicycle row has first-party model-year evidence and satisfies model_year >= 2020.
-- Images remain remote: only HTTPS source URLs are stored, never image binaries.

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  ('salsa-cutthroat-c-grx-610-1x-2025-us', 'Salsa', 'Cutthroat C GRX 610 1x', 2025, 'gravel_bikepacking', 'US',
   '{"frame_material":"carbon","wheel_size":"29","drivetrain_brand":"Shimano","drivetrain":"GRX RX822 / RX610, 12-speed","brake_type":"hydraulic_disc","brakes":"Shimano GRX RX400","bottom_bracket":"Press Fit BB92 41x92 mm","udh_compatible":true,"model_year_evidence":"official Salsa archived product title and URL explicitly identify 2025"}'::jsonb,
   'https://www.salsacycles.com/products/2025-cutthroat-c-grx-610-1x', '2026-08-06'),
  ('salsa-cutthroat-c-force-x0-axs-2025-us', 'Salsa', 'Cutthroat C Force X0 AXS Transmission', 2025, 'gravel_bikepacking', 'US',
   '{"frame_material":"carbon","drivetrain_brand":"SRAM","model_year_evidence":"official Salsa archived product title and URL explicitly identify 2025"}'::jsonb,
   'https://www.salsacycles.com/products/2025-cutthroat-c-force-xo-axs-transmission', '2026-08-06'),
  ('salsa-beargrease-c-xt-2025-us', 'Salsa', 'Beargrease C XT', 2025, 'fat_bike', 'US',
   '{"frame_material":"carbon","drivetrain_brand":"Shimano","model_year_evidence":"official Salsa archived product title and URL explicitly identify 2025"}'::jsonb,
   'https://www.salsacycles.com/products/2025-beargrease-c-xt', '2026-08-06'),
  ('salsa-warbird-c-grx-600-1x-2024-us', 'Salsa', 'Warbird C GRX 600 1x', 2024, 'gravel_race', 'US',
   '{"frame_material":"carbon","drivetrain_brand":"Shimano","model_year_evidence":"official Salsa archived product title and URL explicitly identify 2024"}'::jsonb,
   'https://www.salsacycles.com/products/2024-warbird-c-grx-600-1x', '2026-08-06'),
  ('salsa-warbird-c-frameset-2024-us', 'Salsa', 'Warbird C Frameset', 2024, 'gravel_race', 'US',
   '{"frame_material":"carbon","frameset":true,"model_year_evidence":"official Salsa archived product title and URL explicitly identify 2024"}'::jsonb,
   'https://www.salsacycles.com/products/2024-warbird-c-frameset', '2026-08-06'),
  ('salsa-heyday-advent-2024-us', 'Salsa', 'Heyday! Advent', 2024, 'fat_bike', 'US',
   '{"frame_material":"aluminium","model_year_evidence":"official Salsa archived product title and URL explicitly identify 2024"}'::jsonb,
   'https://www.salsacycles.com/products/2024-heyday-advent', '2026-08-06'),
  ('salsa-cutthroat-c-rival-gx-axs-2024-us', 'Salsa', 'Cutthroat C Rival GX AXS Transmission', 2024, 'gravel_bikepacking', 'US',
   '{"frame_material":"carbon","drivetrain_brand":"SRAM","model_year_evidence":"official Salsa archived product title and URL explicitly identify 2024"}'::jsonb,
   'https://www.salsacycles.com/products/2024-cutthroat-c-rival-gx-axs-transmission', '2026-08-06'),
  ('salsa-cutthroat-c-frameset-2024-us', 'Salsa', 'Cutthroat C Frameset', 2024, 'gravel_bikepacking', 'US',
   '{"frame_material":"carbon","frameset":true,"model_year_evidence":"official Salsa archived product title and URL explicitly identify 2024"}'::jsonb,
   'https://www.salsacycles.com/products/2024-cutthroat-c-frameset', '2026-08-06'),
  ('salsa-beargrease-c-xt-2024-us', 'Salsa', 'Beargrease C XT', 2024, 'fat_bike', 'US',
   '{"frame_material":"carbon","drivetrain_brand":"Shimano","model_year_evidence":"official Salsa archived product title and URL explicitly identify 2024"}'::jsonb,
   'https://www.salsacycles.com/products/2024-beargrease-c-xt', '2026-08-06'),
  ('salsa-beargrease-c-cues-2024-us', 'Salsa', 'Beargrease C CUES', 2024, 'fat_bike', 'US',
   '{"frame_material":"carbon","drivetrain_brand":"Shimano","model_year_evidence":"official Salsa archived product title and URL explicitly identify 2024"}'::jsonb,
   'https://www.salsacycles.com/products/2024-beargrease-c-cues', '2026-08-06'),

  ('marin-rift-zone-el-xr-2025-int', 'Marin', 'Rift Zone EL XR', 2025, 'emtb_light_full_suspension', 'global',
   '{"frame_material":"Series 4 aluminium","wheel_size":"29","front_travel_mm":150,"rear_travel_mm":140,"motor":"Bosch Performance Line SX","motor_peak_power_w":600,"motor_torque_nm":55,"battery_wh":400,"suspension_brand":"Fox","fork":"Fox 36 Performance Elite","rear_shock":"Fox Float X Performance Elite","drivetrain_brand":"SRAM","drivetrain":"GX AXS T-Type","brake_type":"hydraulic_disc","brakes":"Magura MT7 4-piston","rear_spacing":"148x12","model_year_evidence":"official Marin product URL and page explicitly identify 2025"}'::jsonb,
   'https://marinbikes.com/products/2025-rift-zone-el-xr-int', '2026-08-06'),
  ('marin-rift-zone-el2-2025-int', 'Marin', 'Rift Zone EL2', 2025, 'emtb_light_full_suspension', 'global',
   '{"frame_material":"Series 4 aluminium","wheel_size":"29","front_travel_mm":150,"rear_travel_mm":140,"motor":"Bosch Performance Line SX","motor_peak_power_w":600,"motor_torque_nm":55,"battery_wh":400,"suspension_brand":"Fox","fork":"Fox 36 Performance","rear_shock":"Fox Float X Performance","drivetrain_brand":"SRAM","drivetrain":"Eagle 90 / GX T-Type","brake_type":"hydraulic_disc","brakes":"SRAM Code Bronze 4-piston","model_year_evidence":"official Marin product URL and page explicitly identify 2025"}'::jsonb,
   'https://marinbikes.com/products/2025-rift-zone-el2-int', '2026-08-06'),
  ('marin-lombard-e2-2025-us', 'Marin', 'Lombard E2', 2025, 'electric_allroad', 'US',
   '{"model_year_evidence":"official Marin product URL explicitly identifies 2025"}'::jsonb,
   'https://marinbikes.com/products/2025-1-lombard-e2', '2026-08-06'),
  ('marin-rift-zone-xr-2025-us', 'Marin', 'Rift Zone XR', 2025, 'trail_full_suspension', 'US',
   '{"model_year_evidence":"official Marin product URL explicitly identifies 2025"}'::jsonb,
   'https://marinbikes.com/products/2025-rift-zone-xr', '2026-08-06'),
  ('marin-team-marin-2-2024-us', 'Marin', 'Team Marin 2', 2024, 'xc_hardtail', 'US',
   '{"model_year_evidence":"official Marin product URL explicitly identifies 2024"}'::jsonb,
   'https://marinbikes.com/products/2024-team-marin-2', '2026-08-06'),
  ('marin-gestalt-xr-2024-us', 'Marin', 'Gestalt XR', 2024, 'gravel', 'US',
   '{"model_year_evidence":"official Marin product URL explicitly identifies 2024"}'::jsonb,
   'https://marinbikes.com/products/2024-gestalt-xr-copy', '2026-08-06'),
  ('marin-rift-zone-jr-26-2025-us', 'Marin', 'Rift Zone JR 26', 2025, 'youth_full_suspension', 'US',
   '{"wheel_size":"26","model_year_evidence":"official Marin product URL explicitly identifies 2025"}'::jsonb,
   'https://marinbikes.com/products/2025-1-rift-zone-jr-26', '2026-08-06'),
  ('marin-dsx-fs-2026-us', 'Marin', 'DSX FS', 2026, 'gravel_suspension', 'US',
   '{"model_year_evidence":"official Marin product URL explicitly identifies 2026"}'::jsonb,
   'https://marinbikes.com/products/2026-dsx-fs', '2026-08-06'),
  ('marin-fairfax-e-st-2025-int', 'Marin', 'Fairfax E ST', 2025, 'electric_fitness', 'global',
   '{"model_year_evidence":"official Marin product URL explicitly identifies 2025"}'::jsonb,
   'https://marinbikes.com/products/2025-fairfax-e-st-int', '2026-08-06'),
  ('marin-team-marin-1-2024-us', 'Marin', 'Team Marin 1', 2024, 'xc_hardtail', 'US',
   '{"model_year_evidence":"official Marin product URL explicitly identifies 2024"}'::jsonb,
   'https://marinbikes.com/products/2024-team-marin-1', '2026-08-06'),
  ('marin-dsx-2-2025-us', 'Marin', 'DSX 2', 2025, 'gravel', 'US',
   '{"model_year_evidence":"official Marin product URL explicitly identifies 2025"}'::jsonb,
   'https://marinbikes.com/products/2025-1-dsx-2', '2026-08-06'),
  ('marin-gestalt-1-2023-us', 'Marin', 'Gestalt 1', 2023, 'gravel', 'US',
   '{"model_year_evidence":"official Marin product URL explicitly identifies 2023"}'::jsonb,
   'https://marinbikes.com/products/2023-gestalt-1', '2026-08-06'),
  ('marin-dsx-1-2025-us', 'Marin', 'DSX 1', 2025, 'gravel', 'US',
   '{"model_year_evidence":"official Marin product URL explicitly identifies 2025"}'::jsonb,
   'https://marinbikes.com/products/2025-1-dsx-1', '2026-08-06'),

  ('norco-optic-a1-gen3-2025-ca', 'Norco', 'Optic A1 Gen 3', 2025, 'trail_full_suspension', 'CA',
   '{"frame_material":"aluminium","wheel_size":"29","front_travel_mm":140,"rear_travel_mm":125,"model_year_evidence":"official Norco MY25 Optic product page explicitly identifies the 2025 Optic"}'::jsonb,
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a1/', '2026-08-06'),
  ('norco-optic-a2-gen3-2025-ca', 'Norco', 'Optic A2 Gen 3', 2025, 'trail_full_suspension', 'CA',
   '{"frame_material":"aluminium","wheel_size":"29","front_travel_mm":140,"rear_travel_mm":125,"model_year_evidence":"official Norco MY25 Optic product page explicitly identifies the 2025 Optic"}'::jsonb,
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a2/', '2026-08-06'),
  ('norco-optic-c2-gen3-2025-global', 'Norco', 'Optic C2 Gen 3', 2025, 'trail_full_suspension', 'global',
   '{"frame_material":"carbon","wheel_size":"29","front_travel_mm":140,"rear_travel_mm":125,"model_year_evidence":"official Norco MY25 Optic product page explicitly identifies the 2025 Optic"}'::jsonb,
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-C2/', '2026-08-06'),

  ('yeti-sb140-29-2025-us', 'Yeti', 'SB140 29', 2025, 'trail_full_suspension', 'US',
   '{"frame_material":"carbon","wheel_size":"29","rear_travel_mm":140,"family_level":true,"model_year_evidence":"official Yeti archive explicitly lists SB140 29 for 2023-2025"}'::jsonb,
   'https://yeticycles.com/en-us/archive', '2026-08-06'),
  ('yeti-sb120-2025-us', 'Yeti', 'SB120', 2025, 'xc_trail_full_suspension', 'US',
   '{"frame_material":"carbon","wheel_size":"29","rear_travel_mm":120,"family_level":true,"model_year_evidence":"official Yeti archive explicitly lists SB120 for 2023-2025"}'::jsonb,
   'https://yeticycles.com/en-us/archive', '2026-08-06'),
  ('yeti-sb160-2025-us', 'Yeti', 'SB160', 2025, 'enduro_full_suspension', 'US',
   '{"frame_material":"carbon","wheel_size":"29","rear_travel_mm":160,"family_level":true,"model_year_evidence":"official Yeti archive explicitly lists SB160 for 2023-2025"}'::jsonb,
   'https://yeticycles.com/en-us/archive', '2026-08-06'),
  ('yeti-sb165-2025-us', 'Yeti', 'SB165', 2025, 'enduro_full_suspension', 'US',
   '{"frame_material":"carbon","family_level":true,"model_year_evidence":"official Yeti archive explicitly lists SB165 for 2023-2026"}'::jsonb,
   'https://yeticycles.com/en-us/archive', '2026-08-06'),

  ('pivot-les-2025-global', 'Pivot', 'LES', 2025, 'xc_hardtail', 'global',
   '{"family_level":true,"model_year_evidence":"official Pivot Bike Archive lists LES through model year 2025"}'::jsonb,
   'https://www.pivotcycles.com/en/bike-archive', '2026-08-06'),
  ('pivot-mach-4-2025-global', 'Pivot', 'Mach 4', 2025, 'xc_full_suspension', 'global',
   '{"family_level":true,"model_year_evidence":"official Pivot Bike Archive lists Mach 4 through model year 2025"}'::jsonb,
   'https://www.pivotcycles.com/en/bike-archive', '2026-08-06'),
  ('pivot-mach-6-2025-global', 'Pivot', 'Mach 6', 2025, 'enduro_full_suspension', 'global',
   '{"family_level":true,"model_year_evidence":"official Pivot Bike Archive lists Mach 6 through model year 2025"}'::jsonb,
   'https://www.pivotcycles.com/en/bike-archive', '2026-08-06'),
  ('pivot-shuttle-am-2025-global', 'Pivot', 'Shuttle AM', 2025, 'emtb_full_suspension', 'global',
   '{"family_level":true,"model_year_evidence":"official Pivot Bike Archive lists Shuttle AM through model year 2025"}'::jsonb,
   'https://www.pivotcycles.com/en/bike-archive', '2026-08-06'),
  ('pivot-shuttle-lt-2025-global', 'Pivot', 'Shuttle LT', 2025, 'emtb_full_suspension', 'global',
   '{"family_level":true,"model_year_evidence":"official Pivot Bike Archive lists Shuttle LT through model year 2025"}'::jsonb,
   'https://www.pivotcycles.com/en/bike-archive', '2026-08-06'),

  ('rocky-mountain-element-carbon-99-2025-int', 'Rocky Mountain', 'Element Carbon 99', 2025, 'xc_full_suspension', 'global',
   '{"frame_material":"carbon","wheel_size":"29 / 27.5 XS","rear_travel_mm":120,"fork":"RockShox SID Ultimate Flight Attendant 120mm","drivetrain_brand":"SRAM","drivetrain":"XX Eagle Transmission Wireless","brake_type":"hydraulic_disc","model_year_evidence":"official Rocky Mountain 2025 collection and product URL suffix -25"}'::jsonb,
   'https://bikes.com/en-intl/products/element-c99-25', '2026-08-06'),
  ('rocky-mountain-element-carbon-70-2025-int', 'Rocky Mountain', 'Element Carbon 70', 2025, 'xc_full_suspension', 'global',
   '{"frame_material":"carbon","rear_travel_mm":120,"fork":"Fox 34 Float Performance Elite","drivetrain_brand":"SRAM","drivetrain":"GX Eagle Transmission Wireless","model_year_evidence":"official Rocky Mountain 2025 collection and product URL suffix -25"}'::jsonb,
   'https://bikes.com/en-intl/products/element-c70-25', '2026-08-06'),
  ('rocky-mountain-altitude-alloy-70-coil-2025-int', 'Rocky Mountain', 'Altitude Alloy 70 Coil', 2025, 'enduro_full_suspension', 'global',
   '{"frame_material":"aluminium","suspension_brand":"Fox","fork":"Fox 38 Float EVOL GRIP2 Factory","rear_shock":"Fox DHX Coil Factory","drivetrain_brand":"Shimano","brakes":"Shimano XT Trail 4 Piston","model_year_evidence":"official Rocky Mountain 2025 collection and product URL suffix -25"}'::jsonb,
   'https://bikes.com/en-intl/products/altitude-a70-coil-25', '2026-08-06')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at)
values
  ('salsa-cutthroat-c-grx-610-1x-2025-us',
   'https://www.salsacycles.com/cdn/shop/files/salsa-cutthroat-c-grx-610-bike-dark-pine-BK00428-1920x1080-uc-1.png?v=1739311277&width=1946',
   'manufacturer', 'Salsa', 'https://www.salsacycles.com/products/2025-cutthroat-c-grx-610-1x', 10, '2026-08-06'),
  ('marin-rift-zone-el-xr-2025-int',
   'https://marinbikes.com/cdn/shop/files/2025_MARIN_BIKES_RIFT_ZONE_EL_XR_TAN_BROWN_SIDE.png?v=1753785495&width=1000',
   'manufacturer', 'Marin', 'https://marinbikes.com/products/2025-rift-zone-el-xr-int', 10, '2026-08-06'),
  ('marin-rift-zone-el2-2025-int',
   'https://marinbikes.com/cdn/shop/files/2025_MARIN_BIKES_RIFT_ZONE_EL_2_SILVER_SIDE.png?v=1771956712&width=1000',
   'manufacturer', 'Marin', 'https://marinbikes.com/products/2025-rift-zone-el2-int', 10, '2026-08-06'),
  ('rocky-mountain-element-carbon-99-2025-int',
   'https://bikes.com/cdn/shop/files/Web_MY25_Element_C99_C3_29_Profile.jpg?v=1743703741&width=2500',
   'manufacturer', 'Rocky Mountain', 'https://bikes.com/en-intl/products/element-c99-25', 10, '2026-08-06')
on conflict (bike_id, image_url) do update set
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_page_url = excluded.source_page_url,
  priority = excluded.priority,
  checked_at = excluded.checked_at,
  enabled = true;

-- SOURCE: supabase/schema/catalog_enrichment_wave_06_specs_components_media_2026_08_07.sql
-- VeloQuest catalog enrichment wave 06.
-- Enriches existing verified 2020+ bicycles; it does not broaden model-year claims.
-- All media remain remote HTTPS URLs. Component compatibility is default-deny.

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","wheel_size":"700c","drivetrain_brand":"Shimano","drivetrain":"Shimano GRX 820 2x12, 11-36","groupset":"Shimano GRX 820","rear_derailleur":"Shimano GRX 820 Shadow RD+","cassette":"Shimano 105 7100 11-36 12-speed","brake_type":"hydraulic_disc","brakes":"Shimano GRX 820 hydraulic disc, 160/160 mm CL800 rotors","wheelset":"DT Swiss G1800 Spline","tires":"Vittoria Terreno T50 700x40c tubeless-ready","front_axle":"12x100","rear_axle":"12x142","bottom_bracket":"BSA 68 mm threaded","udh_compatible":true,"max_tire_clearance_mm":48,"spec_evidence":"official Cannondale 2025 SuperX 3 product specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'cannondale-superx-3-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","wheel_size":"27.5 x 4.0","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore XT M8100 / SLX M7100 1x12","rear_derailleur":"Shimano Deore XT M8100","cassette":"Shimano SLX M7100 10-51 12-speed","brake_type":"hydraulic_disc","brakes":"SRAM Level TL; 180 mm front / 160 mm rear CenterLine rotors","wheelset":"Sun Ringle SRC / Mulefut SL 80 mm","tires":"45NRTH Vanhelga 27.5 x 4.0 tubeless-ready","front_axle":"15x150","rear_axle":"12x197","bottom_bracket":"BSA 100 mm threaded","seatpost_diameter_mm":30.9,"dropper_compatible":true,"max_chainring_teeth":32,"spec_evidence":"official Salsa archived 2025 Beargrease C XT build kit and frame specs"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'salsa-beargrease-c-xt-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","wheel_size":"29","front_travel_mm":160,"rear_travel_mm":150,"suspension_brand":"FOX","fork":"FOX 36 Float Performance","rear_shock":"FOX Float X Performance","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle","brake_type":"hydraulic_disc","weight_kg":15.21,"spec_evidence":"official Santa Cruz Hightower S 2025 product page"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'santa-cruz-hightower-s-2025-us';

update public.bike_catalog_models
set specs = specs || '{"drivetrain_brand":"Shimano","drivetrain":"Shimano Tiagra 2x10","brake_type":"hydraulic_disc","brakes":"Shimano Tiagra hydraulic disc, flat mount","spec_evidence":"official Trek Domane AL 4 Gen 4 product and 2026 pre-owned specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'trek-domane-al-4-gen-4-2026-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Ultegra R8170 Di2 12-speed","rear_derailleur":"Shimano Ultegra R8150 Di2","brake_type":"hydraulic_disc","brakes":"Shimano Ultegra BR-R8170 hydraulic disc","spec_evidence":"official Trek Madone SL 7 Gen 8 2026 pre-owned specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'trek-madone-sl-7-gen-8-2026-us';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at)
values
  ('salsa-beargrease-c-xt-2025-us',
   'https://www.salsacycles.com/cdn/shop/files/salsa-beargrease-c-xt-fat-bike-indigo-BK01372-1920x1080-uc-1.png?v=1736363830&width=1946',
   'manufacturer', 'Salsa', 'https://www.salsacycles.com/products/2025-beargrease-c-xt', 10, '2026-08-07'),
  ('cannondale-superx-3-2025-us',
   'https://embed.widencdn.net/img/dorelrl/oxr8zmqmc4/700px%401x/C25_C17045U_SuperX_Crb_3_RAW_PD.png',
   'manufacturer', 'Cannondale', 'https://www.cannondale.com/en-us/bikes/road/gravel/superx/superx-3/2025', 10, '2026-08-07'),
  ('santa-cruz-hightower-s-2025-us',
   'https://www.santacruzbicycles.com/cdn/shop/files/MY25_Hightower_C_S_GlossDayGreen_82a74e05-7149-4be3-a166-3a80b49091dc.png?crop=region&crop_height=3513&crop_left=90&crop_top=386&crop_width=5419&v=1732662007&width=5600',
   'manufacturer', 'Santa Cruz', 'https://www.santacruzbicycles.com/products/hightower-s-2025', 10, '2026-08-07'),
  ('santa-cruz-hightower-s-2025-us',
   'https://www.santacruzbicycles.com/cdn/shop/files/MY25_Hightower_C_S_MatteDeepPurple_c70207e1-71ad-4dfc-9e24-43306d8f6ad9.png?crop=region&crop_height=3513&crop_left=90&crop_top=386&crop_width=5419&v=1732662006&width=5600',
   'manufacturer', 'Santa Cruz', 'https://www.santacruzbicycles.com/products/hightower-s-2025', 20, '2026-08-07')
on conflict (bike_id, image_url) do update set
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_page_url = excluded.source_page_url,
  priority = excluded.priority,
  checked_at = excluded.checked_at,
  enabled = true;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('shimano-rd-rx820', 'Shimano', 'RD-RX820', 'rear_derailleur', 'GRX RD-RX820',
   '{"speeds":12,"drivetrain":"2x12","compatible_chain":"HG 12-speed","largest_sprocket_range":"34-36T"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/RD-RX820', '2026-08-07'),
  ('shimano-cs-hg710-12', 'Shimano', 'CS-HG710-12', 'cassette', 'CS-HG710-12 11-36T',
   '{"speeds":12,"range":"11-36T","compatible_chain":"HG 12-speed"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/CS-HG710-12', '2026-08-07'),
  ('shimano-br-rx820', 'Shimano', 'BR-RX820', 'brake_caliper', 'GRX BR-RX820',
   '{"brake_type":"hydraulic_disc","mount":"flat_mount"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/BR-RX820', '2026-08-07'),
  ('shimano-rd-m8100-sgs', 'Shimano', 'RD-M8100-SGS', 'rear_derailleur', 'DEORE XT RD-M8100-SGS',
   '{"speeds":12,"drivetrain":"1x12","compatible_chain":"HG 12-speed","largest_sprocket":"51T"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/RD-M8100-SGS', '2026-08-07'),
  ('shimano-cs-m7100-12', 'Shimano', 'CS-M7100-12', 'cassette', 'SLX CS-M7100-12 10-51T',
   '{"speeds":12,"range":"10-51T","freehub":"MICRO SPLINE","compatible_chain":"HG 12-speed"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/CS-M7100-12', '2026-08-07')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('shimano-rd-rx820', 'shimano-cs-hg710-12', 'compatible',
   'Shimano C-254 lists RD-RX820 for 2x12 with an 11-36T cassette; CS-HG710-12 is Shimano HG 12-speed 11-36T.',
   'https://productinfo.shimano.com/en/compatibility/C-254', '2026-08-07'),
  ('shimano-rd-m8100-sgs', 'shimano-cs-m7100-12', 'compatible',
   'Shimano 2026-2027 MTB compatibility lists RD-M8100-SGS with 10-51T 12-speed cassettes including CS-M7100-12.',
   'https://productinfo.shimano.com/pdfs/product/thisyear/2026-2027_Compatibility_v024_en.pdf', '2026-08-07')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

-- SOURCE: supabase/schema/catalog_enrichment_wave_07_norco_fitment_2026_08_07.sql
-- VeloQuest catalog enrichment wave 07.
-- Deepens existing 2025 Norco Optic Gen 3 records and adds verified SRAM Transmission fitment.
-- Component compatibility remains default-deny: only explicitly sourced pairs are inserted.

update public.bike_catalog_models
set specs = specs || '{"suspension_brand":"FOX","fork":"FOX 34 Factory Float, Grip X, 140 mm, 44 mm offset","rear_shock":"FOX Float X Factory, 185x50 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle AXS T-Type 12-speed","cassette":"SRAM 1275 Eagle T-Type 10-52T 12-speed","brake_type":"hydraulic_disc","brakes":"SRAM Code Silver Stealth 4-piston","bottom_bracket":"SRAM DUB BSA 73 mm MTB Wide","udh_compatible":true,"spec_evidence":"official Norco 2025 Optic A1 product specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'norco-optic-a1-gen3-2025-ca';

update public.bike_catalog_models
set specs = specs || '{"suspension_brand":"RockShox","fork":"RockShox Pike Base, 140 mm, 44 mm offset","rear_shock":"RockShox Super Deluxe Select+, 185x50 mm","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore M6100 1x12","rear_derailleur":"Shimano Deore RD-M6100","cassette":"Shimano Deore CS-M6100-12 10-51T","brake_type":"hydraulic_disc","brakes":"Shimano Deore MT520 4-piston, RT-64 180/180 mm rotors","wheelset":"WTB ST i30 TCS 2.0 29 in","tires":"Maxxis Minion DHF 29x2.5 front / Dissector 29x2.4 rear","front_axle":"15x110 Boost","rear_axle":"12x148 Boost","rear_freehub":"MICRO SPLINE","udh_compatible":true,"weight_kg":17.2,"spec_evidence":"official Norco 2025 Optic A2 product specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'norco-optic-a2-gen3-2025-ca';

update public.bike_catalog_models
set specs = specs || '{"suspension_brand":"RockShox","fork":"RockShox Pike Select+, Charger 3.1, 140 mm","rear_shock":"RockShox Super Deluxe Select+, 185x50 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle AXS T-Type 12-speed","brake_type":"hydraulic_disc","brakes":"SRAM Code Silver Stealth 4-piston","udh_compatible":true,"spec_evidence":"official Norco 2025 Optic C2 product specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'norco-optic-c2-gen3-2025-global';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('sram-rd-gx-e-b1', 'SRAM', 'RD-GX-E-B1', 'rear_derailleur', 'GX Eagle Transmission Derailleur',
   '{"speeds":12,"system":"Eagle Transmission","t_type":true,"axs":true,"mount":"Full Mount / hangerless"}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/rd-gx-e-b1', '2026-08-07'),
  ('sram-cs-xs-1275-a1', 'SRAM', 'CS-XS-1275-A1', 'cassette', 'XS-1275 Eagle Transmission Cassette',
   '{"speeds":12,"range":"10-52T","system":"Eagle Transmission","t_type":true,"freehub":"XD"}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/cs-xs-1275-a1', '2026-08-07')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('sram-rd-gx-e-b1', 'sram-cs-xs-1275-a1', 'compatible',
   'SRAM GX Eagle AXS Transmission groupset pairs the GX Eagle Transmission derailleur with the 10-52T T-Type Eagle Transmission cassette family; XS-1275 is the GX-level 10-52T T-Type cassette.',
   'https://www.sram.com/en/sram/models/gs-gx-e-d1', '2026-08-07')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

-- SOURCE: supabase/schema/catalog_enrichment_wave_08_bmc_factory_fitment_2026_08_07.sql
-- VeloQuest catalog enrichment wave 08.
-- Deepens verified 2024 BMC factory specifications and introduces an explicit
-- Bike -> factory component evidence layer. Unknown fitments remain default-deny.

create table if not exists public.bike_catalog_component_fitments (
  bike_id text not null references public.bike_catalog_models(id) on delete cascade,
  component_id text not null references public.garage_components(id) on delete cascade,
  fitment_type text not null check (fitment_type in ('factory_installed', 'manufacturer_approved', 'incompatible')),
  evidence_url text not null check (evidence_url ~ '^https://'),
  evidence_checked_at date not null,
  notes text not null default '',
  primary key (bike_id, component_id, fitment_type)
);

create index if not exists bike_catalog_component_fitments_lookup_idx
on public.bike_catalog_component_fitments (bike_id, fitment_type, component_id);

alter table public.bike_catalog_component_fitments enable row level security;
revoke all on table public.bike_catalog_component_fitments from anon, authenticated;
grant select on table public.bike_catalog_component_fitments to authenticated;

drop policy if exists bike_catalog_component_fitments_read on public.bike_catalog_component_fitments;
create policy bike_catalog_component_fitments_read on public.bike_catalog_component_fitments
for select to authenticated using (
  exists (
    select 1 from public.bike_catalog_models bike
    where bike.id = bike_id and bike.enabled = true and bike.model_year >= 2020
  )
  and exists (
    select 1 from public.garage_components component
    where component.id = component_id and component.enabled = true
  )
);

comment on table public.bike_catalog_component_fitments is
'Evidence-backed links between verified catalog bicycles and exact components. Missing rows mean unknown; clients must not infer fitment.';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":120,"rear_travel_mm":100,"suspension_brand":"Ohlins","fork":"Ohlins RXC34 Carbon, 120 mm","rear_shock":"Ohlins TXC2 Air","drivetrain_brand":"SRAM","drivetrain":"SRAM XX SL Eagle Transmission 1x12","rear_derailleur":"SRAM XX SL Eagle Transmission","cassette":"SRAM XX SL Eagle Transmission XS-1299 10-52T","crankset":"SRAM XX SL Eagle Carbon 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level Ultimate; HS2 rotors","wheelset":"Duke Lucky Jack SLS4","hubs":"Duke Madmax","tires":"Pirelli Scorpion XC RC 2.4 in","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":62,"spec_evidence":"official BMC 2024 Fourstroke 01 TEAM archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-team-bikes-bmc-24a-000004',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-01-team-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":110,"rear_travel_mm":100,"suspension_brand":"FOX","fork":"FOX Float 34 SC Factory FIT4, 110 mm","rear_shock":"FOX Float DPS EVOL LV Factory","drivetrain_brand":"SRAM","drivetrain":"SRAM XX SL Eagle Transmission 1x12","rear_derailleur":"SRAM XX SL Eagle Transmission","cassette":"SRAM XX SL Eagle Transmission XS-1299 10-52T","crankset":"SRAM XX SL Eagle Carbon 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level Ultimate; HS2 Centerlock rotors","wheelset":"DT Swiss XRC 1200, 30 mm internal","hubs":"DT Swiss 180 Straightpull, Ratchet EXP 36, SINC ceramic bearings","tires":"Vittoria Mezcal 2.35 in","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":62,"weight_kg":10.7,"spec_evidence":"official BMC 2024 Fourstroke 01 LTD archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-ltd-bikes-bmc-24-10503-003',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-01-ltd-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":110,"rear_travel_mm":100,"suspension_brand":"RockShox","fork":"RockShox SID Ultimate 3P, 110 mm","rear_shock":"RockShox SIDLUXE Ultimate","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 Eagle Transmission 1x12","rear_derailleur":"SRAM X0 Eagle Transmission","cassette":"SRAM X0 Eagle Transmission XS-1295 10-52T","crankset":"SRAM X0 Eagle 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level Ultimate; HS2 rotors","wheelset":"DT Swiss XRC 1501, 30 mm internal","hubs":"DT Swiss 240 Straightpull, Ratchet EXP 36","tires":"Vittoria Mezcal 2.35 in","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":62,"weight_kg":11.1,"spec_evidence":"official BMC 2024 Fourstroke 01 ONE archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-one-bikes-bmc-24-10503-002',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-01-one-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":110,"rear_travel_mm":100,"suspension_brand":"RockShox","fork":"RockShox SID SL Select+, 110 mm","rear_shock":"RockShox SIDLUXE Select+","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle Transmission 1x12","rear_derailleur":"SRAM GX Eagle Transmission","cassette":"SRAM XS-1275 Eagle Transmission CS-XS-1275-A1 10-52T","crankset":"SRAM GX Eagle 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level TLM; HS2 rotors","wheelset":"XCD-30W Carbon, 30 mm internal","hubs":"XCD-30W","tires":"Vittoria Mezcal 2.35 in","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":62,"weight_kg":11.4,"spec_evidence":"official BMC 2024 Fourstroke 01 TWO archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-two-bikes-bmc-24-10503-001',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-01-two-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":120,"rear_travel_mm":120,"suspension_brand":"RockShox","fork":"RockShox SID Select+ 3P, 120 mm","rear_shock":"RockShox SIDLUXE Select+","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle 1x12","rear_derailleur":"SRAM GX Eagle","cassette":"SRAM XG-1275 Eagle 10-52T","crankset":"SRAM Stylo 6K Eagle 32T","brake_type":"hydraulic_disc","brakes":"SRAM G2 RS; Centerline 180/180 mm rotors","wheelset":"DT Swiss M 1900, 30 mm internal","hubs":"DT Swiss 370, Ratchet LN18","tires":"Maxxis Rekon 2.4 in EXO TR","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":62,"weight_kg":12.6,"spec_evidence":"official BMC 2024 Fourstroke LT ONE archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-lt-one-bikes-bmc-24-10517-006',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-lt-one-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":100,"suspension_brand":"RockShox","fork":"RockShox SID SL Select 3P, 100 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM X01/GX Eagle 1x12","rear_derailleur":"SRAM X01 Eagle","cassette":"SRAM CS-XG-1275-B1 10-52T","crankset":"SRAM X1 Eagle DUB 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level Silver Stealth; Centerline rotors","wheelset":"DT Swiss XR 1700, 25 mm internal","hubs":"DT Swiss 350 Straightpull, Ratchet 36 SL","tires":"Vittoria Barzo 2.25 in tubeless","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":58,"spec_evidence":"official BMC 2024 Twostroke 01 ONE archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/twostroke-01-one-bikes-bmc-24-10515-001',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-twostroke-01-one-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":100,"suspension_brand":"RockShox","fork":"RockShox Reba RL R, 100 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle 1x12","rear_derailleur":"SRAM GX Eagle","cassette":"SRAM CS-XG-1275-B1 10-52T","crankset":"SRAM GX Eagle DUB 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level Bronze Stealth; Centerline rotors","wheelset":"DT Swiss X 1900, 25 mm internal","hubs":"DT Swiss 370, Ratchet LN18","tires":"Vittoria Barzo 2.25 in tubeless","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":58,"spec_evidence":"official BMC 2024 Twostroke 01 TWO archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/twostroke-01-two-bikes-bmc-24-10515-002',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-twostroke-01-two-2024-global';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('sram-rd-x0-e-b1', 'SRAM', 'RD-X0-E-B1', 'rear_derailleur', 'X0 Eagle Transmission Derailleur',
   '{"speeds":12,"system":"Eagle Transmission","t_type":true,"axs":true,"mount":"Full Mount / hangerless","max_cassette":"52T"}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/rd-x0-e-b1', '2026-08-07'),
  ('sram-cs-xs-1295-a1', 'SRAM', 'CS-XS-1295-A1', 'cassette', 'XS-1295 Eagle Transmission Cassette',
   '{"speeds":12,"range":"10-52T","system":"Eagle Transmission","t_type":true,"chainline_mm":55}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/cs-xs-1295-a1', '2026-08-07'),
  ('sram-rd-xx-sle-b1', 'SRAM', 'RD-XX-SLE-B1', 'rear_derailleur', 'XX SL Eagle Transmission Derailleur',
   '{"speeds":12,"system":"Eagle Transmission","t_type":true,"axs":true,"mount":"Full Mount / hangerless","max_cassette":"52T"}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/rd-xx-sle-b1', '2026-08-07'),
  ('sram-cs-xs-1299-a1', 'SRAM', 'CS-XS-1299-A1', 'cassette', 'XS-1299 Eagle Transmission Cassette',
   '{"speeds":12,"range":"10-52T","system":"Eagle Transmission","t_type":true,"freehub":"XD","chainline_mm":55}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/cs-xs-1299-a1', '2026-08-07')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('sram-rd-x0-e-b1', 'sram-cs-xs-1295-a1', 'compatible',
   'SRAM X0 Eagle AXS Transmission groupset pairs the X0 T-Type derailleur with the 10-52T X0 Eagle Transmission cassette.',
   'https://www.sram.com/en/sram/models/gs-x0-e-d1', '2026-08-07'),
  ('sram-rd-xx-sle-b1', 'sram-cs-xs-1299-a1', 'compatible',
   'SRAM XX SL Eagle AXS Transmission groupset pairs the XX SL T-Type derailleur with the XS-1299 10-52T cassette family.',
   'https://www.sram.com/en/sram/models/gs-xx-sle-d1', '2026-08-07')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('bmc-fourstroke-01-team-2024-global', 'sram-rd-xx-sle-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-team-bikes-bmc-24a-000004', '2026-08-07', 'BMC lists SRAM XX SL Eagle Transmission rear derailleur.'),
  ('bmc-fourstroke-01-team-2024-global', 'sram-cs-xs-1299-a1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-team-bikes-bmc-24a-000004', '2026-08-07', 'BMC lists SRAM XX SL Eagle Transmission XS-1299 cassette.'),
  ('bmc-fourstroke-01-ltd-2024-global', 'sram-rd-xx-sle-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-ltd-bikes-bmc-24-10503-003', '2026-08-07', 'BMC lists SRAM XX SL Eagle Transmission rear derailleur.'),
  ('bmc-fourstroke-01-ltd-2024-global', 'sram-cs-xs-1299-a1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-ltd-bikes-bmc-24-10503-003', '2026-08-07', 'BMC lists SRAM XX SL Eagle Transmission XS-1299 cassette.'),
  ('bmc-fourstroke-01-one-2024-global', 'sram-rd-x0-e-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-one-bikes-bmc-24-10503-002', '2026-08-07', 'BMC lists SRAM X0 Eagle Transmission rear derailleur.'),
  ('bmc-fourstroke-01-one-2024-global', 'sram-cs-xs-1295-a1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-one-bikes-bmc-24-10503-002', '2026-08-07', 'BMC lists SRAM X0 Eagle Transmission XS-1295 cassette.'),
  ('bmc-fourstroke-01-two-2024-global', 'sram-rd-gx-e-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-two-bikes-bmc-24-10503-001', '2026-08-07', 'BMC lists SRAM GX Eagle Transmission rear derailleur.'),
  ('bmc-fourstroke-01-two-2024-global', 'sram-cs-xs-1275-a1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-two-bikes-bmc-24-10503-001', '2026-08-07', 'BMC lists CS-XS-1275-A1 cassette explicitly.'),
  ('bmc-twostroke-01-one-2024-global', 'sram-cs-xg-1275-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/twostroke-01-one-bikes-bmc-24-10515-001', '2026-08-07', 'BMC lists CS-XG-1275-B1 cassette explicitly.'),
  ('bmc-twostroke-01-two-2024-global', 'sram-cs-xg-1275-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/twostroke-01-two-bikes-bmc-24-10515-002', '2026-08-07', 'BMC lists CS-XG-1275-B1 cassette explicitly.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

-- SOURCE: supabase/schema/catalog_enrichment_wave_09_bmc_2025_cues_2026_08_07.sql
-- VeloQuest catalog enrichment wave 09.
-- Deepens five existing 2025 BMC archive bikes using exact first-party product pages.
-- Adds only component identities and compatibility pairs that can be corroborated
-- by BMC + Shimano/SRAM first-party evidence. Wheel diameter remains unknown where
-- the BMC technical overview does not state it explicitly.

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Premium Aluminium","frame":"257 AMP Premium Aluminium; integrated battery; 12x142 mm thru-axle","fork":"257 Premium Aluminium; 12x100 mm thru-axle","motor":"Bosch Performance Line Speed","motor_brand":"Bosch","battery":"Bosch PowerTube 625 Wh","battery_wh":625,"display":"Bosch Kiox","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 1x11","rear_derailleur":"Shimano CUES RD-U8000","cassette":"Shimano CUES CS-LG700-11 11-50T","crankset":"Miranda Classic x Bosch CF3D; 46T","brakes":"TEKTRO TRP HD; 180/160 mm rotors","rims":"E-SRX30","hubs":"CL-712 front; ECT-142S rear","tires":"Pirelli Angel GT 37 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":42,"spec_evidence":"official BMC 2025 Edition 257 AMP AL SPEED ONE USA archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/257-amp-al-speed-one-usa-bikes-bmc-25e-000013',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-257-amp-al-speed-one-usa-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Premium Aluminium","frame":"URS Premium Aluminium; 12x142 mm thru-axle","fork":"URS Carbon; 12x100 mm thru-axle","drivetrain_brand":"SRAM","drivetrain":"SRAM Apex Eagle 1x12","rear_derailleur":"SRAM Apex Eagle","cassette":"SRAM NX Eagle 11-50T","crankset":"SRAM Apex 1 DUB WIDE; 40T","bottom_bracket":"PF86","brakes":"SRAM Apex; Centerline Centerlock 160/160 mm rotors","rims":"DT Swiss C1850 SPLINE 23 mm","hubs":"CL-712 front; RXC-1425 rear","tires":"WTB Riddler 45 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":45,"spec_evidence":"official BMC 2025 Edition URS AL ONE archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/urs-al-one-bordeaux-red-gravel-exploration-bikes-bmc-25e-000012',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-urs-al-one-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Premium Aluminium","frame":"Alpenchallenge Premium Aluminium; 12x142 mm thru-axle","fork":"Alpenchallenge Premium Aluminium; 12x100 mm thru-axle","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle 1x12","rear_derailleur":"SRAM GX Eagle","cassette":"SRAM NX PG-1230 Eagle 11-50T","crankset":"SRAM S650 Eagle; 38T","bottom_bracket":"BSA threaded","brakes":"TEKTRO HD-EU818; 180/180 mm rotors","rims":"SR500","hubs":"CL-712 front; RXC-142S rear","tires":"Vittoria Randonneur 37 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":42,"spec_evidence":"official BMC 2025 Edition Alpenchallenge AL TWO archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-two-dark-petrol-lifestyle-active-bikes-bmc-25e-000009',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-alpenchallenge-al-two-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Premium Aluminium","frame":"Alpenchallenge Premium Aluminium; 12x142 mm thru-axle","fork":"Alpenchallenge Premium Aluminium; 12x100 mm thru-axle","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore 1x12","rear_derailleur":"Shimano Deore RD-M6100","cassette":"Shimano Deore CS-M6100 10-51T","crankset":"FSA Vero Pro; 40T","bottom_bracket":"BSA threaded","brakes":"TEKTRO HD-R280; 180/180 mm rotors","rims":"PFR300","hubs":"CL-712 front; CL-142M rear","tires":"Vittoria Randonneur 37 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":42,"spec_evidence":"official BMC 2025 Edition Alpenchallenge AL THREE archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-three-blackpetrol-lifestyle-active-bikes-bmc-25e-000010',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-alpenchallenge-al-three-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Premium Aluminium","frame":"Alpenchallenge Premium Aluminium; 12x142 mm thru-axle","fork":"Alpenchallenge Premium Aluminium; 12x100 mm thru-axle","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 1x11","rear_derailleur":"Shimano CUES RD-U6000","cassette":"Shimano CUES CS-LG400 11-50T","crankset":"FSA Vero Pro; 40T","bottom_bracket":"BSA threaded","brakes":"Shimano BL-MT200 / BR-UR300; SM-RT10 180/180 mm rotors","rims":"PFR300","hubs":"CL-712 front; RXC-142S rear","tires":"Vittoria Randonneur 37 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":42,"spec_evidence":"official BMC 2025 Edition Alpenchallenge AL FOUR archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-four-grey-black-lifestyle-active-bikes-bmc-25e-000011',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-alpenchallenge-al-four-2025-us';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('shimano-rd-u8000', 'Shimano', 'RD-U8000', 'rear_derailleur', 'CUES RD-U8000',
   '{"speeds":11,"system":"CUES LINKGLIDE","max_cassette":"50T"}'::jsonb, 2,
   'https://productinfo.shimano.com/en/product/RD-U8000', '2026-08-07'),
  ('shimano-cs-lg700-11', 'Shimano', 'CS-LG700-11', 'cassette', 'CS-LG700-11 LINKGLIDE 11-50T',
   '{"speeds":11,"range":"11-50T","system":"LINKGLIDE"}'::jsonb, 2,
   'https://productinfo.shimano.com/en/product/CS-LG700-11', '2026-08-07'),
  ('shimano-rd-u6000', 'Shimano', 'RD-U6000', 'rear_derailleur', 'CUES RD-U6000',
   '{"speeds":"11/10","system":"CUES LINKGLIDE","max_cassette":"50T"}'::jsonb, 2,
   'https://productinfo.shimano.com/en/product/RD-U6000', '2026-08-07'),
  ('shimano-cs-lg400-11', 'Shimano', 'CS-LG400-11', 'cassette', 'CS-LG400-11 LINKGLIDE 11-50T',
   '{"speeds":11,"range":"11-50T","system":"LINKGLIDE"}'::jsonb, 2,
   'https://productinfo.shimano.com/en/product/CS-LG400-11', '2026-08-07'),
  ('sram-cs-pg-1230-a1', 'SRAM', 'CS-PG-1230-A1', 'cassette', 'PG-1230 Eagle 11-50T',
   '{"speeds":12,"range":"11-50T","system":"Eagle","driver_body":"splined 8/9/10"}'::jsonb, 2,
   'https://www.sram.com/en/sram/models/cs-pg-1230-a1', '2026-08-07')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('shimano-rd-u8000', 'shimano-cs-lg700-11', 'compatible',
   'Shimano CUES U8000 1x11 lineup pairs RD-U8000 with CS-LG700-11 11-50T.',
   'https://productinfo.shimano.com/en/lineup/cues-u8000-1x11', '2026-08-07'),
  ('shimano-rd-u6000', 'shimano-cs-lg400-11', 'compatible',
   'Shimano rear drivetrain compatibility lists RD-U6000 for 1x11 with 48-50T largest sprocket and CS-LG400-11 11-50T.',
   'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-07')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('bmc-257-amp-al-speed-one-usa-2025-us', 'shimano-rd-u8000', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/257-amp-al-speed-one-usa-bikes-bmc-25e-000013', '2026-08-07',
   'BMC explicitly lists Shimano CUES RD-U8000.'),
  ('bmc-257-amp-al-speed-one-usa-2025-us', 'shimano-cs-lg700-11', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/257-amp-al-speed-one-usa-bikes-bmc-25e-000013', '2026-08-07',
   'BMC explicitly lists Shimano CUES CS-LG700-11, 11-50T.'),
  ('bmc-alpenchallenge-al-four-2025-us', 'shimano-rd-u6000', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-four-grey-black-lifestyle-active-bikes-bmc-25e-000011', '2026-08-07',
   'BMC explicitly lists Shimano CUES RD-U6000.'),
  ('bmc-alpenchallenge-al-four-2025-us', 'shimano-cs-lg400-11', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-four-grey-black-lifestyle-active-bikes-bmc-25e-000011', '2026-08-07',
   'BMC lists CUES CS-LG400, 11-50T in a 1x11 drivetrain; Shimano canonical product is CS-LG400-11.'),
  ('bmc-alpenchallenge-al-three-2025-us', 'shimano-rd-m6100-sgs', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-three-blackpetrol-lifestyle-active-bikes-bmc-25e-000010', '2026-08-07',
   'BMC lists Deore RD-M6100 in a 1x12 drivetrain; Shimano canonical rear-derailleur product is RD-M6100-SGS.'),
  ('bmc-alpenchallenge-al-three-2025-us', 'shimano-cs-m6100-12', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-three-blackpetrol-lifestyle-active-bikes-bmc-25e-000010', '2026-08-07',
   'BMC lists Deore CS-M6100, 10-51T in a 1x12 drivetrain; Shimano canonical cassette product is CS-M6100-12.'),
  ('bmc-alpenchallenge-al-two-2025-us', 'sram-cs-pg-1230-a1', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-two-dark-petrol-lifestyle-active-bikes-bmc-25e-000009', '2026-08-07',
   'BMC explicitly lists SRAM NX PG-1230 Eagle, 11-50T; SRAM product ID is CS-PG-1230-A1.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

-- SOURCE: supabase/schema/catalog_enrichment_wave_10_bmc_2024_road_lt_2026_08_07.sql
-- VeloQuest catalog enrichment wave 10 (prepared while live SQL endpoint was unavailable).
-- Exact BMC 2024 archive product pages only. No wheel diameter or media URL is inferred.

update public.bike_catalog_models
set specs = specs || '{"frame_material":"01 Premium Carbon","frame":"Speedmachine 01 Premium Carbon; 142x12 mm thru-axle","fork":"Speedmachine 01 Premium Carbon; 100x12 mm thru-axle","drivetrain_brand":"SRAM","drivetrain":"SRAM Red AXS 2x12","rear_derailleur":"SRAM Red AXS","front_derailleur":"SRAM RED eTap AXS","cassette":"SRAM Red XG-1290 10-33T","crankset":"SRAM Red AXS 48/35T with power meter","bottom_bracket":"T47","brake_type":"hydraulic_disc","brakes":"SRAM S-900 Aero HRD DB-S-900-A1; Centerline XR Centerlock 160/160 mm","rims":"Zipp 858 NSW Tubeless Disc","hubs":"Zipp Cognition V2; Axial Clutch V2","tires":"Pirelli P-Zero Race SL TLR 28 mm","rear_axle":"142x12 mm thru-axle","front_axle":"100x12 mm thru-axle","max_tire_clearance_mm":30,"weight_kg":8.9,"spec_evidence":"official BMC 2024 Speedmachine 01 LTD archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/speedmachine-01-ltd-bikes-bmc-24-10627-001',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-speedmachine-01-ltd-2024-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"01 Premium Carbon","frame":"Speedmachine 01 Premium Carbon; 142x12 mm thru-axle","fork":"Speedmachine 01 Premium Carbon; 100x12 mm thru-axle","drivetrain_brand":"SRAM","drivetrain":"SRAM Red AXS 2x12","rear_derailleur":"SRAM Red AXS","front_derailleur":"SRAM RED AXS","cassette":"SRAM Red XG-1290 10-33T","crankset":"SRAM Red AXS 48/35T with power meter","bottom_bracket":"T47","brake_type":"hydraulic_disc","brakes":"SRAM Red AXS ED-RED-E1; Paceline X Centerlock 160/160 mm","rims":"Zipp 858 NSW Tubeless Disc","hubs":"Zipp Cognition V2; Axial Clutch V2","tires":"Pirelli P-Zero Race SL TLR 28 mm","rear_axle":"142x12 mm thru-axle","front_axle":"100x12 mm thru-axle","max_tire_clearance_mm":30,"weight_kg":8.9,"spec_evidence":"official BMC 2024 Speedmachine 01 ONE archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/speedmachine-01-one-bikes-bmc-24-10627-004',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-speedmachine-01-one-2024-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"01 Premium Carbon","frame":"Teammachine R 01 Premium Carbon; 12x142 mm thru-axle","fork":"Teammachine R 01 Premium Carbon; 12x100 mm thru-axle","drivetrain_brand":"SRAM","drivetrain":"SRAM Red AXS 2x12","rear_derailleur":"SRAM Red AXS","front_derailleur":"SRAM RED AXS","cassette":"SRAM Red XG-1290 10-30T","crankset":"SRAM Red AXS 48/35T with power meter","bottom_bracket":"PF86","brake_type":"hydraulic_disc","brakes":"SRAM Red AXS ED-RED-E1; Paceline X Centerlock 160/160 mm","rims":"DT Swiss ARC 1100 62 mm","hubs":"DT Swiss 180 Straightpull; Ratchet EXP 36; SINC ceramic bearings","tires":"Pirelli P-Zero Race SL TLR 26 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":30,"weight_kg":7.0,"spec_evidence":"official BMC 2024 Teammachine R 01 ONE archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/teammachine-r-01-one-bikes-bmc-24-10628-005',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-teammachine-r-01-one-2024-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","frame":"Fourstroke LT Carbon; APS suspension; 120 mm travel; 12x148 Boost thru-axle","front_travel_mm":120,"rear_travel_mm":120,"suspension_brand":"FOX","fork":"FOX Float 34 SC Factory FIT4 Kashima 120 mm","rear_shock":"FOX Float DPS Factory Kashima EVOL LV","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 Eagle Transmission 1x12","rear_derailleur":"SRAM X0 Eagle Transmission","cassette":"SRAM X0 Eagle Transmission XS-1295 10-52T","crankset":"SRAM X0 Eagle 32T","bottom_bracket":"PF92","brake_type":"hydraulic_disc","brakes":"SRAM G2 Ultimate; HS2 180/180 mm rotors","wheelset":"DT Swiss XRC 1501 30 mm internal","hubs":"DT Swiss 240 Straightpull; Ratchet EXP 36","tires":"Maxxis Rekon 2.4 in EXO TR","rear_axle":"12x148 Boost thru-axle","max_tire_clearance_mm":62,"weight_kg":11.6,"spec_evidence":"official BMC 2024 Fourstroke LT LTD archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/fourstroke-lt-ltd-bikes-bmc-24-10517-002',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-lt-ltd-2024-global';

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('bmc-fourstroke-lt-ltd-2024-global', 'sram-rd-x0-e-b1', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/fourstroke-lt-ltd-bikes-bmc-24-10517-002', '2026-08-07',
   'BMC explicitly lists SRAM X0 Eagle Transmission rear derailleur.'),
  ('bmc-fourstroke-lt-ltd-2024-global', 'sram-cs-xs-1295-a1', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/fourstroke-lt-ltd-bikes-bmc-24-10517-002', '2026-08-07',
   'BMC explicitly lists SRAM X0 Eagle Transmission XS-1295 cassette, 10-52T.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

-- SOURCE: supabase/schema/catalog_expansion_wave_11_kona_ibis_transition_2026_08_07.sql
-- VeloQuest catalog expansion wave 11 (prepared while Supabase MCP was unavailable).
-- Adds verified 2020+ bicycle models for three new catalog brands and deepens
-- evidence-backed Garage compatibility. All evidence URLs are first-party.
-- No remote image URL is guessed or copied from a third-party source.

-- Minimal backward-compatible category extension required for explicit upgrade
-- fitment. Existing component categories and rows remain unchanged.
alter table public.garage_components
  drop constraint if exists garage_components_category_check;
alter table public.garage_components
  add constraint garage_components_category_check check (category in (
    'rear_derailleur','front_derailleur','cassette','chain','crankset','chainring',
    'bottom_bracket','shifter','brake_caliper','brake_lever','brake_adapter','rotor','wheelset',
    'hub','tire','fork','rear_shock','seatpost','dropper_post','saddle','handlebar',
    'stem','pedal','e_bike_system','motor','battery','range_extender','controller'
  ));

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  -- Kona: official 2025 lineup announcements explicitly identify these models.
  ('kona-honzo-esd-2025-global', 'Kona', 'Honzo ESD', 2025, 'trail_hardtail', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Honzo ESD"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-unit-x-2025-global', 'Kona', 'Unit X', 2025, 'bikepacking_hardtail', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Unit X"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-unit-2025-global', 'Kona', 'Unit', 2025, 'bikepacking_hardtail', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Unit"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-sutra-ltd-2025-global', 'Kona', 'Sutra LTD', 2025, 'adventure_touring', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Sutra LTD"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-sutra-2025-global', 'Kona', 'Sutra', 2025, 'adventure_touring', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Sutra"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-rove-2025-global', 'Kona', 'Rove', 2025, 'gravel', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Rove"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-rove-dl-2025-global', 'Kona', 'Rove DL', 2025, 'gravel', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Rove DL"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-rove-ltd-2025-global', 'Kona', 'Rove LTD', 2025, 'gravel', 'global',
   '{"frame_material":"steel","model_year_evidence":"official Kona 2025 steel lineup names Rove LTD"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-steel-lineup', '2026-08-07'),
  ('kona-mahuna-2025-global', 'Kona', 'Mahuna', 2025, 'trail_hardtail', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Mahuna"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-rove-al-700-2025-global', 'Kona', 'Rove AL 700', 2025, 'gravel', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Rove AL 700"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-dew-e-2025-global', 'Kona', 'Dew-E', 2025, 'electric_urban', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Dew-E"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-dew-2025-global', 'Kona', 'Dew', 2025, 'urban', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Dew"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-dew-dl-2025-global', 'Kona', 'Dew DL', 2025, 'urban', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Dew DL"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-e-coco-2025-global', 'Kona', 'eCoco', 2025, 'electric_urban', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names eCoco"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),
  ('kona-coco-2025-global', 'Kona', 'Coco', 2025, 'urban', 'global',
   '{"frame_material":"aluminium","model_year_evidence":"official Kona 2025 alloy lineup names Coco"}'::jsonb,
   'https://konaworld.com/blogs/cog/fresh-looks-for-2025-new-colors-for-konas-alloy-lineup', '2026-08-07'),

  -- Ibis: official support/archive supplies year ranges and frame-level compatibility.
  ('ibis-ripmo-af-v1-udh-2025-global', 'Ibis', 'Ripmo AF V1 UDH', 2025, 'trail_full_suspension', 'global',
   '{"family_level":true,"frame_material":"aluminium","wheel_size":"29","front_travel_mm":160,"rear_travel_mm":147,"shock_size":"210x55 mm","rear_spacing":"148 Boost","seatpost_diameter_mm":31.6,"rear_brake_mount":"160 mm post mount","max_rear_rotor_mm":203,"bottom_bracket":"73 mm BSA threaded","chainline_mm":"52 or 55","udh_compatible":true,"max_tire_width_in":2.5,"max_chainring_teeth":34,"model_year_evidence":"official Ibis support page lists Ripmo AF V1 UDH for 2024-2025"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models/ripmo-af-v1-udh', '2026-08-07'),
  ('ibis-ripley-af-v1-udh-2025-global', 'Ibis', 'Ripley AF V1 UDH', 2025, 'xc_trail_full_suspension', 'global',
   '{"family_level":true,"frame_material":"aluminium","wheel_size":"29","front_travel_mm":130,"rear_travel_mm":120,"shock_size":"190x45 mm","rear_spacing":"148 Boost","seatpost_diameter_mm":31.6,"rear_brake_mount":"160 mm post mount","max_rear_rotor_mm":203,"bottom_bracket":"73 mm BSA threaded","chainline_mm":"52 or 55","udh_compatible":true,"max_tire_width_in":2.6,"max_chainring_teeth":34,"coil_shock_compatible":false,"fork_travel_approved_mm":[120,130,140],"model_year_evidence":"official Ibis support page lists Ripley AF V1 UDH for 2024-2025"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models/ripley-af-v1-udh', '2026-08-07'),
  ('ibis-oso-2024-global', 'Ibis', 'Oso', 2024, 'electric_enduro', 'global',
   '{"family_level":true,"wheel_size":"29","rear_travel_mm":155,"model_year_evidence":"official Ibis Past Models lists Oso for 2023-2024"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models', '2026-08-07'),
  ('ibis-hakka-mx-2024-global', 'Ibis', 'Hakka MX', 2024, 'gravel', 'global',
   '{"family_level":true,"wheel_size":"27.5 / 700C","model_year_evidence":"official Ibis Past Models lists Hakka MX for 2022-2024"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models', '2026-08-07'),
  ('ibis-ripley-v4s-2024-global', 'Ibis', 'Ripley V4S', 2024, 'xc_trail_full_suspension', 'global',
   '{"family_level":true,"wheel_size":"29","rear_travel_mm":120,"model_year_evidence":"official Ibis Past Models lists Ripley V4S for 2022-2024"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models', '2026-08-07'),
  ('ibis-ripmo-v2s-2024-global', 'Ibis', 'Ripmo V2S', 2024, 'trail_full_suspension', 'global',
   '{"family_level":true,"wheel_size":"29","rear_travel_mm":147,"model_year_evidence":"official Ibis Past Models lists Ripmo V2S for 2022-2024"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models', '2026-08-07'),
  ('ibis-exie-usa-2024-global', 'Ibis', 'Exie USA', 2024, 'xc_full_suspension', 'global',
   '{"family_level":true,"wheel_size":"29","rear_travel_mm":100,"model_year_evidence":"official Ibis Past Models lists Exie USA for 2023-2024"}'::jsonb,
   'https://www.ibiscycles.com/bikes/past-models', '2026-08-07'),

  -- Transition: official model-specific support pages include model years and compatibility dimensions.
  ('transition-sentinel-alloy-v3-2025-global', 'Transition', 'Sentinel Alloy V3', 2025, 'trail_full_suspension', 'global',
   '{"family_level":true,"frame_material":"aluminium","wheel_size":"29 / MX (XS 27.5)","front_travel_mm":160,"rear_travel_mm":150,"compatible_rear_travel_mm":160,"shock_size":"205x60 mm trunnion","compatible_shock_size":"205x65 mm trunnion","shock_hardware":"trunnion top / 30x8 mm bottom","fork_offset_mm":44,"bottom_bracket":"73 mm BSA threaded","chainline_mm":"52-55","rear_brake_mount":"180 mm post mount","max_rear_rotor_mm":223,"rear_axle":"12x148 UDH","udh_compatible":true,"max_chainring_teeth":34,"max_tire_size":"29x2.5","model_year_evidence":"official Transition Sentinel V3 support includes 2025 decal/specification and V3 released in 2024"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Sentinel-Alloy/126', '2026-08-07'),
  ('transition-spur-v1-2025-global', 'Transition', 'Spur V1', 2025, 'xc_trail_full_suspension', 'global',
   '{"family_level":true,"frame_material":"carbon","wheel_size":"29","front_travel_mm":120,"rear_travel_mm":120,"compatible_rear_travel_mm":100,"shock_size":"190x45 mm","compatible_shock_size":"190x37.5 mm","shock_hardware":"30x8 mm top / 25x8 mm bottom","fork_offset_mm":44,"bottom_bracket":"73 mm BSA threaded","chainline_mm":52,"rear_brake_mount":"160 mm post mount","max_rear_rotor_mm":180,"rear_spacing":"148 Boost","max_chainring_teeth":36,"max_tire_size":"29x2.4","model_year_evidence":"official Transition Spur support lists years produced 2020-2025"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Spur/17', '2026-08-07'),
  ('transition-patrol-carbon-2025-global', 'Transition', 'Patrol Carbon', 2025, 'enduro_full_suspension', 'global',
   '{"family_level":true,"frame_material":"carbon","wheel_size":"29 front / 27.5 rear","front_travel_mm":160,"rear_travel_mm":160,"compatible_front_travel_mm":170,"compatible_rear_travel_mm":170,"shock_size":"205x60 mm trunnion","compatible_shock_size":"205x65 mm trunnion","shock_hardware":"trunnion top / 30x8 mm bottom","fork_offset_mm":44,"bottom_bracket":"73 mm BSA threaded","chainline_mm":52,"rear_brake_mount":"180 mm post mount","max_rear_rotor_mm":223,"rear_axle":"12x148 UDH","udh_compatible":true,"max_chainring_teeth":34,"max_tire_size":"27.5x2.6","model_year_evidence":"official Transition Patrol Carbon support lists years produced 2022-2025 and 2025 graphics"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Patrol-Carbon/119', '2026-08-07'),
  ('transition-patrol-alloy-2025-global', 'Transition', 'Patrol Alloy', 2025, 'enduro_full_suspension', 'global',
   '{"family_level":true,"frame_material":"aluminium","wheel_size":"mixed","front_travel_mm":160,"rear_travel_mm":160,"model_year_evidence":"official Transition Patrol Alloy support lists years produced 2021-2025"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Patrol-Alloy/28', '2026-08-07'),
  ('transition-regulator-cx-2025-global', 'Transition', 'Regulator CX', 2025, 'electric_enduro', 'global',
   '{"family_level":true,"frame_material":"carbon","wheel_size":"29 front / 27.5 rear","front_travel_mm":160,"rear_travel_mm":150,"compatible_rear_travel_mm":160,"shock_size":"205x60 mm trunnion","compatible_shock_size":"205x65 mm trunnion","shock_hardware":"trunnion top / 30x8 mm bottom","fork_offset_mm":44,"chainline_mm":55,"rear_brake_mount":"180 mm post mount","max_rear_rotor_mm":223,"rear_axle":"12x148 UDH","udh_compatible":true,"max_chainring_teeth":34,"max_tire_size":"27.5x2.6","motor":"Bosch Performance Line CX BDU384Y","battery":"Bosch PowerTube 600","battery_wh":600,"range_extender":"Bosch PowerMore 250 compatible","model_year_evidence":"official Transition Regulator CX support identifies 2025-2026 and states released in 2025"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Regulator-CX/128', '2026-08-07'),
  ('transition-relay-alloy-2025-global', 'Transition', 'Relay Alloy', 2025, 'electric_enduro', 'global',
   '{"family_level":true,"frame_material":"aluminium","wheel_size":"29 (XS 27.5)","front_travel_mm":160,"rear_travel_mm":160,"compatible_rear_travel_mm":170,"shock_size":"205x60 mm","compatible_shock_size":"205x65 mm","shock_hardware":"trunnion top / 30x8 mm bottom","fork_offset_mm":44,"model_year_evidence":"official Transition Relay Alloy support lists years produced 2023-2026 and 2025 graphics"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Relay-Alloy/120', '2026-08-07'),
  ('transition-transam-29-2025-global', 'Transition', 'TransAM 29', 2025, 'trail_hardtail', 'global',
   '{"family_level":true,"wheel_size":"29","model_year_evidence":"official Transition TransAM 29 support lists years produced 2023-2025"}'::jsonb,
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/TransAM-29/32', '2026-08-07')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- Verified components needed by the new compatibility graph.
insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('dvo-jade-x-coil', 'DVO', 'Jade X', 'rear_shock', 'DVO Jade X Coil',
   '{"spring":"coil","product_family":"Jade X"}'::jsonb, 3,
   'https://dvosuspension.com/product/jade-x/', '2026-08-07'),
  ('bosch-performance-line-cx-bdu384y', 'Bosch', 'Performance Line CX BDU384Y', 'motor', 'Bosch Performance Line CX BDU384Y',
   '{"system":"Bosch smart system","model_code":"BDU384Y"}'::jsonb, 3,
   'https://www.bosch-ebike.com/us/products/performance-line-cx', '2026-08-07'),
  ('bosch-powertube-600', 'Bosch', 'PowerTube 600', 'battery', 'Bosch PowerTube 600',
   '{"system":"Bosch smart system","capacity_wh":600,"form_factor":"integrated"}'::jsonb, 3,
   'https://www.bosch-ebike.com/us/products/batteries/powertube-compacttube', '2026-08-07'),
  ('bosch-powermore-250', 'Bosch', 'PowerMore 250', 'range_extender', 'Bosch PowerMore 250',
   '{"system":"Bosch smart system","capacity_wh":250,"product_code":"BBP3625"}'::jsonb, 3,
   'https://www.bosch-ebike.com/us/products/batteries/powermore250', '2026-08-07'),
  ('shimano-sm-ma-f180p-p2', 'Shimano', 'SM-MA-F180P/P2', 'brake_adapter', 'Shimano SM-MA-F180P/P2 brake adapter',
   '{"mount":"post mount","application":"160 mm direct to 180 mm rotor"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/compatibility/C-193', '2026-08-07'),
  ('shimano-sm-ma-f203p-p', 'Shimano', 'SM-MA-F203P/P', 'brake_adapter', 'Shimano SM-MA-F203P/P brake adapter',
   '{"mount":"post mount","application":"160 mm direct to 203 mm rotor"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/compatibility/C-193', '2026-08-07')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- Bike -> component fitment. Missing rows remain unknown/default-deny.
insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('ibis-ripmo-af-v1-udh-2025-global', 'dvo-jade-x-coil', 'manufacturer_approved',
   'https://www.ibiscycles.com/bikes/past-models/ripmo-af-v1-udh', '2026-08-07',
   'Ibis explicitly states that it specs and recommends the DVO Jade X Coil for Ripmo AF V1 UDH.'),
  ('ibis-ripmo-af-v1-udh-2025-global', 'shimano-sm-ma-f180p-p2', 'manufacturer_approved',
   'https://www.ibiscycles.com/bikes/past-models/ripmo-af-v1-udh', '2026-08-07',
   'Ibis explicitly provides Shimano SM-MA-F180P/P2 for a 180 mm rear rotor on the 160 mm post mount.'),
  ('ibis-ripmo-af-v1-udh-2025-global', 'shimano-sm-ma-f203p-p', 'manufacturer_approved',
   'https://www.ibiscycles.com/bikes/past-models/ripmo-af-v1-udh', '2026-08-07',
   'Ibis explicitly provides Shimano SM-MA-F203P/P for a 203 mm rear rotor on the 160 mm post mount.'),
  ('ibis-ripley-af-v1-udh-2025-global', 'shimano-sm-ma-f180p-p2', 'manufacturer_approved',
   'https://www.ibiscycles.com/bikes/past-models/ripley-af-v1-udh', '2026-08-07',
   'Ibis explicitly provides Shimano SM-MA-F180P/P2 for a 180 mm rear rotor.'),
  ('ibis-ripley-af-v1-udh-2025-global', 'shimano-sm-ma-f203p-p', 'manufacturer_approved',
   'https://www.ibiscycles.com/bikes/past-models/ripley-af-v1-udh', '2026-08-07',
   'Ibis explicitly provides Shimano SM-MA-F203P/P for a 203 mm rear rotor.'),
  ('transition-regulator-cx-2025-global', 'bosch-performance-line-cx-bdu384y', 'factory_installed',
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Regulator-CX/128', '2026-08-07',
   'Transition explicitly lists Bosch Performance Line CX BDU38/BDU384Y as the drive unit.'),
  ('transition-regulator-cx-2025-global', 'bosch-powertube-600', 'factory_installed',
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Regulator-CX/128', '2026-08-07',
   'Transition explicitly lists Bosch PowerTube 600 Wh as the battery.'),
  ('transition-regulator-cx-2025-global', 'bosch-powermore-250', 'manufacturer_approved',
   'https://www.transitionbikes.com/Product-Support-By-Model-Version-Details/Regulator-CX/128', '2026-08-07',
   'Transition explicitly marks the Bosch PowerMore 250 Wh range extender as compatible.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

-- Component -> component compatibility, kept separate from bike fitment.
insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('bosch-powertube-600', 'bosch-powermore-250', 'compatible',
   'Bosch states PowerMore 250 can be combined with smart-system batteries; final bike-level approval is still required.',
   'https://www.bosch-ebike.com/us/service/accessories-retrofitting', '2026-08-07')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

-- SOURCE: supabase/schema/catalog_expansion_wave_12_cervelo_archive_2026_08_07.sql
-- VeloQuest catalog expansion wave 12.
-- Cervelo generations are sourced from the official Bike Archive/support pages.
-- Each row uses an explicitly supported model year >= 2020; no year is inferred
-- from paint, component generation, retailer listings, or current availability.

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  ('cervelo-r5-disc-mk4-2023-global', 'Cervelo', 'R5 Disc MK4', 2023, 'road_race', 'global',
   '{"family_level":true,"wheel_size":"700C","front_axle":"12x100 mm","model_year_evidence":"official Cervelo support identifies R5 Disc MK4 first model year 2023 and current archive generation"}'::jsonb,
   'https://www.cervelo.com/en-US/support/R5%20DISC%20MK4', '2026-08-07'),
  ('cervelo-s5-disc-mk4-2023-global', 'Cervelo', 'S5 Disc MK4', 2023, 'road_aero', 'global',
   '{"family_level":true,"wheel_size":"700C","front_axle":"12x100 mm","model_year_evidence":"official Cervelo support identifies S5 Disc MK4 first model year 2023 and current archive generation"}'::jsonb,
   'https://www.cervelo.com/en-US/support/S5%20DISC%20MK4', '2026-08-07'),
  ('cervelo-soloist-disc-mk1-2023-global', 'Cervelo', 'Soloist Disc MK1', 2023, 'road_race', 'global',
   '{"family_level":true,"wheel_size":"700C","front_axle":"12x100 mm","model_year_evidence":"official Cervelo support identifies Soloist Disc MK1 first model year 2023 and current archive generation"}'::jsonb,
   'https://www.cervelo.com/en-US/support/SOLOIST%20DISC%20MK1', '2026-08-07'),
  ('cervelo-zfs-5-disc-mk1-2024-global', 'Cervelo', 'ZFS-5 Disc MK1', 2024, 'xc_full_suspension', 'global',
   '{"family_level":true,"frame_material":"carbon","wheel_size":"29","rear_axle":"12x148 mm","model_year_evidence":"official Cervelo support identifies ZFS-5 Disc MK1 first model year 2024 and current archive generation"}'::jsonb,
   'https://www.cervelo.com/en-US/support/ZFS-5%20DISC%20MK1', '2026-08-07'),
  ('cervelo-caledonia-5-disc-mk1-2021-global', 'Cervelo', 'Caledonia-5 Disc MK1', 2021, 'road_endurance', 'global',
   '{"family_level":true,"wheel_size":"700C","model_year_evidence":"official Cervelo support identifies Caledonia-5 Disc MK1 first model year 2021 and current archive generation"}'::jsonb,
   'https://www.cervelo.com/en-US/support/CALEDONIA-5%20DISC%20MK1', '2026-08-07'),
  ('cervelo-caledonia-disc-mk1-2021-global', 'Cervelo', 'Caledonia Disc MK1', 2021, 'road_endurance', 'global',
   '{"family_level":true,"model_year_evidence":"official Cervelo Bike Archive lists Caledonia Disc MK1 as 2021-present"}'::jsonb,
   'https://www.cervelo.com/en-US/support/archive', '2026-08-07'),
  ('cervelo-p5-disc-mk2-2020-global', 'Cervelo', 'P5 Disc MK2', 2020, 'triathlon_tt', 'global',
   '{"family_level":true,"model_year_evidence":"official Cervelo support lists P5 Disc MK2 from model year 2019-present; 2020 is explicitly inside the supported generation range"}'::jsonb,
   'https://www.cervelo.com/en-US/support/P5%20DISC%20MK2', '2026-08-07')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- SOURCE: supabase/schema/catalog_expansion_wave_13_commencal_propain_specialized_2026_08_08.sql
-- VeloQuest catalog expansion wave 13.
-- Evidence policy: first-party only. Model years are explicit on the manufacturer
-- page/archive. Archive-only rows stay intentionally shallow; exact product pages
-- carry deeper factory specs and fitment. Unknown compatibility stays default-deny.

begin;

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  -- COMMENCAL: exact product pages / official category pages explicitly mark years.
  ('commencal-meta-v5-signature-2025-us', 'COMMENCAL', 'META V5 Signature Glittery White', 2025, 'enduro_full_suspension', 'us',
   '{"frame_material":"aluminium","wheel_size":"29","front_travel_mm":160,"rear_travel_mm":150,"fork":"FOX 36 Float Factory Grip X2","rear_shock":"FOX Float X Factory 210x55 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle T-Type 1x12","rear_derailleur":"SRAM GX Eagle T-Type","cassette":"SRAM XG 1275 Eagle 10-52T 12-speed","crankset":"SRAM X0 Eagle T-Type 32T","brake_type":"hydraulic_disc","brakes":"TRP DH-R EVO PRO 4-piston; 203 mm rotors","wheelset":"DT Swiss EX 1700 29","hubs":"DT Swiss 350 Boost","tires":"Schwalbe Magic Mary 29x2.4 front / Tacky Chan 29x2.4 rear","spec_evidence":"official COMMENCAL exact 2025 product specification"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20v5/BT4MTRV5SGEU3.html?lang=en_US', '2026-08-08'),
  ('commencal-meta-sx-v5-signature-2026-us', 'COMMENCAL', 'META SX V5 Signature Pure White', 2026, 'enduro_full_suspension', 'us',
   '{"frame_material":"aluminium","wheel_size":"29 front / 27.5 rear","front_travel_mm":170,"rear_travel_mm":165,"fork":"FOX 38 Float Factory","rear_shock":"FOX Float X2 Factory","drivetrain_brand":"SRAM","drivetrain":"SRAM Eagle 90 / GX T-Type 1x12","rear_derailleur":"SRAM Eagle 90","cassette":"SRAM GX T-Type 10-52T 12-speed","crankset":"SRAM X0 T-Type 32T","brake_type":"hydraulic_disc","brakes":"Shimano XT 4-piston; MT905 203 mm rotors","wheelset":"DT Swiss EX 1700 mixed","hubs":"DT Swiss 350; 15x110 front / 12x148 rear","spec_evidence":"official COMMENCAL exact 2026 product specification"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US', '2026-08-08'),
  ('commencal-meta-sx-v5-essential-2026-us', 'COMMENCAL', 'META SX V5 Essential Pure White', 2026, 'enduro_full_suspension', 'us',
   '{"family_level":true,"wheel_size":"29 front / 27.5 rear","front_travel_mm":170,"rear_travel_mm":165,"model_year_evidence":"official COMMENCAL META SX V5 category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/', '2026-08-08'),
  ('commencal-supreme-dh-v5-signature-2026-us', 'COMMENCAL', 'SUPREME DH V5 Signature Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"suspension":"front_and_rear","model_year_evidence":"official COMMENCAL downhill category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/', '2026-08-08'),
  ('commencal-supreme-dh-v5-rockshox-2026-us', 'COMMENCAL', 'SUPREME DH V5 RockShox Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"suspension":"front_and_rear","model_year_evidence":"official COMMENCAL downhill category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/', '2026-08-08'),
  ('commencal-supreme-dh-v5-xs-2026-us', 'COMMENCAL', 'SUPREME DH V5 XS Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"suspension":"front_and_rear","model_year_evidence":"official COMMENCAL downhill category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/', '2026-08-08'),
  ('commencal-supreme-dh-v5-ride-2026-us', 'COMMENCAL', 'SUPREME DH V5 Ride Pyrite Grey', 2026, 'downhill', 'us',
   '{"family_level":true,"suspension":"front_and_rear","model_year_evidence":"official COMMENCAL downhill category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/', '2026-08-08'),
  ('commencal-frs-signature-2026-us', 'COMMENCAL', 'FRS Signature Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"wheel_size":"27.5","suspension":"front_and_rear","model_year_evidence":"official COMMENCAL FRS category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/frs/', '2026-08-08'),
  ('commencal-frs-rockshox-2026-us', 'COMMENCAL', 'FRS RockShox Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"wheel_size":"27.5","suspension":"front_and_rear","model_year_evidence":"official COMMENCAL FRS category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/frs/', '2026-08-08'),
  ('commencal-frs-park-2026-us', 'COMMENCAL', 'FRS Park Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"wheel_size":"27.5","suspension":"front_and_rear","model_year_evidence":"official COMMENCAL FRS category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/frs/', '2026-08-08'),
  ('commencal-frs-essential-2025-us', 'COMMENCAL', 'FRS Essential Pure White', 2025, 'downhill', 'us',
   '{"family_level":true,"wheel_size":"27.5","suspension":"front_and_rear","model_year_evidence":"official COMMENCAL FRS category lists this exact 2025 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/frs/', '2026-08-08'),
  ('commencal-clash-essential-2026-us', 'COMMENCAL', 'CLASH Essential Pure White', 2026, 'enduro_full_suspension', 'us',
   '{"family_level":true,"suspension":"front_and_rear","model_year_evidence":"official COMMENCAL enduro category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/enduro/', '2026-08-08'),
  ('commencal-meta-ht-v3-signature-2026-us', 'COMMENCAL', 'META HT V3 Signature Pure White', 2026, 'trail_hardtail', 'us',
   '{"family_level":true,"model_year_evidence":"official COMMENCAL bike catalogue lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/', '2026-08-08'),

  -- Propain: official Tech Archive explicitly records generation start years.
  ('propain-ekano-al-3-enduro-2026-global', 'Propain', 'Ekano AL 3 Enduro', 2026, null, 'global',
   '{"family_level":true,"generation":3,"model_year_evidence":"official Propain Tech Archive: Ekano AL 3 Enduro since 2026"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-ekano-al-3-trail-2026-global', 'Propain', 'Ekano AL 3 Trail', 2026, null, 'global',
   '{"family_level":true,"generation":3,"model_year_evidence":"official Propain Tech Archive: Ekano AL 3 Trail since 2026"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-hugene-3-2025-global', 'Propain', 'Hugene 3 CF', 2025, 'trail_full_suspension', 'global',
   '{"frame_material":"carbon","wheel_size":"29","front_travel_mm":140,"rear_travel_mm":130,"model_year_evidence":"official Propain Tech Archive: Hugene 3 since 2025; current official product page confirms 29-inch / 140 front / 130 rear"}'::jsonb,
   'https://www.propain-bikes.com/us/product/bikes/trail/hugene-cf/', '2026-08-08'),
  ('propain-rage-cf-3r-2024-global', 'Propain', 'Rage CF 3R', 2024, null, 'global',
   '{"family_level":true,"generation":"3R","model_year_evidence":"official Propain Tech Archive: Rage CF 3R since 2024"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-spindrift-al-5-2024-global', 'Propain', 'Spindrift AL 5', 2024, null, 'global',
   '{"family_level":true,"generation":5,"model_year_evidence":"official Propain Tech Archive: Spindrift AL 5 since 2024"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-sresh-cf-1-2024-global', 'Propain', 'Sresh CF 1', 2024, null, 'global',
   '{"family_level":true,"generation":1,"model_year_evidence":"official Propain Tech Archive: Sresh CF 1 since 2024"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-sresh-sl-1-2024-global', 'Propain', 'Sresh SL 1', 2024, null, 'global',
   '{"family_level":true,"generation":1,"model_year_evidence":"official Propain Tech Archive: Sresh SL 1 since 2024"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-terrel-cf-1-2024-global', 'Propain', 'Terrel CF 1', 2024, 'gravel', 'global',
   '{"family_level":true,"generation":1,"model_year_evidence":"official Propain Tech Archive: Terrel CF 1 since 2024"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-trickshot-2-2025-global', 'Propain', 'Trickshot 2', 2025, null, 'global',
   '{"family_level":true,"generation":2,"model_year_evidence":"official Propain Tech Archive: Trickshot 2 since 2025"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-tyee-al-61-2025-global', 'Propain', 'Tyee AL 6.1', 2025, 'enduro_full_suspension', 'global',
   '{"family_level":true,"generation":"6.1","model_year_evidence":"official Propain Tech Archive: Tyee AL 6.1 since 2025"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-tyee-cf-61-2025-global', 'Propain', 'Tyee CF 6.1', 2025, 'enduro_full_suspension', 'global',
   '{"family_level":true,"generation":"6.1","model_year_evidence":"official Propain Tech Archive: Tyee CF 6.1 since 2025"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-yuma-4-2025-global', 'Propain', 'Yuma 4', 2025, null, 'global',
   '{"family_level":true,"generation":4,"model_year_evidence":"official Propain Tech Archive: Yuma 4 since 2025"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),

  -- Specialized: official Bike Archive gives explicit 2025 year; exact pages give factory build specs.
  ('specialized-stumpjumper-15-pro-2025-us', 'Specialized', 'Stumpjumper 15 Pro', 2025, 'trail_full_suspension', 'us',
   '{"frame_material":"carbon","wheel_size":"29 / mixed depending size","front_travel_mm":150,"rear_travel_mm":145,"fork":"FOX FLOAT 36 Factory GRIP X2","rear_shock":"FOX FLOAT Factory GENIE 210x55 mm (S2-S6)","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 Eagle Transmission AXS 1x12","rear_derailleur":"SRAM X0 Eagle Transmission","cassette":"SRAM X0 Eagle Transmission 10-52T 12-speed","crankset":"SRAM X0 Eagle 32T","brake_type":"hydraulic_disc","brakes":"SRAM Maven Silver 4-piston","wheelset":"Roval Traverse SL II carbon","hubs":"Industry Nine 1/1 Boost","tires":"Specialized Butcher T9 front / Eliminator T7 rear","rear_axle":"12x148","udh_compatible":true,"spec_evidence":"official Specialized exact 2025 product page and 2025 manual"}'::jsonb,
   'https://www.specialized.com/us/en/stumpjumper-15-pro-sram-x0-axs-fox-factory/p/4221403', '2026-08-08'),
  ('specialized-stumpjumper-15-expert-2025-us', 'Specialized', 'Stumpjumper 15 Expert', 2025, 'trail_full_suspension', 'us',
   '{"frame_material":"carbon","wheel_size":"29 / mixed depending size","rear_travel_mm":145,"drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle Transmission AXS 1x12","rear_derailleur":"SRAM GX Eagle Transmission","cassette":"SRAM GX Eagle Transmission 10-52T 12-speed","crankset":"SRAM GX Eagle 32T","brake_type":"hydraulic_disc","brakes":"SRAM Maven Bronze 4-piston","wheelset":"Roval Traverse alloy","hubs":"DT Swiss 370 Boost","tires":"Specialized Butcher T9 front / Eliminator T7 rear","spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/stumpjumper-15-expert-sram-gx-axs-fox-performance-elite/p/4221401', '2026-08-08'),
  ('specialized-epic-8-pro-2025-us', 'Specialized', 'Epic 8 Pro', 2025, 'xc_full_suspension', 'us',
   '{"wheel_size":"29","front_travel_mm":120,"rear_travel_mm":120,"fork":"RockShox SID Ultimate 120 mm","rear_shock":"RockShox SIDLuxe Ultimate 190x45 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 AXS Transmission 1x12","rear_derailleur":"SRAM X0 AXS Transmission","cassette":"SRAM XS-1295 10-52T 12-speed","crankset":"SRAM X0 Eagle Quarq DUB","brake_type":"hydraulic_disc","brakes":"SRAM Level Silver Stealth 4-piston 180/160","wheelset":"Roval Control carbon","hubs":"DT Swiss 350 Boost","tires":"Specialized Fast Trak 29x2.35 front / Renegade 29x2.35 rear","spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503', '2026-08-08'),
  ('specialized-diverge-sport-carbon-2025-us', 'Specialized', 'Diverge Sport Carbon', 2025, 'gravel', 'us',
   '{"frame_material":"carbon","wheel_size":"700c","fork":"Future Shock 1.5 / FACT carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano GRX RX610/RX820 2x12","rear_derailleur":"Shimano GRX RD-RX820 12-speed","cassette":"Shimano 105 12-speed 11-36","crankset":"Shimano GRX RX610 46/30T","brake_type":"hydraulic_disc","brakes":"Shimano GRX RX400 hydraulic disc","wheelset":"DT Swiss G540","tires":"Specialized Pathfinder Pro 700x42","front_axle":"12x100","rear_axle":"12x142","spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/diverge-sport-carbon-shimano-grx/p/4223496', '2026-08-08'),
  ('specialized-tarmac-sl8-pro-ultegra-2025-us', 'Specialized', 'Tarmac SL8 Pro - Shimano Ultegra Di2', 2025, 'road_race', 'us',
   '{"frame_material":"carbon","wheel_size":"700c","drivetrain_brand":"Shimano","drivetrain":"Shimano Ultegra Di2 R8100 2x12","rear_derailleur":"Shimano Ultegra Di2 R8150","cassette":"Shimano Ultegra 11-30T 12-speed","crankset":"Shimano Ultegra R8100 52/36T with 4iiii Precision 3+","brake_type":"hydraulic_disc","wheelset":"Roval Rapide CL II carbon","tires":"S-Works Turbo 2BR 700x26","spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935', '2026-08-08'),
  ('specialized-roubaix-sl8-comp-2025-us', 'Specialized', 'Roubaix SL8 Comp', 2025, 'road_endurance', 'us',
   '{"frame_material":"carbon","wheel_size":"700c","fork":"Future Shock 3.2 / FACT carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano 105 Di2 2x12","rear_derailleur":"Shimano 105 Di2 R7150","cassette":"Shimano 105 11-36T 12-speed","crankset":"Shimano 105 50/34T","brake_type":"hydraulic_disc","brakes":"Shimano 105 hydraulic disc 160/160","wheelset":"DT Swiss G540","tires":"S-Works Mondo 2BR 700x32","front_axle":"12x100","rear_axle":"12x142","spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/roubaix-sl8-comp-shimano-105-di2/p/4221823', '2026-08-08'),
  ('specialized-crux-pro-2025-us', 'Specialized', 'Crux Pro', 2025, 'gravel', 'us',
   '{"frame_material":"carbon","wheel_size":"700c","drivetrain_brand":"SRAM","drivetrain":"SRAM Force XPLR eTap AXS 1x12","rear_derailleur":"SRAM Force XPLR eTap AXS","cassette":"SRAM XPLR XG-1251 10-44T 12-speed","crankset":"SRAM Force 1x 40T","brake_type":"hydraulic_disc","brakes":"SRAM Force eTap AXS hydraulic disc","wheelset":"Roval Terra CL carbon","tires":"Specialized Pathfinder Pro 700x38","front_axle":"12x100","rear_axle":"12x142","udh_compatible":true,"spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/crux-pro-sram-force-xplr-etap-axs/p/4223481', '2026-08-08')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

-- Manufacturer-hosted remote media only. No image binary is copied into Supabase.
insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at)
values
  ('specialized-epic-8-pro-2025-us',
   'https://assets.specialized.com/i/specialized/90325-12_EPIC-8-PRO-LGNBLUTNT-LQDMET-YEL_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503', 10, '2026-08-08'),
  ('specialized-diverge-sport-carbon-2025-us',
   'https://assets.specialized.com/i/specialized/95425-61_DIVERGE-SPORT-CARBON-DOP-GUN_HERO?%24scom-pdp-gallery-image%24=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/diverge-sport-carbon-shimano-grx/p/4223496', 10, '2026-08-08'),
  ('specialized-tarmac-sl8-pro-ultegra-2025-us',
   'https://assets.specialized.com/i/specialized/94925-12_TARMAC-SL8-PRO-UDI2-CARB-METWHTSIL_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935', 10, '2026-08-08'),
  ('specialized-roubaix-sl8-comp-2025-us',
   'https://assets.specialized.com/i/specialized/94425-50_ROUBAIX-COMP-LGNBLUTNT-MORNMST_HERO?%24scom-pdp-gallery-image%24=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/roubaix-sl8-comp-shimano-105-di2/p/4221823', 10, '2026-08-08'),
  ('specialized-crux-pro-2025-us',
   'https://assets.specialized.com/i/specialized/91425-10_CRUX-PRO-CARB-DPLAKEMET-SMK_HERO?%24scom-pdp-gallery-image%24=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/crux-pro-sram-force-xplr-etap-axs/p/4223481', 10, '2026-08-08')
on conflict (bike_id, image_url) do update set
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_page_url = excluded.source_page_url,
  priority = excluded.priority,
  checked_at = excluded.checked_at,
  enabled = true;

-- Exact factory-installed component links. These reuse components whose identities
-- are separately evidenced by SRAM/Shimano first-party documentation.
insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('specialized-stumpjumper-15-pro-2025-us', 'sram-rd-x0-e-b1', 'factory_installed',
   'https://www.specialized.com/us/en/stumpjumper-15-pro-sram-x0-axs-fox-factory/p/4221403', '2026-08-08',
   'Specialized lists the SRAM X0 Eagle Transmission derailleur on the exact 2025 build.'),
  ('specialized-stumpjumper-15-pro-2025-us', 'sram-cs-xs-1295-a1', 'factory_installed',
   'https://www.specialized.com/us/en/stumpjumper-15-pro-sram-x0-axs-fox-factory/p/4221403', '2026-08-08',
   'Specialized lists the X0 Eagle Transmission 10-52T cassette; SRAM X0 groupset evidence identifies XS-1295.'),
  ('specialized-stumpjumper-15-expert-2025-us', 'sram-rd-gx-e-b1', 'factory_installed',
   'https://www.specialized.com/us/en/stumpjumper-15-expert-sram-gx-axs-fox-performance-elite/p/4221401', '2026-08-08',
   'Specialized lists the SRAM GX Eagle Transmission derailleur on the exact 2025 build.'),
  ('specialized-stumpjumper-15-expert-2025-us', 'sram-cs-xs-1275-a1', 'factory_installed',
   'https://www.specialized.com/us/en/stumpjumper-15-expert-sram-gx-axs-fox-performance-elite/p/4221401', '2026-08-08',
   'Specialized lists the GX Eagle Transmission 10-52T cassette; SRAM GX groupset evidence identifies XS-1275.'),
  ('specialized-epic-8-pro-2025-us', 'sram-rd-x0-e-b1', 'factory_installed',
   'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503', '2026-08-08',
   'Specialized lists SRAM X0 AXS Transmission on the exact 2025 Epic 8 Pro build.'),
  ('specialized-epic-8-pro-2025-us', 'sram-cs-xs-1295-a1', 'factory_installed',
   'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503', '2026-08-08',
   'Specialized explicitly lists SRAM XS-1295 10-52T on the exact 2025 build.'),
  ('specialized-diverge-sport-carbon-2025-us', 'shimano-rd-rx820', 'factory_installed',
   'https://www.specialized.com/us/en/diverge-sport-carbon-shimano-grx/p/4223496', '2026-08-08',
   'Specialized explicitly lists Shimano GRX RX820 12-speed rear derailleur.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;

-- SOURCE: catalog-harvester/batches/wave14.json
insert into public.bike_catalog_models
  (id, brand, model, model_year, trim, category, market, specs, manufacturer_url, evidence_checked_at)
values
('haro-aeras-2020-global', 'Haro', 'Aeras', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-aire-2020-global', 'Haro', 'Aire', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-beasley-24-2020-global', 'Haro', 'Beasley 24', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-beasley-26-2020-global', 'Haro', 'Beasley 26', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-beasley-27-5-2020-global', 'Haro', 'Beasley 27.5', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-bridgeport-2020-global', 'Haro', 'Bridgeport', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-bridgeport-st-2020-global', 'Haro', 'Bridgeport ST', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-double-peak-27-5-plus-comp-2020-global', 'Haro', 'Double Peak 27.5 Plus Comp', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-double-peak-27-5-plus-trail-2020-global', 'Haro', 'Double Peak 27.5 Plus Trail', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-double-peak-27-5-sport-2020-global', 'Haro', 'Double Peak 27.5 Sport', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-double-peak-29-comp-2020-global', 'Haro', 'Double Peak 29 Comp', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-double-peak-29-sport-2020-global', 'Haro', 'Double Peak 29 Sport', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-double-peak-29-trail-2020-global', 'Haro', 'Double Peak 29 Trail', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-double-peak-io-2020-global', 'Haro', 'Double Peak IO', 2020, '', 'emtb', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-double-peak-io-commuter-2020-global', 'Haro', 'Double Peak IO Commuter', 2020, '', 'emtb', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-20-2020-global', 'Haro', 'Flightline 20', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-20-plus-2020-global', 'Haro', 'Flightline 20 Plus', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-24-2020-global', 'Haro', 'Flightline 24', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-24-plus-2020-global', 'Haro', 'Flightline 24 Plus', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-24-plus-ds-2020-global', 'Haro', 'Flightline 24 Plus DS', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-27-5-plus-2020-global', 'Haro', 'Flightline 27.5 Plus', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-one-2020-global', 'Haro', 'Flightline One', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-one-27-5-2020-global', 'Haro', 'Flightline One 27.5', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-one-st-2020-global', 'Haro', 'Flightline One ST', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-two-27-5-2020-global', 'Haro', 'Flightline Two 27.5', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-flightline-two-29-2020-global', 'Haro', 'Flightline Two 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-pd-2-2020-global', 'Haro', 'PD 2', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-pd-4-2020-global', 'Haro', 'PD 4', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-shift-r5-27-5-2020-global', 'Haro', 'Shift R5 27.5', 2020, '', 'mountain_full_suspension', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-shift-r5-29-2020-global', 'Haro', 'Shift R5 29', 2020, '', 'mountain_full_suspension', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-shift-r7-27-5-2020-global', 'Haro', 'Shift R7 27.5', 2020, '', 'mountain_full_suspension', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-shift-r7-29-2020-global', 'Haro', 'Shift R7 29', 2020, '', 'mountain_full_suspension', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-shift-r9-27-5-2020-global', 'Haro', 'Shift R9 27.5', 2020, '', 'mountain_full_suspension', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-shift-s3-27-5-2020-global', 'Haro', 'Shift S3 27.5', 2020, '', 'mountain_full_suspension', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-shift-s3-29-2020-global', 'Haro', 'Shift S3 29', 2020, '', 'mountain_full_suspension', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-steel-reserve-1-1-2020-global', 'Haro', 'Steel Reserve 1.1', 2020, '', 'dirt_jump', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-steel-reserve-1-2-2020-global', 'Haro', 'Steel Reserve 1.2', 2020, '', 'dirt_jump', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-thread-one-2020-global', 'Haro', 'Thread One', 2020, '', 'dirt_jump', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-thread-slope-2020-global', 'Haro', 'Thread Slope', 2020, '', 'dirt_jump', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-thread-two-2020-global', 'Haro', 'Thread Two', 2020, '', 'dirt_jump', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-westlake-2020-global', 'Haro', 'Westlake', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2020 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2020', '2026-08-08'),
('haro-aeras-2021-global', 'Haro', 'Aeras', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-aeras-st-2021-global', 'Haro', 'Aeras ST', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-beasley-24-2021-global', 'Haro', 'Beasley 24', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-beasley-26-2021-global', 'Haro', 'Beasley 26', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-beasley-27-5-2021-global', 'Haro', 'Beasley 27.5', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-beasley-27-5-dlx-2021-global', 'Haro', 'Beasley 27.5 DLX', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-beasley-27-5-dlx-microshift-2021-global', 'Haro', 'Beasley 27.5 DLX MicroSHIFT', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-bridgeport-2021-global', 'Haro', 'Bridgeport', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-bridgeport-st-2021-global', 'Haro', 'Bridgeport ST', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-double-peak-27-5-comp-2021-global', 'Haro', 'Double Peak 27.5 Comp', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-double-peak-27-5-sport-2021-global', 'Haro', 'Double Peak 27.5 Sport', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-double-peak-27-5-sport-microshift-2021-global', 'Haro', 'Double Peak 27.5 Sport MicroSHIFT', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-double-peak-27-5-trail-2021-global', 'Haro', 'Double Peak 27.5 Trail', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-double-peak-29-comp-2021-global', 'Haro', 'Double Peak 29 Comp', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-double-peak-29-sport-2021-global', 'Haro', 'Double Peak 29 Sport', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro exact product page: 2021 model","wheel_size":"29","frame_material":"aluminium","front_travel_mm":100,"drivetrain_brand":"Shimano","drivetrain":"Shimano 2x8","rear_derailleur":"Shimano Altus RD-310","cassette":"Shimano HG-200 8-speed 12-32T","brake_type":"hydraulic_disc","brakes":"Shimano BR-MT200"}'::jsonb, 'https://archive.harobikes.com/mtb/2021-mtb/double-peak-29-sport-2021', '2026-08-08'),
('haro-double-peak-29-trail-2021-global', 'Haro', 'Double Peak 29 Trail', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-double-peak-io-2021-global', 'Haro', 'Double Peak IO', 2021, '', 'emtb', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-double-peak-io-commuter-2021-global', 'Haro', 'Double Peak IO Commuter', 2021, '', 'emtb', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-20-2021-global', 'Haro', 'Flightline 20', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-20-plus-2021-global', 'Haro', 'Flightline 20 Plus', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-24-2021-global', 'Haro', 'Flightline 24', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-24-plus-2021-global', 'Haro', 'Flightline 24 Plus', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-24-plus-ds-2021-global', 'Haro', 'Flightline 24 Plus DS', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-one-26-2021-global', 'Haro', 'Flightline One 26', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-one-27-5-2021-global', 'Haro', 'Flightline One 27.5', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-one-27-5-st-2021-global', 'Haro', 'Flightline One 27.5 ST', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-one-29-2021-global', 'Haro', 'Flightline One 29', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-two-27-5-2021-global', 'Haro', 'Flightline Two 27.5', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-flightline-two-29-2021-global', 'Haro', 'Flightline Two 29', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-pd1-27-5-2021-global', 'Haro', 'PD1 27.5', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-pd2-27-5-2021-global', 'Haro', 'PD2 27.5', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-pd4-27-5-2021-global', 'Haro', 'PD4 27.5', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-shift-io-5-2021-global', 'Haro', 'Shift IO 5', 2021, '', 'emtb_full_suspension', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-shift-io-7-2021-global', 'Haro', 'Shift IO 7', 2021, '', 'emtb_full_suspension', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-shift-io-9-2021-global', 'Haro', 'Shift IO 9', 2021, '', 'emtb_full_suspension', 'global', '{"model_year_evidence":"official Haro exact product page: Year 2021","frame_material":"aluminium","wheel_size":"29 front / 27.5 rear","front_travel_mm":160,"rear_travel_mm":160,"fork":"Fox Rhythm 36 FLOAT E 160 mm","rear_shock":"Fox Float X2 225x75 mm","drivetrain_brand":"Shimano","drivetrain":"Shimano XT Di2 11-speed","cassette":"Shimano Deore XT CS-M8000 11-speed 11-46T","brake_type":"hydraulic_disc","brakes":"Shimano BR-MT520 4-piston 203 mm","motor":"Shimano STEPS EP-800","motor_torque_nm":85,"battery_wh":630}'::jsonb, 'https://archive.harobikes.com/mtb/2021-mtb/shift-io-9-2021', '2026-08-08'),
('haro-steel-reserve-1-1-2021-global', 'Haro', 'Steel Reserve 1.1', 2021, '', 'dirt_jump', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-steel-reserve-1-2-2021-global', 'Haro', 'Steel Reserve 1.2', 2021, '', 'dirt_jump', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-thread-one-2021-global', 'Haro', 'Thread One', 2021, '', 'dirt_jump', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-thread-slope-2021-global', 'Haro', 'Thread Slope', 2021, '', 'dirt_jump', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-thread-two-2021-global', 'Haro', 'Thread Two', 2021, '', 'dirt_jump', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-westlake-2021-global', 'Haro', 'Westlake', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2021 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2021', '2026-08-08'),
('haro-aeras-2023-global', 'Haro', 'Aeras', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('haro-aeras-st-2023-global', 'Haro', 'Aeras ST', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('haro-beasley-27-5-2023-global', 'Haro', 'Beasley 27.5', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('haro-beasley-27-5-dlx-2023-global', 'Haro', 'Beasley 27.5 DLX', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('haro-bridgeport-2023-global', 'Haro', 'Bridgeport', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('haro-bridgeport-st-2023-global', 'Haro', 'Bridgeport ST', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('haro-double-peak-29-sport-2023-global', 'Haro', 'Double Peak 29 Sport', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('haro-pd1-2023-global', 'Haro', 'PD1', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('haro-pd2-2023-global', 'Haro', 'PD2', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('haro-pd4-2023-global', 'Haro', 'PD4', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('haro-westlake-2023-global', 'Haro', 'Westlake', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Haro 2023 MTB lineup"}'::jsonb, 'https://archive.harobikes.com/mtb/2023', '2026-08-08'),
('author-a-ray-29-team-2020-global', 'AUTHOR', 'A-Ray 29 Team', 2020, '', 'mountain_full_suspension', 'global', '{"model_year_evidence":"official AUTHOR archive labels A-Ray 29 Team 2019-20"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-a-ray-29-2020-global', 'AUTHOR', 'A-Ray 29', 2020, '', 'mountain_full_suspension', 'global', '{"model_year_evidence":"official AUTHOR archive labels A-Ray 29 2019-20"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-a-ray-27-5-2020-global', 'AUTHOR', 'A-Ray 27.5', 2020, '', 'mountain_full_suspension', 'global', '{"model_year_evidence":"official AUTHOR archive labels A-Ray 27.5 2019-20"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-magnum-29-2020-global', 'AUTHOR', 'Magnum 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"carbon","fork":"FOX 32 Float","drivetrain_brand":"Shimano","drivetrain":"Shimano XT groupset"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-sector-29-2020-global', 'AUTHOR', 'Sector 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano XT groupset"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-master-29-2020-global', 'AUTHOR', 'Master 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano SLX/XT"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-egoist-29-2020-global', 'AUTHOR', 'Egoist 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","drivetrain_brand":"Shimano","drivetrain":"Shimano XT groupset"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-vision-29-2020-global', 'AUTHOR', 'Vision 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","brake_type":"hydraulic_disc"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-modus-29-2020-global', 'AUTHOR', 'Modus 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore groupset"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-orion-29-2020-global', 'AUTHOR', 'Orion 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","drivetrain_brand":"Shimano","drivetrain":"Shimano SLX/XT"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-context-29-asl-2020-global', 'AUTHOR', 'Context 29 ASL', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","brake_type":"hydraulic_disc"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-context-29-2020-global', 'AUTHOR', 'Context 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","brake_type":"hydraulic_disc"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-instinct-29-2020-global', 'AUTHOR', 'Instinct 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","brake_type":"hydraulic_disc"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-instinct-29-asl-2020-global', 'AUTHOR', 'Instinct 29 ASL', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","brake_type":"hydraulic_disc"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-instinct-asl-27-5-2020-global', 'AUTHOR', 'Instinct ASL 27.5', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","brake_type":"hydraulic_disc"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-traction-29-asl-2020-global', 'AUTHOR', 'Traction 29 ASL', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-traction-29-2020-global', 'AUTHOR', 'Traction 29', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-traction-asl-27-5-2020-global', 'AUTHOR', 'Traction ASL 27.5', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-traction-27-5-2020-global', 'AUTHOR', 'Traction 27.5', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-ultrasonic-27-5-2020-global', 'AUTHOR', 'Ultrasonic 27.5', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official AUTHOR 2020 archive exact model","frame_material":"aluminium","drivetrain_brand":"Shimano","drivetrain":"Shimano SLX"}'::jsonb, 'https://en.author.eu/bicycles/mountain-bike?f_yr=2020', '2026-08-08'),
('author-charisma-77-2020-global', 'AUTHOR', 'Charisma 77', 2020, '', 'road', 'global', '{"model_year_evidence":"official AUTHOR archive labels Charisma 77 2020-21","frame_material":"carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Dura-Ace"}'::jsonb, 'https://en.author.eu/bicycles/road?f_yr=2020', '2026-08-08'),
('author-charisma-66-2020-global', 'AUTHOR', 'Charisma 66', 2020, '', 'road', 'global', '{"model_year_evidence":"official AUTHOR archive labels Charisma 66 2020-21","frame_material":"carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Ultegra"}'::jsonb, 'https://en.author.eu/bicycles/road?f_yr=2020', '2026-08-08'),
('author-charisma-55-2020-global', 'AUTHOR', 'Charisma 55', 2020, '', 'road', 'global', '{"model_year_evidence":"official AUTHOR archive labels Charisma 55 2020-21","frame_material":"carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano 105"}'::jsonb, 'https://en.author.eu/bicycles/road?f_yr=2020', '2026-08-08'),
('author-aura-55-2020-global', 'AUTHOR', 'Aura 55', 2020, '', 'road', 'global', '{"model_year_evidence":"official AUTHOR archive labels Aura 55 2020-21","frame_material":"aluminium","drivetrain_brand":"Shimano","drivetrain":"Shimano 105"}'::jsonb, 'https://en.author.eu/bicycles/road?f_yr=2020', '2026-08-08'),
('author-ronin-sl-2020-global', 'AUTHOR', 'Ronin SL', 2020, '', 'gravel', 'global', '{"model_year_evidence":"official AUTHOR 2020 gravel archive exact model","frame_material":"steel","drivetrain_brand":"Shimano","drivetrain":"Shimano GRX"}'::jsonb, 'https://en.author.eu/bicycles/gravel?f_yr=2020', '2026-08-08'),
('author-aura-xr6-2020-global', 'AUTHOR', 'Aura XR6', 2020, '', 'gravel', 'global', '{"model_year_evidence":"official AUTHOR 2020 gravel archive exact model"}'::jsonb, 'https://en.author.eu/bicycles/gravel?f_yr=2020', '2026-08-08'),
('author-ronin-xc-2020-global', 'AUTHOR', 'Ronin XC', 2020, '', 'gravel', 'global', '{"model_year_evidence":"official AUTHOR 2020 gravel archive exact model","frame_material":"steel","drivetrain_brand":"Shimano","drivetrain":"Shimano GRX","brake_type":"hydraulic_disc"}'::jsonb, 'https://en.author.eu/bicycles/gravel?f_yr=2020', '2026-08-08'),
('author-aura-xr5-2020-global', 'AUTHOR', 'Aura XR5', 2020, '', 'gravel', 'global', '{"model_year_evidence":"official AUTHOR 2020 gravel archive exact model","drivetrain_brand":"Shimano","drivetrain":"Shimano GRX 600"}'::jsonb, 'https://en.author.eu/bicycles/gravel?f_yr=2020', '2026-08-08'),
('author-ronin-2020-global', 'AUTHOR', 'Ronin', 2020, '', 'gravel', 'global', '{"model_year_evidence":"official AUTHOR 2020 gravel archive exact model","frame_material":"steel","brake_type":"hydraulic_disc","drivetrain_brand":"Shimano","drivetrain":"Shimano GRX"}'::jsonb, 'https://en.author.eu/bicycles/gravel?f_yr=2020', '2026-08-08'),
('author-aura-xr4-2020-global', 'AUTHOR', 'Aura XR4', 2020, '', 'gravel', 'global', '{"model_year_evidence":"official AUTHOR 2020 gravel archive exact model","frame_material":"aluminium","brake_type":"mechanical_disc"}'::jsonb, 'https://en.author.eu/bicycles/gravel?f_yr=2020', '2026-08-08'),
('author-aura-xr3-2020-global', 'AUTHOR', 'Aura XR3', 2020, '', 'gravel', 'global', '{"model_year_evidence":"official AUTHOR 2020 gravel archive exact model","frame_material":"aluminium","drivetrain_brand":"Shimano","drivetrain":"Shimano Sora","brake_type":"mechanical_disc"}'::jsonb, 'https://en.author.eu/bicycles/gravel?f_yr=2020', '2026-08-08'),
('mondraker-chaser-r-2024-global', 'Mondraker', 'CHASER R', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-crafty-carbon-r-2024-global', 'Mondraker', 'CRAFTY CARBON R', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-crafty-carbon-rr-2024-global', 'Mondraker', 'CRAFTY CARBON RR', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-crafty-carbon-rr-sl-2024-global', 'Mondraker', 'CRAFTY CARBON RR SL', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-crafty-carbon-xr-2024-global', 'Mondraker', 'CRAFTY CARBON XR', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-crafty-r-2024-global', 'Mondraker', 'CRAFTY R', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-crafty-rr-2024-global', 'Mondraker', 'CRAFTY RR', 2024, '', 'emtb_enduro', 'global', '{"model_year_evidence":"official Mondraker exact archive: CRAFTY RR 2024","frame_material":"aluminium","wheel_size":"29","front_travel_mm":160,"rear_travel_mm":150,"fork":"Fox 38 29 Float GRIP2 Factory Kashima","rear_shock":"Fox Float-X LV Factory Kashima 205x65","rear_axle":"12x148 Boost","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle 1x12","rear_derailleur":"SRAM GX Eagle","cassette":"SRAM PG-1230 11-50T 12-speed","brake_type":"hydraulic_disc","brakes":"SRAM Code Bronze 220/200 mm","motor":"Bosch Performance Line CX GEN4 Smart System","battery_wh":750}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-crafty-xr-2024-global', 'Mondraker', 'CRAFTY XR', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-crusher-2024-global', 'Mondraker', 'CRUSHER', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-crusher-r-2024-global', 'Mondraker', 'CRUSHER R', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-crusher-rr-2024-global', 'Mondraker', 'CRUSHER RR', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-dune-r-2024-global', 'Mondraker', 'DUNE R', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-dune-rr-2024-global', 'Mondraker', 'DUNE RR', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-dune-xr-2024-global', 'Mondraker', 'DUNE XR', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-dusty-r-2024-global', 'Mondraker', 'DUSTY R', 2024, '', 'e_gravel', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-dusty-rr-2024-global', 'Mondraker', 'DUSTY RR', 2024, '', 'e_gravel', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-dusty-sx-r-2024-global', 'Mondraker', 'DUSTY SX R', 2024, '', 'e_gravel', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-dusty-sx-rr-2024-global', 'Mondraker', 'DUSTY SX RR', 2024, '', 'e_gravel', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-dusty-xr-2024-global', 'Mondraker', 'DUSTY XR', 2024, '', 'e_gravel', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-f-play-24-2024-global', 'Mondraker', 'F-PLAY 24', 2024, '', 'kids', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-f-play-26-2024-global', 'Mondraker', 'F-PLAY 26', 2024, '', 'kids', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-f-podium-2024-global', 'Mondraker', 'F-PODIUM', 2024, '', 'xc_full_suspension', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-f-podium-r-2024-global', 'Mondraker', 'F-PODIUM R', 2024, '', 'xc_full_suspension', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-f-podium-rr-2024-global', 'Mondraker', 'F-PODIUM RR', 2024, '', 'xc_full_suspension', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-f-podium-rr-sl-2024-global', 'Mondraker', 'F-PODIUM RR SL', 2024, '', 'xc_full_suspension', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-f-podium-rs-2024-global', 'Mondraker', 'F-PODIUM RS', 2024, '', 'xc_full_suspension', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-f-podium-unlimited-flight-attendant-2024-global', 'Mondraker', 'F-PODIUM UNLIMITED FLIGHT ATTENDANT', 2024, '', 'xc_full_suspension', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-f-trick-24-2024-global', 'Mondraker', 'F-TRICK 24', 2024, '', 'kids', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-f-trick-26-2024-global', 'Mondraker', 'F-TRICK 26', 2024, '', 'kids', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-foxy-carbon-r-2024-global', 'Mondraker', 'FOXY CARBON R', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-foxy-carbon-unlimited-20th-anniversary-2024-global', 'Mondraker', 'FOXY CARBON UNLIMITED 20TH ANNIVERSARY', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-foxy-r-2024-global', 'Mondraker', 'FOXY R', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-level-r-2024-global', 'Mondraker', 'LEVEL R', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-level-rr-2024-global', 'Mondraker', 'LEVEL RR', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-level-xr-2024-global', 'Mondraker', 'LEVEL XR', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-neat-r-2024-global', 'Mondraker', 'NEAT R', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-neat-rr-2024-global', 'Mondraker', 'NEAT RR', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-neat-rr-sl-2024-global', 'Mondraker', 'NEAT RR SL', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-neat-unlimited-gulf-2024-global', 'Mondraker', 'NEAT UNLIMITED GULF', 2024, '', null, 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-podium-2024-global', 'Mondraker', 'PODIUM', 2024, '', 'xc_hardtail', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-podium-r-2024-global', 'Mondraker', 'PODIUM R', 2024, '', 'xc_hardtail', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-podium-rr-sl-2024-global', 'Mondraker', 'PODIUM RR SL', 2024, '', 'xc_hardtail', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-raze-carbon-r-2024-global', 'Mondraker', 'RAZE CARBON R', 2024, '', 'trail_full_suspension', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-raze-carbon-rr-2024-global', 'Mondraker', 'RAZE CARBON RR', 2024, '', 'trail_full_suspension', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-raze-carbon-rr-sl-2024-global', 'Mondraker', 'RAZE CARBON RR SL', 2024, '', 'trail_full_suspension', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-summum-2024-global', 'Mondraker', 'SUMMUM', 2024, '', 'downhill', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-summum-carbon-r-2024-global', 'Mondraker', 'SUMMUM CARBON R', 2024, '', 'downhill', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-summum-carbon-rr-2024-global', 'Mondraker', 'SUMMUM CARBON RR', 2024, '', 'downhill', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('mondraker-summum-r-2024-global', 'Mondraker', 'SUMMUM R', 2024, '', 'downhill', 'global', '{"model_year_evidence":"official Mondraker 2024 archive model list"}'::jsonb, 'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr', '2026-08-08'),
('ns-bikes-define-2024-global', 'NS Bikes', 'Define', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 archive navigation"}'::jsonb, 'https://www.nsbikes.com/2024/', '2026-08-08'),
('ns-bikes-e-fine-2024-global', 'NS Bikes', 'E-Fine', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 archive navigation"}'::jsonb, 'https://www.nsbikes.com/2024/', '2026-08-08'),
('ns-bikes-e-fine-2-2024-global', 'NS Bikes', 'E-Fine 2', 2024, '', 'emtb_full_suspension', 'global', '{"model_year_evidence":"official NS Bikes archived 2024 exact product URL","frame_material":"aluminium","wheel_size":"29 front / 27.5 rear","front_travel_mm":160,"rear_travel_mm":150,"fork":"RockShox 35 Gold RL 160 mm","rear_shock":"X-Fusion H3C / Marzocchi Bomber CR","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore 1x11","rear_derailleur":"Shimano Deore RD-M5100","cassette":"SunRace CSMS7 11-46T 11-speed","brake_type":"hydraulic_disc","brakes":"Shimano Deore MT420 4-piston 203/203 mm","motor":"Shimano E7000","battery_wh":504}'::jsonb, 'https://www.nsbikes.com/2024/e-fine-2%2C628%2Cpl.html', '2026-08-08'),
('ns-bikes-crust-2024-global', 'NS Bikes', 'Crust', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 archive navigation"}'::jsonb, 'https://www.nsbikes.com/2024/', '2026-08-08'),
('ns-bikes-fuzz-2024-global', 'NS Bikes', 'Fuzz', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 archive navigation"}'::jsonb, 'https://www.nsbikes.com/2024/', '2026-08-08'),
('ns-bikes-nerd-2024-global', 'NS Bikes', 'Nerd', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 archive navigation"}'::jsonb, 'https://www.nsbikes.com/2024/', '2026-08-08'),
('ns-bikes-synonym-2024-global', 'NS Bikes', 'Synonym', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 archive navigation"}'::jsonb, 'https://www.nsbikes.com/2024/', '2026-08-08'),
('ns-bikes-eccentric-2024-global', 'NS Bikes', 'Eccentric', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 archive navigation"}'::jsonb, 'https://www.nsbikes.com/2024/', '2026-08-08'),
('ns-bikes-zircus-2024-global', 'NS Bikes', 'Zircus', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 archive navigation"}'::jsonb, 'https://www.nsbikes.com/2024/', '2026-08-08'),
('ns-bikes-clash-2024-global', 'NS Bikes', 'Clash', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 exact product URL","wheel_size":"26","frame_material":"aluminium"}'::jsonb, 'https://www.nsbikes.com/2024/clash%2C118%2Cpl.html', '2026-08-08'),
('ns-bikes-movement-2024-global', 'NS Bikes', 'Movement', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 archive navigation"}'::jsonb, 'https://www.nsbikes.com/2024/', '2026-08-08'),
('ns-bikes-metropolis-2024-global', 'NS Bikes', 'Metropolis', 2024, '', null, 'global', '{"model_year_evidence":"official NS Bikes 2024 archive navigation"}'::jsonb, 'https://www.nsbikes.com/2024/', '2026-08-08'),
('ns-bikes-rag-2024-global', 'NS Bikes', 'Rag+', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official NS Bikes 2024 exact product URL"}'::jsonb, 'https://www.nsbikes.com/2024/rag-3%2C644%2Cpl.html', '2026-08-08'),
('polygon-cascade-2-2021-global', 'Polygon', 'CASCADE 2', 2021, '', null, 'global', '{"model_year_evidence":"official Polygon Bike Archive result labels CASCADE 2 2021"}'::jsonb, 'https://www.polygonbikes.com/us/bike-archive/', '2026-08-08'),
('dartmoor-thunderbird-fr-2026-global', 'Dartmoor', 'Thunderbird FR', 2026, '', 'freeride_full_suspension', 'global', '{"model_year_evidence":"official Dartmoor page explicitly calls Thunderbird FR 2026 a brand-new freeride machine"}'::jsonb, 'https://dartmoor-bikes.com/thunderbird-fr-2026-built-big-sends-natalia-budner-bikecheck', '2026-08-08')
on conflict (brand, model, model_year, trim, market) do update set
  category = coalesce(public.bike_catalog_models.category, excluded.category),
  specs = excluded.specs || public.bike_catalog_models.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = greatest(public.bike_catalog_models.evidence_checked_at, excluded.evidence_checked_at),
  enabled = true;

-- SOURCE: supabase/schema/catalog_enrichment_wave_14_haro_shimano_2026_08_08.sql
begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('shimano-rd-m8050-gs', 'Shimano', 'RD-M8050-GS', 'rear_derailleur', 'DEORE XT Di2 RD-M8050-GS',
   '{"speeds":11,"compatible_cassette_range":"11-40T / 11-42T / 11-46T"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-08'),
  ('shimano-cs-m8000-11', 'Shimano', 'CS-M8000', 'cassette', 'DEORE XT CS-M8000 11-46T',
   '{"speeds":11,"range":"11-46T"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-08'),
  ('shimano-br-mt520', 'Shimano', 'BR-MT520', 'brake_caliper', 'Shimano BR-MT520',
   '{"brake_type":"hydraulic_disc","pistons":4,"compatible_rotor_sizes_mm":[140,160,180,200,203]}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/BR-MT520', '2026-08-08')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('shimano-rd-m8050-gs', 'shimano-cs-m8000-11', 'compatible',
   'Shimano C-433 lists RD-M8050-GS with CS-M8000 11-speed 11-46T among supported MTB combinations.',
   'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-08')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('haro-shift-io-9-2021-global', 'shimano-cs-m8000-11', 'factory_installed',
   'https://archive.harobikes.com/mtb/2021-mtb/shift-io-9-2021', '2026-08-08',
   'Haro exact product page specifies Shimano Deore XT M8000 11-speed 11-46T cassette.'),
  ('haro-shift-io-9-2021-global', 'shimano-br-mt520', 'factory_installed',
   'https://archive.harobikes.com/mtb/2021-mtb/shift-io-9-2021', '2026-08-08',
   'Haro exact product page specifies Shimano BR-MT520 brakes with 203 mm rotors.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;

-- SOURCE: catalog-harvester/batches/wave15.json
insert into public.bike_catalog_models
  (id, brand, model, model_year, trim, category, market, specs, manufacturer_url, evidence_checked_at)
values
('specialized-crux-expert-sram-rival-xplr-axs-2026-global', 'Specialized', 'Crux Expert - SRAM Rival XPLR AXS', 2026, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"SRAM Rival XPLR AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-crux-pro-sram-force-xplr-axs-2026-global', 'Specialized', 'Crux Pro - SRAM Force XPLR AXS', 2026, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"SRAM Force XPLR AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-ltd-red-bull-2025-tdf-2026-global', 'Specialized', 'S-Works Tarmac SL8 LTD - Red Bull 2025 TdF', 2026, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-4-pro-2026-global', 'Specialized', 'Turbo Levo 4 Pro', 2026, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-epic-8-evo-shimano-xtr-di2-fox-factory-2026-global', 'Specialized', 'S-Works Epic 8 EVO - Shimano XTR Di2, FOX Factory', 2026, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"Shimano XTR Di2","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-turbo-levo-4-2026-global', 'Specialized', 'S-Works Turbo Levo 4', 2026, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-4-expert-2026-global', 'Specialized', 'Turbo Levo 4 Expert', 2026, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-4-comp-2026-global', 'Specialized', 'Turbo Levo 4 Comp', 2026, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-turbo-levo-4-frameset-2026-global', 'Specialized', 'S-Works Turbo Levo 4 Frameset', 2026, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-epic-8-expert-shimano-xt-di2-rockshox-select-2026-global', 'Specialized', 'Epic 8 Expert - Shimano XT Di2, RockShox Select+', 2026, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"Shimano XT Di2","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-epic-8-expert-sram-gx-axs-rockshox-select-2026-global', 'Specialized', 'Epic 8 Expert - SRAM GX AXS, RockShox Select+', 2026, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"SRAM GX AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant-2026-global', 'Specialized', 'S-Works Epic 8 - SRAM XX SL AXS, RockShox Ultimate Flight Attendant', 2026, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"SRAM XX SL AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant-2026-global', 'Specialized', 'Epic 8 Pro - SRAM X0 AXS, RockShox Ultimate Flight Attendant', 2026, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"SRAM X0 AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-sl-2-expert-di2-2026-global', 'Specialized', 'Turbo Levo SL 2 Expert Di2', 2026, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-frameset-fact-12r-carbon-2026-global', 'Specialized', 'S-Works Tarmac SL8 Frameset - FACT 12r Carbon', 2026, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-epic-8-comp-sram-s-1000-axs-rockshox-select-2026-global', 'Specialized', 'Epic 8 Comp - SRAM S-1000 AXS, RockShox Select', 2026, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"SRAM S-1000 AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate-2026-global', 'Specialized', 'S-Works Epic 8 EVO - SRAM XX SL AXS, RockShox Ultimate', 2026, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"SRAM XX SL AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-epic-8-pro-evo-frameset-fox-float-factory-2026-global', 'Specialized', 'Epic 8 Pro EVO Frameset - FOX FLOAT Factory', 2026, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-crux-comp-shimano-grx-2026-global', 'Specialized', 'Crux Comp - Shimano GRX', 2026, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"Shimano GRX","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-sram-red-axs-2026-global', 'Specialized', 'S-Works Tarmac SL8 - SRAM RED AXS', 2026, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"SRAM RED AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2026-global', 'Specialized', 'S-Works Tarmac SL8 - Shimano Dura-Ace Di2', 2026, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"Shimano Dura-Ace Di2","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-crux-frameset-fact-10r-carbon-2026-global', 'Specialized', 'Crux Frameset - FACT 10r Carbon', 2026, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-crux-frameset-fact-12r-carbon-2026-global', 'Specialized', 'S-Works Crux Frameset - FACT 12r Carbon', 2026, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-diverge-4-pro-ltd-sram-red-xplr-2026-global', 'Specialized', 'Diverge 4 Pro LTD - SRAM RED XPLR', 2026, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"SRAM RED XPLR","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-frameset-ltd-yoon-hyup-2026-global', 'Specialized', 'S-Works Tarmac SL8 Frameset LTD - Yoon Hyup', 2026, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-frameset-ltd-lucas-beaufort-2026-global', 'Specialized', 'S-Works Tarmac SL8 Frameset LTD - Lucas Beaufort', 2026, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-frameset-ltd-parra-2026-global', 'Specialized', 'S-Works Tarmac SL8 Frameset LTD - Parra', 2026, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-crux-sram-red-xplr-2026-global', 'Specialized', 'S-Works Crux - SRAM RED XPLR', 2026, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026","drivetrain":"SRAM RED XPLR","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-frameset-ltd-demi-dreaming-2026-global', 'Specialized', 'S-Works Tarmac SL8 Frameset LTD - Demi Dreaming', 2026, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2026"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-epic-8-evo-expert-sram-gx-axs-fox-performance-elite-2025-global', 'Specialized', 'Epic 8 EVO Expert - SRAM GX AXS, FOX Performance Elite', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM GX AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-roubaix-sl8-pro-shimano-ultegra-di2-2025-global', 'Specialized', 'Roubaix SL8 Pro - Shimano Ultegra Di2', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano Ultegra Di2","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-diverge-comp-carbon-sram-apex-etap-axs-2025-global', 'Specialized', 'Diverge Comp Carbon - SRAM Apex eTAP AXS', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM Apex eTAP AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-aethos-frameset-fact-12r-carbon-2025-global', 'Specialized', 'S-Works Aethos Frameset - FACT 12r Carbon', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-allez-sprint-frameset-d-aluisio-smartweld-alloy-2025-global', 'Specialized', 'Allez Sprint Frameset - D''Aluisio Smartweld Alloy', 2025, '', null, 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2025-global', 'Specialized', 'S-Works Tarmac SL8 - Shimano Dura-Ace Di2', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano Dura-Ace Di2","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-tarmac-sl8-expert-shimano-ultegra-di2-2025-global', 'Specialized', 'Tarmac SL8 Expert - Shimano Ultegra Di2', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano Ultegra Di2","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-diverge-expert-carbon-sram-rival-etap-axs-gx-eagle-axs-2025-global', 'Specialized', 'Diverge Expert Carbon - SRAM Rival eTAP AXS / GX Eagle AXS', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM Rival eTAP AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-tarmac-sl8-pro-sram-force-etap-axs-2025-global', 'Specialized', 'Tarmac SL8 Pro - SRAM Force eTAP AXS', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM Force eTAP AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-diverge-e5-shimano-claris-2025-global', 'Specialized', 'Diverge E5 - Shimano Claris', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano Claris","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-chisel-hardtail-comp-2025-global', 'Specialized', 'Chisel Hardtail Comp', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-diverge-e5-elite-shimano-grx-2025-global', 'Specialized', 'Diverge E5 Elite - Shimano GRX', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano GRX","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-stumpjumper-15-frameset-fox-float-genie-factory-2025-global', 'Specialized', 'S-Works Stumpjumper 15 Frameset - FOX FLOAT GENIE Factory', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-ltd-forward-50-collection-2025-global', 'Specialized', 'S-Works Tarmac SL8 LTD - Forward 50 Collection', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-crux-sram-red-xplr-2025-global', 'Specialized', 'S-Works Crux - SRAM RED XPLR', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM RED XPLR","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-crux-pro-sram-force-xplr-etap-axs-2025-global', 'Specialized', 'Crux Pro - SRAM Force XPLR eTAP AXS', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-crux-frameset-fact-12r-carbon-2025-global', 'Specialized', 'S-Works Crux Frameset - FACT 12r Carbon', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-tero-4-0-2025-global', 'Specialized', 'Turbo Tero 4.0', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-diverge-sport-carbon-shimano-grx-2025-global', 'Specialized', 'Diverge Sport Carbon - Shimano GRX', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano GRX","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-frameset-ready-to-paint-2025-global', 'Specialized', 'S-Works Tarmac SL8 Frameset - Ready to Paint', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-tarmac-sl7-comp-shimano-105-di2-2025-global', 'Specialized', 'Tarmac SL7 Comp - Shimano 105 Di2', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano 105 Di2","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-frameset-fact-12r-carbon-2025-global', 'Specialized', 'S-Works Tarmac SL8 Frameset - FACT 12r Carbon', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-3-comp-carbon-2025-global', 'Specialized', 'Turbo Levo 3 Comp Carbon', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-crux-dsw-frameset-d-aluisio-smartweld-alloy-2025-global', 'Specialized', 'Crux DSW Frameset - D''Aluisio Smartweld Alloy', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-crux-dsw-comp-sram-apex-xplr-2025-global', 'Specialized', 'Crux DSW Comp - SRAM Apex XPLR', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM Apex XPLR","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-3-2025-global', 'Specialized', 'Turbo Levo 3', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-tarmac-sl8-pro-shimano-ultegra-di2-2025-global', 'Specialized', 'Tarmac SL8 Pro - Shimano Ultegra Di2', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano Ultegra Di2","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-ltd-sram-red-axs-2025-global', 'Specialized', 'S-Works Tarmac SL8 LTD - SRAM RED AXS', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM RED AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-aethos-ltd-sram-red-axs-2025-global', 'Specialized', 'S-Works Aethos LTD - SRAM RED AXS', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM RED AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-sram-red-axs-2025-global', 'Specialized', 'S-Works Tarmac SL8 - SRAM RED AXS', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM RED AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-tarmac-sl8-expert-sram-rival-etap-axs-2025-global', 'Specialized', 'Tarmac SL8 Expert - SRAM Rival eTAP AXS', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM Rival eTAP AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-diverge-comp-e5-sram-apex-2025-global', 'Specialized', 'Diverge Comp E5 - SRAM Apex', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM Apex","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-epic-8-evo-comp-sram-s-1000-axs-fox-performance-2025-global', 'Specialized', 'Epic 8 EVO Comp - SRAM S-1000 AXS, FOX Performance', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM S-1000 AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-epic-8-comp-sram-s-1000-axs-rockshox-select-2025-global', 'Specialized', 'Epic 8 Comp - SRAM S-1000 AXS, RockShox Select', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM S-1000 AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-tarmac-sl7-sport-shimano-105-2025-global', 'Specialized', 'Tarmac SL7 Sport - Shimano 105', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano 105","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-chisel-comp-shimano-2025-global', 'Specialized', 'Chisel Comp Shimano', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-vado-4-0-2025-global', 'Specialized', 'Turbo Vado 4.0', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-sl-2-comp-2025-global', 'Specialized', 'Turbo Levo SL 2 Comp', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-turbo-levo-sl-2-2025-global', 'Specialized', 'S-Works Turbo Levo SL 2', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-sl-2-comp-alloy-2025-global', 'Specialized', 'Turbo Levo SL 2 Comp Alloy', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-sl-2-pro-2025-global', 'Specialized', 'Turbo Levo SL 2 Pro', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-sl-2-o-hlins-coil-2025-global', 'Specialized', 'Turbo Levo SL 2 Öhlins Coil', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-levo-sl-2-expert-2025-global', 'Specialized', 'Turbo Levo SL 2 Expert', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-tero-4-0-step-through-2025-global', 'Specialized', 'Turbo Tero 4.0 Step-Through', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-roubaix-sl8-shimano-tiagra-2025-global', 'Specialized', 'Roubaix SL8 - Shimano Tiagra', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano Tiagra","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-crux-comp-shimano-grx-2025-global', 'Specialized', 'Crux Comp - Shimano GRX', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano GRX","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-crux-expert-sram-rival-xplr-etap-axs-2025-global', 'Specialized', 'Crux Expert - SRAM Rival XPLR eTAP AXS', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-stumpjumper-15-ltd-fox-dhx-live-valve-neo-2025-global', 'Specialized', 'S-Works Stumpjumper 15 LTD - FOX DHX Live Valve Neo', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-roubaix-sl8-comp-shimano-105-di2-2025-global', 'Specialized', 'Roubaix SL8 Comp - Shimano 105 Di2', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"Shimano 105 Di2","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-kenevo-sl-2-expert-2025-global', 'Specialized', 'Turbo Kenevo SL 2 Expert', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-roubaix-sl8-expert-sram-rival-etap-axs-2025-global', 'Specialized', 'Roubaix SL8 Expert - SRAM Rival eTAP AXS', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025","drivetrain":"SRAM Rival eTAP AXS","drivetrain_title_evidence":true}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-turbo-levo-sl-2-ltd-fox-dhx-live-valve-neo-2025-global', 'Specialized', 'S-Works Turbo Levo SL 2 LTD - FOX DHX Live Valve Neo', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-team-frameset-fdj-suez-2025-global', 'Specialized', 'S-Works Tarmac SL8 Team Frameset - FDJ - SUEZ', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-ltd-remco-s-golden-season-2025-global', 'Specialized', 'S-Works Tarmac SL8 LTD - Remco''s Golden Season', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-turbo-creo-2-sram-red-xx1-eagle-axs-2025-global', 'Specialized', 'S-Works Turbo Creo 2 - SRAM RED / XX1 Eagle AXS', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-sirrus-x-5-0-2025-global', 'Specialized', 'Sirrus X 5.0', 2025, '', 'fitness', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-vado-4-0-step-through-2025-global', 'Specialized', 'Turbo Vado 4.0 Step-Through', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-turbo-tero-4-0-eq-2025-global', 'Specialized', 'Turbo Tero 4.0 EQ', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-team-frameset-soudal-quick-step-2025-global', 'Specialized', 'S-Works Tarmac SL8 Team Frameset - Soudal Quick-Step', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('specialized-s-works-tarmac-sl8-team-frameset-red-bull-bora-hansgrohe-2025-global', 'Specialized', 'S-Works Tarmac SL8 Team Frameset - Red Bull - BORA - hansgrohe', 2025, '', 'road', 'global', '{"model_year_evidence":"official Specialized Bike Archive result explicitly labels this model 2025"}'::jsonb, 'https://www.specialized.com/gb/en/bike-archive', '2026-08-09'),
('rocky-mountain-blizzard-carbon-30-2024-global', 'Rocky Mountain', 'Blizzard Carbon 30', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-growler-20-2024-global', 'Rocky Mountain', 'Growler 20', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-powerplay-alloy-70-2024-global', 'Rocky Mountain', 'Instinct Powerplay Alloy 70', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox Lyrik Select","rear_shock":"RockShox Super Deluxe Select+","drivetrain":"Shimano XT"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-powerplay-alloy-50-2024-global', 'Rocky Mountain', 'Instinct Powerplay Alloy 50', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox Revelation Select RC","rear_shock":"RockShox Deluxe Select+","drivetrain":"Shimano SLX"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-blizzard-powerplay-alloy-30-2024-global', 'Rocky Mountain', 'Blizzard Powerplay Alloy 30', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","drivetrain":"MicroShift Advent X 10-speed","brakes":"SRAM Level 2-piston"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-flow-2024-global', 'Rocky Mountain', 'Flow', 2024, '', null, 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-blizzard-carbon-50-2024-global', 'Rocky Mountain', 'Blizzard Carbon 50', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-solo-carbon-70-2024-global', 'Rocky Mountain', 'Solo Carbon 70', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-slayer-carbon-50-2024-global', 'Rocky Mountain', 'Slayer Carbon 50', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-slayer-alloy-30-2024-global', 'Rocky Mountain', 'Slayer Alloy 30', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-reaper-powerplay-24-2024-global', 'Rocky Mountain', 'Reaper Powerplay 24', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox Reba R 120 mm","brakes":"Tektro HD-J285","dropper_post":"X-Fusion Manic Composite"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-powerplay-carbon-50-2024-global', 'Rocky Mountain', 'Instinct Powerplay Carbon 50', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox Lyrik Select","rear_shock":"RockShox Deluxe Select+","drivetrain":"Shimano SLX"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-alloy-30-2024-global', 'Rocky Mountain', 'Instinct Alloy 30', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox 35 Gold RL","rear_shock":"RockShox Deluxe Select RT","drivetrain":"Shimano Deore"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-element-carbon-70-2024-global', 'Rocky Mountain', 'Element Carbon 70', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-soul-10-2024-global', 'Rocky Mountain', 'Soul 10', 2024, '', null, 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-slayer-carbon-70-2024-global', 'Rocky Mountain', 'Slayer Carbon 70', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-carbon-30-2024-global', 'Rocky Mountain', 'Instinct Carbon 30', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"Marzocchi Z2 Rail","rear_shock":"Fox Float DPS Performance","drivetrain":"Shimano Deore"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-alloy-50-2024-global', 'Rocky Mountain', 'Instinct Alloy 50', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"Fox 36 GRIP Performance","rear_shock":"Fox Float X Performance","drivetrain":"Shimano XT"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-growler-40-2024-global', 'Rocky Mountain', 'Growler 40', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-fusion-powerplay-10-2024-global', 'Rocky Mountain', 'Fusion Powerplay 10', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-flow-jr-24-2024-global', 'Rocky Mountain', 'Flow Jr 24', 2024, '', null, 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-blizzard-powerplay-alloy-50-2024-global', 'Rocky Mountain', 'Blizzard Powerplay Alloy 50', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","drivetrain":"SRAM GX Eagle","brakes":"SRAM G2 R 4-piston"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-altitude-alloy-50-2024-global', 'Rocky Mountain', 'Altitude Alloy 50', 2024, '', null, 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"Fox 38 Float EVOL GRIP","rear_shock":"Fox Float X Performance","drivetrain":"Shimano SLX","brakes":"Shimano SLX Trail 4-piston"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-soul-20-2024-global', 'Rocky Mountain', 'Soul 20', 2024, '', null, 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-solo-carbon-50-2024-global', 'Rocky Mountain', 'Solo Carbon 50', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","drivetrain":"SRAM Apex XPLR AXS"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-solo-alloy-50-2024-global', 'Rocky Mountain', 'Solo Alloy 50', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","drivetrain":"SRAM Apex 1x12"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-solo-alloy-30-2024-global', 'Rocky Mountain', 'Solo Alloy 30', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","drivetrain":"SRAM Apex 1x11"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-slayer-carbon-90-2024-global', 'Rocky Mountain', 'Slayer Carbon 90', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-slayer-c-frameset-2024-global', 'Rocky Mountain', 'Slayer C Frameset', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-slayer-alloy-50-2024-global', 'Rocky Mountain', 'Slayer Alloy 50', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-slayer-alloy-30-park-2024-global', 'Rocky Mountain', 'Slayer Alloy 30 Park', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-reaper-powerplay-26-2024-global', 'Rocky Mountain', 'Reaper Powerplay 26', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox Reba R 140 mm","brakes":"Tektro HD-J285","dropper_post":"X-Fusion Manic Composite"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-powerplay-carbon-70-2024-global', 'Rocky Mountain', 'Instinct Powerplay Carbon 70', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"Fox 36 E-MTB Float EVOL GRIP Performance","rear_shock":"Fox Float X Performance","drivetrain":"Shimano XT"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-carbon-99-2024-global', 'Rocky Mountain', 'Instinct Carbon 99', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox Lyrik Ultimate Flight Attendant","rear_shock":"RockShox Super Deluxe Ultimate Flight Attendant","drivetrain":"SRAM X0 Transmission Wireless"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-carbon-90-2024-global', 'Rocky Mountain', 'Instinct Carbon 90', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"Fox 36 GRIP2 Factory","rear_shock":"Fox Float X Factory","drivetrain":"Shimano XTR"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-carbon-70-2024-global', 'Rocky Mountain', 'Instinct Carbon 70', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"Fox 36 Performance Elite","rear_shock":"Fox Float X Performance Elite","drivetrain":"Shimano XT"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-carbon-70-2024-sram-x0-transmission-global', 'Rocky Mountain', 'Instinct Carbon 70', 2024, 'SRAM X0 Transmission', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox Lyrik Select+","rear_shock":"RockShox Super Deluxe Ultimate","drivetrain":"SRAM X0 Transmission Wireless"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-carbon-50-2024-global', 'Rocky Mountain', 'Instinct Carbon 50', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox Lyrik Select RC","rear_shock":"Fox Float X Performance","drivetrain":"Shimano XT"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-c-frameset-2024-global', 'Rocky Mountain', 'Instinct C Frameset', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","rear_shock":"Fox Float X Factory"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-instinct-alloy-10-2024-global', 'Rocky Mountain', 'Instinct Alloy 10', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox Recon Silver RL","rear_shock":"RockShox Deluxe Select","drivetrain":"Shimano CUES"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-growler-jr-20-2024-global', 'Rocky Mountain', 'Growler Jr 20', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-fusion-powerplay-30-2024-global', 'Rocky Mountain', 'Fusion Powerplay 30', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","drivetrain":"Shimano SLX","brakes":"Shimano MT4100 2-piston"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-fusion-30-2024-global', 'Rocky Mountain', 'Fusion 30', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-fusion-10-2024-global', 'Rocky Mountain', 'Fusion 10', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"SR Suntour XCM32","drivetrain":"MicroShift Advent"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-element-carbon-99-2024-global', 'Rocky Mountain', 'Element Carbon 99', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result","fork":"RockShox SID Ultimate Flight Attendant","rear_shock":"RockShox SIDLuxe Ultimate Flight Attendant","drivetrain":"SRAM XX Transmission Wireless"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('rocky-mountain-element-carbon-90-2024-global', 'Rocky Mountain', 'Element Carbon 90', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Rocky Mountain 2024 Bikes archive collection result"}'::jsonb, 'https://bikes.com/collections/2024-bikes', '2026-08-09'),
('marin-alpine-trail-e2-2024-global', 'Marin', 'Alpine Trail E2', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-rift-zone-xr-axs-2024-global', 'Marin', 'Rift Zone XR AXS', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-alpine-trail-e1-2024-global', 'Marin', 'Alpine Trail E1', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-alpine-trail-e-2024-global', 'Marin', 'Alpine Trail E', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-rift-zone-e-2024-global', 'Marin', 'Rift Zone E', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-team-marin-2-2024-global', 'Marin', 'Team Marin 2', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-gestalt-xr-2024-global', 'Marin', 'Gestalt XR', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-rift-zone-2-2024-global', 'Marin', 'Rift Zone 2', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-san-quentin-3-2024-global', 'Marin', 'San Quentin 3', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-dsx-fs-2024-global', 'Marin', 'DSX FS', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-rift-zone-jr-26-2024-global', 'Marin', 'Rift Zone Jr 26"', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-rift-zone-jr-24-2024-global', 'Marin', 'Rift Zone Jr 24"', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-el-roy-2024-global', 'Marin', 'El Roy', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-team-marin-1-2024-global', 'Marin', 'Team Marin 1', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-alcatraz-2024-global', 'Marin', 'Alcatraz', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-san-quentin-2-2024-global', 'Marin', 'San Quentin 2', 2024, '', null, 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-dsx-2-2024-global', 'Marin', 'DSX 2', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-dsx-1-2024-global', 'Marin', 'DSX 1', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-dsx-2024-global', 'Marin', 'DSX', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-fairfax-2-2024-global', 'Marin', 'Fairfax 2', 2024, '', 'fitness', 'global', '{"model_year_evidence":"official Marin 2024 Archive collection result"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('marin-san-quentin-24-2025-global', 'Marin', 'San Quentin 24"', 2025, '', null, 'global', '{"model_year_evidence":"official Marin archive result explicitly labels this model 2025"}'::jsonb, 'https://marinbikes.com/collections/2024-archive', '2026-08-09'),
('yeti-sb165-2023-global', 'Yeti', 'SB165', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB165 2023-2026"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb165-2024-global', 'Yeti', 'SB165', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB165 2023-2026"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb165-2025-global', 'Yeti', 'SB165', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB165 2023-2026"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb165-2026-global', 'Yeti', 'SB165', 2026, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB165 2023-2026"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb140-29-2023-global', 'Yeti', 'SB140 29', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB140 29 2023-2025"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb140-29-2024-global', 'Yeti', 'SB140 29', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB140 29 2023-2025"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb140-29-2025-global', 'Yeti', 'SB140 29', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB140 29 2023-2025"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb120-2023-global', 'Yeti', 'SB120', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB120 2023-2025"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb120-2024-global', 'Yeti', 'SB120', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB120 2023-2025"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb120-2025-global', 'Yeti', 'SB120', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB120 2023-2025"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-160e-2022-global', 'Yeti', '160E', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels 160E 2022-2024"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-160e-2023-global', 'Yeti', '160E', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels 160E 2022-2024"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-160e-2024-global', 'Yeti', '160E', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels 160E 2022-2024"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb160-2023-global', 'Yeti', 'SB160', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB160 2023-2025"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb160-2024-global', 'Yeti', 'SB160', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB160 2023-2025"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb160-2025-global', 'Yeti', 'SB160', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB160 2023-2025"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb165-27-5-2020-global', 'Yeti', 'SB165 27.5', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB165 27.5 2020-2023","wheel_size":"27.5"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb165-27-5-2021-global', 'Yeti', 'SB165 27.5', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB165 27.5 2020-2023","wheel_size":"27.5"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb165-27-5-2022-global', 'Yeti', 'SB165 27.5', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB165 27.5 2020-2023","wheel_size":"27.5"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb165-27-5-2023-global', 'Yeti', 'SB165 27.5', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB165 27.5 2020-2023","wheel_size":"27.5"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb140-27-5-2020-global', 'Yeti', 'SB140 27.5', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB140 27.5 2020-2023","wheel_size":"27.5"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb140-27-5-2021-global', 'Yeti', 'SB140 27.5', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB140 27.5 2020-2023","wheel_size":"27.5"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb140-27-5-2022-global', 'Yeti', 'SB140 27.5', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB140 27.5 2020-2023","wheel_size":"27.5"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb140-27-5-2023-global', 'Yeti', 'SB140 27.5', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB140 27.5 2020-2023","wheel_size":"27.5"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb115-2021-global', 'Yeti', 'SB115', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB115 2021-2022"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb115-2022-global', 'Yeti', 'SB115', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB115 2021-2022"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb130-2020-global', 'Yeti', 'SB130', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB130 2020-2022"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb130-2021-global', 'Yeti', 'SB130', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB130 2020-2022"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb130-2022-global', 'Yeti', 'SB130', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB130 2020-2022"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb150-2020-global', 'Yeti', 'SB150', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB150 2020-2022"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb150-2021-global', 'Yeti', 'SB150', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB150 2020-2022"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb150-2022-global', 'Yeti', 'SB150', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB150 2020-2022"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('yeti-sb100-2020-global', 'Yeti', 'SB100', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official Yeti Bike Archive labels SB100 2020-2020"}'::jsonb, 'https://yeticycles.com/en-us/archive', '2026-08-09'),
('focus-jam-alu-2022-global', 'FOCUS', 'JAM ALU', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2025"}'::jsonb, 'https://www.focus-bikes.com/int/archive/bikes/jam/pdp-jam-alu-2022-2025', '2026-08-09'),
('focus-jam-alu-2023-global', 'FOCUS', 'JAM ALU', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2025"}'::jsonb, 'https://www.focus-bikes.com/int/archive/bikes/jam/pdp-jam-alu-2022-2025', '2026-08-09'),
('focus-jam-alu-2024-global', 'FOCUS', 'JAM ALU', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2025"}'::jsonb, 'https://www.focus-bikes.com/int/archive/bikes/jam/pdp-jam-alu-2022-2025', '2026-08-09'),
('focus-jam-alu-2025-global', 'FOCUS', 'JAM ALU', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2025"}'::jsonb, 'https://www.focus-bikes.com/int/archive/bikes/jam/pdp-jam-alu-2022-2025', '2026-08-09'),
('focus-jam-alu-ltd-2021-global', 'FOCUS', 'JAM ALU LTD', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2021-2021"}'::jsonb, 'https://www.focus-bikes.com/int/archive/bikes/jam', '2026-08-09'),
('focus-jam-carbon-2020-global', 'FOCUS', 'JAM CARBON', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2021"}'::jsonb, 'https://www.focus-bikes.com/int/archive/bikes/jam', '2026-08-09'),
('focus-jam-carbon-2021-global', 'FOCUS', 'JAM CARBON', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2021"}'::jsonb, 'https://www.focus-bikes.com/int/archive/bikes/jam', '2026-08-09'),
('focus-jam-carbon-2022-global', 'FOCUS', 'JAM CARBON', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2022"}'::jsonb, 'https://www.focus-bikes.com/int/archive/bikes/jam', '2026-08-09'),
('focus-focus-sam2-bosch-2023-global', 'FOCUS', 'FOCUS SAM² Bosch', 2023, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2023-2024"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/focus-sam', '2026-08-09'),
('focus-focus-sam2-bosch-2024-global', 'FOCUS', 'FOCUS SAM² Bosch', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2023-2024"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/focus-sam', '2026-08-09'),
('focus-focus-sam2-bosch-2021-global', 'FOCUS', 'FOCUS SAM² Bosch', 2021, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2021-2022"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/focus-sam', '2026-08-09'),
('focus-focus-sam2-bosch-2022-global', 'FOCUS', 'FOCUS SAM² Bosch', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2021-2022"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/focus-sam', '2026-08-09'),
('focus-focus-sam2-shimano-2020-global', 'FOCUS', 'FOCUS SAM² Shimano', 2020, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2020"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/focus-sam', '2026-08-09'),
('focus-thron2-bosch-2022-global', 'FOCUS', 'THRON² Bosch', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2024"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/thron/pdp-thron-2022-2024-bosch', '2026-08-09'),
('focus-thron2-bosch-2023-global', 'FOCUS', 'THRON² Bosch', 2023, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2024"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/thron/pdp-thron-2022-2024-bosch', '2026-08-09'),
('focus-thron2-bosch-2024-global', 'FOCUS', 'THRON² Bosch', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2024"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/thron/pdp-thron-2022-2024-bosch', '2026-08-09'),
('focus-thron2-eqp-bosch-2022-global', 'FOCUS', 'THRON² EQP Bosch', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2024"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/thron/pdp-thron-eqp-2022-2024-bosch', '2026-08-09'),
('focus-thron2-eqp-bosch-2023-global', 'FOCUS', 'THRON² EQP Bosch', 2023, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2024"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/thron/pdp-thron-eqp-2022-2024-bosch', '2026-08-09'),
('focus-thron2-eqp-bosch-2024-global', 'FOCUS', 'THRON² EQP Bosch', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2022-2024"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/thron/pdp-thron-eqp-2022-2024-bosch', '2026-08-09'),
('focus-jarifa2-bosch-2020-global', 'FOCUS', 'JARIFA² Bosch', 2020, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2022"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/jarifa/pdp-jarifa-2020-2022-bosch', '2026-08-09'),
('focus-jarifa2-bosch-2021-global', 'FOCUS', 'JARIFA² Bosch', 2021, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2022"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/jarifa/pdp-jarifa-2020-2022-bosch', '2026-08-09'),
('focus-jarifa2-bosch-2022-global', 'FOCUS', 'JARIFA² Bosch', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2022"}'::jsonb, 'https://www.focus-bikes.com/int/archive/e-bikes/jarifa/pdp-jarifa-2020-2022-bosch', '2026-08-09'),
('focus-atlas-6-series-2020-global', 'FOCUS', 'ATLAS 6 series', 2020, '', null, 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2025"}'::jsonb, 'https://www.focus-bikes.com/de_de/archive/bikes/atlas/pdp-atlas-6-series-2020-2025', '2026-08-09'),
('focus-atlas-6-series-2021-global', 'FOCUS', 'ATLAS 6 series', 2021, '', null, 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2025"}'::jsonb, 'https://www.focus-bikes.com/de_de/archive/bikes/atlas/pdp-atlas-6-series-2020-2025', '2026-08-09'),
('focus-atlas-6-series-2022-global', 'FOCUS', 'ATLAS 6 series', 2022, '', null, 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2025"}'::jsonb, 'https://www.focus-bikes.com/de_de/archive/bikes/atlas/pdp-atlas-6-series-2020-2025', '2026-08-09'),
('focus-atlas-6-series-2023-global', 'FOCUS', 'ATLAS 6 series', 2023, '', null, 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2025"}'::jsonb, 'https://www.focus-bikes.com/de_de/archive/bikes/atlas/pdp-atlas-6-series-2020-2025', '2026-08-09'),
('focus-atlas-6-series-2024-global', 'FOCUS', 'ATLAS 6 series', 2024, '', null, 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2025"}'::jsonb, 'https://www.focus-bikes.com/de_de/archive/bikes/atlas/pdp-atlas-6-series-2020-2025', '2026-08-09'),
('focus-atlas-6-series-2025-global', 'FOCUS', 'ATLAS 6 series', 2025, '', null, 'global', '{"model_year_evidence":"official FOCUS archive page labels this generation 2020-2025"}'::jsonb, 'https://www.focus-bikes.com/de_de/archive/bikes/atlas/pdp-atlas-6-series-2020-2025', '2026-08-09'),
('corratec-allroad-travel-eq-2026-global', 'Corratec', 'Allroad Travel EQ', 2026, '', 'gravel', 'global', '{"model_year_evidence":"official exact Corratec product page explicitly states model year 2026","frame_material":"aluminium","wheel_size":"700c / 622","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 2x10","rear_derailleur":"Shimano RD-U6020","cassette":"Shimano CS-LG300-10 11-39T","chain":"Shimano CN-LG500","brakes":"Shimano BR-U6030 160/160 mm","fork":"Allroad aluminium fork","weight_kg":13.95}'::jsonb, 'https://www.corratec.com/en/Bike-Archive/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-09'),
('corratec-revo-bow-ilink-sl-pro-2026-global', 'Corratec', 'Revo Bow iLink SL Pro', 2026, '', 'xc_full_suspension', 'global', '{"model_year_evidence":"official exact Corratec product page explicitly states model year 2026","frame_material":"carbon","wheel_size":"29","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 Eagle AXS Transmission 1x12","rear_derailleur":"SRAM X0 Eagle AXS T-Type","cassette":"SRAM XS-1275 T-Type 10-52T","brakes":"SRAM Level Silver Stealth 4-piston 180/160 mm","fork":"RockShox SID Select 3P 120 mm","rear_shock":"RockShox SID Select+ 190x45","weight_kg":12.7}'::jsonb, 'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html', '2026-08-09')
on conflict (brand, model, model_year, trim, market) do update set
  category = coalesce(public.bike_catalog_models.category, excluded.category),
  specs = excluded.specs || public.bike_catalog_models.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = greatest(public.bike_catalog_models.evidence_checked_at, excluded.evidence_checked_at),
  enabled = true;

-- SOURCE: supabase/schema/catalog_enrichment_wave_15_corratec_cues_2026_08_09.sql
begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  (
    'shimano-rd-u6020-10', 'Shimano', 'RD-U6020-10', 'rear_derailleur', 'CUES RD-U6020-10',
    '{"speeds":10,"system":"CUES LINKGLIDE","drivetrain":"2x10","total_capacity_t":44,"largest_sprocket_t":39}'::jsonb,
    1, 'https://productinfo.shimano.com/en/product/RD-U6020-10', '2026-08-09', true
  ),
  (
    'shimano-cs-lg300-10', 'Shimano', 'CS-LG300-10', 'cassette', 'CUES CS-LG300-10 11-39T',
    '{"speeds":10,"system":"LINKGLIDE","range":"11-39T","compatible_chain":"LINKGLIDE / HG 11-speed"}'::jsonb,
    1, 'https://productinfo.shimano.com/en/product/CS-LG300-10', '2026-08-09', true
  ),
  (
    'shimano-cn-lg500', 'Shimano', 'CN-LG500', 'chain', 'LINKGLIDE CN-LG500',
    '{"system":"LINKGLIDE","speeds":[9,10,11],"e_bike_compatible":true}'::jsonb,
    1, 'https://productinfo.shimano.com/en/product/CN-LG500', '2026-08-09', true
  ),
  (
    'shimano-br-u6030-r', 'Shimano', 'BR-U6030-R', 'brake_caliper', 'CUES BR-U6030-R',
    '{"brake_type":"hydraulic_disc","position":"rear","series":"CUES","hose":"SM-BH59-JK-SSR"}'::jsonb,
    1, 'https://productinfo.shimano.com/en/product/BR-U6030-R', '2026-08-09', true
  )
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  (
    'shimano-rd-u6020-10', 'shimano-cs-lg300-10', 'compatible',
    'Shimano CUES 2x10 compatibility lists RD-U6020-10 with CS-LG300-10 11-39T.',
    'https://productinfo.shimano.com/en/compatibility/C-454', '2026-08-09'
  ),
  (
    'shimano-cs-lg300-10', 'shimano-cn-lg500', 'compatible',
    'Shimano CUES 2x10 compatibility lists CS-LG300-10 with CN-LG500.',
    'https://productinfo.shimano.com/en/compatibility/C-454', '2026-08-09'
  )
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  (
    'corratec-allroad-travel-eq-2026-global', 'shimano-rd-u6020-10', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-09',
    'Official Corratec exact build lists Shimano RD-U6020 CUES 10-speed.'
  ),
  (
    'corratec-allroad-travel-eq-2026-global', 'shimano-cs-lg300-10', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-09',
    'Official Corratec exact build lists Shimano CS-LG300-10 11-39T.'
  ),
  (
    'corratec-allroad-travel-eq-2026-global', 'shimano-cn-lg500', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-09',
    'Official Corratec exact build lists Shimano CN-LG500.'
  ),
  (
    'corratec-allroad-travel-eq-2026-global', 'shimano-br-u6030-r', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-09',
    'Official Corratec exact build lists rear Shimano BR-U6030 hydraulic brake.'
  ),
  (
    'corratec-revo-bow-ilink-sl-pro-2026-global', 'sram-rd-x0-e-b1', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html', '2026-08-09',
    'Official Corratec exact build lists SRAM X0 Eagle AXS T-Type rear shifting.'
  ),
  (
    'corratec-revo-bow-ilink-sl-pro-2026-global', 'sram-cs-xs-1275-a1', 'factory_installed',
    'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html', '2026-08-09',
    'Official Corratec exact build lists SRAM XS-1275 T-Type 10-52T cassette.'
  )
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;

-- SOURCE: catalog-harvester/batches/wave16.json
insert into public.bike_catalog_models
  (id, brand, model, model_year, trim, category, market, specs, manufacturer_url, evidence_checked_at)
values
('rose-ground-control-2020-global', 'ROSE', 'Ground Control', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Ground Control 2020-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-ground-control-2021-global', 'ROSE', 'Ground Control', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Ground Control 2020-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-ground-control-2022-global', 'ROSE', 'Ground Control', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Ground Control 2020-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-ground-control-2023-global', 'ROSE', 'Ground Control', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Ground Control 2020-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-ground-control-2024-global', 'ROSE', 'Ground Control', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Ground Control 2020-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-root-miller-2020-global', 'ROSE', 'Root Miller', 2020, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Root Miller 2020-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-root-miller-2021-global', 'ROSE', 'Root Miller', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Root Miller 2020-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-root-miller-2022-global', 'ROSE', 'Root Miller', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Root Miller 2020-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-root-miller-2023-global', 'ROSE', 'Root Miller', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Root Miller 2020-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-root-miller-2024-global', 'ROSE', 'Root Miller', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Root Miller 2020-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-bonero-2022-global', 'ROSE', 'Bonero', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Bonero 2022-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-bonero-2023-global', 'ROSE', 'Bonero', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Bonero 2022-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-bonero-2024-global', 'ROSE', 'Bonero', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official ROSE frame-details index labels Bonero 2022-2024"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-backroad-al-2025-global', 'ROSE', 'Backroad AL', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official ROSE frame-details index explicitly labels Backroad AL 2025"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-backroad-cf-2025-global', 'ROSE', 'Backroad CF', 2025, '', 'gravel', 'global', '{"model_year_evidence":"official ROSE frame-details index explicitly labels Backroad CF 2025"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-xtra-watt-evo-2021-global', 'ROSE', 'Xtra Watt Evo', 2021, '', 'e_bike', 'global', '{"model_year_evidence":"official ROSE frame-details index explicitly labels Xtra Watt Evo 2021"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('rose-xtra-watt-evo-2025-global', 'ROSE', 'Xtra Watt Evo', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official ROSE frame-details index explicitly labels Xtra Watt Evo 2025"}'::jsonb, 'https://www.rosebikes.com/support/manuals', '2026-08-09'),
('lapierre-e-explorer-5-5-low-2026-global', 'Lapierre', 'E-Explorer 5.5 Low', 2026, '', 'e_bike', 'global', '{"model_year_evidence":"official exact Lapierre product description explicitly states E-Explorer 5.5 Low 2026","frame_material":"aluminium","wheel_size":"27.5","motor":"Bosch Performance Line 75 Nm","battery":"Bosch 540 Wh","drivetrain":"Shimano CUES 9-speed","rear_derailleur":"Shimano CUES RD-U3020-9","cassette":"Shimano CUES CS-LG300-9","chain":"KMC eGlide EPT 9-11s","fork":"Suntour XCM32-Boost RL DS 100 mm","brakes":"Tektro HD-M280 2-piston 203/203 mm"}'::jsonb, 'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09'),
('lapierre-e-explorer-6-5-low-2026-global', 'Lapierre', 'E-Explorer 6.5 Low', 2026, '', 'e_bike', 'global', '{"model_year_evidence":"official exact Lapierre product description explicitly states E-Explorer 6.5 Low 2026","frame_material":"aluminium","wheel_size":"27.5","motor":"Bosch Performance Line PX 75 Nm","battery":"Bosch PowerTube 500 Wh","drivetrain":"Shimano Deore/CUES 9-speed","rear_derailleur":"Shimano CUES RD-U3020-9","cassette":"Shimano CUES CS-LG300-9","chain":"KMC eGlide EPT 9-11s","fork":"Suntour XCM32-Boost RL DS 110 mm","brakes":"Tektro HD-M280 2-piston 203/203 mm"}'::jsonb, 'https://lapierrebikes.com/en-int/products/e-explorer-65-llcub', '2026-08-09'),
('lapierre-xelius-drs-team-replica-2026-global', 'Lapierre', 'Xelius DRS Team Replica', 2026, '', 'road', 'global', '{"model_year_evidence":"official exact Lapierre page explicitly describes the 2026 Team Replica design","frame_material":"carbon","drivetrain":"Shimano Dura-Ace Di2 12-speed","wheels":"Ursus Proxima 40","weight_kg":7.25}'::jsonb, 'https://lapierrebikes.com/en-int/pages/bikes/xelius-drs-team-replica', '2026-08-09'),
('ghost-e-riot-2025-global', 'GHOST', 'E-Riot', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2025"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-path-asket-2025-global', 'GHOST', 'Path Asket', 2025, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2025"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-poacha-2025-global', 'GHOST', 'Poacha', 2025, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2025"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-riot-2024-global', 'GHOST', 'E-Riot', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-asx-2024-global', 'GHOST', 'E-ASX', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-teru-pro-advanced-2024-global', 'GHOST', 'E-Teru Pro Advanced', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-teru-universal-2024-global', 'GHOST', 'E-Teru Universal', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-teru-essential-2024-global', 'GHOST', 'E-Teru Essential', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-lector-2024-global', 'GHOST', 'Lector', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-lector-fs-2024-global', 'GHOST', 'Lector FS', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-nirvana-4x-2024-global', 'GHOST', 'Nirvana 4X', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-nirvana-tour-2024-global', 'GHOST', 'Nirvana Tour', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-nirvana-trail-2024-global', 'GHOST', 'Nirvana Trail', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-riot-al-2024-global', 'GHOST', 'Riot AL', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-riot-cf-2024-global', 'GHOST', 'Riot CF', 2024, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-path-riot-2024-global', 'GHOST', 'Path Riot', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-asket-al-2024-global', 'GHOST', 'Asket AL', 2024, '', 'gravel', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-path-asket-2024-global', 'GHOST', 'Path Asket', 2024, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2024"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-riot-750wh-2023-global', 'GHOST', 'E-Riot 750WH', 2023, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-asx-2023-global', 'GHOST', 'E-ASX', 2023, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-teru-essential-2023-global', 'GHOST', 'E-Teru Essential', 2023, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-teru-pro-advanced-2023-global', 'GHOST', 'E-Teru Pro Advanced', 2023, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-kato-fs-2023-global', 'GHOST', 'Kato FS', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-kato-lanao-2023-global', 'GHOST', 'Kato / Lanao', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-lector-fs-sf-2023-global', 'GHOST', 'Lector FS SF', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-lector-sf-2023-global', 'GHOST', 'Lector SF', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-nirvana-4x-2023-global', 'GHOST', 'Nirvana 4X', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-nirvana-tour-2023-global', 'GHOST', 'Nirvana Tour', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-nirvana-trail-2023-global', 'GHOST', 'Nirvana Trail', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-riot-al-2023-global', 'GHOST', 'Riot AL', 2023, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-path-riot-2023-global', 'GHOST', 'Path Riot', 2023, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-asket-al-2023-global', 'GHOST', 'Asket AL', 2023, '', 'gravel', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-path-asket-2023-global', 'GHOST', 'Path Asket', 2023, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2023"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-lector-sf-2022-global', 'GHOST', 'Lector SF', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-lector-fs-sf-2022-global', 'GHOST', 'Lector FS SF', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-kato-fs-2022-global', 'GHOST', 'Kato FS', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-nirvana-4x-2022-global', 'GHOST', 'Nirvana 4X', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-nirvana-trail-2022-global', 'GHOST', 'Nirvana Trail', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-road-rage-al-2022-global', 'GHOST', 'Road Rage AL', 2022, '', 'gravel', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-asx-essential-2022-global', 'GHOST', 'E-ASX Essential', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-asx-universal-advanced-2022-global', 'GHOST', 'E-ASX Universal Advanced', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-riot-al-2022-global', 'GHOST', 'E-Riot AL', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-riot-cf-2022-global', 'GHOST', 'E-Riot CF', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-teru-essential-low-eq-2022-global', 'GHOST', 'E-Teru Essential Low EQ', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-teru-essential-mid-eq-2022-global', 'GHOST', 'E-Teru Essential Mid EQ', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-teru-universal-low-eq-2022-global', 'GHOST', 'E-Teru Universal Low EQ', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-teru-universal-eq-2022-global', 'GHOST', 'E-Teru Universal EQ', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-e-teru-pro-advanced-2022-global', 'GHOST', 'E-Teru Pro Advanced', 2022, '', 'e_bike', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-riot-2022-global', 'GHOST', 'Riot', 2022, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2022"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09'),
('ghost-nirvana-tour-2021-global', 'GHOST', 'Nirvana Tour', 2021, '', 'mountain', 'global', '{"model_year_evidence":"official GHOST exploded-drawings index lists this model under 2021 and labels it MY21"}'::jsonb, 'https://ghost-bikes.com/en-es/pages/downloads/exploded-drawings', '2026-08-09')
on conflict (brand, model, model_year, trim, market) do update set
  category = coalesce(public.bike_catalog_models.category, excluded.category),
  specs = excluded.specs || public.bike_catalog_models.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = greatest(public.bike_catalog_models.evidence_checked_at, excluded.evidence_checked_at),
  enabled = true;

-- SOURCE: supabase/schema/catalog_enrichment_wave_16_lapierre_cues_2026_08_09.sql
begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  (
    'shimano-rd-u3020-9', 'Shimano', 'RD-U3020-9', 'rear_derailleur', 'CUES RD-U3020 9-speed',
    '{"speeds":9,"system":"CUES LINKGLIDE","drivetrain":"2x9","largest_sprocket_t":36}'::jsonb,
    1, 'https://productinfo.shimano.com/en/lineup/cues-u4000-2x9', '2026-08-09', true
  ),
  (
    'shimano-cs-lg300-9', 'Shimano', 'CS-LG300-9', 'cassette', 'LINKGLIDE CS-LG300-9',
    '{"speeds":9,"system":"LINKGLIDE","compatible_chain":"LINKGLIDE / HG 11-speed","factory_fitment_range":"11-36T"}'::jsonb,
    1, 'https://bike.shimano.com/en-SG/products/components/pdp.P-CS-LG300-9.html', '2026-08-09', true
  ),
  (
    'kmc-eglide-ept-9-11', 'KMC', 'eGlide EPT 9-11s', 'chain', 'KMC eGlide EPT 9-11s',
    '{"speeds":[9,10,11],"coating":"EPT","e_bike_compatible":true}'::jsonb,
    1, 'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09', true
  ),
  (
    'tektro-hd-m280', 'Tektro', 'HD-M280', 'brake_caliper', 'Tektro HD-M280',
    '{"brake_type":"hydraulic_disc","pistons":2,"factory_rotor_mm":203}'::jsonb,
    1, 'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09', true
  )
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  (
    'shimano-rd-u3020-9', 'shimano-cs-lg300-9', 'compatible',
    'Shimano CUES 2x9 lineup pairs RD-U3020 with CS-LG300-9; the compatibility chart limits this derailleur to the 11-36T cassette variant.',
    'https://productinfo.shimano.com/en/lineup/cues-u4000-2x9', '2026-08-09'
  )
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  (
    'lapierre-e-explorer-5-5-low-2026-global', 'shimano-rd-u3020-9', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09',
    'Official exact Lapierre specification lists Shimano CUES RD-U3020-9.'
  ),
  (
    'lapierre-e-explorer-5-5-low-2026-global', 'shimano-cs-lg300-9', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09',
    'Official exact Lapierre specification lists Shimano CUES CS-LG300-9.'
  ),
  (
    'lapierre-e-explorer-5-5-low-2026-global', 'kmc-eglide-ept-9-11', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09',
    'Official exact Lapierre specification lists KMC eGlide EPT 9-11s.'
  ),
  (
    'lapierre-e-explorer-5-5-low-2026-global', 'tektro-hd-m280', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-09',
    'Official exact Lapierre specification lists Tektro HD-M280 front and rear brakes.'
  ),
  (
    'lapierre-e-explorer-6-5-low-2026-global', 'shimano-rd-u3020-9', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-65-llcub', '2026-08-09',
    'Official exact Lapierre specification lists Shimano CUES RD-U3020-9.'
  ),
  (
    'lapierre-e-explorer-6-5-low-2026-global', 'shimano-cs-lg300-9', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-65-llcub', '2026-08-09',
    'Official exact Lapierre specification lists Shimano CUES CS-LG300-9.'
  ),
  (
    'lapierre-e-explorer-6-5-low-2026-global', 'kmc-eglide-ept-9-11', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-65-llcub', '2026-08-09',
    'Official exact Lapierre specification lists KMC eGlide EPT 9-11s.'
  ),
  (
    'lapierre-e-explorer-6-5-low-2026-global', 'tektro-hd-m280', 'factory_installed',
    'https://lapierrebikes.com/en-int/products/e-explorer-65-llcub', '2026-08-09',
    'Official exact Lapierre specification lists Tektro HD-M280 front and rear brakes.'
  )
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;

-- SOURCE: supabase/schema/catalog_enrichment_wave_17_exact_product_pilot_2026_08_11.sql
-- VeloQuest catalog enrichment wave 17.
-- Exact first-party product pages only. Missing fields remain unknown and no
-- component identity is inferred from a family or marketing name.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Advanced-grade composite","wheel_size":"700c","fork":"Advanced-grade composite full-composite OverDrive steerer","drivetrain_brand":"Shimano","drivetrain":"Shimano 105 2x12","groupset":"Shimano 105","rear_derailleur":"Shimano 105","cassette":"Shimano 105 11-36T","crankset":"Shimano 105 50/34T","bottom_bracket":"Shimano press fit","brake_type":"hydraulic_disc","brakes":"Shimano 105 hydraulic; SM-RT64 160/160 mm rotors","wheelset":"Giant P-R1 Disc alloy","hubs":"Giant alloy 12 mm thru-axle","tires":"Giant Gavia Fondo 1 tubeless 700x32c","max_tire_clearance_mm":40,"spec_evidence":"official Giant exact 2026 product specification"}'::jsonb,
    manufacturer_url = 'https://www.giant-bicycles.com/us/defy-advanced-2',
    evidence_checked_at = '2026-08-11'
where id = 'giant-defy-advanced-2-2026-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminium 6066 T4/T6","wheel_size":"29 front / 27.5 rear","front_travel_mm":170,"rear_travel_mm":165,"fork":"FOX 38 Factory 170 mm","rear_shock":"FOX Float X2 Factory 230x65 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM Eagle 90 / GX T-Type 1x12","rear_derailleur":"SRAM Eagle 90 12-speed","cassette":"SRAM GX T-Type 10-52T 12-speed","crankset":"SRAM X0 T-Type 32T","bottom_bracket":"SRAM DUB92 MTB Wide press fit","brake_type":"hydraulic_disc","brakes":"Shimano XT 4-piston; MT905 203 mm rotors","wheelset":"DT Swiss EX1700 29/27.5","hubs":"DT Swiss 350 15x110 front / 12x148 rear","tires":"Maxxis Assegai 29x2.5 front / DHR II 27.5x2.5 rear","weight_kg":16.3,"spec_evidence":"official COMMENCAL exact 2026 product specification"}'::jsonb,
    manufacturer_url = 'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US',
    evidence_checked_at = '2026-08-11'
where id = 'commencal-meta-sx-v5-signature-2026-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminium 6061-T6","wheel_size":"29 front / 27.5 rear","front_travel_mm":160,"rear_travel_mm":140,"fork":"RockShox Lyrik Select 160 mm","rear_shock":"RockShox Super Deluxe 210x55 mm","motor":"Panasonic GXM AMXXPRO","motor_torque_nm":105,"battery_wh":900,"drivetrain_brand":"Shimano","drivetrain":"Shimano Deore XT Di2 M8250 1x12","rear_derailleur":"Shimano Deore XT Di2 M8250","cassette":"Shimano CS-M7100-12 10-51T","crankset":"Miranda 34T 170 mm","brake_type":"hydraulic_disc","brakes":"Shimano Deore XT M8120; Galfer 203/203 mm rotors","hubs":"Shimano Deore XT M8210-B","wheelset":"DT Swiss H 552 29/27.5","tires":"Schwalbe Albert 29x2.5 front / 27.5x2.5 rear","weight_kg":22.98,"spec_evidence":"official Kellys exact 2026 product specification"}'::jsonb,
    manufacturer_url = 'https://kellysbike.com/e-fullsuspension/theos-rs90-p-royal-purple-29-27-5-900-wh_11011',
    evidence_checked_at = '2026-08-11'
where id = 'kellys-theos-rs90-p-royal-purple-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Gravelator Premium Carbon R6990","wheel_size":"700c","fork":"Gravel Carbon Fork F18 Race","drivetrain_brand":"SRAM","drivetrain":"SRAM RED XPLR AXS 1x13","rear_derailleur":"SRAM RED XPLR AXS 13-speed","cassette":"SRAM RED XPLR XG-1391 10-46T","crankset":"SRAM RED XPLR AXS 42T","brake_type":"hydraulic_disc","brakes":"SRAM RED AXS HRD; Paceline-X Center Lock 160/160 mm","wheelset":"Zipp 303 XPLR SW","tires":"Goodyear XPLR Intermediate 45-622","weight_kg":7.8,"spec_evidence":"official KTM exact 2026 product specification"}'::jsonb,
    manufacturer_url = 'https://www.ktm-bikes.at/bikes/detail/mx1260460115-gravelator-exonic-m-55-mx1260460115-gravelator-exonic-spotted-white-ornge-blk-grey-1x13-sram-red-xplr-axs-2026',
    evidence_checked_at = '2026-08-11'
where id = 'ktm-gravelator-exonic-2026-global';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('giant-defy-advanced-2-2026-us',
   'https://images2.giant-bicycles.com/b_white%2Cc_pad%2Ch_100%2Cq_90%2Cw_100/ln09xatfxrvyqelva1lt/MY26DefyAdvanced2_ColorAAbyssBlack.jpg',
   'manufacturer', 'Giant', 'https://www.giant-bicycles.com/us/defy-advanced-2', 10, '2026-08-11', true)
on conflict (bike_id, image_url) do update set
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_page_url = excluded.source_page_url,
  priority = excluded.priority,
  checked_at = excluded.checked_at,
  enabled = true;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('kellys-theos-rs90-p-royal-purple-2026-global', 'shimano-cs-m7100-12', 'factory_installed',
   'https://kellysbike.com/e-fullsuspension/theos-rs90-p-royal-purple-29-27-5-900-wh_11011', '2026-08-11',
   'Official exact Kellys specification lists Shimano CS-M7100-12 10-51T.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;

-- SOURCE: supabase/schema/catalog_enrichment_wave_18_specialized_exact_2026_08_11.sql
-- VeloQuest catalog enrichment wave 18.
-- Exact first-party Specialized product pages and first-party Shimano/SRAM
-- compatibility evidence only. Unknown identities remain unknown.

begin;

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 11m carbon","wheel_size":"29","front_travel_mm":130,"rear_travel_mm":120,"fork":"FOX 34 Performance Elite Grip X 130 mm","rear_shock":"FOX Float Performance Elite 190x45 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX AXS Transmission 1x12","rear_derailleur":"SRAM GX AXS Transmission","cassette":"SRAM XS-1275 10-52T 12-speed","crankset":"SRAM GX Eagle DUB 32T","bottom_bracket":"SRAM DUB Threaded Wide","brake_type":"hydraulic_disc","brakes":"SRAM Code Bronze Stealth 4-piston; 180/200 mm front, 180 mm rear","wheelset":"Roval Control carbon","hubs":"Industry Nine 1/1 15x110 front / 12x148 XD rear","tires":"Specialized Purgatory 29x2.4 front / Ground Control 29x2.35 rear","weight_kg":12.16,"spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/epic-8-evo-expert-sram-gx-axs-fox-performance-elite/p/4275710', evidence_checked_at = '2026-08-11'
where id = 'specialized-epic-8-evo-expert-sram-gx-axs-fox-performance-elite-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 9r carbon","wheel_size":"700c","fork":"Future Shock 2.0","drivetrain_brand":"SRAM","drivetrain":"SRAM Apex eTap AXS / X1 Eagle AXS 1x12","rear_derailleur":"SRAM X1 Eagle AXS","cassette":"SRAM PG-1210 11-50T 12-speed","crankset":"SRAM Apex DUB Wide 40T","bottom_bracket":"SRAM DUB BSA","brake_type":"hydraulic_disc","brakes":"SRAM Apex eTap AXS hydraulic disc","wheelset":"DT Swiss G540 tubeless-ready","tires":"Specialized Pathfinder Pro 2BR 700x42","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/diverge-comp-carbon-sram-apex-etap-axs/p/4223498', evidence_checked_at = '2026-08-11'
where id = 'specialized-diverge-comp-carbon-sram-apex-etap-axs-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 9r carbon","wheel_size":"700c","fork":"FACT carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano 105 mechanical 2x12","groupset":"Shimano 105","rear_derailleur":"Shimano 105 12-speed mechanical","cassette":"Shimano 105 11-34T 12-speed","crankset":"Shimano 105 52/36T","bottom_bracket":"Shimano threaded BSA","brake_type":"hydraulic_disc","brakes":"Shimano 105 hydraulic; 160 mm front / 140 mm rear","wheelset":"DT R470 Disc","tires":"Specialized Turbo Pro 700x26","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/tarmac-sl7-sport-shimano-105/p/4221542', evidence_checked_at = '2026-08-11'
where id = 'specialized-tarmac-sl7-sport-shimano-105-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 10r carbon","wheel_size":"700c","fork":"Future Shock 3.2 / FACT carbon","drivetrain_brand":"SRAM","drivetrain":"SRAM Rival eTap AXS 2x12","groupset":"SRAM Rival eTap AXS","rear_derailleur":"SRAM Rival eTap AXS 12-speed","cassette":"SRAM XG-1250 10-36T","crankset":"SRAM Rival AXS power 46/33T","bottom_bracket":"SRAM DUB BSA","brake_type":"hydraulic_disc","brakes":"SRAM Rival hydraulic; 160/160 mm","wheelset":"Roval Terra C carbon","hubs":"DT 370","tires":"S-Works Mondo 2BR 700x32c","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/roubaix-sl8-expert-sram-rival-etap-axs/p/4221821', evidence_checked_at = '2026-08-11'
where id = 'specialized-roubaix-sl8-expert-sram-rival-etap-axs-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"E5 Premium aluminum","wheel_size":"700c","fork":"S-Works FACT carbon","drivetrain_brand":"SRAM","drivetrain":"SRAM Apex XPLR mechanical 1x12","rear_derailleur":"SRAM Apex XPLR mechanical","cassette":"SRAM PG-1231 XPLR 11-44T","crankset":"SRAM Apex XPLR 40T","bottom_bracket":"SRAM DUB BSA 68 Wide","brake_type":"hydraulic_disc","brakes":"SRAM Apex hydraulic disc","wheelset":"DT G540 tubeless-ready","tires":"Specialized Pathfinder Pro 2BR 700x38","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/crux-dsw-comp-sram-apex-xplr/p/4221802', evidence_checked_at = '2026-08-11'
where id = 'specialized-crux-dsw-comp-sram-apex-xplr-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"M5 aluminum","wheel_size":"29","front_travel_mm":120,"rear_travel_mm":110,"fork":"RockShox SID Rush 120 mm","rear_shock":"RockShox Deluxe Select+ 190x40 mm","drivetrain_brand":"Shimano","drivetrain":"Shimano SLX M7100 / Deore M6100 1x12","rear_derailleur":"Shimano SLX RD-M7100-SGS","cassette":"Shimano Deore CS-M6100-12 10-51T","crankset":"Shimano MT-511 32T","bottom_bracket":"Shimano BB-MT501 BSA","brake_type":"hydraulic_disc","brakes":"Shimano M6100 2-piston; 180 mm front / 160 mm rear","wheelset":"Specialized alloy tubeless-ready 27 mm","hubs":"Shimano MT410-B Micro Spline","tires":"Specialized Ground Control 29x2.35 front / Fast Trak 29x2.35 rear","weight_kg":12.86,"spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/chisel-comp-shimano/p/4274028', evidence_checked_at = '2026-08-11'
where id = 'specialized-chisel-comp-shimano-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 10r carbon","wheel_size":"700c","fork":"Tarmac SL8 FACT 10r carbon","drivetrain_brand":"SRAM","drivetrain":"SRAM Force eTap AXS 2x12","groupset":"SRAM Force eTap AXS","rear_derailleur":"SRAM Force eTap AXS 12-speed","cassette":"SRAM Force 10-33T 12-speed","crankset":"SRAM Force DUB power 48/35T","bottom_bracket":"SRAM DUB BSA 68","brake_type":"hydraulic_disc","brakes":"SRAM Force eTap AXS hydraulic; 160/160 mm","wheelset":"Roval Rapide CL II carbon","hubs":"DT Swiss 350","tires":"S-Works Turbo 2BR 700x26","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/tarmac-sl8-pro-sram-force-etap-axs/p/4221537', evidence_checked_at = '2026-08-11'
where id = 'specialized-tarmac-sl8-pro-sram-force-etap-axs-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 10r carbon","wheel_size":"700c","fork":"FACT 10r carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Ultegra Di2 R8150 2x12","groupset":"Shimano Ultegra Di2","rear_derailleur":"Shimano RD-R8150 Di2","cassette":"Shimano Ultegra 12-speed 11-30T","crankset":"Shimano Ultegra R8100 52/36T with 4iiii power meter","bottom_bracket":"Shimano threaded BSA","brake_type":"hydraulic_disc","brakes":"Shimano Ultegra R8170 hydraulic; 160 mm front / 140 mm rear","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935', evidence_checked_at = '2026-08-11'
where id = 'specialized-tarmac-sl8-pro-shimano-ultegra-di2-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 12r carbon","wheel_size":"700c","fork":"S-Works FACT 12r carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Dura-Ace Di2 R9250 2x12","groupset":"Shimano Dura-Ace Di2","rear_derailleur":"Shimano RD-R9250 Di2","cassette":"Shimano Dura-Ace 12-speed 11-30T","crankset":"Shimano Dura-Ace R9200 52/36T with 4iiii power meter","bottom_bracket":"Shimano Dura-Ace BB-R9200","brake_type":"hydraulic_disc","brakes":"Shimano Dura-Ace R9270 hydraulic; 160 mm front / 140 mm rear","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221536', evidence_checked_at = '2026-08-11'
where id = 'specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 10r carbon","wheel_size":"700c","fork":"FACT 10r carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Ultegra Di2 R8150 2x12","groupset":"Shimano Ultegra Di2","rear_derailleur":"Shimano RD-R8150 Di2","cassette":"Shimano Ultegra 12-speed 11-30T","crankset":"Shimano Ultegra R8100 52/36T","bottom_bracket":"Shimano threaded BSA","brake_type":"hydraulic_disc","brakes":"Shimano Ultegra R8170 hydraulic; 160 mm front / 140 mm rear","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/tarmac-sl8-expert-shimano-ultegra-di2/p/4276209', evidence_checked_at = '2026-08-11'
where id = 'specialized-tarmac-sl8-expert-shimano-ultegra-di2-2025-global';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('specialized-diverge-comp-carbon-sram-apex-etap-axs-2025-global','https://assets.specialized.com/i/specialized/95425-50_DIVERGE-COMP-CARBON-BRCH-WHT_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/diverge-comp-carbon-sram-apex-etap-axs/p/4223498',10,'2026-08-11',true),
  ('specialized-tarmac-sl7-sport-shimano-105-2025-global','https://assets.specialized.com/i/specialized/90623-60_TARMAC-SL7-SPORT-CARB-METDKNVY_HERO?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/tarmac-sl7-sport-shimano-105/p/4221542',10,'2026-08-11',true),
  ('specialized-roubaix-sl8-expert-sram-rival-etap-axs-2025-global','https://assets.specialized.com/i/specialized/94425-31_ROUBAIX-EXPERT-VLTPRL-SILDST_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/roubaix-sl8-expert-sram-rival-etap-axs/p/4221821',10,'2026-08-11',true),
  ('specialized-crux-dsw-comp-sram-apex-xplr-2025-global','https://assets.specialized.com/i/specialized/91425-52_CRUX-DSW-COMP-BRCH-CLY_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/crux-dsw-comp-sram-apex-xplr/p/4221802',10,'2026-08-11',true),
  ('specialized-chisel-comp-shimano-2025-global','https://assets.specialized.com/i/specialized/93825-51_CHISEL-COMP-SHIMANO-DKMOS-LQDMET_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/chisel-comp-shimano/p/4274028',10,'2026-08-11',true),
  ('specialized-tarmac-sl8-pro-sram-force-etap-axs-2025-global','https://assets.specialized.com/i/specialized/94925-10_TARMAC-SL8-PRO-ETAP-CARB-METWHTSIL_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/tarmac-sl8-pro-sram-force-etap-axs/p/4221537',10,'2026-08-11',true),
  ('specialized-tarmac-sl8-pro-shimano-ultegra-di2-2025-global','https://assets.specialized.com/i/specialized/94925-13_TARMAC-SL8-PRO-UDI2-LQDMET-BLUPRL-BLKLQDMET_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935',10,'2026-08-11',true),
  ('specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2025-global','https://assets.specialized.com/i/specialized/94925-01_TARMAC-SL8-SW-DI2-SLDMET-REDPRL-METWHTSIL_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221536',10,'2026-08-11',true),
  ('specialized-tarmac-sl8-expert-shimano-ultegra-di2-2025-global','https://assets.specialized.com/i/specialized/94925-32_TARMAC-SL8-EXPERT-DI2-DPLAKEMET-GRNPRL_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/tarmac-sl8-expert-shimano-ultegra-di2/p/4276209',10,'2026-08-11',true)
on conflict (bike_id, image_url) do update set source_page_url=excluded.source_page_url, priority=excluded.priority, checked_at=excluded.checked_at, enabled=true;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('shimano-rd-r8150','Shimano','RD-R8150','rear_derailleur','Ultegra Di2 RD-R8150','{"speeds":12,"largest_sprocket_range":"30-34T"}'::jsonb,4,'https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11'),
  ('shimano-rd-r9250','Shimano','RD-R9250','rear_derailleur','Dura-Ace Di2 RD-R9250','{"speeds":12,"largest_sprocket_range":"30-34T"}'::jsonb,5,'https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11'),
  ('shimano-cs-r8101-12-11-34','Shimano','CS-R8101-12 11-34T','cassette','Ultegra CS-R8101-12 11-34T','{"speeds":12,"range":"11-34T","freehub":"HG spline L2"}'::jsonb,4,'https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11'),
  ('shimano-cs-r9200-12-11-34','Shimano','CS-R9200-12 11-34T','cassette','Dura-Ace CS-R9200-12 11-34T','{"speeds":12,"range":"11-34T","freehub":"HG spline L2"}'::jsonb,5,'https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11')
on conflict (id) do update set specs=excluded.specs, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, enabled=true;

insert into public.garage_compatibility
  (source_component_id,target_component_id,status,rule_summary,evidence_url,evidence_checked_at)
values
  ('shimano-rd-r8150','shimano-cs-r8101-12-11-34','compatible','Shimano C-454 lists RD-R8150 with 11-34T 12-speed road cassettes.','https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11'),
  ('shimano-rd-r9250','shimano-cs-r9200-12-11-34','compatible','Shimano C-454 lists RD-R9250 with 11-34T 12-speed road cassettes.','https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11')
on conflict (source_component_id,target_component_id) do update set status=excluded.status, rule_summary=excluded.rule_summary, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
  ('specialized-epic-8-evo-expert-sram-gx-axs-fox-performance-elite-2025-global','sram-cs-xs-1275-a1','factory_installed','https://www.specialized.com/us/en/epic-8-evo-expert-sram-gx-axs-fox-performance-elite/p/4275710','2026-08-11','Official exact specification lists SRAM XS-1275 10-52T.'),
  ('specialized-chisel-comp-shimano-2025-global','shimano-cs-m6100-12','factory_installed','https://www.specialized.com/us/en/chisel-comp-shimano/p/4274028','2026-08-11','Official exact specification lists Shimano Deore M6100 10-51T cassette.'),
  ('specialized-tarmac-sl8-pro-shimano-ultegra-di2-2025-global','shimano-rd-r8150','factory_installed','https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935','2026-08-11','Official exact specification lists Shimano RD-R8150.'),
  ('specialized-tarmac-sl8-expert-shimano-ultegra-di2-2025-global','shimano-rd-r8150','factory_installed','https://www.specialized.com/us/en/tarmac-sl8-expert-shimano-ultegra-di2/p/4276209','2026-08-11','Official exact specification lists Shimano RD-R8150.'),
  ('specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2025-global','shimano-rd-r9250','factory_installed','https://www.specialized.com/us/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221536','2026-08-11','Official exact specification lists Shimano RD-R9250.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, notes=excluded.notes;

commit;

-- SOURCE: supabase/schema/catalog_enrichment_wave_19_norco_exact_fitment_2026_08_12.sql
-- VeloQuest catalog enrichment wave 19.
-- Exact first-party Norco 2025 Optic product specifications only.
-- Adds factory-installed component fitments; no inferred upgrade recommendation
-- or photo URL is added without separate first-party evidence.

begin;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('norco-optic-a1-gen3-2025-ca', 'sram-rd-gx-e-b1', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a1/', '2026-08-12',
   'Official Norco Optic A1 specification lists SRAM GX Eagle AXS T-Type rear derailleur.'),
  ('norco-optic-a1-gen3-2025-ca', 'sram-cs-xs-1275-a1', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a1/', '2026-08-12',
   'Official Norco Optic A1 specification lists SRAM 1275 Eagle T-Type 10-52T cassette.'),
  ('norco-optic-a2-gen3-2025-ca', 'shimano-rd-m6100-sgs', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a2/', '2026-08-12',
   'Official Norco Optic A2 specification lists Shimano Deore RD-M6100 12-speed rear derailleur.'),
  ('norco-optic-a2-gen3-2025-ca', 'shimano-cs-m6100-12', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a2/', '2026-08-12',
   'Official Norco Optic A2 specification lists Shimano Deore CS-M6100-12 10-51T cassette.'),
  ('norco-optic-a2-gen3-2025-ca', 'shimano-br-mt520', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a2/', '2026-08-12',
   'Official Norco Optic A2 specification lists Shimano Deore MT520 four-piston brakes.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;

-- SOURCE: catalog-harvester/quality-rules.json
update public.bike_catalog_models
set category = case
    when lower(brand) = lower('Propain') and model ~* '^Ekano.*Enduro' then 'electric_enduro'
    when lower(brand) = lower('Propain') and model ~* '^Ekano.*Trail' then 'electric_trail'
    when lower(brand) = lower('Propain') and model ~* '^Rage' then 'downhill'
    when lower(brand) = lower('Propain') and model ~* '^Spindrift' then 'freeride_full_suspension'
    when lower(brand) = lower('Propain') and model ~* '^Sresh' then 'electric_trail'
    when lower(brand) = lower('Propain') and model ~* '^Trickshot' then 'dirt_jump'
    when lower(brand) = lower('Propain') and model ~* '^Yuma' then 'youth_full_suspension'
    when lower(brand) = lower('Mondraker') and model ~* '^(CHASER|CRAFTY|CRUSHER|LEVEL|DUNE|NEAT)' then 'electric_enduro'
    when lower(brand) = lower('Mondraker') and model ~* '^FOXY' then 'trail_full_suspension'
    when lower(brand) = lower('NS Bikes') and model ~* '^Define' then 'enduro_full_suspension'
    when lower(brand) = lower('NS Bikes') and model ~* '^E-Fine' then 'electric_enduro'
    when lower(brand) = lower('NS Bikes') and model ~* '^Crust' then 'urban'
    when lower(brand) = lower('NS Bikes') and model ~* '^Fuzz' then 'downhill'
    when lower(brand) = lower('NS Bikes') and model ~* '^Nerd' then 'enduro_full_suspension'
    when lower(brand) = lower('NS Bikes') and model ~* '^Synonym' then 'xc_full_suspension'
    when lower(brand) = lower('NS Bikes') and model ~* '^Eccentric' then 'trail_hardtail'
    when lower(brand) = lower('NS Bikes') and model ~* '^(Zircus|Clash|Movement|Metropolis)' then 'dirt_jump'
    when lower(brand) = lower('Polygon') and model ~* '^CASCADE' then 'trail_hardtail'
    when lower(brand) = lower('Specialized') and model ~* '^Allez Sprint' then 'road_race'
    when lower(brand) = lower('Rocky Mountain') and model ~* '^Flow Jr' then 'kids'
    when lower(brand) = lower('Rocky Mountain') and model ~* '^Flow' then 'dirt_jump'
    when lower(brand) = lower('Rocky Mountain') and model ~* '^Soul' then 'trail_hardtail'
    when lower(brand) = lower('Rocky Mountain') and model ~* '^Altitude' then 'enduro_full_suspension'
    when lower(brand) = lower('Marin') and model ~* '^Alpine Trail E' then 'electric_enduro'
    when lower(brand) = lower('Marin') and model ~* '^Rift Zone E' then 'electric_trail'
    when lower(brand) = lower('Marin') and model ~* '^Rift Zone Jr' then 'youth_full_suspension'
    when lower(brand) = lower('Marin') and model ~* '^Rift Zone' then 'trail_full_suspension'
    when lower(brand) = lower('Marin') and model ~* '^Team Marin' then 'xc_hardtail'
    when lower(brand) = lower('Marin') and model ~* '^San Quentin 24' then 'kids'
    when lower(brand) = lower('Marin') and model ~* '^San Quentin' then 'trail_hardtail'
    when lower(brand) = lower('Marin') and model ~* '^El Roy' then 'trail_hardtail'
    when lower(brand) = lower('Marin') and model ~* '^Alcatraz' then 'dirt_jump'
    when lower(brand) = lower('FOCUS') and model ~* '^ATLAS' then 'gravel'
    else category
  end
where category is null;

update public.bike_catalog_models
set specs = jsonb_set(specs, '{model_year_evidence}', to_jsonb(manufacturer_url), true)
where not (specs ? 'model_year_evidence');

-- SOURCE: supabase/schema/catalog_release_quality.sql
-- Release-quality normalization for archive rows that are intentionally
-- shallow but still need a stable finder category. Exact technical specs and
-- compatibility remain default-deny until first-party evidence is added.

update public.bike_catalog_models
set category = case
  when brand = 'FOCUS' and model ilike 'ATLAS%' then 'gravel'
  when brand = 'Marin' and model = 'Alcatraz' then 'dirt_jump'
  when brand = 'Marin' and model ilike 'Alpine Trail E%' then 'emtb_full_suspension'
  when brand = 'Marin' and model = 'El Roy' then 'trail_hardtail'
  when brand = 'Marin' and model ilike 'Rift Zone E%' then 'emtb_full_suspension'
  when brand = 'Marin' and model ilike 'Rift Zone Jr%' then 'youth_full_suspension'
  when brand = 'Marin' and model ilike 'Rift Zone%' then 'trail_full_suspension'
  when brand = 'Marin' and model ilike 'San Quentin 24%' then 'kids'
  when brand = 'Marin' and model ilike 'San Quentin%' then 'trail_hardtail'
  when brand = 'Marin' and model ilike 'Team Marin%' then 'xc_hardtail'
  when brand = 'Mondraker' and model ilike 'FOXY%' then 'trail_full_suspension'
  when brand = 'Mondraker' and model ilike any (array['CHASER%','CRAFTY%','CRUSHER%','DUNE%','LEVEL%','NEAT%']) then 'emtb_full_suspension'
  when brand = 'NS Bikes' and model ilike any (array['Clash%','Metropolis%','Movement%','Zircus%']) then 'dirt_jump'
  when brand = 'NS Bikes' and model = 'Crust' then 'gravel'
  when brand = 'NS Bikes' and model = 'Define' then 'trail_full_suspension'
  when brand = 'NS Bikes' and model ilike 'E-Fine%' then 'emtb_full_suspension'
  when brand = 'NS Bikes' and model = 'Eccentric' then 'trail_hardtail'
  when brand = 'NS Bikes' and model = 'Fuzz' then 'downhill'
  when brand = 'NS Bikes' and model = 'Nerd' then 'trail_full_suspension'
  when brand = 'NS Bikes' and model = 'Synonym' then 'xc_full_suspension'
  when brand = 'Polygon' and model ilike 'CASCADE%' then 'mountain'
  when brand = 'Propain' and model ilike 'Ekano%' then 'emtb_full_suspension'
  when brand = 'Propain' and model ilike 'Rage%' then 'downhill'
  when brand = 'Propain' and model ilike 'Spindrift%' then 'freeride_full_suspension'
  when brand = 'Propain' and model ilike 'Sresh%' then 'emtb_full_suspension'
  when brand = 'Propain' and model ilike 'Trickshot%' then 'dirt_jump'
  when brand = 'Propain' and model ilike 'Yuma%' then 'kids'
  when brand = 'Rocky Mountain' and model ilike 'Altitude%' then 'enduro_full_suspension'
  when brand = 'Rocky Mountain' and model = 'Flow' then 'dirt_jump'
  when brand = 'Rocky Mountain' and model ilike 'Flow Jr%' then 'kids'
  when brand = 'Rocky Mountain' and model ilike 'Soul%' then 'xc_hardtail'
  when brand = 'Specialized' and model ilike 'Allez Sprint%' then 'road_race'
  else category
end
where category is null or btrim(category) = '';

-- Older SQL waves already have an evidence-backed model_year column and an
-- official manufacturer page, but did not duplicate that fact inside specs.
-- Normalize the explicit field so all finder rows share one contract.
update public.bike_catalog_models
set specs = jsonb_set(
  coalesce(specs, '{}'::jsonb),
  '{model_year_evidence}',
  to_jsonb(model_year::text),
  true
)
where coalesce(btrim(specs ->> 'model_year_evidence'), '') = '';

-- SOURCE: supabase/schema/catalog_performance_indexes_wave_16_2026_08_09.sql
create index if not exists bike_catalog_component_fitments_component_idx
  on public.bike_catalog_component_fitments (component_id);

create index if not exists garage_compatibility_target_component_idx
  on public.garage_compatibility (target_component_id);

-- SOURCE: supabase/schema/functional_completion_0_8.sql
-- VeloQuest 0.8.0 functional-completion schema.
-- Product scope: persistent progression campaign, privacy controls,
-- merge review inbox and server-backed virtual bike rewards.

alter table public.profiles
  add column if not exists privacy_zone_enabled boolean not null default true;

alter table public.player_progress
  add column if not exists specialization_changes_used smallint not null default 0
  check (specialization_changes_used between 0 and 1);

create table if not exists public.season_chapters (
  season_id text not null,
  chapter_number smallint not null check (chapter_number between 1 and 4),
  title text not null,
  min_xp integer not null check (min_xp >= 0),
  objective text not null,
  primary key (season_id, chapter_number)
);

alter table public.season_chapters enable row level security;
revoke all on table public.season_chapters from anon, authenticated;
grant select on table public.season_chapters to authenticated;
drop policy if exists season_chapters_read on public.season_chapters;
create policy season_chapters_read on public.season_chapters
for select to authenticated using (true);

insert into public.season_chapters (season_id, chapter_number, title, min_xp, objective)
values
  ('alpha-1', 1, 'Первые следы', 0, 'Начни исследование и открой первые территории.'),
  ('alpha-1', 2, 'За горизонтом', 600, 'Расширяй карту и пробуй разные типы квестов.'),
  ('alpha-1', 3, 'Свой путь', 1300, 'Выбери специализацию и следуй своему стилю.'),
  ('alpha-1', 4, 'Край карты', 2000, 'Заверши сезон серией осмысленных исследовательских поездок.')
on conflict (season_id, chapter_number) do update set
  title = excluded.title,
  min_xp = excluded.min_xp,
  objective = excluded.objective;

create table if not exists public.quest_specialization_affinity (
  specialization text not null check (specialization in ('explorer', 'climber', 'stayer')),
  quest_code text not null references public.quest_templates(code) on delete cascade,
  weight smallint not null check (weight between 0 and 100),
  primary key (specialization, quest_code)
);

alter table public.quest_specialization_affinity enable row level security;
revoke all on table public.quest_specialization_affinity from anon, authenticated;
grant select on table public.quest_specialization_affinity to authenticated;
drop policy if exists quest_specialization_affinity_read on public.quest_specialization_affinity;
create policy quest_specialization_affinity_read on public.quest_specialization_affinity
for select to authenticated using (true);

insert into public.quest_specialization_affinity (specialization, quest_code, weight)
values
  ('explorer', 'new_land', 100), ('explorer', 'close_the_loop', 70), ('explorer', 'long_ride', 55), ('explorer', 'high_route', 40),
  ('climber', 'high_route', 100), ('climber', 'new_land', 65), ('climber', 'long_ride', 55), ('climber', 'close_the_loop', 40),
  ('stayer', 'long_ride', 100), ('stayer', 'close_the_loop', 75), ('stayer', 'new_land', 55), ('stayer', 'high_route', 40)
on conflict (specialization, quest_code) do update set weight = excluded.weight;

create table if not exists public.virtual_items (
  id text primary key,
  slot text not null check (slot in ('frame', 'wheels', 'cockpit', 'badge')),
  display_name text not null,
  description text not null,
  unlock_level smallint not null check (unlock_level between 1 and 10),
  rarity text not null check (rarity in ('standard', 'rare', 'epic')),
  enabled boolean not null default true
);

alter table public.virtual_items enable row level security;
revoke all on table public.virtual_items from anon, authenticated;
grant select on table public.virtual_items to authenticated;
drop policy if exists virtual_items_read on public.virtual_items;
create policy virtual_items_read on public.virtual_items
for select to authenticated using (enabled = true);

insert into public.virtual_items (id, slot, display_name, description, unlock_level, rarity)
values
  ('vqb-frame-ivory', 'frame', 'Ivory Explorer', 'Базовая рама VeloQuest Bike.', 1, 'standard'),
  ('vqb-wheels-trail', 'wheels', 'Trail 40', 'Игровой комплект колёс за первые исследования.', 2, 'standard'),
  ('vqb-badge-compass', 'badge', 'Compass Mark', 'Виртуальный знак исследователя.', 3, 'rare'),
  ('vqb-cockpit-summit', 'cockpit', 'Summit Cockpit', 'Игровой кокпит за стабильный прогресс.', 4, 'rare'),
  ('vqb-wheels-horizon', 'wheels', 'Horizon 50', 'Виртуальные колёса высокого уровня.', 6, 'epic'),
  ('vqb-frame-aurora', 'frame', 'Aurora Frame', 'Финальная виртуальная рама сезона.', 9, 'epic')
on conflict (id) do update set
  slot = excluded.slot,
  display_name = excluded.display_name,
  description = excluded.description,
  unlock_level = excluded.unlock_level,
  rarity = excluded.rarity,
  enabled = true;

create table if not exists public.virtual_loadout (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('frame', 'wheels', 'cockpit', 'badge')),
  virtual_item_id text not null references public.virtual_items(id),
  installed_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.virtual_loadout enable row level security;
revoke all on table public.virtual_loadout from anon, authenticated;
grant select, insert, update, delete on table public.virtual_loadout to authenticated;
drop policy if exists virtual_loadout_select_own on public.virtual_loadout;
create policy virtual_loadout_select_own on public.virtual_loadout for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists virtual_loadout_insert_own on public.virtual_loadout;
create policy virtual_loadout_insert_own on public.virtual_loadout for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists virtual_loadout_update_own on public.virtual_loadout;
create policy virtual_loadout_update_own on public.virtual_loadout for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists virtual_loadout_delete_own on public.virtual_loadout;
create policy virtual_loadout_delete_own on public.virtual_loadout for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.enforce_virtual_item_unlock()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_required_level smallint;
  v_level smallint;
  v_slot text;
begin
  if new.user_id <> (select auth.uid()) then
    raise exception 'virtual_item_owner_mismatch';
  end if;
  select unlock_level, slot into v_required_level, v_slot
  from public.virtual_items where id = new.virtual_item_id and enabled = true;
  if not found or v_slot <> new.slot then raise exception 'invalid_virtual_item'; end if;
  select coalesce(level, 1) into v_level from public.player_progress where user_id = new.user_id;
  if coalesce(v_level, 1) < v_required_level then raise exception 'virtual_item_locked'; end if;
  new.installed_at := now();
  return new;
end;
$$;

drop trigger if exists virtual_loadout_unlock_guard on public.virtual_loadout;
create trigger virtual_loadout_unlock_guard
before insert or update on public.virtual_loadout
for each row execute function public.enforce_virtual_item_unlock();

create table if not exists public.ride_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null,
  source_fingerprint text not null,
  candidate_ride_id uuid references public.rides(id) on delete cascade,
  reason text not null,
  status text not null default 'needs_review' check (status in ('needs_review', 'confirmed_duplicate', 'dismissed')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, source_kind, source_fingerprint)
);

alter table public.ride_inbox enable row level security;
revoke all on table public.ride_inbox from anon, authenticated;
grant select, update on table public.ride_inbox to authenticated;
drop policy if exists ride_inbox_select_own on public.ride_inbox;
create policy ride_inbox_select_own on public.ride_inbox for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists ride_inbox_update_own on public.ride_inbox;
create policy ride_inbox_update_own on public.ride_inbox for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and status in ('confirmed_duplicate', 'dismissed'));

create or replace function public.guard_specialization_change()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.specialization is not distinct from old.specialization then
    new.specialization_changes_used := old.specialization_changes_used;
    new.specialization_changed_at := old.specialization_changed_at;
    return new;
  end if;
  if old.level < 3 then raise exception 'specialization_requires_level_3'; end if;
  if new.specialization not in ('explorer', 'climber', 'stayer') then raise exception 'invalid_specialization'; end if;
  if old.specialization is null then
    new.specialization_changes_used := 0;
  else
    if old.specialization_changes_used >= 1 then raise exception 'specialization_change_already_used'; end if;
    new.specialization_changes_used := old.specialization_changes_used + 1;
  end if;
  new.specialization_changed_at := now();
  return new;
end;
$$;

drop trigger if exists player_progress_specialization_guard on public.player_progress;
create trigger player_progress_specialization_guard
before update of specialization, specialization_changes_used, specialization_changed_at on public.player_progress
for each row execute function public.guard_specialization_change();

grant update (specialization, specialization_changes_used, specialization_changed_at)
on public.player_progress to authenticated;
drop policy if exists player_progress_update_specialization_own on public.player_progress;
create policy player_progress_update_specialization_own on public.player_progress for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Extend the bounded telemetry vocabulary used by the alpha.
alter table public.client_events drop constraint if exists client_events_event_name_check;
alter table public.client_events add constraint client_events_event_name_check check (event_name in (
  'cloud_hydration_failed', 'ride_sync_succeeded', 'ride_sync_failed',
  'source_disconnected', 'account_delete_requested', 'specialization_selected',
  'virtual_item_installed', 'ride_inbox_reviewed', 'privacy_zone_updated',
  'quest_selected', 'route_influence_reported', 'client_render_error', 'bike_cache_write_failed'
));

-- SOURCE: supabase/schema/strava_integration.sql
create table if not exists public.strava_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  scope text not null default 'read,activity:read',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strava_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  app_redirect text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.strava_webhook_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  object_type text not null,
  object_id bigint not null,
  aspect_type text not null,
  event_time bigint not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (user_id, object_type, object_id, aspect_type, event_time)
);

alter table public.strava_credentials enable row level security;
alter table public.strava_oauth_states enable row level security;
alter table public.strava_webhook_events enable row level security;

revoke all on table public.strava_credentials, public.strava_oauth_states, public.strava_webhook_events from public, anon, authenticated;
grant select, insert, update, delete on table public.strava_credentials, public.strava_oauth_states, public.strava_webhook_events to service_role;
grant usage on sequence public.strava_webhook_events_id_seq to service_role;

drop policy if exists strava_credentials_service_only on public.strava_credentials;
create policy strava_credentials_service_only on public.strava_credentials
for all to service_role using (true) with check (true);

drop policy if exists strava_oauth_states_service_only on public.strava_oauth_states;
create policy strava_oauth_states_service_only on public.strava_oauth_states
for all to service_role using (true) with check (true);

drop policy if exists strava_webhook_events_service_only on public.strava_webhook_events;
create policy strava_webhook_events_service_only on public.strava_webhook_events
for all to service_role using (true) with check (true);

create index if not exists strava_oauth_states_expiry_idx on public.strava_oauth_states (expires_at);
create index if not exists strava_webhook_events_pending_idx on public.strava_webhook_events (user_id, received_at) where processed_at is null;

-- SOURCE: supabase/schema/ride_processor.sql
create or replace function public.process_ride_alpha(
  p_user_id uuid,
  p_source_kind text,
  p_external_ride_id text,
  p_source_fingerprint text,
  p_cross_source_fingerprint text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_moving_time_seconds integer,
  p_distance_meters double precision,
  p_elevation_gain_meters double precision,
  p_average_speed_mps double precision,
  p_route_geojson jsonb,
  p_h3_cells text[],
  p_quest_code text,
  p_loop_value numeric,
  p_reward_eligible boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_existing_import public.ride_imports%rowtype;
  v_ride_id uuid;
  v_inserted_ride_id uuid;
  v_new_cells text[] := '{}'::text[];
  v_template public.quest_templates%rowtype;
  v_quest public.quest_runs%rowtype;
  v_metric_value numeric := 0;
  v_next_progress numeric := 0;
  v_quest_completed boolean := false;
  v_xp_awarded integer := 0;
  v_total_xp integer := 0;
  v_season_xp integer := 0;
  v_specialization text := null;
begin
  if p_user_id is null then
    raise exception 'user_required';
  end if;

  select * into v_template
  from public.quest_templates
  where code = p_quest_code and enabled = true;
  if not found then
    raise exception 'invalid_quest';
  end if;

  select * into v_existing_import
  from public.ride_imports
  where user_id = p_user_id
    and source_kind = p_source_kind
    and source_fingerprint = p_source_fingerprint;

  if found then
    select coalesce(adventure_xp, 0) into v_total_xp
    from public.player_progress where user_id = p_user_id;
    return jsonb_build_object(
      'duplicate', true,
      'rideId', v_existing_import.canonical_ride_id,
      'newCells', '[]'::jsonb,
      'xpAwarded', 0,
      'totalXp', coalesce(v_total_xp, 0),
      'quest', jsonb_build_object('code', p_quest_code, 'completed', false)
    );
  end if;

  insert into public.rides (
    user_id, bike_id, cross_source_fingerprint, started_at, ended_at,
    moving_time_seconds, distance_meters, elevation_gain_meters,
    average_speed_mps, route_geojson, is_historical, processing_status
  ) values (
    p_user_id,
    (select id from public.bikes where user_id = p_user_id and is_active = true order by updated_at desc limit 1),
    p_cross_source_fingerprint, p_started_at, p_ended_at,
    p_moving_time_seconds, p_distance_meters, p_elevation_gain_meters,
    p_average_speed_mps, p_route_geojson, not p_reward_eligible, 'ready'
  )
  on conflict (user_id, cross_source_fingerprint) do nothing
  returning id into v_inserted_ride_id;

  if v_inserted_ride_id is null then
    select id into v_ride_id from public.rides
    where user_id = p_user_id and cross_source_fingerprint = p_cross_source_fingerprint;

    insert into public.ride_imports (
      user_id, canonical_ride_id, source_kind, external_ride_id,
      source_fingerprint, cross_source_fingerprint, started_at, ended_at,
      moving_time_seconds, distance_meters, elevation_gain_meters,
      average_speed_mps, route_geojson, processing_status, source_metadata
    ) values (
      p_user_id, v_ride_id, p_source_kind, p_external_ride_id,
      p_source_fingerprint, p_cross_source_fingerprint, p_started_at, p_ended_at,
      p_moving_time_seconds, p_distance_meters, p_elevation_gain_meters,
      p_average_speed_mps, p_route_geojson, 'duplicate',
      jsonb_build_object('processor', '0.8.0', 'reason', 'cross_source_duplicate')
    )
    on conflict (user_id, source_kind, source_fingerprint) do nothing;

    insert into public.ride_inbox (
      user_id, source_kind, source_fingerprint, candidate_ride_id, reason, details
    ) values (
      p_user_id, p_source_kind, p_source_fingerprint, v_ride_id,
      'cross_source_duplicate',
      jsonb_build_object('processor', '0.8.0', 'match', 'exact_cross_source_fingerprint')
    )
    on conflict (user_id, source_kind, source_fingerprint) do nothing;

    select coalesce(adventure_xp, 0) into v_total_xp
    from public.player_progress where user_id = p_user_id;
    return jsonb_build_object(
      'duplicate', true,
      'rideId', v_ride_id,
      'newCells', '[]'::jsonb,
      'xpAwarded', 0,
      'totalXp', coalesce(v_total_xp, 0),
      'quest', jsonb_build_object('code', p_quest_code, 'completed', false)
    );
  end if;

  v_ride_id := v_inserted_ride_id;

  insert into public.ride_imports (
    user_id, canonical_ride_id, source_kind, external_ride_id,
    source_fingerprint, cross_source_fingerprint, started_at, ended_at,
    moving_time_seconds, distance_meters, elevation_gain_meters,
    average_speed_mps, route_geojson, processing_status, source_metadata
  ) values (
    p_user_id, v_ride_id, p_source_kind, p_external_ride_id,
    p_source_fingerprint, p_cross_source_fingerprint, p_started_at, p_ended_at,
    p_moving_time_seconds, p_distance_meters, p_elevation_gain_meters,
    p_average_speed_mps, p_route_geojson, 'processed',
    jsonb_build_object('processor', '0.8.0')
  );

  with inserted as (
    insert into public.explored_cells (
      user_id, h3_index, h3_resolution, first_ride_id, origin
    )
    select p_user_id, lower(cell), 8, v_ride_id,
           case when p_reward_eligible then 'earned' else 'historical' end
    from unnest(coalesce(p_h3_cells, '{}'::text[])) as cell
    on conflict (user_id, h3_index) do nothing
    returning h3_index
  )
  select coalesce(array_agg(h3_index), '{}'::text[]) into v_new_cells from inserted;

  if p_reward_eligible then
    select * into v_quest
    from public.quest_runs
    where user_id = p_user_id and status = 'active'
    for update;

    if found and v_quest.template_code <> p_quest_code and v_quest.progress_value > 0 then
      raise exception 'active_quest_conflict';
    end if;

    if found and v_quest.template_code <> p_quest_code then
      update public.quest_runs set status = 'abandoned'
      where id = v_quest.id;
      v_quest.id := null;
    end if;

    if v_quest.id is null then
      insert into public.quest_runs (
        user_id, template_code, target_value, progress_value, reward_xp, status
      ) values (
        p_user_id, v_template.code, v_template.default_target, 0, v_template.reward_xp, 'active'
      ) returning * into v_quest;
    end if;

    v_metric_value := case v_template.metric
      when 'new_cells' then cardinality(v_new_cells)::numeric
      when 'moving_minutes' then p_moving_time_seconds::numeric / 60
      when 'elevation_meters' then coalesce(p_elevation_gain_meters, 0)::numeric
      when 'loop' then greatest(0, least(1, coalesce(p_loop_value, 0)))
      else 0
    end;

    if v_template.metric = 'loop' then
      v_next_progress := greatest(v_quest.progress_value, v_metric_value);
    else
      v_next_progress := v_quest.progress_value + v_metric_value;
    end if;
    v_quest_completed := v_next_progress >= v_quest.target_value;

    update public.quest_runs set
      progress_value = v_next_progress,
      status = case when v_quest_completed then 'completed' else 'active' end,
      completed_at = case when v_quest_completed then now() else null end,
      completed_by_ride_id = case when v_quest_completed then v_ride_id else null end
    where id = v_quest.id;

    if v_quest_completed then
      insert into public.xp_ledger (
        user_id, ride_id, quest_run_id, entry_type, delta, reason
      ) values (
        p_user_id, v_ride_id, v_quest.id, 'quest', v_quest.reward_xp,
        'quest:' || p_quest_code
      )
      on conflict do nothing;
      if found then v_xp_awarded := v_quest.reward_xp; end if;
    end if;
  end if;

  select
    coalesce(sum(delta), 0)::integer,
    coalesce(sum(delta) filter (where entry_type <> 'migration'), 0)::integer
  into v_total_xp, v_season_xp
  from public.xp_ledger where user_id = p_user_id;

  insert into public.player_progress (user_id, adventure_xp, level, season_xp, specialization, specialization_changed_at, updated_at)
  values (
    p_user_id,
    v_total_xp,
    least(10, floor(v_total_xp / 500.0)::integer + 1),
    greatest(0, v_season_xp),
    v_specialization,
    case when v_specialization is null then null else now() end,
    now()
  )
  on conflict (user_id) do update set
    adventure_xp = excluded.adventure_xp,
    level = excluded.level,
    season_xp = excluded.season_xp,
    specialization = player_progress.specialization,
    specialization_changed_at = player_progress.specialization_changed_at,
    updated_at = now();

  return jsonb_build_object(
    'duplicate', false,
    'rideId', v_ride_id,
    'newCells', to_jsonb(v_new_cells),
    'xpAwarded', v_xp_awarded,
    'totalXp', v_total_xp,
    'quest', jsonb_build_object(
      'code', p_quest_code,
      'completed', v_quest_completed,
      'progressValue', case when p_reward_eligible then v_next_progress else 0 end,
      'targetValue', v_template.default_target,
      'rewardXp', v_template.reward_xp,
      'rewardEligible', p_reward_eligible
    )
  );
end;
$$;

revoke all on function public.process_ride_alpha(
  uuid, text, text, text, text, timestamptz, timestamptz, integer,
  double precision, double precision, double precision, jsonb, text[], text,
  numeric, boolean
) from public, anon, authenticated;

grant execute on function public.process_ride_alpha(
  uuid, text, text, text, text, timestamptz, timestamptz, integer,
  double precision, double precision, double precision, jsonb, text[], text,
  numeric, boolean
) to service_role;
