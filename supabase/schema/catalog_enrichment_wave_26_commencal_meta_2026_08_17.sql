-- VeloQuest catalog enrichment wave 26.
-- Exact first-party COMMENCAL META product pages only. Adds explicit factory
-- specifications and factory-installed component evidence. COMMENCAL states
-- that bike specifications are subject to change without notice; this caveat
-- is retained and no compatibility or upgrade recommendation is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"AL 6066 T4, T6","wheel_size":"29/27.5","rear_travel_mm":165,"fork":"FOX 38 Factory, 170 mm travel","rear_shock":"FOX Float X2 Factory","drivetrain_brand":"SRAM","drivetrain":"SRAM Eagle 90 / GX T-Type 12-speed","rear_derailleur":"SRAM Eagle 90 12s","brakes":"SHIMANO New XT, 4 pistons, resin pads; SHIMANO MT905 203 mm rotors","cassette":"SRAM GX T-Type 12s, 10-52t","crankset":"SRAM X0 T-Type, 165 mm, 32t","bottom_bracket":"SRAM DUB92 MTB WIDE Pressfit","hubs":"DT SWISS 350","wheelset":"DT SWISS EX1700 29 front / 27.5 rear","tires":"MAXXIS Assegai 29x2.5 front / DHR II 27.5x2.5 rear","weight_kg":16.3,"spec_evidence":"official COMMENCAL exact META SX V5 Signature Pure White 2026 product page; specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US',
    evidence_checked_at = '2026-08-17'
where id = 'commencal-meta-sx-v5-signature-2026-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"AL 6066 T4, T6","wheel_size":"29/29","rear_travel_mm":150,"fork":"FOX 36 Factory, 160 mm travel","rear_shock":"FOX Float X Factory","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle T-Type 12-speed","rear_derailleur":"SRAM GX Eagle T-Type 12s","brakes":"TRP DH-R EVO PRO, 4 pistons, resin pads; TRP R2 203 mm rotors","cassette":"SRAM XG 1275 Eagle 12s, 10-52t","crankset":"SRAM X0 Eagle T-Type, 170 mm, 32t","bottom_bracket":"SRAM DUB WIDE Pressfit","hubs":"DT SWISS 350","wheelset":"DT SWISS EX1700 29","tires":"SCHWALBE Magic Mary 29x2.4 front / Tacky Chan 29x2.4 rear","weight_kg":15.9,"spec_evidence":"official COMMENCAL exact META V5 Signature Glittery White 2025 product page; specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20v5/BT4MTRV5SGEU3.html?lang=en_US',
    evidence_checked_at = '2026-08-17'
where id = 'commencal-meta-v5-signature-2025-us';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('sram-eagle-90-12s-oem-commencal', 'SRAM', 'Eagle 90 12s', 'rear_derailleur', 'SRAM Eagle 90 12s',
   '{"speeds":12,"evidence_scope":"COMMENCAL exact-product OEM listing; exact SRAM SKU not inferred"}'::jsonb,
   1, 'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US', '2026-08-17', true),
  ('shimano-new-xt-4p-oem-commencal', 'Shimano', 'New XT 4 Piston', 'brake_caliper', 'SHIMANO New XT, 4 pistons',
   '{"pistons":4,"rotor_mm":203,"evidence_scope":"COMMENCAL exact-product OEM listing; exact Shimano caliper SKU not inferred"}'::jsonb,
   1, 'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US', '2026-08-17', true),
  ('sram-gx-eagle-ttype-12s-oem-commencal', 'SRAM', 'GX Eagle T-Type 12s', 'rear_derailleur', 'SRAM GX Eagle T-Type 12s',
   '{"speeds":12,"evidence_scope":"COMMENCAL exact-product OEM listing; exact SRAM SKU not inferred"}'::jsonb,
   1, 'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20v5/BT4MTRV5SGEU3.html?lang=en_US', '2026-08-17', true),
  ('trp-dhr-evo-pro-oem-commencal', 'TRP', 'DH-R EVO PRO', 'brake_caliper', 'TRP DH-R EVO PRO, 4 pistons',
   '{"pistons":4,"rotor_mm":203,"evidence_scope":"COMMENCAL exact-product OEM listing"}'::jsonb,
   1, 'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20v5/BT4MTRV5SGEU3.html?lang=en_US', '2026-08-17', true)
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
  ('commencal-meta-sx-v5-signature-2026-us', 'sram-eagle-90-12s-oem-commencal', 'factory_installed',
   'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US', '2026-08-17',
   'Official COMMENCAL META SX V5 Signature Pure White 2026 page lists SRAM Eagle 90 12s. Specifications are subject to change without notice; exact SRAM SKU is not inferred.'),
  ('commencal-meta-sx-v5-signature-2026-us', 'shimano-new-xt-4p-oem-commencal', 'factory_installed',
   'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US', '2026-08-17',
   'Official COMMENCAL page lists SHIMANO New XT 4-piston brakes with MT905 203 mm rotors. Specifications are subject to change without notice; exact caliper SKU is not inferred.'),
  ('commencal-meta-v5-signature-2025-us', 'sram-gx-eagle-ttype-12s-oem-commencal', 'factory_installed',
   'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20v5/BT4MTRV5SGEU3.html?lang=en_US', '2026-08-17',
   'Official COMMENCAL META V5 Signature Glittery White 2025 page lists SRAM GX Eagle T-Type 12s. Specifications are subject to change without notice; exact SRAM SKU is not inferred.'),
  ('commencal-meta-v5-signature-2025-us', 'trp-dhr-evo-pro-oem-commencal', 'factory_installed',
   'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20v5/BT4MTRV5SGEU3.html?lang=en_US', '2026-08-17',
   'Official COMMENCAL page lists TRP DH-R EVO PRO 4-piston brakes with R2 203 mm rotors. Specifications are subject to change without notice.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
