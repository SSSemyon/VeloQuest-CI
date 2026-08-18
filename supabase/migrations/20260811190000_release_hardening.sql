-- SOURCE: supabase/schema/release_upgrade_parity.sql
-- Upgrade parity fixes that must reach an existing production database even
-- when the full baseline is marked as already applied.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.player_progress (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop function if exists public.search_bike_catalog(text, text, text, integer, integer, text, text, text, text, integer, integer);
drop index if exists public.bike_catalog_models_search_trgm_idx;
drop index if exists public.bike_catalog_models_search_fts_idx;
alter table public.bike_catalog_models drop column if exists search_text;
alter table public.bike_catalog_models add column search_text text generated always as (
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
create index bike_catalog_models_search_trgm_idx
on public.bike_catalog_models using gin (search_text extensions.gin_trgm_ops)
where enabled = true;
create index bike_catalog_models_search_fts_idx
on public.bike_catalog_models using gin (to_tsvector('simple'::regconfig, search_text))
where enabled = true;

alter table public.garage_compatibility drop constraint if exists garage_compatibility_status_check;
alter table public.garage_compatibility add constraint garage_compatibility_status_check
check (status in ('compatible', 'conditional', 'incompatible'));

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('shimano-rd-m6100-sgs', 'shimano-cs-m8000-11', 'incompatible',
   'RD-M6100-SGS относится к 12-скоростной системе Shimano MTB, а CS-M8000 — к 11-скоростной; эта пара отсутствует в официальной матрице совместимости C-433.',
   'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-11'),
  ('shimano-rd-m8050-gs', 'shimano-cs-m6100-12', 'incompatible',
   'RD-M8050-GS относится к 11-скоростной системе Shimano MTB, а CS-M6100-12 — к 12-скоростной; эта пара отсутствует в официальной матрице совместимости C-433.',
   'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-11'),
  ('shimano-br-mt520', 'shimano-sm-ma-f180p-p2', 'conditional',
   'BR-MT520 допускает 180-мм ротор только при совпадении стандарта крепления рамы/вилки и использовании указанного Shimano-адаптера; перед установкой нужно проверить mount и исходный размер ротора.',
   'https://productinfo.shimano.com/en/product/SM-MA-F180P-P2', '2026-08-11'),
  ('shimano-br-mt520', 'shimano-sm-ma-f203p-p', 'conditional',
   'BR-MT520 допускает 203-мм ротор только при совпадении стандарта крепления рамы/вилки и использовании указанного Shimano-адаптера; обязательны проверка допустимого ротора для вилки/рамы и clearance.',
   'https://productinfo.shimano.com/en/product/SM-MA-F203P-P', '2026-08-11')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

create table if not exists private.route_generation_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);
alter table private.route_generation_rate_limits enable row level security;
revoke all on table private.route_generation_rate_limits from public, anon, authenticated;

create or replace function public.consume_route_generation_quota(
  p_limit integer default 6,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_row private.route_generation_rate_limits%rowtype;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;
  if p_limit < 1 or p_limit > 30 or p_window_seconds < 10 or p_window_seconds > 3600 then
    raise exception 'invalid_rate_limit';
  end if;

  insert into private.route_generation_rate_limits (user_id, window_started_at, request_count)
  values (v_user_id, v_now, 1)
  on conflict (user_id) do nothing
  returning * into v_row;

  if found then return true; end if;

  select * into v_row
  from private.route_generation_rate_limits
  where user_id = v_user_id
  for update;

  if v_row.window_started_at <= v_now - make_interval(secs => p_window_seconds) then
    update private.route_generation_rate_limits
    set window_started_at = v_now, request_count = 1
    where user_id = v_user_id;
    return true;
  end if;
  if v_row.request_count >= p_limit then return false; end if;

  update private.route_generation_rate_limits
  set request_count = request_count + 1
  where user_id = v_user_id;
  return true;
end;
$$;

revoke execute on function public.consume_route_generation_quota(integer, integer) from public, anon;
grant execute on function public.consume_route_generation_quota(integer, integer) to authenticated;

revoke execute on function public.enforce_virtual_item_unlock() from public, anon, authenticated;
revoke execute on function public.guard_specialization_change() from public, anon, authenticated;

alter table public.client_events drop constraint if exists client_events_event_name_check;
alter table public.client_events add constraint client_events_event_name_check check (event_name in (
  'cloud_hydration_failed', 'ride_sync_succeeded', 'ride_sync_failed',
  'source_disconnected', 'account_delete_requested', 'specialization_selected',
  'virtual_item_installed', 'ride_inbox_reviewed', 'privacy_zone_updated',
  'quest_selected', 'route_influence_reported', 'client_render_error', 'bike_cache_write_failed'
));

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

-- SOURCE: supabase/schema/quest_selection.sql
-- Server-authoritative quest selection. A selected quest exists before the
-- first ride, so it survives cold restart and device changes.

create unique index if not exists quest_runs_one_active_per_user_idx
on public.quest_runs (user_id) where status = 'active';

create or replace function public.activate_quest_alpha(
  p_template_code text,
  p_confirm_abandon boolean default false
)
returns table (code text, progress_value numeric, target_value numeric, reward_xp integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.quest_templates%rowtype;
  v_active public.quest_runs%rowtype;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;

  select * into v_template
  from public.quest_templates template
  where template.code = p_template_code and template.enabled = true;
  if not found then raise exception 'invalid_quest'; end if;

  select * into v_active
  from public.quest_runs
  where user_id = v_user_id and status = 'active'
  for update;

  if found and v_active.template_code = p_template_code then
    return query select v_active.template_code, v_active.progress_value, v_active.target_value, v_active.reward_xp;
    return;
  end if;

  if found and v_active.progress_value > 0 and not p_confirm_abandon then
    raise exception 'active_quest_has_progress';
  end if;

  if found then
    update public.quest_runs set status = 'abandoned' where id = v_active.id;
  end if;

  insert into public.quest_runs (user_id, template_code, target_value, progress_value, reward_xp, status)
  values (v_user_id, v_template.code, v_template.default_target, 0, v_template.reward_xp, 'active')
  returning template_code, quest_runs.progress_value, quest_runs.target_value, quest_runs.reward_xp
  into code, progress_value, target_value, reward_xp;
  return next;
end;
$$;

revoke all on function public.activate_quest_alpha(text, boolean) from public, anon;
grant execute on function public.activate_quest_alpha(text, boolean) to authenticated;

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

-- SOURCE: supabase/schema/release_backend_indexes.sql
-- Cover the remaining foreign keys reported by the Supabase performance advisor.
-- These are additive, idempotent and safe to apply after the full baseline.

create index if not exists quest_specialization_affinity_quest_code_idx
on public.quest_specialization_affinity (quest_code);

create index if not exists ride_inbox_candidate_ride_idx
on public.ride_inbox (candidate_ride_id);

create index if not exists strava_oauth_states_user_idx
on public.strava_oauth_states (user_id);

create index if not exists virtual_loadout_virtual_item_idx
on public.virtual_loadout (virtual_item_id);
