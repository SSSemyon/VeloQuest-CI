-- VeloQuest manufacturer-first catalog ingestion wave.
-- Only bicycle model years 2020+ are eligible for bike_catalog_models.
-- Evidence comes from first-party manufacturer pages checked 2026-08-06.

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  ('giant-defy-advanced-sl-0-2026-us', 'Giant', 'Defy Advanced SL 0', 2026, 'road_endurance', 'US',
   '{"frame_material":"Advanced SL-grade composite","max_tire_clearance_mm":38}'::jsonb,
   'https://www.giant-bicycles.com/us/defy-advanced-sl-0', '2026-08-06'),
  ('giant-defy-advanced-eplus-elite-1-2026-us', 'Giant', 'Defy Advanced E+ Elite 1', 2026, 'electric_road_endurance', 'US',
   '{"frame_material":"Advanced-grade composite","wheel_size":"700C","motor":"SyncDrive Move Plus","motor_torque_nm":30,"battery_wh":400,"drivetrain_brand":"SRAM","drivetrain":"Force AXS","brake_type":"hydraulic_disc","front_axle":"12x100","rear_axle":"12x145"}'::jsonb,
   'https://www.giant-bicycles.com/us/defy-advanced-eplus-elite-1', '2026-08-06'),
  ('giant-defy-advanced-pro-2-2026-gb', 'Giant', 'Defy Advanced Pro 2', 2026, 'road_endurance', 'GB',
   '{"frame_material":"Advanced-grade composite","max_tire_clearance_mm":38}'::jsonb,
   'https://www.giant-bicycles.com/gb/defy-advanced-pro-2', '2026-08-06'),
  ('giant-defy-advanced-pro-1-2026-ca', 'Giant', 'Defy Advanced Pro 1', 2026, 'road_endurance', 'CA',
   '{"frame_material":"Advanced-grade composite"}'::jsonb,
   'https://www.giant-bicycles.com/ca/defy-advanced-pro-1', '2026-08-06'),
  ('giant-defy-advanced-0-2026-ba', 'Giant', 'Defy Advanced 0', 2026, 'road_endurance', 'BA',
   '{"frame_material":"Advanced-grade composite","max_tire_clearance_mm":38}'::jsonb,
   'https://www.giant-bicycles.com/ba/defy-advanced-0', '2026-08-06'),

  ('liv-langma-advanced-sl-0-2026-is', 'Liv', 'Langma Advanced SL 0', 2026, 'road_race', 'IS',
   '{"frame_material":"composite"}'::jsonb,
   'https://www.liv-cycling.com/is/langma-advanced-sl-0', '2026-08-06'),
  ('liv-langma-advanced-1-qom-2026-is', 'Liv', 'Langma Advanced 1 QOM', 2026, 'road_race', 'IS',
   '{"frame_material":"composite"}'::jsonb,
   'https://www.liv-cycling.com/is/langma-advanced-1-qom', '2026-08-06'),
  ('liv-langma-advanced-pro-1-pro-compact-2026-is', 'Liv', 'Langma Advanced Pro 1 (Pro Compact)', 2026, 'road_race', 'IS',
   '{"frame_material":"composite"}'::jsonb,
   'https://www.liv-cycling.com/is/langma-advanced-pro-1--pro-compact-', '2026-08-06'),
  ('liv-langma-advanced-2-qom-2026-is', 'Liv', 'Langma Advanced 2 QOM', 2026, 'road_race', 'IS',
   '{"frame_material":"composite"}'::jsonb,
   'https://www.liv-cycling.com/is/langma-advanced-2-qom', '2026-08-06'),

  ('trek-madone-slr-9-axs-gen-8-2026-us', 'Trek', 'Madone SLR 9 AXS Gen 8', 2026, 'road_race_aero', 'US',
   '{"drivetrain_brand":"SRAM","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/madone-slr-9-axs-gen-8--2026-medium/p/69689/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/madone-slr/madone-slr-9-axs-1x-gen-8/p/5344417/', '2026-08-06'),
  ('trek-madone-slr-7-axs-gen-8-2026-us', 'Trek', 'Madone SLR 7 AXS Gen 8', 2026, 'road_race_aero', 'US',
   '{"drivetrain_brand":"SRAM","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/madone-slr-7-axs-gen-8--2026-x-small/p/80453/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/f/F213/', '2026-08-06'),
  ('trek-madone-sl-7-gen-8-2026-us', 'Trek', 'Madone SL 7 Gen 8', 2026, 'road_race_aero', 'US',
   '{"model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/madone-sl-7-gen-8--2026-medium/p/80424/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/madone-sl/madone-sl-7-gen-8/p/46220/', '2026-08-06'),
  ('trek-madone-sl-6-gen-8-2026-us', 'Trek', 'Madone SL 6 Gen 8', 2026, 'road_race_aero', 'US',
   '{"model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/madone-sl-6-gen-8--2026-medium/p/85650/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/f/F213/', '2026-08-06'),
  ('trek-domane-sl-7-gen-4-2026-us', 'Trek', 'Domane SL 7 Gen 4', 2026, 'road_endurance', 'US',
   '{"frame_material":"OCLV Carbon","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-sl-7-gen-4--2026-56cm/p/78701/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/domane/', '2026-08-06'),
  ('trek-domane-sl-6-gen-4-2026-us', 'Trek', 'Domane SL 6 Gen 4', 2026, 'road_endurance', 'US',
   '{"frame_material":"OCLV Carbon","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-sl-6-gen-4--2026-56cm/p/79196/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/domane/', '2026-08-06'),
  ('trek-domane-al-5-gen-4-2026-us', 'Trek', 'Domane AL 5 Gen 4', 2026, 'road_endurance', 'US',
   '{"frame_material":"aluminium","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-al-5-gen-4--2026-56cm/p/71834/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/domane/domane-al/f/F221-5/', '2026-08-06'),
  ('trek-domane-al-4-gen-4-2026-us', 'Trek', 'Domane AL 4 Gen 4', 2026, 'road_endurance', 'US',
   '{"frame_material":"aluminium","model_year_evidence_url":"https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-al-4-gen-4--2026-56cm/p/70588/"}'::jsonb,
   'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/domane/domane-al/f/F221-5/domane-al-4-gen-4/41607/5301530/', '2026-08-06'),

  ('bmc-fourstroke-r-01-one-2026-us', 'BMC', 'Fourstroke R 01 ONE', 2026, 'xc_full_suspension', 'US',
   '{"frame_material":"carbon","model_year_evidence_url":"https://us.bmc-switzerland.com/collections/mountain-bikes"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/mountain-bikes', '2026-08-06'),
  ('bmc-twostroke-01-one-2026-us', 'BMC', 'Twostroke 01 ONE', 2026, 'xc_hardtail', 'US',
   '{"frame_material":"carbon","fork_travel_mm":100,"chainline_mm":55,"chainring_range":"26T-38T","drivetrain_ecosystems":["AXS","Di2","mechanical"],"model_year_evidence_url":"https://us.bmc-switzerland.com/collections/mountain-bikes"}'::jsonb,
   'https://us.bmc-switzerland.com/products/twostroke-01-one-bikes-bmc-27a-000054', '2026-08-06'),
  ('bmc-teammachine-slr-four-2026-us', 'BMC', 'Teammachine SLR FOUR', 2026, 'road_race', 'US',
   '{"frame_material":"carbon","drivetrain_brand":"Shimano","groupset":"105","model_year_evidence_url":"https://bmc-switzerland.com/collections/teammachine-slr-series"}'::jsonb,
   'https://us.bmc-switzerland.com/products/teammachine-slr-four-bikes-bmc-26a-000022', '2026-08-06'),
  ('bmc-kaius-01-one-2026-us', 'BMC', 'Kaius 01 ONE', 2026, 'gravel_race', 'US',
   '{"frame_material":"carbon","model_year_evidence_url":"https://bmc-switzerland.com/collections/kaius-series"}'::jsonb,
   'https://us.bmc-switzerland.com/products/kaius-01-one-bikes-bmc-27a-000072', '2026-08-06'),
  ('bmc-kaius-01-three-2026-us', 'BMC', 'Kaius 01 THREE', 2026, 'gravel_race', 'US',
   '{"frame_material":"carbon","model_year_evidence_url":"https://bmc-switzerland.com/collections/kaius-series"}'::jsonb,
   'https://us.bmc-switzerland.com/products/kaius-01-three-bikes-bmc-26a-000001', '2026-08-06'),

  ('merida-etmo-800-2026-global', 'Merida', 'ETMO 800', 2026, 'electric_mtb', 'global',
   '{"suspension_brand":"Marzocchi","model_year_evidence_url":"https://www.merida-bikes.com/en/bikefinder/tag/2026-354"}'::jsonb,
   'https://www.merida-bikes.com/en/bikefinder/tag/2026-354', '2026-08-06'),
  ('merida-etmo-700-2026-global', 'Merida', 'ETMO 700', 2026, 'electric_mtb', 'global',
   '{"suspension_brand":"RockShox","model_year_evidence_url":"https://www.merida-bikes.com/en/bikefinder/tag/2026-354"}'::jsonb,
   'https://www.merida-bikes.com/en/bikefinder/tag/2026-354', '2026-08-06'),
  ('merida-etmo-500-2026-global', 'Merida', 'ETMO 500', 2026, 'electric_mtb', 'global',
   '{"model_year_evidence_url":"https://www.merida-bikes.com/en/bikefinder/tag/2026-354"}'::jsonb,
   'https://www.merida-bikes.com/en/bikefinder/tag/2026-354', '2026-08-06'),
  ('merida-mission-10k-2026-global', 'Merida', 'MISSION 10K', 2026, 'gravel_race', 'global',
   '{"frame_material":"carbon","model_year_evidence_url":"https://www.merida-bikes.com/en/bikefinder/tag/2026-354"}'::jsonb,
   'https://www.merida-bikes.com/en/bike/5657/mission-10k', '2026-08-06'),
  ('merida-mission-7000-2026-global', 'Merida', 'MISSION 7000', 2026, 'gravel_race', 'global',
   '{"frame_material":"carbon","model_year_evidence_url":"https://www.merida-bikes.com/en/bikefinder/tag/2026-354"}'::jsonb,
   'https://www.merida-bikes.com/en/bike/5659/mission-7000', '2026-08-06')
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

