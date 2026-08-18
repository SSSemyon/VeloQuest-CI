-- VeloQuest catalog enrichment wave 48.
-- Russia-first Bear Bike exact product evidence.
-- Palermo explicitly carries model year 2023 in the official product title and
-- remains listed in the current official Russian catalog. Media is omitted
-- because the page exposes many unlabeled image assets without an unambiguous
-- product OpenGraph image. No compatibility/manufacturer-approved/no-upgrade inference.

begin;

insert into public.bike_catalog_models
  (id, brand, model, model_year, trim, category, market, specs, manufacturer_url, evidence_checked_at, enabled)
values
  (
    'bearbike-palermo-2023-ru',
    'Bear Bike',
    'Palermo',
    2023,
    '',
    'City',
    'ru',
    '{"frame_material":"steel","wheel_size":"28","drivetrain_brand":"Shimano","drivetrain":"Shimano Nexus 8-speed internal gear hub","groupset":"Shimano Nexus","brakes":"Tektro caliper rim brakes","tires":"700x35C","weight_kg":17,"rear_hub":"Shimano Nexus 8-speed","model_year_evidence":"https://bearbike.ru/catalog/velosipedy/gorodskie_velosipedy/velosiped_bearbike_palermo_2023/","current_russia_catalog_evidence":"https://bearbike.ru/catalog/velosipedy/","source_scope":"official_manufacturer_russia"}'::jsonb,
    'https://bearbike.ru/catalog/velosipedy/gorodskie_velosipedy/velosiped_bearbike_palermo_2023/',
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
    'oem-bearbike-palermo-2023-rear-hub',
    'Shimano',
    'Nexus 8-speed',
    'rear_hub',
    'Shimano Nexus 8-speed rear hub',
    '{"speeds":8,"evidence_scope":"Bear Bike exact-product OEM specification"}'::jsonb,
    1,
    'https://bearbike.ru/catalog/velosipedy/gorodskie_velosipedy/velosiped_bearbike_palermo_2023/',
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
    'bearbike-palermo-2023-ru',
    'oem-bearbike-palermo-2023-rear-hub',
    'factory_installed',
    'https://bearbike.ru/catalog/velosipedy/gorodskie_velosipedy/velosiped_bearbike_palermo_2023/',
    '2026-08-17',
    'Official Bear Bike Palermo (2023) product page explicitly lists Shimano Nexus 8-speed rear hub.'
  )
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
