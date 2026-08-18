-- VeloQuest catalog enrichment wave 31.
-- Exact first-party Specialized product pages only. Adds explicit factory specs
-- and exact factory drivetrain/brake fitments for Epic 8 Pro, S-Works Epic 8
-- EVO and Turbo Levo 4 Pro. Detailed technical specifications take precedence
-- over marketing shorthand. No upgrade compatibility/outcome is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29","rear_travel_mm":120,"fork":"RockShox SID ULTIMATE Flight Attendant, Ride Dynamics developed 3 position, Debon Air, 15x110mm, 44mm offset, 120mm Travel","rear_shock":"RockShox SIDLuxe ULTIMATE Flight Attendant, Ride Dynamics developed 3 position, Solo Air, 190x45mm","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 Eagle AXS Transmission 12-speed","rear_derailleur":"SRAM X0 Eagle Transmission","brakes":"SRAM Motive Silver, 4-piston, 180 mm front / 160 mm rear","cassette":"SRAM XS 1295, 12 speed, 10-52","crankset":"SRAM X0 Eagle, Quarq Spindle power meter, DUB","bottom_bracket":"SRAM DUB Threaded Wide","wheelset":"Roval Control SL VI, hookless carbon 29, DT Swiss 350","tires":"Specialized Fast Trak 29x2.35 front / Air Trak 29x2.35 rear","weight_kg":10.82,"spec_evidence":"official Specialized exact Epic 8 Pro SRAM X0 AXS RockShox Ultimate Flight Attendant product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant/p/4221523',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"S-Works FACT 12m Carbon","wheel_size":"29","rear_travel_mm":120,"fork":"FOX 34 SL Factory, GRIP X Damper, 130mm travel","rear_shock":"FOX FLOAT Factory, EVOL LV, Ride Dynamics Tuned, 190x45mm","drivetrain_brand":"Shimano","drivetrain":"Shimano XTR Di2 12-speed","rear_derailleur":"Shimano XTR Di2, 12-speed","brakes":"Shimano XTR 9220, 4-piston, 180 mm front / 180 mm rear","cassette":"Shimano XTR, 12 Speed, 10-51T","crankset":"Shimano XTR 9200, 4iiii power meter, 170mm","bottom_bracket":"Shimano BB-MT801, Threaded","wheelset":"Roval Control SL VI, hookless carbon, Industry 9 Solix, carbon spokes","tires":"Specialized Purgatory 29x2.4 front / Ground Control 29x2.35 rear","weight_kg":11.17,"spec_evidence":"official Specialized exact S-Works Epic 8 EVO Shimano XTR Di2 FOX Factory product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/ch/en/s-works-epic-8-evo-shimano-xtr-di2-fox-factory/p/4291453',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-s-works-epic-8-evo-shimano-xtr-di2-fox-factory-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29/27.5","rear_travel_mm":150,"fork":"FOX 38 Performance Elite, GRIP X2, 160 mm","rear_shock":"FOX FLOAT X Factory with Specialized GENIE, 210x55mm","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 Eagle T-Type AXS 12-speed","rear_derailleur":"SRAM X0 Eagle Transmission","brakes":"SRAM Maven Silver, 4-piston hydraulic disc","cassette":"SRAM XS 1295, 12 speed, 10-52","crankset":"SRAM X0 Alloy crank, 155mm, ISIS","wheelset":"Roval Traverse HD Carbon, DT Swiss 350, 29 front / 27.5 rear","tires":"Butcher GRID Gravity T9 29x2.4 front / 27.5x2.4 rear","motor":"Specialized 3.1 Motor, 105Nm, 810W","battery_wh":840,"weight_kg":23.94,"spec_evidence":"official Specialized exact Turbo Levo 4 Pro technical specification; detailed technical spec explicitly lists FOX 38 Performance Elite; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/ch/en/turbo-levo-4-pro/p/4221339',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-turbo-levo-4-pro-2026-global';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('sram-x0-eagle-transmission-oem-specialized-epic-pro', 'SRAM', 'X0 Eagle Transmission', 'rear_derailleur', 'SRAM X0 Eagle Transmission', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant/p/4221523', '2026-08-17', true),
  ('sram-motive-silver-oem-specialized-epic-pro', 'SRAM', 'Motive Silver', 'brake_caliper', 'SRAM Motive Silver, 4-piston', '{"pistons":4,"rotor_front_mm":180,"rotor_rear_mm":160,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant/p/4221523', '2026-08-17', true),
  ('shimano-xtr-di2-12s-oem-specialized-epic-evo', 'Shimano', 'XTR Di2 12-speed', 'rear_derailleur', 'Shimano XTR Di2, 12-speed', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ch/en/s-works-epic-8-evo-shimano-xtr-di2-fox-factory/p/4291453', '2026-08-17', true),
  ('shimano-xtr-9220-oem-specialized-epic-evo', 'Shimano', 'XTR 9220', 'brake_caliper', 'Shimano XTR 9220, 4-piston', '{"pistons":4,"rotor_front_mm":180,"rotor_rear_mm":180,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ch/en/s-works-epic-8-evo-shimano-xtr-di2-fox-factory/p/4291453', '2026-08-17', true),
  ('sram-x0-eagle-transmission-oem-specialized-levo-pro', 'SRAM', 'X0 Eagle Transmission', 'rear_derailleur', 'SRAM X0 Eagle Transmission', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ch/en/turbo-levo-4-pro/p/4221339', '2026-08-17', true),
  ('sram-maven-silver-oem-specialized-levo-pro', 'SRAM', 'Maven Silver', 'brake_caliper', 'SRAM Maven Silver, 4-piston', '{"pistons":4,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ch/en/turbo-levo-4-pro/p/4221339', '2026-08-17', true)
on conflict (id) do update set brand=excluded.brand, model=excluded.model, category=excluded.category, display_name=excluded.display_name, specs=excluded.specs, unlock_level=excluded.unlock_level, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, enabled=true;

insert into public.bike_catalog_component_fitments (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('specialized-epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant-2026-global','sram-x0-eagle-transmission-oem-specialized-epic-pro','factory_installed','https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant/p/4221523','2026-08-17','Official Specialized Epic 8 Pro page lists SRAM X0 Eagle Transmission.'),
  ('specialized-epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant-2026-global','sram-motive-silver-oem-specialized-epic-pro','factory_installed','https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant/p/4221523','2026-08-17','Official Specialized page lists SRAM Motive Silver 4-piston brakes, 180 mm front / 160 mm rear.'),
  ('specialized-s-works-epic-8-evo-shimano-xtr-di2-fox-factory-2026-global','shimano-xtr-di2-12s-oem-specialized-epic-evo','factory_installed','https://www.specialized.com/ch/en/s-works-epic-8-evo-shimano-xtr-di2-fox-factory/p/4291453','2026-08-17','Official Specialized S-Works Epic 8 EVO page lists Shimano XTR Di2 12-speed.'),
  ('specialized-s-works-epic-8-evo-shimano-xtr-di2-fox-factory-2026-global','shimano-xtr-9220-oem-specialized-epic-evo','factory_installed','https://www.specialized.com/ch/en/s-works-epic-8-evo-shimano-xtr-di2-fox-factory/p/4291453','2026-08-17','Official Specialized page lists Shimano XTR 9220 4-piston brakes with 180 mm rotors.'),
  ('specialized-turbo-levo-4-pro-2026-global','sram-x0-eagle-transmission-oem-specialized-levo-pro','factory_installed','https://www.specialized.com/ch/en/turbo-levo-4-pro/p/4221339','2026-08-17','Official Specialized Turbo Levo 4 Pro technical spec lists SRAM X0 Eagle Transmission.'),
  ('specialized-turbo-levo-4-pro-2026-global','sram-maven-silver-oem-specialized-levo-pro','factory_installed','https://www.specialized.com/ch/en/turbo-levo-4-pro/p/4221339','2026-08-17','Official Specialized Turbo Levo 4 Pro technical spec lists SRAM Maven Silver 4-piston brakes.')
on conflict (bike_id, component_id, fitment_type) do update set evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, notes=excluded.notes;

commit;
