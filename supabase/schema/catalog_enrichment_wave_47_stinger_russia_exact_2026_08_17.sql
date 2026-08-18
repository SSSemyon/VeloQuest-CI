-- VeloQuest catalog enrichment wave 47.
-- Russia-first Stinger exact product evidence.
-- The official product page explicitly states model year 2025 and the OEM
-- drivetrain/brake specification. Media is omitted because the page exposes
-- many unlabeled gallery assets and no unambiguous OpenGraph product image.
-- No compatibility/manufacturer-approved/no-upgrade inference.

begin;

insert into public.bike_catalog_models
  (id, brand, model, model_year, trim, category, market, specs, manufacturer_url, evidence_checked_at, enabled)
values
  (
    'stinger-graphite-pro-29-2025-ru',
    'Stinger',
    'Graphite Pro 29"',
    2025,
    '',
    'XC MTB',
    'ru',
    '{"frame_material":"aluminum","wheel_size":"29","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES U6000 1x10","groupset":"Shimano CUES U6000","brakes":"Shimano MT201/UR300 hydraulic disc","cassette":"KMC REACT LG 10-speed 11-48T","tires":"Maxxis Rekon Race 2.25","hubs":"Novatec SL-Elite Centerlock TA15x100 / TA12x142","wheelset":"STG XC/25 tubeless ready","model_year_evidence":"https://stingerbike.ru/catalog/velosipedy/gornye-velosipedy/gornyy-velosiped-graphite-pro-29-2025/","source_scope":"official_manufacturer_russia"}'::jsonb,
    'https://stingerbike.ru/catalog/velosipedy/gornye-velosipedy/gornyy-velosiped-graphite-pro-29-2025/',
    '2026-08-17',
    true
  )
on conflict (brand, model, model_year, trim, market) do update set
  category = excluded.category,
  specs = excluded.specs || public.bike_catalog_models.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = greatest(public.bike_catalog_models.evidence_checked_at, excluded.evidence_checked_at),
  enabled = true;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  (
    'oem-stinger-graphite-pro-29-2025-rd',
    'Shimano',
    'CUES U6000',
    'rear_derailleur',
    'Shimano CUES U6000',
    '{"speeds":10,"evidence_scope":"Stinger exact-product OEM specification"}'::jsonb,
    1,
    'https://stingerbike.ru/catalog/velosipedy/gornye-velosipedy/gornyy-velosiped-graphite-pro-29-2025/',
    '2026-08-17',
    true
  )
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  (
    'stinger-graphite-pro-29-2025-ru',
    'oem-stinger-graphite-pro-29-2025-rd',
    'factory_installed',
    'https://stingerbike.ru/catalog/velosipedy/gornye-velosipedy/gornyy-velosiped-graphite-pro-29-2025/',
    '2026-08-17',
    'Official Stinger exact product specification explicitly states model year 2025 and Shimano CUES U6000 rear derailleur, 1x10.'
  )
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
