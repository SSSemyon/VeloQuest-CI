-- VeloQuest catalog enrichment wave 24.
-- Exact first-party Giant and Corratec product pages only. Adds explicit OEM
-- specs, manufacturer media and factory-installed component evidence. No
-- compatibility, manufacturer-approved upgrade, or no-upgrade outcome is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Advanced-grade composite","wheel_size":"700C","fork":"Advanced SL-Grade Composite, Full-Composite OverDrive Aero Steerer, 12x100mm thru-axle, Disc","drivetrain_brand":"SRAM","drivetrain":"SRAM Force AXS","rear_derailleur":"SRAM Force AXS","brakes":"SRAM Force AXS HRD, Centerline 160mm center-lock [F] 160mm 6-bols [R]","cassette":"SRAM Force XG-1270 10x33T 12-speed","crankset":"SRAM Force X-SYNC 33/46T BCD107 chain ring Praxis E Crank Carbon ISIS","bottom_bracket":"Giant E+ System BBSS","wheelset":"Giant SLR 1 E+ 36 Carbon Disc Wheel System, Hookless, Tubeless Ready","tires":"Cadex Classic, tubeless, 700x32, folding","motor":"SyncDriveMove Plus Hub drive 75Nm max","battery_wh":400,"spec_evidence":"official Giant exact 2026 Defy Advanced E+ Elite 1 product page"}'::jsonb,
    manufacturer_url = 'https://www.giant-bicycles.com/us/defy-advanced-eplus-elite-1',
    evidence_checked_at = '2026-08-17'
where id = 'giant-defy-advanced-eplus-elite-1-2026-us';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"622-24","drivetrain_brand":"Shimano","drivetrain":"SHIMANO CUES 2x10","rear_derailleur":"SHIMANO RD-U6020 CUES 10-SPEED","front_derailleur":"SHIMANO FD-6030F CUES 2-SPEED","brakes":"SHIMANO BR-U6030 CUES 160","cassette":"SHIMANO CS-LG300-10 CUES 10-SPEED 11-39T","crankset":"SHIMANO FC-U6030 CUES 2-SPEED 172.5/165mm 50/34T","wheelset":"622-24 12x100 / 12x142 Centerlock","tires":"SCHWALBE G-One Overland 365 Reflex 50-622","weight_kg":13.95,"spec_evidence":"official Corratec exact 2026 Allroad Travel EQ product page; frame material intentionally left unknown because the page does not state it"}'::jsonb,
    manufacturer_url = 'https://www.corratec.com/en/Bikes/oxid-oxid/Road-E-Gravel/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html',
    evidence_checked_at = '2026-08-17'
where id = 'corratec-allroad-travel-eq-2026-global';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('giant-defy-advanced-eplus-elite-1-2026-us',
   'https://images2.giant-bicycles.com/b_white%2Cc_pad%2Ch_100%2Cq_90%2Cw_100/sc6suv0fyyjjzxihrdlh/MY26DefyAdvancedEElite1_ColorA.jpg',
   'manufacturer', 'Giant', 'https://www.giant-bicycles.com/us/defy-advanced-eplus-elite-1', 20, '2026-08-17', true),
  ('corratec-allroad-travel-eq-2026-global',
   'https://www.corratec.com/out/pictures/master/product/1/9a41dbbf-a15c-470e-9677-f1e23a08ac2e.jpg',
   'manufacturer', 'Corratec', 'https://www.corratec.com/en/Bikes/oxid-oxid/Road-E-Gravel/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', 10, '2026-08-17', true)
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
  ('sram-force-axs-oem-giant-2026', 'SRAM', 'Force AXS', 'rear_derailleur', 'SRAM Force AXS',
   '{"evidence_scope":"OEM exact-product label; exact SRAM derailleur SKU not inferred"}'::jsonb,
   1, 'https://www.giant-bicycles.com/us/defy-advanced-eplus-elite-1', '2026-08-17', true),
  ('sram-force-axs-hrd-oem-giant-2026', 'SRAM', 'Force AXS HRD', 'brake_caliper', 'SRAM Force AXS HRD',
   '{"rotor_front_mm":160,"evidence_scope":"OEM exact-product label; exact SRAM brake SKU not inferred"}'::jsonb,
   1, 'https://www.giant-bicycles.com/us/defy-advanced-eplus-elite-1', '2026-08-17', true),
  ('shimano-rd-u6020-cues', 'Shimano', 'RD-U6020', 'rear_derailleur', 'SHIMANO RD-U6020 CUES 10-SPEED',
   '{"speeds":10,"family":"CUES","evidence_scope":"Corratec exact-product OEM listing"}'::jsonb,
   1, 'https://www.corratec.com/en/Bikes/oxid-oxid/Road-E-Gravel/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-17', true),
  ('shimano-br-u6030-cues-oem', 'Shimano', 'BR-U6030', 'brake_caliper', 'SHIMANO BR-U6030 CUES 160',
   '{"rotor_mm":160,"evidence_scope":"Corratec exact-product OEM listing"}'::jsonb,
   1, 'https://www.corratec.com/en/Bikes/oxid-oxid/Road-E-Gravel/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-17', true)
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
  ('giant-defy-advanced-eplus-elite-1-2026-us', 'sram-force-axs-oem-giant-2026', 'factory_installed',
   'https://www.giant-bicycles.com/us/defy-advanced-eplus-elite-1', '2026-08-17',
   'Official Giant Defy Advanced E+ Elite 1 (2026) product page explicitly lists SRAM Force AXS as rear derailleur. Exact SRAM SKU is intentionally not inferred.'),
  ('giant-defy-advanced-eplus-elite-1-2026-us', 'sram-force-axs-hrd-oem-giant-2026', 'factory_installed',
   'https://www.giant-bicycles.com/us/defy-advanced-eplus-elite-1', '2026-08-17',
   'Official Giant product page explicitly lists SRAM Force AXS HRD brakes.'),
  ('corratec-allroad-travel-eq-2026-global', 'shimano-rd-u6020-cues', 'factory_installed',
   'https://www.corratec.com/en/Bikes/oxid-oxid/Road-E-Gravel/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-17',
   'Official Corratec Allroad Travel EQ 2026 product page explicitly lists SHIMANO RD-U6020 CUES 10-SPEED.'),
  ('corratec-allroad-travel-eq-2026-global', 'shimano-br-u6030-cues-oem', 'factory_installed',
   'https://www.corratec.com/en/Bikes/oxid-oxid/Road-E-Gravel/Allroad-Travel-EQ-Bronze-Dark-Bronze-46.html', '2026-08-17',
   'Official Corratec product page explicitly lists SHIMANO BR-U6030 CUES 160 front and rear brakes.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
