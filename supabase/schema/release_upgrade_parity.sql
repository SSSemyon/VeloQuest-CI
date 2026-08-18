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
