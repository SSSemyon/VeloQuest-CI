-- VeloQuest catalog expansion wave 13.
-- Evidence policy: first-party only. Model years are explicit on the manufacturer
-- page/archive. Archive-only rows stay intentionally shallow; exact product pages
-- carry deeper factory specs and fitment. Unknown compatibility stays default-deny.

begin;

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  -- COMMENCAL: exact product pages / official category pages explicitly mark years.
  ('commencal-meta-v5-signature-2025-us', 'COMMENCAL', 'META V5 Signature Glittery White', 2025, 'enduro_full_suspension', 'us',
   '{"frame_material":"aluminium","wheel_size":"29","front_travel_mm":160,"rear_travel_mm":150,"fork":"FOX 36 Float Factory Grip X2","rear_shock":"FOX Float X Factory 210x55 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle T-Type 1x12","rear_derailleur":"SRAM GX Eagle T-Type","cassette":"SRAM XG 1275 Eagle 10-52T 12-speed","crankset":"SRAM X0 Eagle T-Type 32T","brake_type":"hydraulic_disc","brakes":"TRP DH-R EVO PRO 4-piston; 203 mm rotors","wheelset":"DT Swiss EX 1700 29","hubs":"DT Swiss 350 Boost","tires":"Schwalbe Magic Mary 29x2.4 front / Tacky Chan 29x2.4 rear","spec_evidence":"official COMMENCAL exact 2025 product specification"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20v5/BT4MTRV5SGEU3.html?lang=en_US', '2026-08-08'),
  ('commencal-meta-sx-v5-signature-2026-us', 'COMMENCAL', 'META SX V5 Signature Pure White', 2026, 'enduro_full_suspension', 'us',
   '{"frame_material":"aluminium","wheel_size":"29 front / 27.5 rear","front_travel_mm":170,"rear_travel_mm":165,"fork":"FOX 38 Float Factory","rear_shock":"FOX Float X2 Factory","drivetrain_brand":"SRAM","drivetrain":"SRAM Eagle 90 / GX T-Type 1x12","rear_derailleur":"SRAM Eagle 90","cassette":"SRAM GX T-Type 10-52T 12-speed","crankset":"SRAM X0 T-Type 32T","brake_type":"hydraulic_disc","brakes":"Shimano XT 4-piston; MT905 203 mm rotors","wheelset":"DT Swiss EX 1700 mixed","hubs":"DT Swiss 350; 15x110 front / 12x148 rear","spec_evidence":"official COMMENCAL exact 2026 product specification"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US', '2026-08-08'),
  ('commencal-meta-sx-v5-essential-2026-us', 'COMMENCAL', 'META SX V5 Essential Pure White', 2026, 'enduro_full_suspension', 'us',
   '{"family_level":true,"wheel_size":"29 front / 27.5 rear","front_travel_mm":170,"rear_travel_mm":165,"model_year_evidence":"official COMMENCAL META SX V5 category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/', '2026-08-08'),
  ('commencal-supreme-dh-v5-signature-2026-us', 'COMMENCAL', 'SUPREME DH V5 Signature Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"suspension":"front_and_rear","model_year_evidence":"official COMMENCAL downhill category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/', '2026-08-08'),
  ('commencal-supreme-dh-v5-rockshox-2026-us', 'COMMENCAL', 'SUPREME DH V5 RockShox Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"suspension":"front_and_rear","model_year_evidence":"official COMMENCAL downhill category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/', '2026-08-08'),
  ('commencal-supreme-dh-v5-xs-2026-us', 'COMMENCAL', 'SUPREME DH V5 XS Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"suspension":"front_and_rear","model_year_evidence":"official COMMENCAL downhill category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/', '2026-08-08'),
  ('commencal-supreme-dh-v5-ride-2026-us', 'COMMENCAL', 'SUPREME DH V5 Ride Pyrite Grey', 2026, 'downhill', 'us',
   '{"family_level":true,"suspension":"front_and_rear","model_year_evidence":"official COMMENCAL downhill category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/', '2026-08-08'),
  ('commencal-frs-signature-2026-us', 'COMMENCAL', 'FRS Signature Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"wheel_size":"27.5","suspension":"front_and_rear","model_year_evidence":"official COMMENCAL FRS category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/frs/', '2026-08-08'),
  ('commencal-frs-rockshox-2026-us', 'COMMENCAL', 'FRS RockShox Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"wheel_size":"27.5","suspension":"front_and_rear","model_year_evidence":"official COMMENCAL FRS category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/frs/', '2026-08-08'),
  ('commencal-frs-park-2026-us', 'COMMENCAL', 'FRS Park Pure White', 2026, 'downhill', 'us',
   '{"family_level":true,"wheel_size":"27.5","suspension":"front_and_rear","model_year_evidence":"official COMMENCAL FRS category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/frs/', '2026-08-08'),
  ('commencal-frs-essential-2025-us', 'COMMENCAL', 'FRS Essential Pure White', 2025, 'downhill', 'us',
   '{"family_level":true,"wheel_size":"27.5","suspension":"front_and_rear","model_year_evidence":"official COMMENCAL FRS category lists this exact 2025 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/downhill/frs/', '2026-08-08'),
  ('commencal-clash-essential-2026-us', 'COMMENCAL', 'CLASH Essential Pure White', 2026, 'enduro_full_suspension', 'us',
   '{"family_level":true,"suspension":"front_and_rear","model_year_evidence":"official COMMENCAL enduro category lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/enduro/', '2026-08-08'),
  ('commencal-meta-ht-v3-signature-2026-us', 'COMMENCAL', 'META HT V3 Signature Pure White', 2026, 'trail_hardtail', 'us',
   '{"family_level":true,"model_year_evidence":"official COMMENCAL bike catalogue lists this exact 2026 trim"}'::jsonb,
   'https://www.commencal.com/us/en/bikes/bikes/', '2026-08-08'),

  -- Propain: official Tech Archive explicitly records generation start years.
  ('propain-ekano-al-3-enduro-2026-global', 'Propain', 'Ekano AL 3 Enduro', 2026, null, 'global',
   '{"family_level":true,"generation":3,"model_year_evidence":"official Propain Tech Archive: Ekano AL 3 Enduro since 2026"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-ekano-al-3-trail-2026-global', 'Propain', 'Ekano AL 3 Trail', 2026, null, 'global',
   '{"family_level":true,"generation":3,"model_year_evidence":"official Propain Tech Archive: Ekano AL 3 Trail since 2026"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-hugene-3-2025-global', 'Propain', 'Hugene 3 CF', 2025, 'trail_full_suspension', 'global',
   '{"frame_material":"carbon","wheel_size":"29","front_travel_mm":140,"rear_travel_mm":130,"model_year_evidence":"official Propain Tech Archive: Hugene 3 since 2025; current official product page confirms 29-inch / 140 front / 130 rear"}'::jsonb,
   'https://www.propain-bikes.com/us/product/bikes/trail/hugene-cf/', '2026-08-08'),
  ('propain-rage-cf-3r-2024-global', 'Propain', 'Rage CF 3R', 2024, null, 'global',
   '{"family_level":true,"generation":"3R","model_year_evidence":"official Propain Tech Archive: Rage CF 3R since 2024"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-spindrift-al-5-2024-global', 'Propain', 'Spindrift AL 5', 2024, null, 'global',
   '{"family_level":true,"generation":5,"model_year_evidence":"official Propain Tech Archive: Spindrift AL 5 since 2024"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-sresh-cf-1-2024-global', 'Propain', 'Sresh CF 1', 2024, null, 'global',
   '{"family_level":true,"generation":1,"model_year_evidence":"official Propain Tech Archive: Sresh CF 1 since 2024"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-sresh-sl-1-2024-global', 'Propain', 'Sresh SL 1', 2024, null, 'global',
   '{"family_level":true,"generation":1,"model_year_evidence":"official Propain Tech Archive: Sresh SL 1 since 2024"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-terrel-cf-1-2024-global', 'Propain', 'Terrel CF 1', 2024, 'gravel', 'global',
   '{"family_level":true,"generation":1,"model_year_evidence":"official Propain Tech Archive: Terrel CF 1 since 2024"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-trickshot-2-2025-global', 'Propain', 'Trickshot 2', 2025, null, 'global',
   '{"family_level":true,"generation":2,"model_year_evidence":"official Propain Tech Archive: Trickshot 2 since 2025"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-tyee-al-61-2025-global', 'Propain', 'Tyee AL 6.1', 2025, 'enduro_full_suspension', 'global',
   '{"family_level":true,"generation":"6.1","model_year_evidence":"official Propain Tech Archive: Tyee AL 6.1 since 2025"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-tyee-cf-61-2025-global', 'Propain', 'Tyee CF 6.1', 2025, 'enduro_full_suspension', 'global',
   '{"family_level":true,"generation":"6.1","model_year_evidence":"official Propain Tech Archive: Tyee CF 6.1 since 2025"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),
  ('propain-yuma-4-2025-global', 'Propain', 'Yuma 4', 2025, null, 'global',
   '{"family_level":true,"generation":4,"model_year_evidence":"official Propain Tech Archive: Yuma 4 since 2025"}'::jsonb,
   'https://service.propain-bikes.com/en_US/technical-archive/tech-archive', '2026-08-08'),

  -- Specialized: official Bike Archive gives explicit 2025 year; exact pages give factory build specs.
  ('specialized-stumpjumper-15-pro-2025-us', 'Specialized', 'Stumpjumper 15 Pro', 2025, 'trail_full_suspension', 'us',
   '{"frame_material":"carbon","wheel_size":"29 / mixed depending size","front_travel_mm":150,"rear_travel_mm":145,"fork":"FOX FLOAT 36 Factory GRIP X2","rear_shock":"FOX FLOAT Factory GENIE 210x55 mm (S2-S6)","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 Eagle Transmission AXS 1x12","rear_derailleur":"SRAM X0 Eagle Transmission","cassette":"SRAM X0 Eagle Transmission 10-52T 12-speed","crankset":"SRAM X0 Eagle 32T","brake_type":"hydraulic_disc","brakes":"SRAM Maven Silver 4-piston","wheelset":"Roval Traverse SL II carbon","hubs":"Industry Nine 1/1 Boost","tires":"Specialized Butcher T9 front / Eliminator T7 rear","rear_axle":"12x148","udh_compatible":true,"spec_evidence":"official Specialized exact 2025 product page and 2025 manual"}'::jsonb,
   'https://www.specialized.com/us/en/stumpjumper-15-pro-sram-x0-axs-fox-factory/p/4221403', '2026-08-08'),
  ('specialized-stumpjumper-15-expert-2025-us', 'Specialized', 'Stumpjumper 15 Expert', 2025, 'trail_full_suspension', 'us',
   '{"frame_material":"carbon","wheel_size":"29 / mixed depending size","rear_travel_mm":145,"drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle Transmission AXS 1x12","rear_derailleur":"SRAM GX Eagle Transmission","cassette":"SRAM GX Eagle Transmission 10-52T 12-speed","crankset":"SRAM GX Eagle 32T","brake_type":"hydraulic_disc","brakes":"SRAM Maven Bronze 4-piston","wheelset":"Roval Traverse alloy","hubs":"DT Swiss 370 Boost","tires":"Specialized Butcher T9 front / Eliminator T7 rear","spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/stumpjumper-15-expert-sram-gx-axs-fox-performance-elite/p/4221401', '2026-08-08'),
  ('specialized-epic-8-pro-2025-us', 'Specialized', 'Epic 8 Pro', 2025, 'xc_full_suspension', 'us',
   '{"wheel_size":"29","front_travel_mm":120,"rear_travel_mm":120,"fork":"RockShox SID Ultimate 120 mm","rear_shock":"RockShox SIDLuxe Ultimate 190x45 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 AXS Transmission 1x12","rear_derailleur":"SRAM X0 AXS Transmission","cassette":"SRAM XS-1295 10-52T 12-speed","crankset":"SRAM X0 Eagle Quarq DUB","brake_type":"hydraulic_disc","brakes":"SRAM Level Silver Stealth 4-piston 180/160","wheelset":"Roval Control carbon","hubs":"DT Swiss 350 Boost","tires":"Specialized Fast Trak 29x2.35 front / Renegade 29x2.35 rear","spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503', '2026-08-08'),
  ('specialized-diverge-sport-carbon-2025-us', 'Specialized', 'Diverge Sport Carbon', 2025, 'gravel', 'us',
   '{"frame_material":"carbon","wheel_size":"700c","fork":"Future Shock 1.5 / FACT carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano GRX RX610/RX820 2x12","rear_derailleur":"Shimano GRX RD-RX820 12-speed","cassette":"Shimano 105 12-speed 11-36","crankset":"Shimano GRX RX610 46/30T","brake_type":"hydraulic_disc","brakes":"Shimano GRX RX400 hydraulic disc","wheelset":"DT Swiss G540","tires":"Specialized Pathfinder Pro 700x42","front_axle":"12x100","rear_axle":"12x142","spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/diverge-sport-carbon-shimano-grx/p/4223496', '2026-08-08'),
  ('specialized-tarmac-sl8-pro-ultegra-2025-us', 'Specialized', 'Tarmac SL8 Pro - Shimano Ultegra Di2', 2025, 'road_race', 'us',
   '{"frame_material":"carbon","wheel_size":"700c","drivetrain_brand":"Shimano","drivetrain":"Shimano Ultegra Di2 R8100 2x12","rear_derailleur":"Shimano Ultegra Di2 R8150","cassette":"Shimano Ultegra 11-30T 12-speed","crankset":"Shimano Ultegra R8100 52/36T with 4iiii Precision 3+","brake_type":"hydraulic_disc","wheelset":"Roval Rapide CL II carbon","tires":"S-Works Turbo 2BR 700x26","spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935', '2026-08-08'),
  ('specialized-roubaix-sl8-comp-2025-us', 'Specialized', 'Roubaix SL8 Comp', 2025, 'road_endurance', 'us',
   '{"frame_material":"carbon","wheel_size":"700c","fork":"Future Shock 3.2 / FACT carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano 105 Di2 2x12","rear_derailleur":"Shimano 105 Di2 R7150","cassette":"Shimano 105 11-36T 12-speed","crankset":"Shimano 105 50/34T","brake_type":"hydraulic_disc","brakes":"Shimano 105 hydraulic disc 160/160","wheelset":"DT Swiss G540","tires":"S-Works Mondo 2BR 700x32","front_axle":"12x100","rear_axle":"12x142","spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/roubaix-sl8-comp-shimano-105-di2/p/4221823', '2026-08-08'),
  ('specialized-crux-pro-2025-us', 'Specialized', 'Crux Pro', 2025, 'gravel', 'us',
   '{"frame_material":"carbon","wheel_size":"700c","drivetrain_brand":"SRAM","drivetrain":"SRAM Force XPLR eTap AXS 1x12","rear_derailleur":"SRAM Force XPLR eTap AXS","cassette":"SRAM XPLR XG-1251 10-44T 12-speed","crankset":"SRAM Force 1x 40T","brake_type":"hydraulic_disc","brakes":"SRAM Force eTap AXS hydraulic disc","wheelset":"Roval Terra CL carbon","tires":"Specialized Pathfinder Pro 700x38","front_axle":"12x100","rear_axle":"12x142","udh_compatible":true,"spec_evidence":"official Specialized exact 2025 product page"}'::jsonb,
   'https://www.specialized.com/us/en/crux-pro-sram-force-xplr-etap-axs/p/4223481', '2026-08-08')
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

-- Manufacturer-hosted remote media only. No image binary is copied into Supabase.
insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at)
values
  ('specialized-epic-8-pro-2025-us',
   'https://assets.specialized.com/i/specialized/90325-12_EPIC-8-PRO-LGNBLUTNT-LQDMET-YEL_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503', 10, '2026-08-08'),
  ('specialized-diverge-sport-carbon-2025-us',
   'https://assets.specialized.com/i/specialized/95425-61_DIVERGE-SPORT-CARBON-DOP-GUN_HERO?%24scom-pdp-gallery-image%24=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/diverge-sport-carbon-shimano-grx/p/4223496', 10, '2026-08-08'),
  ('specialized-tarmac-sl8-pro-ultegra-2025-us',
   'https://assets.specialized.com/i/specialized/94925-12_TARMAC-SL8-PRO-UDI2-CARB-METWHTSIL_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935', 10, '2026-08-08'),
  ('specialized-roubaix-sl8-comp-2025-us',
   'https://assets.specialized.com/i/specialized/94425-50_ROUBAIX-COMP-LGNBLUTNT-MORNMST_HERO?%24scom-pdp-gallery-image%24=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/roubaix-sl8-comp-shimano-105-di2/p/4221823', 10, '2026-08-08'),
  ('specialized-crux-pro-2025-us',
   'https://assets.specialized.com/i/specialized/91425-10_CRUX-PRO-CARB-DPLAKEMET-SMK_HERO?%24scom-pdp-gallery-image%24=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/crux-pro-sram-force-xplr-etap-axs/p/4223481', 10, '2026-08-08')
