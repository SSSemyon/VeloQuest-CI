-- VeloQuest catalog enrichment wave 06.
-- Enriches existing verified 2020+ bicycles; it does not broaden model-year claims.
-- All media remain remote HTTPS URLs. Component compatibility is default-deny.

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","wheel_size":"700c","drivetrain_brand":"Shimano","drivetrain":"Shimano GRX 820 2x12, 11-36","groupset":"Shimano GRX 820","rear_derailleur":"Shimano GRX 820 Shadow RD+","cassette":"Shimano 105 7100 11-36 12-speed","brake_type":"hydraulic_disc","brakes":"Shimano GRX 820 hydraulic disc, 160/160 mm CL800 rotors","wheelset":"DT Swiss G1800 Spline","tires":"Vittoria Terreno T50 700x40c tubeless-ready","front_axle":"12x100","rear_axle":"12x142","bottom_bracket":"BSA 68 mm threaded","udh_compatible":true,"max_tire_clearance_mm":48,"spec_evidence":"official Cannondale 2025 SuperX 3 product specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'cannondale-superx-3-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","wheel_size":"27.5 x 4.0","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore XT M8100 / SLX M7100 1x12","rear_derailleur":"Shimano Deore XT M8100","cassette":"Shimano SLX M7100 10-51 12-speed","brake_type":"hydraulic_disc","brakes":"SRAM Level TL; 180 mm front / 160 mm rear CenterLine rotors","wheelset":"Sun Ringle SRC / Mulefut SL 80 mm","tires":"45NRTH Vanhelga 27.5 x 4.0 tubeless-ready","front_axle":"15x150","rear_axle":"12x197","bottom_bracket":"BSA 100 mm threaded","seatpost_diameter_mm":30.9,"dropper_compatible":true,"max_chainring_teeth":32,"spec_evidence":"official Salsa archived 2025 Beargrease C XT build kit and frame specs"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'salsa-beargrease-c-xt-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","wheel_size":"29","front_travel_mm":160,"rear_travel_mm":150,"suspension_brand":"FOX","fork":"FOX 36 Float Performance","rear_shock":"FOX Float X Performance","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle","brake_type":"hydraulic_disc","weight_kg":15.21,"spec_evidence":"official Santa Cruz Hightower S 2025 product page"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'santa-cruz-hightower-s-2025-us';

update public.bike_catalog_models
set specs = specs || '{"drivetrain_brand":"Shimano","drivetrain":"Shimano Tiagra 2x10","brake_type":"hydraulic_disc","brakes":"Shimano Tiagra hydraulic disc, flat mount","spec_evidence":"official Trek Domane AL 4 Gen 4 product and 2026 pre-owned specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'trek-domane-al-4-gen-4-2026-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Ultegra R8170 Di2 12-speed","rear_derailleur":"Shimano Ultegra R8150 Di2","brake_type":"hydraulic_disc","brakes":"Shimano Ultegra BR-R8170 hydraulic disc","spec_evidence":"official Trek Madone SL 7 Gen 8 2026 pre-owned specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'trek-madone-sl-7-gen-8-2026-us';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at)
values
  ('salsa-beargrease-c-xt-2025-us',
   'https://www.salsacycles.com/cdn/shop/files/salsa-beargrease-c-xt-fat-bike-indigo-BK01372-1920x1080-uc-1.png?v=1736363830&width=1946',
   'manufacturer', 'Salsa', 'https://www.salsacycles.com/products/2025-beargrease-c-xt', 10, '2026-08-07'),
  ('cannondale-superx-3-2025-us',
   'https://embed.widencdn.net/img/dorelrl/oxr8zmqmc4/700px%401x/C25_C17045U_SuperX_Crb_3_RAW_PD.png',
   'manufacturer', 'Cannondale', 'https://www.cannondale.com/en-us/bikes/road/gravel/superx/superx-3/2025', 10, '2026-08-07'),
  ('santa-cruz-hightower-s-2025-us',
   'https://www.santacruzbicycles.com/cdn/shop/files/MY25_Hightower_C_S_GlossDayGreen_82a74e05-7149-4be3-a166-3a80b49091dc.png?crop=region&crop_height=3513&crop_left=90&crop_top=386&crop_width=5419&v=1732662007&width=5600',
   'manufacturer', 'Santa Cruz', 'https://www.santacruzbicycles.com/products/hightower-s-2025', 10, '2026-08-07'),
  ('santa-cruz-hightower-s-2025-us',
   'https://www.santacruzbicycles.com/cdn/shop/files/MY25_Hightower_C_S_MatteDeepPurple_c70207e1-71ad-4dfc-9e24-43306d8f6ad9.png?crop=region&crop_height=3513&crop_left=90&crop_top=386&crop_width=5419&v=1732662006&width=5600',
   'manufacturer', 'Santa Cruz', 'https://www.santacruzbicycles.com/products/hightower-s-2025', 20, '2026-08-07')
on conflict (bike_id, image_url) do update set
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_page_url = excluded.source_page_url,
  priority = excluded.priority,
  checked_at = excluded.checked_at,
  enabled = true;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('shimano-rd-rx820', 'Shimano', 'RD-RX820', 'rear_derailleur', 'GRX RD-RX820',
   '{"speeds":12,"drivetrain":"2x12","compatible_chain":"HG 12-speed","largest_sprocket_range":"34-36T"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/RD-RX820', '2026-08-07'),
  ('shimano-cs-hg710-12', 'Shimano', 'CS-HG710-12', 'cassette', 'CS-HG710-12 11-36T',
   '{"speeds":12,"range":"11-36T","compatible_chain":"HG 12-speed"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/CS-HG710-12', '2026-08-07'),
  ('shimano-br-rx820', 'Shimano', 'BR-RX820', 'brake_caliper', 'GRX BR-RX820',
   '{"brake_type":"hydraulic_disc","mount":"flat_mount"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/BR-RX820', '2026-08-07'),
  ('shimano-rd-m8100-sgs', 'Shimano', 'RD-M8100-SGS', 'rear_derailleur', 'DEORE XT RD-M8100-SGS',
   '{"speeds":12,"drivetrain":"1x12","compatible_chain":"HG 12-speed","largest_sprocket":"51T"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/RD-M8100-SGS', '2026-08-07'),
  ('shimano-cs-m7100-12', 'Shimano', 'CS-M7100-12', 'cassette', 'SLX CS-M7100-12 10-51T',
   '{"speeds":12,"range":"10-51T","freehub":"MICRO SPLINE","compatible_chain":"HG 12-speed"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/CS-M7100-12', '2026-08-07')
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
  ('shimano-rd-rx820', 'shimano-cs-hg710-12', 'compatible',
   'Shimano C-254 lists RD-RX820 for 2x12 with an 11-36T cassette; CS-HG710-12 is Shimano HG 12-speed 11-36T.',
   'https://productinfo.shimano.com/en/compatibility/C-254', '2026-08-07'),
  ('shimano-rd-m8100-sgs', 'shimano-cs-m7100-12', 'compatible',
   'Shimano 2026-2027 MTB compatibility lists RD-M8100-SGS with 10-51T 12-speed cassettes including CS-M7100-12.',
   'https://productinfo.shimano.com/pdfs/product/thisyear/2026-2027_Compatibility_v024_en.pdf', '2026-08-07')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;
