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
