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