on conflict (bike_id, image_url) do update set
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_page_url = excluded.source_page_url,
  priority = excluded.priority,
  checked_at = excluded.checked_at,
  enabled = true;

-- Exact factory-installed component links. These reuse components whose identities
-- are separately evidenced by SRAM/Shimano first-party documentation.
insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('specialized-stumpjumper-15-pro-2025-us', 'sram-rd-x0-e-b1', 'factory_installed',
   'https://www.specialized.com/us/en/stumpjumper-15-pro-sram-x0-axs-fox-factory/p/4221403', '2026-08-08',
   'Specialized lists the SRAM X0 Eagle Transmission derailleur on the exact 2025 build.'),
  ('specialized-stumpjumper-15-pro-2025-us', 'sram-cs-xs-1295-a1', 'factory_installed',
   'https://www.specialized.com/us/en/stumpjumper-15-pro-sram-x0-axs-fox-factory/p/4221403', '2026-08-08',
   'Specialized lists the X0 Eagle Transmission 10-52T cassette; SRAM X0 groupset evidence identifies XS-1295.'),
  ('specialized-stumpjumper-15-expert-2025-us', 'sram-rd-gx-e-b1', 'factory_installed',
   'https://www.specialized.com/us/en/stumpjumper-15-expert-sram-gx-axs-fox-performance-elite/p/4221401', '2026-08-08',
   'Specialized lists the SRAM GX Eagle Transmission derailleur on the exact 2025 build.'),
  ('specialized-stumpjumper-15-expert-2025-us', 'sram-cs-xs-1275-a1', 'factory_installed',
   'https://www.specialized.com/us/en/stumpjumper-15-expert-sram-gx-axs-fox-performance-elite/p/4221401', '2026-08-08',
   'Specialized lists the GX Eagle Transmission 10-52T cassette; SRAM GX groupset evidence identifies XS-1275.'),
  ('specialized-epic-8-pro-2025-us', 'sram-rd-x0-e-b1', 'factory_installed',
   'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503', '2026-08-08',
   'Specialized lists SRAM X0 AXS Transmission on the exact 2025 Epic 8 Pro build.'),
  ('specialized-epic-8-pro-2025-us', 'sram-cs-xs-1295-a1', 'factory_installed',
   'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503', '2026-08-08',
   'Specialized explicitly lists SRAM XS-1295 10-52T on the exact 2025 build.'),
  ('specialized-diverge-sport-carbon-2025-us', 'shimano-rd-rx820', 'factory_installed',
   'https://www.specialized.com/us/en/diverge-sport-carbon-shimano-grx/p/4223496', '2026-08-08',
   'Specialized explicitly lists Shimano GRX RX820 12-speed rear derailleur.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
