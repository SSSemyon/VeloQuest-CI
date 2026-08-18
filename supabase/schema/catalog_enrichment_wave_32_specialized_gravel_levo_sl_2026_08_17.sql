-- VeloQuest catalog enrichment wave 32.
-- Exact first-party Specialized product pages only. Adds explicit published
-- factory specs and factory drivetrain/brake fitments for Crux Pro, Diverge 4
-- Pro LTD and Turbo Levo SL 2 Expert Di2. No compatibility/outcome is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Crux FACT 10r Carbon","wheel_size":"700C","fork":"S-Works FACT Carbon, 12x100mm thru-axle, flat-mount disc","drivetrain_brand":"SRAM","drivetrain":"SRAM Force XPLR AXS E1 1x13","rear_derailleur":"SRAM Force XPLR AXS E1, 13-speed","brakes":"SRAM Force E1 hydraulic disc, Paceline 160 mm front / 160 mm rear","cassette":"SRAM Force XPLR XG-1371, 13-speed, 10-46t","crankset":"SRAM Force E1 D2 DUB Wide with power meter, 40t","bottom_bracket":"SRAM DUB Threaded BSA WIDE","wheelset":"Roval Terra CL II Tubeless, carbon","tires":"Pathfinder Pro 700x40c","weight_kg":7.62,"spec_evidence":"official Specialized exact Crux Pro SRAM Force XPLR AXS product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/us/en/crux-pro-sram-force-xplr-axs/p/4221535',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-crux-pro-sram-force-xplr-axs-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Diverge 4 FACT 9r Carbon","wheel_size":"700C","fork":"Future Shock 3.3 w/ Smooth Boot, FACT Carbon 12x100mm, thru-axle, flat-mount disc","drivetrain_brand":"SRAM","drivetrain":"SRAM RED XPLR AXS E1 1x13","rear_derailleur":"SRAM RED AXS XPLR E1, 13-speed","brakes":"SRAM RED AXS front / SRAM RED E1 rear, hydraulic disc","cassette":"SRAM RED XPLR E1, 13-speed, 10-46t","crankset":"SRAM RED AXS, Quarq Power Meter, 40t Chainring","bottom_bracket":"SRAM DUB BSA 68 Wide","wheelset":"Roval Terra CLX II Tubeless, carbon","tires":"Tracer TLR 700x45c","weight_kg":8.01,"spec_evidence":"official Specialized exact 2026 Diverge 4 Pro LTD SRAM RED XPLR product page; front and rear brake models are explicitly different, so no reusable single brake component is inferred; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/us/en/diverge-4-pro-ltd-sram-red-xplr/p/4294387',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-diverge-4-pro-ltd-sram-red-xplr-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29/27.5","rear_travel_mm":150,"fork":"FOX FLOAT 36 Performance Elite, GRIP X2, 160 mm","rear_shock":"FOX FLOAT X Performance Elite with Specialized GENIE, 210x55mm","drivetrain_brand":"Shimano","drivetrain":"Shimano XT Di2 12-speed","rear_derailleur":"Shimano XT Di2, 12-speed","brakes":"Shimano Deore XT, 4-piston, 203 mm front / 203 mm rear","cassette":"Shimano XT M8200, 12-speed, 10-51","crankset":"SRAM Alloy Crankset, 165mm, DUB interface","wheelset":"Traverse Alloy 370, 29 front / 27.5 rear","tires":"Butcher GRID TRAIL T9 29x2.4 front / Eliminator GRID GRAVITY T7/T9 27.5x2.4 rear","motor":"Specialized SL 1.2, 50Nm, 320W","battery_wh":320,"weight_kg":18.92,"spec_evidence":"official Specialized exact 2026 Turbo Levo SL 2 Expert Di2 product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/mt/en/turbo-levo-sl-2-expert-di2/p/4221351',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-turbo-levo-sl-2-expert-di2-2026-global';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('sram-force-xplr-axs-e1-oem-specialized-crux-pro', 'SRAM', 'Force XPLR AXS E1', 'rear_derailleur', 'SRAM Force XPLR AXS E1, 13-speed', '{"speeds":13,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/crux-pro-sram-force-xplr-axs/p/4221535', '2026-08-17', true),
  ('sram-force-e1-brake-oem-specialized-crux-pro', 'SRAM', 'Force E1', 'brake_caliper', 'SRAM Force E1 hydraulic disc', '{"rotor_front_mm":160,"rotor_rear_mm":160,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/crux-pro-sram-force-xplr-axs/p/4221535', '2026-08-17', true),
  ('sram-red-xplr-axs-e1-oem-specialized-diverge', 'SRAM', 'RED XPLR AXS E1', 'rear_derailleur', 'SRAM RED AXS XPLR E1, 13-speed', '{"speeds":13,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/diverge-4-pro-ltd-sram-red-xplr/p/4294387', '2026-08-17', true),
  ('shimano-xt-di2-12s-oem-specialized-levo-sl', 'Shimano', 'XT Di2 12-speed', 'rear_derailleur', 'Shimano XT Di2, 12-speed', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/mt/en/turbo-levo-sl-2-expert-di2/p/4221351', '2026-08-17', true),
  ('shimano-deore-xt-4p-oem-specialized-levo-sl', 'Shimano', 'Deore XT 4-piston', 'brake_caliper', 'Shimano Deore XT brake, 4 piston', '{"pistons":4,"rotor_front_mm":203,"rotor_rear_mm":203,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/mt/en/turbo-levo-sl-2-expert-di2/p/4221351', '2026-08-17', true)
on conflict (id) do update set brand=excluded.brand, model=excluded.model, category=excluded.category, display_name=excluded.display_name, specs=excluded.specs, unlock_level=excluded.unlock_level, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, enabled=true;

insert into public.bike_catalog_component_fitments (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('specialized-crux-pro-sram-force-xplr-axs-2026-global','sram-force-xplr-axs-e1-oem-specialized-crux-pro','factory_installed','https://www.specialized.com/us/en/crux-pro-sram-force-xplr-axs/p/4221535','2026-08-17','Official Specialized Crux Pro page lists SRAM Force XPLR AXS E1 13-speed.'),
  ('specialized-crux-pro-sram-force-xplr-axs-2026-global','sram-force-e1-brake-oem-specialized-crux-pro','factory_installed','https://www.specialized.com/us/en/crux-pro-sram-force-xplr-axs/p/4221535','2026-08-17','Official Specialized Crux Pro page lists SRAM Force E1 hydraulic brakes and Paceline 160 mm rotors.'),
  ('specialized-diverge-4-pro-ltd-sram-red-xplr-2026-global','sram-red-xplr-axs-e1-oem-specialized-diverge','factory_installed','https://www.specialized.com/us/en/diverge-4-pro-ltd-sram-red-xplr/p/4294387','2026-08-17','Official Specialized Diverge 4 Pro LTD page lists SRAM RED AXS XPLR E1 13-speed. Front/rear brake models differ and are intentionally not compiled into one reusable brake component.'),
  ('specialized-turbo-levo-sl-2-expert-di2-2026-global','shimano-xt-di2-12s-oem-specialized-levo-sl','factory_installed','https://www.specialized.com/mt/en/turbo-levo-sl-2-expert-di2/p/4221351','2026-08-17','Official Specialized Turbo Levo SL 2 Expert Di2 page lists Shimano XT Di2 12-speed.'),
  ('specialized-turbo-levo-sl-2-expert-di2-2026-global','shimano-deore-xt-4p-oem-specialized-levo-sl','factory_installed','https://www.specialized.com/mt/en/turbo-levo-sl-2-expert-di2/p/4221351','2026-08-17','Official Specialized page lists Shimano Deore XT 4-piston brakes with 203 mm front/rear rotors.')
on conflict (bike_id, component_id, fitment_type) do update set evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, notes=excluded.notes;

commit;
