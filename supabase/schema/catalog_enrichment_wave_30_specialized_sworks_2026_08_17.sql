-- VeloQuest catalog enrichment wave 30.
-- Exact first-party Specialized S-Works product pages only. Adds explicit
-- published factory specs, selected manufacturer hero media and exact factory
-- drivetrain/brake fitments. Unknown brake override on S-Works Crux remains
-- unknown. No upgrade compatibility or recommendation outcome is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"S-Works Crux FACT 12r Carbon","wheel_size":"700C","fork":"S-Works FACT Carbon, 12x100mm thru-axle, flat-mount disc","drivetrain_brand":"SRAM","drivetrain":"SRAM RED XPLR AXS 1x13","rear_derailleur":"SRAM RED AXS XPLR E1, 13-speed","cassette":"SRAM RED XPLR E1, 13-speed, 10-46t","crankset":"SRAM RED E1 AXS with power meter, 40t","bottom_bracket":"SRAM DUB Threaded BSA WIDE","wheelset":"Roval Terra CLX II Tubeless, carbon","tires":"Tracer TLR 700x40c","weight_kg":6.94,"spec_evidence":"official Specialized exact S-Works Crux SRAM RED XPLR product page; Front/Rear Brake fields state See override so brake caliper model is intentionally not stored; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/ie/en/s-works-crux-sram-red-xplr/p/4221538',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-s-works-crux-sram-red-xplr-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"S-Works FACT 12m Carbon","wheel_size":"29","rear_travel_mm":120,"fork":"RockShox SID ULTIMATE Flight Attendant, 120mm","rear_shock":"RockShox SIDLuxe ULTIMATE Flight Attendant, 190x45mm","drivetrain_brand":"SRAM","drivetrain":"SRAM XX SL T-Type AXS 12-speed","rear_derailleur":"SRAM XX SL Eagle AXS","brakes":"SRAM Motive Ultimate, 4-piston, 180 mm front / 160 mm rear","cassette":"SRAM CS-1299 10-52t","crankset":"SRAM / Quarq XX SL Eagle Power Meter, 34T","bottom_bracket":"SRAM DUB, BSA 73mm, Threaded","wheelset":"Roval Control World Cup carbon 29","tires":"Specialized Fast Trak 29x2.35 front / Air Trak 29x2.35 rear","weight_kg":10,"spec_evidence":"official Specialized exact 2026 S-Works Epic 8 SRAM XX SL AXS RockShox Ultimate Flight Attendant product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/us/en/s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant/p/4221525',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29/27.5","rear_travel_mm":150,"fork":"FOX FLOAT 38 Factory, GRIP X2, 160mm","rear_shock":"Fox Float X Factory with Specialized GENIE, 210x55mm","drivetrain_brand":"SRAM","drivetrain":"SRAM XX Eagle T-Type AXS","rear_derailleur":"SRAM XX Eagle Transmission Derailleur","brakes":"SRAM Maven Ultimate, 4-piston hydraulic disc","cassette":"SRAM XX Transmission XS 1297, 10-52t","crankset":"SRAM XX Carbon, 160mm, 34t","wheelset":"Roval Traverse HD carbon, DT Swiss 240 DEG, 29 front / 27.5 rear","tires":"Butcher GRID GRAVITY T9 29x2.4 front / 27.5x2.4 rear","motor":"Specialized 3.1 S-Works, 111Nm, 850W","battery_wh":840,"weight_kg":23.68,"spec_evidence":"official Specialized exact 2026 S-Works Turbo Levo 4 product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/ch/en/s-works-turbo-levo-4/p/4291510',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-s-works-turbo-levo-4-2026-global';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('specialized-s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant-2026-global', 'https://assets.specialized.com/i/specialized/90326-00_EPIC-8-SW-CARB-BLUPRL-METWHTSIL_HERO_DARK-PDP?$scom-pdp-gallery-image-premium$=&fmt=webp', 'manufacturer', 'Specialized', 'https://www.specialized.com/us/en/s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant/p/4221525', 10, '2026-08-17', true),
  ('specialized-s-works-turbo-levo-4-2026-global', 'https://assets.specialized.com/i/specialized/95224-00_LEVO-SW-CARBON-G4-GCLMET-REDPRL-BLKPRL_HERO-PDP-DARK?$scom-pdp-gallery-image-premium$=&fmt=webp', 'manufacturer', 'Specialized', 'https://www.specialized.com/ch/en/s-works-turbo-levo-4/p/4291510', 10, '2026-08-17', true)
