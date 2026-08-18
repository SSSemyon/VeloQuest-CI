-- VeloQuest catalog enrichment wave 28.
-- Exact first-party Specialized 2026 product pages only. Adds explicit factory
-- specs, manufacturer hero media and factory-installed component evidence for
-- Epic 8 Comp, S-Works Tarmac SL8 and Turbo Levo 4 Comp. Specialized weight and
-- specification-change caveats are retained; no compatibility is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29","rear_travel_mm":120,"fork":"RockShox SID Select, Ride Dynamics developed 3 position, TwistLoc remote adjust, Debon Air, 15x110mm, 44mm offset, 120mm Travel","rear_shock":"RockShox SIDLuxe Select+, Ride Dynamics developed 3 position, TwistLoc remote adjust, Solo Air, 190x45mm","drivetrain_brand":"SRAM","drivetrain":"SRAM S-1000 Eagle AXS / T-Type 12-speed","rear_derailleur":"SRAM S-1000 Eagle Transmission","brakes":"SRAM Level Bronze Stealth, 4-piston, 180 mm front / 160 mm rear","cassette":"SRAM XS 1270 Transmission, 10-52t","crankset":"SRAM S1000 Eagle, DUB, 34T","bottom_bracket":"SRAM DUB Threaded Wide","wheelset":"Specialized Alloy 29, 27mm internal width, tubeless","hubs":"Specialized alloy front / alloy sealed-cartridge rear","tires":"Specialized Fast Trak 29x2.35 front / Renegade 29x2.35 rear","weight_kg":11.89,"spec_evidence":"official Specialized exact Epic 8 Comp SRAM S-1000 AXS RockShox Select product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/ch/en/epic-8-comp-sram-s-1000-axs-rockshox-select/p/4221499',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-epic-8-comp-sram-s-1000-axs-rockshox-select-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"S-Works Tarmac SL8 FACT 12r Carbon","wheel_size":"700C","fork":"S-Works FACT 12r Carbon, 12x100mm thru-axle, flat-mount disc","drivetrain_brand":"Shimano","drivetrain":"Shimano Dura-Ace 9200 series Di2 2x12","rear_derailleur":"Shimano Dura-Ace R9250, 12-speed","front_derailleur":"Shimano Dura-Ace R9250, braze-on","brakes":"Shimano Dura-Ace BR-R9270 hydraulic disc","cassette":"Shimano Dura-Ace, 12-speed, 11-30t","crankset":"Shimano Dura-Ace R9200, HollowTech II, 12-speed with 4iiii Precision Pro dual-sided powermeter, 52/36t","bottom_bracket":"Shimano Dura-Ace, BB-R9100","wheelset":"Roval Rapide CLX III Tubeless, 51 mm front / 48.5 mm rear","hubs":"Roval LF18-F front / LF19-R rear","tires":"S-Works Turbo TLR Race Tire, 700x28c","weight_kg":6.67,"spec_evidence":"official Specialized exact 2026 S-Works Tarmac SL8 Shimano Dura-Ace Di2 product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/ch/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221553',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29/27.5","rear_travel_mm":150,"fork":"FOX FLOAT 36 Rhythm, GRIP damper, 15x110mm, 44mm offset, 160 mm","rear_shock":"Fox FLOAT X Genie, Performance series, 210x55","drivetrain_brand":"SRAM","drivetrain":"SRAM S1000 Eagle T-Type AXS","rear_derailleur":"SRAM S-1000 Eagle AXS Transmission","brakes":"SRAM Maven Bronze, 4-piston hydraulic disc","cassette":"SRAM XG-1270 Transmission Cassette, 12-speed, 10-52t","crankset":"SRAM S1000 Alloy crank, ISIS interface, 155mm","wheelset":"Specialized hookless alloy, 30mm internal width, tubeless ready","hubs":"Specialized alloy sealed-cartridge front / rear","tires":"Butcher GRID GRAVITY T9, 29x2.4 front / 27.5x2.4 rear","motor":"Specialized 3.1 Motor, 105Nm torque, 810W power","battery_wh":840,"weight_kg":24.41,"spec_evidence":"official Specialized exact 2026 Turbo Levo 4 Comp product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/ch/en/turbo-levo-4-comp/p/4218709',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-turbo-levo-4-comp-2026-global';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('specialized-epic-8-comp-sram-s-1000-axs-rockshox-select-2026-global',
   'https://assets.specialized.com/i/specialized/90325-51_EPIC-8-COMP-DPORG-WHT_HERO-PDP?$scom-pdp-gallery-image$=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/ch/en/epic-8-comp-sram-s-1000-axs-rockshox-select/p/4221499', 10, '2026-08-17', true),
  ('specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2026-global',
   'https://assets.specialized.com/i/specialized/94926-01_TARMAC-SL8-SW-DI2-PRMFJDMET-METWHT_HERO_DARK-PDP?$scom-pdp-gallery-image-premium$=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/ch/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221553', 10, '2026-08-17', true),
  ('specialized-turbo-levo-4-comp-2026-global',
   'https://assets.specialized.com/i/specialized/95224-56_LEVO-COMP-CARBON-G4-CHAM-METOBSD_HERO-PDP?$scom-pdp-gallery-image$=&fmt=webp',
   'manufacturer', 'Specialized', 'https://www.specialized.com/ch/en/turbo-levo-4-comp/p/4218709', 10, '2026-08-17', true)
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
  ('sram-s1000-eagle-transmission-oem-specialized', 'SRAM', 'S-1000 Eagle Transmission', 'rear_derailleur', 'SRAM S-1000 Eagle Transmission',
   '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb,
   1, 'https://www.specialized.com/ch/en/epic-8-comp-sram-s-1000-axs-rockshox-select/p/4221499', '2026-08-17', true),
  ('sram-level-bronze-stealth-oem-specialized', 'SRAM', 'Level Bronze Stealth', 'brake_caliper', 'SRAM Level Bronze Stealth, 4-piston',
   '{"pistons":4,"rotor_front_mm":180,"rotor_rear_mm":160,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb,
   1, 'https://www.specialized.com/ch/en/epic-8-comp-sram-s-1000-axs-rockshox-select/p/4221499', '2026-08-17', true),
  ('shimano-rd-r9250-oem-specialized', 'Shimano', 'Dura-Ace R9250', 'rear_derailleur', 'Shimano Dura-Ace R9250, 12-speed',
   '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb,
   1, 'https://www.specialized.com/ch/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221553', '2026-08-17', true),
  ('shimano-br-r9270-oem-specialized', 'Shimano', 'Dura-Ace BR-R9270', 'brake_caliper', 'Shimano Dura-Ace BR-R9270 hydraulic disc',
   '{"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb,
   1, 'https://www.specialized.com/ch/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221553', '2026-08-17', true),
  ('sram-s1000-eagle-axs-oem-specialized-levo', 'SRAM', 'S-1000 Eagle AXS Transmission', 'rear_derailleur', 'SRAM S-1000 Eagle AXS Transmission',
   '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb,
   1, 'https://www.specialized.com/ch/en/turbo-levo-4-comp/p/4218709', '2026-08-17', true),
  ('sram-maven-bronze-oem-specialized-levo', 'SRAM', 'Maven Bronze', 'brake_caliper', 'SRAM Maven Bronze, 4-piston',
   '{"pistons":4,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb,
   1, 'https://www.specialized.com/ch/en/turbo-levo-4-comp/p/4218709', '2026-08-17', true)
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
  ('specialized-epic-8-comp-sram-s-1000-axs-rockshox-select-2026-global', 'sram-s1000-eagle-transmission-oem-specialized', 'factory_installed',
   'https://www.specialized.com/ch/en/epic-8-comp-sram-s-1000-axs-rockshox-select/p/4221499', '2026-08-17',
   'Official Specialized Epic 8 Comp product page explicitly lists SRAM S-1000 Eagle Transmission; specification-change caveat retained.'),
  ('specialized-epic-8-comp-sram-s-1000-axs-rockshox-select-2026-global', 'sram-level-bronze-stealth-oem-specialized', 'factory_installed',
   'https://www.specialized.com/ch/en/epic-8-comp-sram-s-1000-axs-rockshox-select/p/4221499', '2026-08-17',
   'Official Specialized page lists SRAM Level Bronze Stealth 4-piston brakes, 180 mm front / 160 mm rear.'),
  ('specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2026-global', 'shimano-rd-r9250-oem-specialized', 'factory_installed',
   'https://www.specialized.com/ch/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221553', '2026-08-17',
   'Official Specialized 2026 S-Works Tarmac SL8 page lists Shimano Dura-Ace R9250 12-speed rear derailleur.'),
  ('specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2026-global', 'shimano-br-r9270-oem-specialized', 'factory_installed',
   'https://www.specialized.com/ch/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221553', '2026-08-17',
   'Official Specialized page lists Shimano Dura-Ace BR-R9270 hydraulic disc brakes.'),
  ('specialized-turbo-levo-4-comp-2026-global', 'sram-s1000-eagle-axs-oem-specialized-levo', 'factory_installed',
   'https://www.specialized.com/ch/en/turbo-levo-4-comp/p/4218709', '2026-08-17',
   'Official Specialized 2026 Turbo Levo 4 Comp page lists SRAM S-1000 Eagle AXS Transmission.'),
  ('specialized-turbo-levo-4-comp-2026-global', 'sram-maven-bronze-oem-specialized-levo', 'factory_installed',
   'https://www.specialized.com/ch/en/turbo-levo-4-comp/p/4218709', '2026-08-17',
   'Official Specialized page lists SRAM Maven Bronze 4-piston brakes; specification-change caveat retained.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
