-- VeloQuest catalog enrichment wave 29.
-- Exact first-party Specialized 2026 product pages only. Adds published factory
-- specs, official hero media and factory-installed drivetrain/brake evidence.
-- Specialized weight/specification-change caveats are retained; no upgrade
-- compatibility or recommendation outcome is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Crux FACT 10r Carbon","wheel_size":"700C","fork":"S-Works FACT Carbon, 12x100mm thru-axle, flat-mount disc","drivetrain_brand":"Shimano","drivetrain":"Shimano GRX 12-speed","rear_derailleur":"Shimano GRX RD-RX822-GS, 12-speed","brakes":"Shimano GRX BR-RX820 hydraulic disc","cassette":"Shimano XT CS-M8100, 12-speed, 10-45t","crankset":"Shimano GRX RX820 40t","bottom_bracket":"Shimano Threaded BSA BB","wheelset":"DT Swiss G540, 24 mm internal, tubeless ready","tires":"Pathfinder 700x40, Tubeless Ready","weight_kg":8.66,"spec_evidence":"official Specialized exact 2026 Crux Comp Shimano GRX product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/gb/en/crux-comp-shimano-grx/p/4223490',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-crux-comp-shimano-grx-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29","rear_travel_mm":120,"fork":"RockShox SID Select+, 120 mm","rear_shock":"RockShox SIDLuxe Select+, 190x45mm","drivetrain_brand":"Shimano","drivetrain":"Shimano XT Di2 12-speed","rear_derailleur":"Shimano XT Di2, 12-speed","brakes":"Shimano XT 8200, 2-piston, 180 mm front / 180 mm rear","cassette":"Shimano XT M8200, 12-speed, 10-51","crankset":"Shimano XT 8200, 34t","bottom_bracket":"Shimano BB-MT801 Threaded","wheelset":"Roval Control SL V, carbon, 29 mm internal, DT Swiss 370","tires":"Specialized Fast Trak 29x2.35 TLR front/rear","weight_kg":11.17,"spec_evidence":"official Specialized exact 2026 Epic 8 Expert Shimano XT Di2 RockShox Select+ product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/us/en/epic-8-expert-shimano-xt-di2-rockshox-select/p/4291798',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-epic-8-expert-shimano-xt-di2-rockshox-select-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29/27.5","rear_travel_mm":150,"fork":"FOX 38 Performance Elite, GRIP X2, 160 mm","rear_shock":"FOX FLOAT X Performance Elite with GENIE","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle T-Type AXS","rear_derailleur":"SRAM GX Eagle Transmission","brakes":"SRAM Maven Silver, 4-piston, 220 mm front / 200 mm rear","cassette":"SRAM GX Eagle Transmission, 12-speed, 10-52t","crankset":"SRAM GX Eagle, ISIS, 155 mm","wheelset":"Roval Traverse Alloy, DT Swiss 370, 29 front / 27.5 rear","tires":"Butcher GRID GRAVITY T9 29x2.3 front / 27.5x2.3 rear","motor":"Specialized 3.1, 105Nm, 810W","battery_wh":840,"weight_kg":24.41,"spec_evidence":"official Specialized exact 2026 Turbo Levo 4 Expert product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/ch/en/turbo-levo-4-expert/p/4218705',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-turbo-levo-4-expert-2026-global';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('specialized-crux-comp-shimano-grx-2026-global', 'https://assets.specialized.com/i/specialized/91426-50_CRUX-COMP-DUNEWHT-SNDSTNMET-ORGZST_HERO-PDP?$scom-pdp-gallery-image$=&fmt=webp', 'manufacturer', 'Specialized', 'https://www.specialized.com/gb/en/crux-comp-shimano-grx/p/4223490', 10, '2026-08-17', true),
  ('specialized-epic-8-expert-shimano-xt-di2-rockshox-select-2026-global', 'https://assets.specialized.com/i/specialized/90326-32_EPIC-8-EXPERT-DI2-DLMMET-OBSD_HERO-PDP?$scom-pdp-gallery-image$=&fmt=webp', 'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/epic-8-expert-shimano-xt-di2-rockshox-select/p/4291798', 10, '2026-08-17', true),
  ('specialized-turbo-levo-4-expert-2026-global', 'https://assets.specialized.com/i/specialized/95224-31_LEVO-EXPERT-CARBON-G4-CYPRMET-SILDST_HERO-PDP?$scom-pdp-gallery-image$=&fmt=webp', 'manufacturer', 'Specialized', 'https://www.specialized.com/ch/en/turbo-levo-4-expert/p/4218705', 10, '2026-08-17', true)