on conflict (bike_id, image_url) do update set source_type=excluded.source_type, source_name=excluded.source_name, source_page_url=excluded.source_page_url, priority=excluded.priority, checked_at=excluded.checked_at, enabled=true;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('sram-red-axs-xplr-e1-oem-specialized-crux', 'SRAM', 'RED AXS XPLR E1', 'rear_derailleur', 'SRAM RED AXS XPLR E1, 13-speed', '{"speeds":13,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ie/en/s-works-crux-sram-red-xplr/p/4221538', '2026-08-17', true),
  ('sram-xx-sl-eagle-axs-oem-specialized-epic', 'SRAM', 'XX SL Eagle AXS', 'rear_derailleur', 'SRAM XX SL Eagle AXS', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant/p/4221525', '2026-08-17', true),
  ('sram-motive-ultimate-oem-specialized-epic', 'SRAM', 'Motive Ultimate', 'brake_caliper', 'SRAM Motive Ultimate, 4-piston', '{"pistons":4,"rotor_front_mm":180,"rotor_rear_mm":160,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant/p/4221525', '2026-08-17', true),
  ('sram-xx-eagle-transmission-oem-specialized-levo', 'SRAM', 'XX Eagle Transmission', 'rear_derailleur', 'SRAM XX Eagle Transmission Derailleur', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ch/en/s-works-turbo-levo-4/p/4291510', '2026-08-17', true),
  ('sram-maven-ultimate-oem-specialized-levo', 'SRAM', 'Maven Ultimate', 'brake_caliper', 'SRAM Maven Ultimate, 4-piston', '{"pistons":4,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ch/en/s-works-turbo-levo-4/p/4291510', '2026-08-17', true)
on conflict (id) do update set brand=excluded.brand, model=excluded.model, category=excluded.category, display_name=excluded.display_name, specs=excluded.specs, unlock_level=excluded.unlock_level, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, enabled=true;

insert into public.bike_catalog_component_fitments (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('specialized-s-works-crux-sram-red-xplr-2026-global','sram-red-axs-xplr-e1-oem-specialized-crux','factory_installed','https://www.specialized.com/ie/en/s-works-crux-sram-red-xplr/p/4221538','2026-08-17','Official Specialized S-Works Crux page lists SRAM RED AXS XPLR E1 13-speed; brake override remains intentionally unresolved.'),
  ('specialized-s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant-2026-global','sram-xx-sl-eagle-axs-oem-specialized-epic','factory_installed','https://www.specialized.com/us/en/s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant/p/4221525','2026-08-17','Official Specialized S-Works Epic 8 page lists SRAM XX SL Eagle AXS.'),
  ('specialized-s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant-2026-global','sram-motive-ultimate-oem-specialized-epic','factory_installed','https://www.specialized.com/us/en/s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant/p/4221525','2026-08-17','Official Specialized page lists SRAM Motive Ultimate 4-piston brakes, 180 mm front / 160 mm rear.'),
  ('specialized-s-works-turbo-levo-4-2026-global','sram-xx-eagle-transmission-oem-specialized-levo','factory_installed','https://www.specialized.com/ch/en/s-works-turbo-levo-4/p/4291510','2026-08-17','Official Specialized S-Works Turbo Levo 4 page lists SRAM XX Eagle Transmission Derailleur.'),
  ('specialized-s-works-turbo-levo-4-2026-global','sram-maven-ultimate-oem-specialized-levo','factory_installed','https://www.specialized.com/ch/en/s-works-turbo-levo-4/p/4291510','2026-08-17','Official Specialized page lists SRAM Maven Ultimate 4-piston brakes.')
on conflict (bike_id, component_id, fitment_type) do update set evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, notes=excluded.notes;

commit;
