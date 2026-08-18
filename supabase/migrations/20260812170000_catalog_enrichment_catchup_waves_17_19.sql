-- SOURCE: supabase/schema/catalog_enrichment_wave_17_exact_product_pilot_2026_08_11.sql
-- VeloQuest catalog enrichment wave 17.
-- Exact first-party product pages only. Missing fields remain unknown and no
-- component identity is inferred from a family or marketing name.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Advanced-grade composite","wheel_size":"700c","fork":"Advanced-grade composite full-composite OverDrive steerer","drivetrain_brand":"Shimano","drivetrain":"Shimano 105 2x12","groupset":"Shimano 105","rear_derailleur":"Shimano 105","cassette":"Shimano 105 11-36T","crankset":"Shimano 105 50/34T","bottom_bracket":"Shimano press fit","brake_type":"hydraulic_disc","brakes":"Shimano 105 hydraulic; SM-RT64 160/160 mm rotors","wheelset":"Giant P-R1 Disc alloy","hubs":"Giant alloy 12 mm thru-axle","tires":"Giant Gavia Fondo 1 tubeless 700x32c","max_tire_clearance_mm":40,"spec_evidence":"official Giant exact 2026 product specification"}'::jsonb,
    manufacturer_url = 'https://www.giant-bicycles.com/us/defy-advanced-2',
    evidence_checked_at = '2026-08-11'
where id = 'giant-defy-advanced-2-2026-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminium 6066 T4/T6","wheel_size":"29 front / 27.5 rear","front_travel_mm":170,"rear_travel_mm":165,"fork":"FOX 38 Factory 170 mm","rear_shock":"FOX Float X2 Factory 230x65 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM Eagle 90 / GX T-Type 1x12","rear_derailleur":"SRAM Eagle 90 12-speed","cassette":"SRAM GX T-Type 10-52T 12-speed","crankset":"SRAM X0 T-Type 32T","bottom_bracket":"SRAM DUB92 MTB Wide press fit","brake_type":"hydraulic_disc","brakes":"Shimano XT 4-piston; MT905 203 mm rotors","wheelset":"DT Swiss EX1700 29/27.5","hubs":"DT Swiss 350 15x110 front / 12x148 rear","tires":"Maxxis Assegai 29x2.5 front / DHR II 27.5x2.5 rear","weight_kg":16.3,"spec_evidence":"official COMMENCAL exact 2026 product specification"}'::jsonb,
    manufacturer_url = 'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US',
    evidence_checked_at = '2026-08-11'
where id = 'commencal-meta-sx-v5-signature-2026-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminium 6061-T6","wheel_size":"29 front / 27.5 rear","front_travel_mm":160,"rear_travel_mm":140,"fork":"RockShox Lyrik Select 160 mm","rear_shock":"RockShox Super Deluxe 210x55 mm","motor":"Panasonic GXM AMXXPRO","motor_torque_nm":105,"battery_wh":900,"drivetrain_brand":"Shimano","drivetrain":"Shimano Deore XT Di2 M8250 1x12","rear_derailleur":"Shimano Deore XT Di2 M8250","cassette":"Shimano CS-M7100-12 10-51T","crankset":"Miranda 34T 170 mm","brake_type":"hydraulic_disc","brakes":"Shimano Deore XT M8120; Galfer 203/203 mm rotors","hubs":"Shimano Deore XT M8210-B","wheelset":"DT Swiss H 552 29/27.5","tires":"Schwalbe Albert 29x2.5 front / 27.5x2.5 rear","weight_kg":22.98,"spec_evidence":"official Kellys exact 2026 product specification"}'::jsonb,
    manufacturer_url = 'https://kellysbike.com/e-fullsuspension/theos-rs90-p-royal-purple-29-27-5-900-wh_11011',
    evidence_checked_at = '2026-08-11'
where id = 'kellys-theos-rs90-p-royal-purple-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Gravelator Premium Carbon R6990","wheel_size":"700c","fork":"Gravel Carbon Fork F18 Race","drivetrain_brand":"SRAM","drivetrain":"SRAM RED XPLR AXS 1x13","rear_derailleur":"SRAM RED XPLR AXS 13-speed","cassette":"SRAM RED XPLR XG-1391 10-46T","crankset":"SRAM RED XPLR AXS 42T","brake_type":"hydraulic_disc","brakes":"SRAM RED AXS HRD; Paceline-X Center Lock 160/160 mm","wheelset":"Zipp 303 XPLR SW","tires":"Goodyear XPLR Intermediate 45-622","weight_kg":7.8,"spec_evidence":"official KTM exact 2026 product specification"}'::jsonb,
    manufacturer_url = 'https://www.ktm-bikes.at/bikes/detail/mx1260460115-gravelator-exonic-m-55-mx1260460115-gravelator-exonic-spotted-white-ornge-blk-grey-1x13-sram-red-xplr-axs-2026',
    evidence_checked_at = '2026-08-11'