on conflict (bike_id, image_url) do update set source_type=excluded.source_type, source_name=excluded.source_name, source_page_url=excluded.source_page_url, priority=excluded.priority, checked_at=excluded.checked_at, enabled=true;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('shimano-rd-rx822-gs-oem-specialized', 'Shimano', 'RD-RX822-GS', 'rear_derailleur', 'Shimano GRX RD-RX822-GS', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/gb/en/crux-comp-shimano-grx/p/4223490', '2026-08-17', true),
  ('shimano-br-rx820-oem-specialized', 'Shimano', 'BR-RX820', 'brake_caliper', 'Shimano GRX BR-RX820', '{"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/gb/en/crux-comp-shimano-grx/p/4223490', '2026-08-17', true),
  ('shimano-xt-di2-12s-oem-specialized', 'Shimano', 'XT Di2 12-speed', 'rear_derailleur', 'Shimano XT Di2, 12-speed', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/epic-8-expert-shimano-xt-di2-rockshox-select/p/4291798', '2026-08-17', true),
  ('shimano-xt-8200-brake-oem-specialized', 'Shimano', 'XT 8200', 'brake_caliper', 'Shimano XT 8200, 2-piston', '{"pistons":2,"rotor_front_mm":180,"rotor_rear_mm":180,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/epic-8-expert-shimano-xt-di2-rockshox-select/p/4291798', '2026-08-17', true),
  ('sram-gx-eagle-transmission-oem-specialized-levo-expert', 'SRAM', 'GX Eagle Transmission', 'rear_derailleur', 'SRAM GX Eagle Transmission', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ch/en/turbo-levo-4-expert/p/4218705', '2026-08-17', true),
  ('sram-maven-silver-oem-specialized-levo-expert', 'SRAM', 'Maven Silver', 'brake_caliper', 'SRAM Maven Silver, 4-piston', '{"pistons":4,"rotor_front_mm":220,"rotor_rear_mm":200,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ch/en/turbo-levo-4-expert/p/4218705', '2026-08-17', true)
on conflict (id) do update set brand=excluded.brand, model=excluded.model, category=excluded.category, display_name=excluded.display_name, specs=excluded.specs, unlock_level=excluded.unlock_level, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, enabled=true;

insert into public.bike_catalog_component_fitments (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('specialized-crux-comp-shimano-grx-2026-global','shimano-rd-rx822-gs-oem-specialized','factory_installed','https://www.specialized.com/gb/en/crux-comp-shimano-grx/p/4223490','2026-08-17','Official Specialized Crux Comp 2026 page lists Shimano GRX RD-RX822-GS; specification-change caveat retained.'),
  ('specialized-crux-comp-shimano-grx-2026-global','shimano-br-rx820-oem-specialized','factory_installed','https://www.specialized.com/gb/en/crux-comp-shimano-grx/p/4223490','2026-08-17','Official Specialized page lists Shimano GRX BR-RX820 front/rear brakes.'),
  ('specialized-epic-8-expert-shimano-xt-di2-rockshox-select-2026-global','shimano-xt-di2-12s-oem-specialized','factory_installed','https://www.specialized.com/us/en/epic-8-expert-shimano-xt-di2-rockshox-select/p/4291798','2026-08-17','Official Specialized Epic 8 Expert page lists Shimano XT Di2 12-speed.'),
  ('specialized-epic-8-expert-shimano-xt-di2-rockshox-select-2026-global','shimano-xt-8200-brake-oem-specialized','factory_installed','https://www.specialized.com/us/en/epic-8-expert-shimano-xt-di2-rockshox-select/p/4291798','2026-08-17','Official Specialized page lists Shimano XT 8200 2-piston brakes with 180 mm rotors.'),
  ('specialized-turbo-levo-4-expert-2026-global','sram-gx-eagle-transmission-oem-specialized-levo-expert','factory_installed','https://www.specialized.com/ch/en/turbo-levo-4-expert/p/4218705','2026-08-17','Official Specialized Turbo Levo 4 Expert page lists SRAM GX Eagle Transmission.'),
  ('specialized-turbo-levo-4-expert-2026-global','sram-maven-silver-oem-specialized-levo-expert','factory_installed','https://www.specialized.com/ch/en/turbo-levo-4-expert/p/4218705','2026-08-17','Official Specialized page lists SRAM Maven Silver 4-piston brakes, 220 mm front / 200 mm rear.')
on conflict (bike_id, component_id, fitment_type) do update set evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, notes=excluded.notes;

commit;
