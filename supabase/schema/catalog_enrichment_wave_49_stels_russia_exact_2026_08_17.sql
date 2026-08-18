-- VeloQuest catalog enrichment wave 49.
-- Russia-first STELS. The 2026 STELS catalog contains carry-over bikes, so this
-- wave never treats catalog-season membership as model-year evidence.
-- Navigator 970 is explicitly marked 2025 on its exact STELS product page and
-- is also listed in the official STELS 2026 catalog. Product image was verified
-- over HTTPS with HTTP 200 on 2026-08-17.
-- No compatibility/manufacturer-approved/no-upgrade inference.

begin;

insert into public.bike_catalog_models
  (id, brand, model, model_year, trim, category, market, specs, manufacturer_url, evidence_checked_at, enabled)
values
  (
    'stels-navigator-970-d-29-2025-ru',
    'STELS',
    'Navigator 970 D 29"',
    2025,
    '',
    'XC MTB',
    'ru',
    '{"frame_material":"aluminum X6","wheel_size":"29","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 1x11 (SL-U6000 / RD-U6000)","groupset":"Shimano CUES","brakes":"Shimano hydraulic disc 180 mm","cassette":"11-42T","tires":"29x2.2","weight_kg":13.34,"model_year_evidence":"https://stelsbicycle.ru/catalog/bicycle/gornye/navigator-970-29d-v010/","current_russia_catalog_evidence":"https://stelsbicycle.ru/images/catalogs/Stels-catalog-bike-2026.pdf","source_scope":"official_manufacturer_russia"}'::jsonb,
    'https://stelsbicycle.ru/catalog/bicycle/gornye/navigator-970-29d-v010/',
    '2026-08-17',
    true
  )
on conflict (brand, model, model_year, trim, market) do update set
  category = excluded.category,
  specs = excluded.specs || public.bike_catalog_models.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = greatest(public.bike_catalog_models.evidence_checked_at, excluded.evidence_checked_at),
  enabled = true;

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  (
    'stels-navigator-970-d-29-2025-ru',
    'https://stelsbicycle.ru/upload/iblock/1dd/9dimrw4t9pbuk7jzwjoiu45trdznr80x/ec72c3cd_4d83_11ef_aba3_00155dd7ab06_5c018daf_45cf_11f0_b03a_00155d5a0c09.jpg',
    'manufacturer',
    'STELS',
    'https://stelsbicycle.ru/catalog/bicycle/gornye/navigator-970-29d-v010/',
    10,
    '2026-08-17',
    true
  )
on conflict (bike_id, image_url) do update set
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_page_url = excluded.source_page_url,
  priority = least(public.bike_catalog_images.priority, excluded.priority),
  checked_at = excluded.checked_at,
  enabled = true;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  (
    'oem-stels-navigator-970-2025-rd',
    'Shimano',
    'CUES RD-U6000',
    'rear_derailleur',
    'Shimano CUES RD-U6000',
    '{"speeds":11,"evidence_scope":"STELS exact-product OEM specification"}'::jsonb,
    1,
    'https://stelsbicycle.ru/catalog/bicycle/gornye/navigator-970-29d-v010/',
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
    'stels-navigator-970-d-29-2025-ru',
    'oem-stels-navigator-970-2025-rd',
    'factory_installed',
    'https://stelsbicycle.ru/catalog/bicycle/gornye/navigator-970-29d-v010/',
    '2026-08-17',
    'Exact STELS product page explicitly marks model year 2025 and Shimano CUES RD-U6000; official STELS 2026 catalog confirms current Russia catalog presence.'
  )
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