where id = 'ktm-gravelator-exonic-2026-global';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('giant-defy-advanced-2-2026-us',
   'https://images2.giant-bicycles.com/b_white%2Cc_pad%2Ch_100%2Cq_90%2Cw_100/ln09xatfxrvyqelva1lt/MY26DefyAdvanced2_ColorAAbyssBlack.jpg',
   'manufacturer', 'Giant', 'https://www.giant-bicycles.com/us/defy-advanced-2', 10, '2026-08-11', true)
on conflict (bike_id, image_url) do update set
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_page_url = excluded.source_page_url,
  priority = excluded.priority,
  checked_at = excluded.checked_at,
  enabled = true;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('kellys-theos-rs90-p-royal-purple-2026-global', 'shimano-cs-m7100-12', 'factory_installed',
   'https://kellysbike.com/e-fullsuspension/theos-rs90-p-royal-purple-29-27-5-900-wh_11011', '2026-08-11',
   'Official exact Kellys specification lists Shimano CS-M7100-12 10-51T.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;

-- SOURCE: supabase/schema/catalog_enrichment_wave_18_specialized_exact_2026_08_11.sql
-- VeloQuest catalog enrichment wave 18.
-- Exact first-party Specialized product pages and first-party Shimano/SRAM
-- compatibility evidence only. Unknown identities remain unknown.

begin;

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 11m carbon","wheel_size":"29","front_travel_mm":130,"rear_travel_mm":120,"fork":"FOX 34 Performance Elite Grip X 130 mm","rear_shock":"FOX Float Performance Elite 190x45 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX AXS Transmission 1x12","rear_derailleur":"SRAM GX AXS Transmission","cassette":"SRAM XS-1275 10-52T 12-speed","crankset":"SRAM GX Eagle DUB 32T","bottom_bracket":"SRAM DUB Threaded Wide","brake_type":"hydraulic_disc","brakes":"SRAM Code Bronze Stealth 4-piston; 180/200 mm front, 180 mm rear","wheelset":"Roval Control carbon","hubs":"Industry Nine 1/1 15x110 front / 12x148 XD rear","tires":"Specialized Purgatory 29x2.4 front / Ground Control 29x2.35 rear","weight_kg":12.16,"spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/epic-8-evo-expert-sram-gx-axs-fox-performance-elite/p/4275710', evidence_checked_at = '2026-08-11'
where id = 'specialized-epic-8-evo-expert-sram-gx-axs-fox-performance-elite-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 9r carbon","wheel_size":"700c","fork":"Future Shock 2.0","drivetrain_brand":"SRAM","drivetrain":"SRAM Apex eTap AXS / X1 Eagle AXS 1x12","rear_derailleur":"SRAM X1 Eagle AXS","cassette":"SRAM PG-1210 11-50T 12-speed","crankset":"SRAM Apex DUB Wide 40T","bottom_bracket":"SRAM DUB BSA","brake_type":"hydraulic_disc","brakes":"SRAM Apex eTap AXS hydraulic disc","wheelset":"DT Swiss G540 tubeless-ready","tires":"Specialized Pathfinder Pro 2BR 700x42","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/diverge-comp-carbon-sram-apex-etap-axs/p/4223498', evidence_checked_at = '2026-08-11'
where id = 'specialized-diverge-comp-carbon-sram-apex-etap-axs-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 9r carbon","wheel_size":"700c","fork":"FACT carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano 105 mechanical 2x12","groupset":"Shimano 105","rear_derailleur":"Shimano 105 12-speed mechanical","cassette":"Shimano 105 11-34T 12-speed","crankset":"Shimano 105 52/36T","bottom_bracket":"Shimano threaded BSA","brake_type":"hydraulic_disc","brakes":"Shimano 105 hydraulic; 160 mm front / 140 mm rear","wheelset":"DT R470 Disc","tires":"Specialized Turbo Pro 700x26","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/tarmac-sl7-sport-shimano-105/p/4221542', evidence_checked_at = '2026-08-11'
where id = 'specialized-tarmac-sl7-sport-shimano-105-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 10r carbon","wheel_size":"700c","fork":"Future Shock 3.2 / FACT carbon","drivetrain_brand":"SRAM","drivetrain":"SRAM Rival eTap AXS 2x12","groupset":"SRAM Rival eTap AXS","rear_derailleur":"SRAM Rival eTap AXS 12-speed","cassette":"SRAM XG-1250 10-36T","crankset":"SRAM Rival AXS power 46/33T","bottom_bracket":"SRAM DUB BSA","brake_type":"hydraulic_disc","brakes":"SRAM Rival hydraulic; 160/160 mm","wheelset":"Roval Terra C carbon","hubs":"DT 370","tires":"S-Works Mondo 2BR 700x32c","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/roubaix-sl8-expert-sram-rival-etap-axs/p/4221821', evidence_checked_at = '2026-08-11'
where id = 'specialized-roubaix-sl8-expert-sram-rival-etap-axs-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"E5 Premium aluminum","wheel_size":"700c","fork":"S-Works FACT carbon","drivetrain_brand":"SRAM","drivetrain":"SRAM Apex XPLR mechanical 1x12","rear_derailleur":"SRAM Apex XPLR mechanical","cassette":"SRAM PG-1231 XPLR 11-44T","crankset":"SRAM Apex XPLR 40T","bottom_bracket":"SRAM DUB BSA 68 Wide","brake_type":"hydraulic_disc","brakes":"SRAM Apex hydraulic disc","wheelset":"DT G540 tubeless-ready","tires":"Specialized Pathfinder Pro 2BR 700x38","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/crux-dsw-comp-sram-apex-xplr/p/4221802', evidence_checked_at = '2026-08-11'
where id = 'specialized-crux-dsw-comp-sram-apex-xplr-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"M5 aluminum","wheel_size":"29","front_travel_mm":120,"rear_travel_mm":110,"fork":"RockShox SID Rush 120 mm","rear_shock":"RockShox Deluxe Select+ 190x40 mm","drivetrain_brand":"Shimano","drivetrain":"Shimano SLX M7100 / Deore M6100 1x12","rear_derailleur":"Shimano SLX RD-M7100-SGS","cassette":"Shimano Deore CS-M6100-12 10-51T","crankset":"Shimano MT-511 32T","bottom_bracket":"Shimano BB-MT501 BSA","brake_type":"hydraulic_disc","brakes":"Shimano M6100 2-piston; 180 mm front / 160 mm rear","wheelset":"Specialized alloy tubeless-ready 27 mm","hubs":"Shimano MT410-B Micro Spline","tires":"Specialized Ground Control 29x2.35 front / Fast Trak 29x2.35 rear","weight_kg":12.86,"spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/chisel-comp-shimano/p/4274028', evidence_checked_at = '2026-08-11'
where id = 'specialized-chisel-comp-shimano-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 10r carbon","wheel_size":"700c","fork":"Tarmac SL8 FACT 10r carbon","drivetrain_brand":"SRAM","drivetrain":"SRAM Force eTap AXS 2x12","groupset":"SRAM Force eTap AXS","rear_derailleur":"SRAM Force eTap AXS 12-speed","cassette":"SRAM Force 10-33T 12-speed","crankset":"SRAM Force DUB power 48/35T","bottom_bracket":"SRAM DUB BSA 68","brake_type":"hydraulic_disc","brakes":"SRAM Force eTap AXS hydraulic; 160/160 mm","wheelset":"Roval Rapide CL II carbon","hubs":"DT Swiss 350","tires":"S-Works Turbo 2BR 700x26","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/tarmac-sl8-pro-sram-force-etap-axs/p/4221537', evidence_checked_at = '2026-08-11'
where id = 'specialized-tarmac-sl8-pro-sram-force-etap-axs-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 10r carbon","wheel_size":"700c","fork":"FACT 10r carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Ultegra Di2 R8150 2x12","groupset":"Shimano Ultegra Di2","rear_derailleur":"Shimano RD-R8150 Di2","cassette":"Shimano Ultegra 12-speed 11-30T","crankset":"Shimano Ultegra R8100 52/36T with 4iiii power meter","bottom_bracket":"Shimano threaded BSA","brake_type":"hydraulic_disc","brakes":"Shimano Ultegra R8170 hydraulic; 160 mm front / 140 mm rear","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935', evidence_checked_at = '2026-08-11'
where id = 'specialized-tarmac-sl8-pro-shimano-ultegra-di2-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 12r carbon","wheel_size":"700c","fork":"S-Works FACT 12r carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Dura-Ace Di2 R9250 2x12","groupset":"Shimano Dura-Ace Di2","rear_derailleur":"Shimano RD-R9250 Di2","cassette":"Shimano Dura-Ace 12-speed 11-30T","crankset":"Shimano Dura-Ace R9200 52/36T with 4iiii power meter","bottom_bracket":"Shimano Dura-Ace BB-R9200","brake_type":"hydraulic_disc","brakes":"Shimano Dura-Ace R9270 hydraulic; 160 mm front / 140 mm rear","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221536', evidence_checked_at = '2026-08-11'
where id = 'specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2025-global';

update public.bike_catalog_models set
  specs = specs || '{"frame_material":"FACT 10r carbon","wheel_size":"700c","fork":"FACT 10r carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Ultegra Di2 R8150 2x12","groupset":"Shimano Ultegra Di2","rear_derailleur":"Shimano RD-R8150 Di2","cassette":"Shimano Ultegra 12-speed 11-30T","crankset":"Shimano Ultegra R8100 52/36T","bottom_bracket":"Shimano threaded BSA","brake_type":"hydraulic_disc","brakes":"Shimano Ultegra R8170 hydraulic; 160 mm front / 140 mm rear","spec_evidence":"official Specialized exact 2025 product specification"}'::jsonb,
  manufacturer_url = 'https://www.specialized.com/us/en/tarmac-sl8-expert-shimano-ultegra-di2/p/4276209', evidence_checked_at = '2026-08-11'
where id = 'specialized-tarmac-sl8-expert-shimano-ultegra-di2-2025-global';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('specialized-diverge-comp-carbon-sram-apex-etap-axs-2025-global','https://assets.specialized.com/i/specialized/95425-50_DIVERGE-COMP-CARBON-BRCH-WHT_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/diverge-comp-carbon-sram-apex-etap-axs/p/4223498',10,'2026-08-11',true),
  ('specialized-tarmac-sl7-sport-shimano-105-2025-global','https://assets.specialized.com/i/specialized/90623-60_TARMAC-SL7-SPORT-CARB-METDKNVY_HERO?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/tarmac-sl7-sport-shimano-105/p/4221542',10,'2026-08-11',true),
  ('specialized-roubaix-sl8-expert-sram-rival-etap-axs-2025-global','https://assets.specialized.com/i/specialized/94425-31_ROUBAIX-EXPERT-VLTPRL-SILDST_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/roubaix-sl8-expert-sram-rival-etap-axs/p/4221821',10,'2026-08-11',true),
  ('specialized-crux-dsw-comp-sram-apex-xplr-2025-global','https://assets.specialized.com/i/specialized/91425-52_CRUX-DSW-COMP-BRCH-CLY_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/crux-dsw-comp-sram-apex-xplr/p/4221802',10,'2026-08-11',true),
  ('specialized-chisel-comp-shimano-2025-global','https://assets.specialized.com/i/specialized/93825-51_CHISEL-COMP-SHIMANO-DKMOS-LQDMET_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/chisel-comp-shimano/p/4274028',10,'2026-08-11',true),
  ('specialized-tarmac-sl8-pro-sram-force-etap-axs-2025-global','https://assets.specialized.com/i/specialized/94925-10_TARMAC-SL8-PRO-ETAP-CARB-METWHTSIL_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/tarmac-sl8-pro-sram-force-etap-axs/p/4221537',10,'2026-08-11',true),
  ('specialized-tarmac-sl8-pro-shimano-ultegra-di2-2025-global','https://assets.specialized.com/i/specialized/94925-13_TARMAC-SL8-PRO-UDI2-LQDMET-BLUPRL-BLKLQDMET_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935',10,'2026-08-11',true),
  ('specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2025-global','https://assets.specialized.com/i/specialized/94925-01_TARMAC-SL8-SW-DI2-SLDMET-REDPRL-METWHTSIL_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221536',10,'2026-08-11',true),
  ('specialized-tarmac-sl8-expert-shimano-ultegra-di2-2025-global','https://assets.specialized.com/i/specialized/94925-32_TARMAC-SL8-EXPERT-DI2-DPLAKEMET-GRNPRL_HERO-PDP?%24scom-pdp-gallery-image%24=&fmt=webp','manufacturer','Specialized','https://www.specialized.com/us/en/tarmac-sl8-expert-shimano-ultegra-di2/p/4276209',10,'2026-08-11',true)
on conflict (bike_id, image_url) do update set source_page_url=excluded.source_page_url, priority=excluded.priority, checked_at=excluded.checked_at, enabled=true;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('shimano-rd-r8150','Shimano','RD-R8150','rear_derailleur','Ultegra Di2 RD-R8150','{"speeds":12,"largest_sprocket_range":"30-34T"}'::jsonb,4,'https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11'),
  ('shimano-rd-r9250','Shimano','RD-R9250','rear_derailleur','Dura-Ace Di2 RD-R9250','{"speeds":12,"largest_sprocket_range":"30-34T"}'::jsonb,5,'https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11'),
  ('shimano-cs-r8101-12-11-34','Shimano','CS-R8101-12 11-34T','cassette','Ultegra CS-R8101-12 11-34T','{"speeds":12,"range":"11-34T","freehub":"HG spline L2"}'::jsonb,4,'https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11'),
  ('shimano-cs-r9200-12-11-34','Shimano','CS-R9200-12 11-34T','cassette','Dura-Ace CS-R9200-12 11-34T','{"speeds":12,"range":"11-34T","freehub":"HG spline L2"}'::jsonb,5,'https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11')
on conflict (id) do update set specs=excluded.specs, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, enabled=true;

insert into public.garage_compatibility
  (source_component_id,target_component_id,status,rule_summary,evidence_url,evidence_checked_at)
values
  ('shimano-rd-r8150','shimano-cs-r8101-12-11-34','compatible','Shimano C-454 lists RD-R8150 with 11-34T 12-speed road cassettes.','https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11'),
  ('shimano-rd-r9250','shimano-cs-r9200-12-11-34','compatible','Shimano C-454 lists RD-R9250 with 11-34T 12-speed road cassettes.','https://productinfo.shimano.com/en/compatibility/C-454','2026-08-11')
on conflict (source_component_id,target_component_id) do update set status=excluded.status, rule_summary=excluded.rule_summary, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
  ('specialized-epic-8-evo-expert-sram-gx-axs-fox-performance-elite-2025-global','sram-cs-xs-1275-a1','factory_installed','https://www.specialized.com/us/en/epic-8-evo-expert-sram-gx-axs-fox-performance-elite/p/4275710','2026-08-11','Official exact specification lists SRAM XS-1275 10-52T.'),
  ('specialized-chisel-comp-shimano-2025-global','shimano-cs-m6100-12','factory_installed','https://www.specialized.com/us/en/chisel-comp-shimano/p/4274028','2026-08-11','Official exact specification lists Shimano Deore M6100 10-51T cassette.'),
  ('specialized-tarmac-sl8-pro-shimano-ultegra-di2-2025-global','shimano-rd-r8150','factory_installed','https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935','2026-08-11','Official exact specification lists Shimano RD-R8150.'),
  ('specialized-tarmac-sl8-expert-shimano-ultegra-di2-2025-global','shimano-rd-r8150','factory_installed','https://www.specialized.com/us/en/tarmac-sl8-expert-shimano-ultegra-di2/p/4276209','2026-08-11','Official exact specification lists Shimano RD-R8150.'),
  ('specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2025-global','shimano-rd-r9250','factory_installed','https://www.specialized.com/us/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221536','2026-08-11','Official exact specification lists Shimano RD-R9250.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, notes=excluded.notes;

commit;

-- SOURCE: supabase/schema/catalog_enrichment_wave_19_norco_exact_fitment_2026_08_12.sql
-- VeloQuest catalog enrichment wave 19.
-- Exact first-party Norco 2025 Optic product specifications only.
-- Adds factory-installed component fitments; no inferred upgrade recommendation
-- or photo URL is added without separate first-party evidence.

begin;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('norco-optic-a1-gen3-2025-ca', 'sram-rd-gx-e-b1', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a1/', '2026-08-12',
   'Official Norco Optic A1 specification lists SRAM GX Eagle AXS T-Type rear derailleur.'),
  ('norco-optic-a1-gen3-2025-ca', 'sram-cs-xs-1275-a1', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a1/', '2026-08-12',
   'Official Norco Optic A1 specification lists SRAM 1275 Eagle T-Type 10-52T cassette.'),
  ('norco-optic-a2-gen3-2025-ca', 'shimano-rd-m6100-sgs', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a2/', '2026-08-12',
   'Official Norco Optic A2 specification lists Shimano Deore RD-M6100 12-speed rear derailleur.'),
  ('norco-optic-a2-gen3-2025-ca', 'shimano-cs-m6100-12', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a2/', '2026-08-12',
   'Official Norco Optic A2 specification lists Shimano Deore CS-M6100-12 10-51T cassette.'),
  ('norco-optic-a2-gen3-2025-ca', 'shimano-br-mt520', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a2/', '2026-08-12',
   'Official Norco Optic A2 specification lists Shimano Deore MT520 four-piston brakes.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