-- The original seed only allowed five component types. Manufacturer ingestion
-- requires the broader set below so Garage can eventually reason about real
-- upgrade paths instead of drivetrain-only compatibility.
alter table public.garage_components
  drop constraint if exists garage_components_category_check;

alter table public.garage_components
  add constraint garage_components_category_check check (category in (
    'rear_derailleur','front_derailleur','cassette','chain','crankset','chainring',
    'bottom_bracket','shifter','brake_caliper','brake_lever','brake_adapter','rotor','wheelset',
    'hub','tire','fork','rear_shock','seatpost','dropper_post','saddle','handlebar',
    'stem','pedal','e_bike_system','motor','battery','range_extender','controller'
  ));

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('hope-pro-5-148-boost-rear', 'Hope', 'Pro 5 148mm Boost Rear', 'hub', 'Hope Pro 5 148mm Boost Rear',
   '{"rear_axle":"12x148 Boost","rotor_interfaces":["Center Lock","6-bolt"]}'::jsonb, 3,
   'https://www.hopetech.com/products/hubs/mountain-bike/pro-5-148mm-boost-rear/', '2026-08-06'),
  ('mahle-x20', 'MAHLE SmartBike Systems', 'X20', 'e_bike_system', 'MAHLE X20',
   '{"system_architecture":"rear_hub_motor","peak_power_w":275,"torque_nm_equivalent":65,"udh_compatible":true,"battery_options_wh":[236,350],"range_extender_wh":171}'::jsonb, 4,
   'https://mahle-smartbike.com/x20/', '2026-08-06'),
  ('pirelli-p-zero-road', 'Pirelli', 'P ZERO Road', 'tire', 'Pirelli P ZERO Road',
   '{"construction":"tube-type clincher","casing_tpi_options":[120,60,26]}'::jsonb, 2,
   'https://www.pirelli.com/tyres/en-ww/bike/tyres/catalogue/p-zero-road', '2026-08-06'),
  ('garbaruk-12s-10-44-xd-xdr', 'Garbaruk', '12-speed 10-44T Gravel cassette', 'cassette', 'Garbaruk 12-speed 10-44T Gravel Cassette',
   '{"speeds":12,"range":"10-44T","freehub":"SRAM XD/XDR","chain_compatibility":["SRAM 12-speed Flattop","SRAM T-Type Flattop"],"chain_incompatibility":["SRAM Eagle","Shimano","KMC","YBN"]}'::jsonb, 4,
   'https://www.garbaruk.com/shop/12-speed-10-44t-gravel-cassette-sram-xd-xdr-freehub-800', '2026-08-06')
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
