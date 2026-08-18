-- VeloQuest catalog enrichment wave 09.
-- Deepens five existing 2025 BMC archive bikes using exact first-party product pages.
-- Adds only component identities and compatibility pairs that can be corroborated
-- by BMC + Shimano/SRAM first-party evidence. Wheel diameter remains unknown where
-- the BMC technical overview does not state it explicitly.

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Premium Aluminium","frame":"257 AMP Premium Aluminium; integrated battery; 12x142 mm thru-axle","fork":"257 Premium Aluminium; 12x100 mm thru-axle","motor":"Bosch Performance Line Speed","motor_brand":"Bosch","battery":"Bosch PowerTube 625 Wh","battery_wh":625,"display":"Bosch Kiox","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 1x11","rear_derailleur":"Shimano CUES RD-U8000","cassette":"Shimano CUES CS-LG700-11 11-50T","crankset":"Miranda Classic x Bosch CF3D; 46T","brakes":"TEKTRO TRP HD; 180/160 mm rotors","rims":"E-SRX30","hubs":"CL-712 front; ECT-142S rear","tires":"Pirelli Angel GT 37 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":42,"spec_evidence":"official BMC 2025 Edition 257 AMP AL SPEED ONE USA archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/257-amp-al-speed-one-usa-bikes-bmc-25e-000013',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-257-amp-al-speed-one-usa-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Premium Aluminium","frame":"URS Premium Aluminium; 12x142 mm thru-axle","fork":"URS Carbon; 12x100 mm thru-axle","drivetrain_brand":"SRAM","drivetrain":"SRAM Apex Eagle 1x12","rear_derailleur":"SRAM Apex Eagle","cassette":"SRAM NX Eagle 11-50T","crankset":"SRAM Apex 1 DUB WIDE; 40T","bottom_bracket":"PF86","brakes":"SRAM Apex; Centerline Centerlock 160/160 mm rotors","rims":"DT Swiss C1850 SPLINE 23 mm","hubs":"CL-712 front; RXC-1425 rear","tires":"WTB Riddler 45 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":45,"spec_evidence":"official BMC 2025 Edition URS AL ONE archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/urs-al-one-bordeaux-red-gravel-exploration-bikes-bmc-25e-000012',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-urs-al-one-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Premium Aluminium","frame":"Alpenchallenge Premium Aluminium; 12x142 mm thru-axle","fork":"Alpenchallenge Premium Aluminium; 12x100 mm thru-axle","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle 1x12","rear_derailleur":"SRAM GX Eagle","cassette":"SRAM NX PG-1230 Eagle 11-50T","crankset":"SRAM S650 Eagle; 38T","bottom_bracket":"BSA threaded","brakes":"TEKTRO HD-EU818; 180/180 mm rotors","rims":"SR500","hubs":"CL-712 front; RXC-142S rear","tires":"Vittoria Randonneur 37 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":42,"spec_evidence":"official BMC 2025 Edition Alpenchallenge AL TWO archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-two-dark-petrol-lifestyle-active-bikes-bmc-25e-000009',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-alpenchallenge-al-two-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Premium Aluminium","frame":"Alpenchallenge Premium Aluminium; 12x142 mm thru-axle","fork":"Alpenchallenge Premium Aluminium; 12x100 mm thru-axle","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore 1x12","rear_derailleur":"Shimano Deore RD-M6100","cassette":"Shimano Deore CS-M6100 10-51T","crankset":"FSA Vero Pro; 40T","bottom_bracket":"BSA threaded","brakes":"TEKTRO HD-R280; 180/180 mm rotors","rims":"PFR300","hubs":"CL-712 front; CL-142M rear","tires":"Vittoria Randonneur 37 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":42,"spec_evidence":"official BMC 2025 Edition Alpenchallenge AL THREE archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-three-blackpetrol-lifestyle-active-bikes-bmc-25e-000010',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-alpenchallenge-al-three-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Premium Aluminium","frame":"Alpenchallenge Premium Aluminium; 12x142 mm thru-axle","fork":"Alpenchallenge Premium Aluminium; 12x100 mm thru-axle","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 1x11","rear_derailleur":"Shimano CUES RD-U6000","cassette":"Shimano CUES CS-LG400 11-50T","crankset":"FSA Vero Pro; 40T","bottom_bracket":"BSA threaded","brakes":"Shimano BL-MT200 / BR-UR300; SM-RT10 180/180 mm rotors","rims":"PFR300","hubs":"CL-712 front; RXC-142S rear","tires":"Vittoria Randonneur 37 mm","rear_axle":"12x142 mm thru-axle","front_axle":"12x100 mm thru-axle","max_tire_clearance_mm":42,"spec_evidence":"official BMC 2025 Edition Alpenchallenge AL FOUR archive technical overview"}'::jsonb,
    manufacturer_url = 'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-four-grey-black-lifestyle-active-bikes-bmc-25e-000011',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-alpenchallenge-al-four-2025-us';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('shimano-rd-u8000', 'Shimano', 'RD-U8000', 'rear_derailleur', 'CUES RD-U8000',
   '{"speeds":11,"system":"CUES LINKGLIDE","max_cassette":"50T"}'::jsonb, 2,
   'https://productinfo.shimano.com/en/product/RD-U8000', '2026-08-07'),
  ('shimano-cs-lg700-11', 'Shimano', 'CS-LG700-11', 'cassette', 'CS-LG700-11 LINKGLIDE 11-50T',
   '{"speeds":11,"range":"11-50T","system":"LINKGLIDE"}'::jsonb, 2,
   'https://productinfo.shimano.com/en/product/CS-LG700-11', '2026-08-07'),
  ('shimano-rd-u6000', 'Shimano', 'RD-U6000', 'rear_derailleur', 'CUES RD-U6000',
   '{"speeds":"11/10","system":"CUES LINKGLIDE","max_cassette":"50T"}'::jsonb, 2,
   'https://productinfo.shimano.com/en/product/RD-U6000', '2026-08-07'),
  ('shimano-cs-lg400-11', 'Shimano', 'CS-LG400-11', 'cassette', 'CS-LG400-11 LINKGLIDE 11-50T',
   '{"speeds":11,"range":"11-50T","system":"LINKGLIDE"}'::jsonb, 2,
   'https://productinfo.shimano.com/en/product/CS-LG400-11', '2026-08-07'),
  ('sram-cs-pg-1230-a1', 'SRAM', 'CS-PG-1230-A1', 'cassette', 'PG-1230 Eagle 11-50T',
   '{"speeds":12,"range":"11-50T","system":"Eagle","driver_body":"splined 8/9/10"}'::jsonb, 2,
   'https://www.sram.com/en/sram/models/cs-pg-1230-a1', '2026-08-07')
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

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('shimano-rd-u8000', 'shimano-cs-lg700-11', 'compatible',
   'Shimano CUES U8000 1x11 lineup pairs RD-U8000 with CS-LG700-11 11-50T.',
   'https://productinfo.shimano.com/en/lineup/cues-u8000-1x11', '2026-08-07'),
  ('shimano-rd-u6000', 'shimano-cs-lg400-11', 'compatible',
   'Shimano rear drivetrain compatibility lists RD-U6000 for 1x11 with 48-50T largest sprocket and CS-LG400-11 11-50T.',
   'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-07')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('bmc-257-amp-al-speed-one-usa-2025-us', 'shimano-rd-u8000', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/257-amp-al-speed-one-usa-bikes-bmc-25e-000013', '2026-08-07',
   'BMC explicitly lists Shimano CUES RD-U8000.'),
  ('bmc-257-amp-al-speed-one-usa-2025-us', 'shimano-cs-lg700-11', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/257-amp-al-speed-one-usa-bikes-bmc-25e-000013', '2026-08-07',
   'BMC explicitly lists Shimano CUES CS-LG700-11, 11-50T.'),
  ('bmc-alpenchallenge-al-four-2025-us', 'shimano-rd-u6000', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-four-grey-black-lifestyle-active-bikes-bmc-25e-000011', '2026-08-07',
   'BMC explicitly lists Shimano CUES RD-U6000.'),
  ('bmc-alpenchallenge-al-four-2025-us', 'shimano-cs-lg400-11', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-four-grey-black-lifestyle-active-bikes-bmc-25e-000011', '2026-08-07',
   'BMC lists CUES CS-LG400, 11-50T in a 1x11 drivetrain; Shimano canonical product is CS-LG400-11.'),
  ('bmc-alpenchallenge-al-three-2025-us', 'shimano-rd-m6100-sgs', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-three-blackpetrol-lifestyle-active-bikes-bmc-25e-000010', '2026-08-07',
   'BMC lists Deore RD-M6100 in a 1x12 drivetrain; Shimano canonical rear-derailleur product is RD-M6100-SGS.'),
  ('bmc-alpenchallenge-al-three-2025-us', 'shimano-cs-m6100-12', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-three-blackpetrol-lifestyle-active-bikes-bmc-25e-000010', '2026-08-07',
   'BMC lists Deore CS-M6100, 10-51T in a 1x12 drivetrain; Shimano canonical cassette product is CS-M6100-12.'),
  ('bmc-alpenchallenge-al-two-2025-us', 'sram-cs-pg-1230-a1', 'factory_installed',
   'https://us.bmc-switzerland.com/collections/bike-archive/products/alpenchallenge-al-two-dark-petrol-lifestyle-active-bikes-bmc-25e-000009', '2026-08-07',
   'BMC explicitly lists SRAM NX PG-1230 Eagle, 11-50T; SRAM product ID is CS-PG-1230-A1.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;
