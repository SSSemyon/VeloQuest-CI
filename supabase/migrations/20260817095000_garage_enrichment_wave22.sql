-- SOURCE: supabase/schema/catalog_enrichment_wave_22_rocky_mountain_archive_fitment_2026_08_17.sql
-- VeloQuest catalog enrichment wave 22.
-- Official Rocky Mountain 2024 archive collection evidence. The archive lists
-- exact bike model names next to OEM component labels. Because these are
-- collection-level rows rather than exact product pages, this wave records only
-- factory-installed fitment. It does not infer SKU, core specs, media,
-- compatibility or upgrade recommendations.

begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('shimano-slx-trail-4-piston-oem', 'Shimano', 'SLX Trail 4 Piston', 'brake_caliper', 'Shimano SLX Trail 4 Piston',
   '{"pistons":4,"evidence_scope":"Rocky Mountain 2024 official archive OEM label; exact Shimano SKU not inferred"}'::jsonb,
   1, 'https://bikes.com/collections/2024-bikes', '2026-08-17', true),
  ('sram-level-2-piston-oem', 'SRAM', 'Level 2 Piston', 'brake_caliper', 'SRAM Level 2 Piston',
   '{"pistons":2,"evidence_scope":"Rocky Mountain 2024 official archive OEM label; exact SRAM SKU not inferred"}'::jsonb,
   1, 'https://bikes.com/collections/2024-bikes', '2026-08-17', true),
  ('sram-g2-r-4-piston-oem', 'SRAM', 'G2 R 4 Piston', 'brake_caliper', 'SRAM G2 R 4 Piston',
   '{"pistons":4,"evidence_scope":"Rocky Mountain 2024 official archive OEM label; exact SRAM SKU not inferred"}'::jsonb,
   1, 'https://bikes.com/collections/2024-bikes', '2026-08-17', true),
  ('shimano-mt4100-2-piston-oem', 'Shimano', 'MT4100 2 Piston', 'brake_caliper', 'Shimano MT4100 2 Piston',
   '{"pistons":2,"evidence_scope":"Rocky Mountain 2024 official archive OEM label; exact lever/caliper SKU pair not inferred"}'::jsonb,
   1, 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', true)
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

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('rocky-mountain-altitude-alloy-50-2024-global', 'shimano-slx-trail-4-piston-oem', 'factory_installed',
   'https://bikes.com/collections/2024-bikes', '2026-08-17',
   'Official Rocky Mountain 2024 archive lists Altitude Alloy 50 with Shimano SLX Trail 4 Piston. Exact Shimano SKU is intentionally not inferred.'),
  ('rocky-mountain-blizzard-powerplay-alloy-30-2024-global', 'sram-level-2-piston-oem', 'factory_installed',
   'https://bikes.com/collections/2024-bikes', '2026-08-17',
   'Official Rocky Mountain 2024 archive lists Blizzard Powerplay Alloy 30 with SRAM Level 2 Piston.'),
  ('rocky-mountain-blizzard-powerplay-alloy-50-2024-global', 'sram-g2-r-4-piston-oem', 'factory_installed',
   'https://bikes.com/collections/2024-bikes', '2026-08-17',
   'Official Rocky Mountain 2024 archive lists Blizzard Powerplay Alloy 50 with SRAM G2 R 4 Piston.'),
  ('rocky-mountain-fusion-powerplay-30-2024-global', 'shimano-mt4100-2-piston-oem', 'factory_installed',
   'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17',
   'Official Rocky Mountain 2024 archive lists Fusion Powerplay 30 with Shimano MT4100 2 Piston. Exact lever/caliper SKU pair is intentionally not inferred.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
