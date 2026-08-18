-- VeloQuest catalog enrichment wave 20.
-- Exact first-party Trek/Specialized product specifications and first-party
-- SRAM component evidence only. Factory fitment is recorded only where the
-- exact bike product page explicitly lists the component. No upgrade
-- recommendation or compatibility relation is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"100 Series Alpha Aluminum","wheel_size":"700c","fork":"Domane AL carbon","drivetrain_brand":"Shimano","drivetrain":"Shimano Tiagra 2x10","groupset":"Shimano Tiagra 4700","rear_derailleur":"Shimano Tiagra 4700 long cage","cassette":"Shimano HG500 11-32 10-speed","crankset":"Shimano Tiagra 4700 50/34","brake_type":"hydraulic_disc","brakes":"Shimano Tiagra hydraulic disc flat mount","wheelset":"Bontrager Paradigm SL / Formula RX-512 front / Formula RX-142 rear","hubs":"Formula RX-512 12x100 front / Formula RX-142 12x142 rear","tires":"Bontrager 700x32mm","spec_evidence":"official Trek exact 2026 Domane AL 4 Gen 4 specification"}'::jsonb,
    manufacturer_url = 'https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-al-4-gen-4--2026-44cm/p/R5301516-2/',
    evidence_checked_at = '2026-08-17'
where id = 'trek-domane-al-4-gen-4-2026-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29","front_travel_mm":120,"rear_travel_mm":120,"fork":"RockShox SID ULTIMATE 120mm","rear_shock":"RockShox SIDLuxe ULTIMATE 190x45mm","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 AXS Transmission 1x12","rear_derailleur":"SRAM X0 AXS Transmission","cassette":"SRAM XS-1295 10-52T 12-speed","crankset":"SRAM X0 Eagle DUB with Quarq spindle power meter","bottom_bracket":"SRAM DUB Threaded Wide","brake_type":"hydraulic_disc","brakes":"SRAM Level Silver Stealth 4-piston 180/160mm","wheelset":"Roval Control carbon 29mm internal","hubs":"DT Swiss 350 15x110 front / 12x148 rear","tires":"Specialized Fast Trak 29x2.35 front / Renegade 29x2.35 rear","spec_evidence":"official Specialized exact 2025 Epic 8 Pro specification"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-epic-8-pro-2025-us';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29","front_travel_mm":130,"rear_travel_mm":120,"fork":"FOX 34 Performance Elite 130mm","rear_shock":"FOX FLOAT Performance Elite 190x45mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX AXS Transmission 1x12","rear_derailleur":"SRAM GX AXS Transmission","cassette":"SRAM XS-1275 10-52T 12-speed","crankset":"SRAM GX Eagle DUB 32T","bottom_bracket":"SRAM DUB Threaded Wide","brake_type":"hydraulic_disc","brakes":"SRAM Code Bronze Stealth 4-piston 180/180mm","wheelset":"Roval Control carbon 29mm internal","hubs":"Industry Nine 1/1 15x110 front / 12x148 rear","tires":"Specialized Purgatory 29x2.4 front / Ground Control 29x2.35 rear","spec_evidence":"official Specialized exact 2025 Epic 8 EVO Expert specification"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/us/en/epic-8-evo-expert-sram-gx-axs-fox-performance-elite/p/4275710',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-epic-8-evo-expert-sram-gx-axs-fox-performance-elite-2025-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29 / size-dependent mixed rear 27.5","front_travel_mm":150,"rear_travel_mm":145,"fork":"FOX FLOAT 36 Performance Elite GRIP X2","rear_shock":"FOX FLOAT Performance Elite Specialized GENIE","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle Transmission AXS 1x12","rear_derailleur":"SRAM GX Eagle Transmission","cassette":"SRAM GX Eagle Transmission 10-52T 12-speed","crankset":"SRAM GX Eagle 32T","bottom_bracket":"SRAM DUB BSA 73mm threaded","brake_type":"hydraulic_disc","brakes":"SRAM Maven Bronze 4-piston","wheelset":"Roval Traverse hookless alloy 30mm internal","hubs":"DT Swiss 370 15x110 front / 12x148 rear","tires":"Specialized Butcher 29x2.3 front / Eliminator size-dependent rear","spec_evidence":"official Specialized exact 2025 Stumpjumper 15 Expert specification"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/us/en/stumpjumper-15-expert-sram-gx-axs-fox-performance-elite/p/4221401',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-stumpjumper-15-expert-2025-us';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('sram-rd-x0-e-b1', 'SRAM', 'RD-X0-E-B1', 'rear_derailleur', 'X0 Eagle Transmission Derailleur',
   '{"speeds":12,"drivetrain":"1x12","max_cassette":"52T","protocol":"AXS","chain_technology":"T-Type"}'::jsonb,
   1, 'https://www.sram.com/en/sram/models/rd-x0-e-b1', '2026-08-17', true),
  ('shimano-rd-4700-gs', 'Shimano', 'RD-4700-GS', 'rear_derailleur', 'Tiagra 4700 Long Cage Rear Derailleur',
   '{"speeds":10,"drivetrain":"2x10","max_cassette":"34T"}'::jsonb,
   1, 'https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-al-4-gen-4--2026-44cm/p/R5301516-2/', '2026-08-17', true)
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
  ('trek-domane-al-4-gen-4-2026-us', 'shimano-rd-4700-gs', 'factory_installed',
   'https://www.trekbikes.com/us/en_US/pre-owned-bikes/pre-owned-road-bikes/domane-al-4-gen-4--2026-44cm/p/R5301516-2/', '2026-08-17',
   'Official Trek 2026 Domane AL 4 Gen 4 specification lists Shimano Tiagra 4700 long-cage rear derailleur.'),
  ('specialized-epic-8-pro-2025-us', 'sram-rd-x0-e-b1', 'factory_installed',
   'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate/p/4221503', '2026-08-17',
   'Official Specialized 2025 Epic 8 Pro specification lists SRAM X0 AXS Transmission rear derailleur.'),
  ('specialized-epic-8-evo-expert-sram-gx-axs-fox-performance-elite-2025-global', 'sram-rd-gx-e-b1', 'factory_installed',
   'https://www.specialized.com/us/en/epic-8-evo-expert-sram-gx-axs-fox-performance-elite/p/4275710', '2026-08-17',
   'Official Specialized 2025 Epic 8 EVO Expert specification lists SRAM GX AXS Transmission rear derailleur.'),
  ('specialized-stumpjumper-15-expert-2025-us', 'sram-rd-gx-e-b1', 'factory_installed',
   'https://www.specialized.com/us/en/stumpjumper-15-expert-sram-gx-axs-fox-performance-elite/p/4221401', '2026-08-17',
   'Official Specialized 2025 Stumpjumper 15 Expert specification lists SRAM GX Eagle Transmission rear derailleur.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
