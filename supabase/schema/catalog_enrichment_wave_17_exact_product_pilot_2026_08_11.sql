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
