-- VeloQuest catalog enrichment wave 62.
-- Russia-first FORWARD current-market evidence.
-- Source is Sportur, the current exclusive official representative of Forward in
-- Russia (development, marketing, sales and warranty), NOT the manufacturer.
-- This provenance distinction is preserved in specs and image source_type.
-- Sporting SX 29 explicitly carries model year 2025 on the exact current card.
-- Product image independently verified HTTP 200 over HTTPS on 2026-08-17.
-- No compatibility/manufacturer-approved/no-upgrade inference.

begin;

insert into public.bike_catalog_models
  (id, brand, model, model_year, trim, category, market, specs, manufacturer_url, evidence_checked_at, enabled)
values
  (
    'forward-sporting-sx-29-2025-ru',
    'Forward',
    'Sporting SX 29',
    2025,
    '',
    'XC MTB',
    'ru',
    '{"frame_material":"steel Hi-Ten","wheel_size":"29","drivetrain_brand":"Shimano","drivetrain":"Shimano Tourney 1x8 (RD-TY300 / Microshift TS38)","groupset":"Shimano Tourney","brakes":"Repute DSC-310 mechanical disc 160/160 mm","cassette":"FWD KDF-CS832 11-32T 8-speed","fork":"FWD 286 steel, aluminum crown, 80 mm","hubs":"FWD aluminum","wheelset":"FWD double-wall aluminum rims","tires":"Wanda P1197 29x2.125","model_year_evidence":"https://sportur.pro/mtb/tproduct/977253470152-velosiped-forward-sporting-sx-29-2025-my","source_scope":"official_exclusive_brand_representative_russia","source_organization":"Sportur","source_role_evidence":"https://sportur.pro/info","provenance_note":"Sportur is the current exclusive representative of Forward and handles bicycle development, marketing, sales and warranty. It is not labeled as the manufacturer in VeloQuest."}'::jsonb,
    'https://sportur.pro/mtb/tproduct/977253470152-velosiped-forward-sporting-sx-29-2025-my',
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
    'forward-sporting-sx-29-2025-ru',
    'https://static.tildacdn.com/stor6264-3237-4563-b266-333434646561/91069324.jpg',
    'authorized_retailer',
    'Sportur · exclusive Forward representative in Russia',
    'https://sportur.pro/mtb/tproduct/977253470152-velosiped-forward-sporting-sx-29-2025-my',
    20,
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
    'oem-forward-sporting-sx-29-2025-rd',
    'Shimano',
    'Tourney TY300',
    'rear_derailleur',
    'Shimano Tourney TY300',
    '{"speeds":8,"evidence_scope":"Forward official-exclusive-representative exact product specification"}'::jsonb,
    1,
    'https://sportur.pro/mtb/tproduct/977253470152-velosiped-forward-sporting-sx-29-2025-my',
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
    'forward-sporting-sx-29-2025-ru',
    'oem-forward-sporting-sx-29-2025-rd',
    'factory_installed',
    'https://sportur.pro/mtb/tproduct/977253470152-velosiped-forward-sporting-sx-29-2025-my',
    '2026-08-17',
    'Exact current Forward card from Sportur, the exclusive official Forward representative in Russia. Source explicitly lists model year 2025 and Shimano Tourney TY300. Representative provenance is retained and is not mislabeled as manufacturer.'
  )
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
