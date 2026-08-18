-- SOURCE: supabase/schema/catalog_enrichment_wave_21_rocky_mountain_media_fitment_2026_08_17.sql
-- VeloQuest catalog enrichment wave 21.
-- Exact first-party Rocky Mountain product pages only. Adds official remote
-- media, missing core specs and explicitly listed factory-installed components.
-- The Shimano brake is stored under the exact OEM product-page label; no SKU,
-- fork travel, hydraulic type or compatibility relationship is inferred when
-- the exact product page does not state it. No upgrade recommendation is added.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FORM Alloy","wheel_size":"27.5 SM / 29 MD-LG-XL; MD-LG-XL MX compatible","rear_travel_mm":160,"fork":"Fox 38 Float EVOL GRIP2 Factory","rear_shock":"Fox DHX Coil Factory","brakes":"Shimano XT Trail 4 Piston","spec_evidence":"official Rocky Mountain exact 2025 Altitude Alloy 70 Coil product page"}'::jsonb,
    manufacturer_url = 'https://bikes.com/en-intl/products/altitude-a70-coil-25',
    evidence_checked_at = '2026-08-17'
where id = 'rocky-mountain-altitude-alloy-70-coil-2025-int';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"SMOOTHWALL Carbon","wheel_size":"27.5 XS / 29 SM-MD-LG-XL","rear_travel_mm":120,"fork":"Fox 34 Float Performance Elite","rear_shock":"Fox Float Performance Elite","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle Transmission Wireless","rear_derailleur":"SRAM GX Eagle Transmission","brakes":"SRAM Level Bronze Stealth 4 Piston","spec_evidence":"official Rocky Mountain exact 2025 Element Carbon 70 product page"}'::jsonb,
    manufacturer_url = 'https://bikes.com/en-intl/products/element-c70-25',
    evidence_checked_at = '2026-08-17'
where id = 'rocky-mountain-element-carbon-70-2025-int';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('rocky-mountain-altitude-alloy-70-coil-2025-int',
   'https://bikes.com/cdn/shop/files/Web_MY25_Altitude_A70_Coil_C2_29_Profile.jpg?v=1743703648',
   'manufacturer', 'Rocky Mountain', 'https://bikes.com/en-intl/products/altitude-a70-coil-25', 10, '2026-08-17', true),
  ('rocky-mountain-element-carbon-70-2025-int',
   'https://bikes.com/cdn/shop/files/Web_MY25_Element_C70_C2_29_Profile.jpg?v=1743703738',
   'manufacturer', 'Rocky Mountain', 'https://bikes.com/en-intl/products/element-c70-25', 10, '2026-08-17', true)
on conflict (bike_id, image_url) do update set
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_page_url = excluded.source_page_url,
  priority = excluded.priority,
  checked_at = excluded.checked_at,
  enabled = true;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('shimano-xt-trail-4-piston-oem', 'Shimano', 'XT Trail 4 Piston', 'brake_caliper', 'Shimano XT Trail 4 Piston',
   '{"pistons":4,"evidence_scope":"OEM exact-product label; exact Shimano SKU not inferred"}'::jsonb,
   1, 'https://bikes.com/en-intl/products/altitude-a70-coil-25', '2026-08-17', true),
  ('sram-rd-gx-e-b1', 'SRAM', 'RD-GX-E-B1', 'rear_derailleur', 'GX Eagle Transmission Derailleur',
   '{"speeds":12,"drivetrain":"1x12","max_cassette":"52T","protocol":"AXS","chain_technology":"T-Type"}'::jsonb,
   1, 'https://www.sram.com/en/sram/models/rd-gx-e-b1', '2026-08-17', true)
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
  ('rocky-mountain-altitude-alloy-70-coil-2025-int', 'shimano-xt-trail-4-piston-oem', 'factory_installed',
   'https://bikes.com/en-intl/products/altitude-a70-coil-25', '2026-08-17',
   'Official Rocky Mountain Altitude Alloy 70 Coil product page explicitly lists Shimano XT Trail 4 Piston. Exact Shimano SKU is intentionally not inferred.'),
  ('rocky-mountain-element-carbon-70-2025-int', 'sram-rd-gx-e-b1', 'factory_installed',
   'https://bikes.com/en-intl/products/element-c70-25', '2026-08-17',
   'Official Rocky Mountain Element Carbon 70 product page explicitly lists SRAM GX Eagle Transmission Wireless; SRAM identifies RD-GX-E-B1 as the GX Eagle Transmission derailleur.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
