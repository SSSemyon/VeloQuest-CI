-- VeloQuest catalog enrichment wave 33.
-- Exact first-party Specialized product pages only. Adds explicit factory specs
-- and factory-installed drivetrain/brake evidence for the final non-Mac
-- enrichment checkpoint. No compatibility or recommendation outcome is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"FACT 11m Carbon","wheel_size":"29","rear_travel_mm":120,"fork":"RockShox SID Select+, Ride Dynamics developed 3 position, Debon Air, 15x110mm, 44mm offset, 120mm Travel","rear_shock":"RockShox SIDLuxe Select+, Ride Dynamics developed 3 position, TwistLoc remote adjust, Solo Air, 190x45mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle AXS Transmission 12-speed","rear_derailleur":"SRAM GX Eagle AXS Transmission","brakes":"SRAM Motive Bronze, 4-piston, 180 mm front / 160 mm rear","cassette":"SRAM XG-1275 T-Type 12-Speed 10-52","crankset":"SRAM GX Eagle, DUB, 165/170/175mm, 34T","bottom_bracket":"SRAM DUB Threaded Wide","wheelset":"Roval Control SL V, Hookless carbon, 29mm internal, DT Swiss 370","tires":"Specialized Fast Trak 29x2.35 front / Air Trak 29x2.35 rear","weight_kg":11.15,"spec_evidence":"official Specialized exact 2026 Epic 8 Expert SRAM GX AXS RockShox Select+ product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/us/en/epic-8-expert-sram-gx-axs-rockshox-select/p/4221521',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-epic-8-expert-sram-gx-axs-rockshox-select-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"S-Works FACT 12m Carbon","wheel_size":"29","rear_travel_mm":120,"fork":"RockShox Pike ULTIMATE, 130mm","rear_shock":"RockShox SIDLuxe ULTIMATE, 190x45mm","drivetrain_brand":"SRAM","drivetrain":"SRAM XX SL Eagle AXS 12-speed","rear_derailleur":"SRAM XX SL Eagle AXS","brakes":"SRAM Motive Ultimate, 4-piston, 180 mm front / 180 mm rear","cassette":"SRAM CS-1299, 12-speed, 10-52t","crankset":"SRAM / Quarq XX SL Eagle Power Meter, 34T","bottom_bracket":"SRAM DUB BSA Threaded","wheelset":"Roval Control World Cup carbon","tires":"Specialized Purgatory 29x2.4 front / Ground Control 29x2.35 rear","weight_kg":11.02,"spec_evidence":"official Specialized exact 2026 S-Works Epic 8 EVO SRAM XX SL AXS RockShox Ultimate product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/us/en/s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate/p/4221540',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"S-Works Tarmac SL8 FACT 12r Carbon","wheel_size":"700C","fork":"S-Works FACT 12r Carbon, 12x100mm thru-axle, flat-mount disc","drivetrain_brand":"SRAM","drivetrain":"SRAM RED AXS E1 2x12","rear_derailleur":"SRAM RED AXS E1, 12-speed","brakes":"SRAM RED E1 hydraulic disc","cassette":"SRAM RED XG-1290 E1, 12-speed, 10-33t","crankset":"SRAM RED E1 Quarq Power Meter, 48/35t","bottom_bracket":"SRAM DUB BSA 68","wheelset":"Roval Rapide CLX III Tubeless, 51mm front / 48.5mm rear","tires":"S-Works Turbo TLR Race Tire, 700x28c","weight_kg":6.62,"spec_evidence":"official Specialized exact 2026 S-Works Tarmac SL8 SRAM RED AXS product page; actual weights vary and specifications are subject to change without notice"}'::jsonb,
    manufacturer_url = 'https://www.specialized.com/ch/en/s-works-tarmac-sl8-sram-red-axs/p/4221554',
    evidence_checked_at = '2026-08-17'
where id = 'specialized-s-works-tarmac-sl8-sram-red-axs-2026-global';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('sram-gx-eagle-transmission-oem-specialized-epic-expert', 'SRAM', 'GX Eagle Transmission', 'rear_derailleur', 'SRAM GX Eagle AXS Transmission', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/epic-8-expert-sram-gx-axs-rockshox-select/p/4221521', '2026-08-17', true),
  ('sram-motive-bronze-oem-specialized-epic-expert', 'SRAM', 'Motive Bronze', 'brake_caliper', 'SRAM Motive Bronze, 4-piston', '{"pistons":4,"rotor_front_mm":180,"rotor_rear_mm":160,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/epic-8-expert-sram-gx-axs-rockshox-select/p/4221521', '2026-08-17', true),
  ('sram-xx-sl-eagle-axs-oem-specialized-epic-evo', 'SRAM', 'XX SL Eagle AXS', 'rear_derailleur', 'SRAM XX SL Eagle AXS', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate/p/4221540', '2026-08-17', true),
  ('sram-motive-ultimate-oem-specialized-epic-evo', 'SRAM', 'Motive Ultimate', 'brake_caliper', 'SRAM Motive Ultimate, 4-piston', '{"pistons":4,"rotor_front_mm":180,"rotor_rear_mm":180,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/us/en/s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate/p/4221540', '2026-08-17', true),
  ('sram-red-axs-e1-oem-specialized-tarmac', 'SRAM', 'RED AXS E1', 'rear_derailleur', 'SRAM RED AXS E1, 12-speed', '{"speeds":12,"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ch/en/s-works-tarmac-sl8-sram-red-axs/p/4221554', '2026-08-17', true),
  ('sram-red-e1-brake-oem-specialized-tarmac', 'SRAM', 'RED E1', 'brake_caliper', 'SRAM RED E1 hydraulic disc', '{"evidence_scope":"Specialized exact-product OEM listing"}'::jsonb, 1, 'https://www.specialized.com/ch/en/s-works-tarmac-sl8-sram-red-axs/p/4221554', '2026-08-17', true)
on conflict (id) do update set brand=excluded.brand, model=excluded.model, category=excluded.category, display_name=excluded.display_name, specs=excluded.specs, unlock_level=excluded.unlock_level, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, enabled=true;

insert into public.bike_catalog_component_fitments (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('specialized-epic-8-expert-sram-gx-axs-rockshox-select-2026-global','sram-gx-eagle-transmission-oem-specialized-epic-expert','factory_installed','https://www.specialized.com/us/en/epic-8-expert-sram-gx-axs-rockshox-select/p/4221521','2026-08-17','Official Specialized Epic 8 Expert page lists SRAM GX Eagle AXS Transmission and RockShox Select+ suspension.'),
  ('specialized-epic-8-expert-sram-gx-axs-rockshox-select-2026-global','sram-motive-bronze-oem-specialized-epic-expert','factory_installed','https://www.specialized.com/us/en/epic-8-expert-sram-gx-axs-rockshox-select/p/4221521','2026-08-17','Official Specialized page lists SRAM Motive Bronze 4-piston brakes with 180 mm front / 160 mm rear rotors.'),
  ('specialized-s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate-2026-global','sram-xx-sl-eagle-axs-oem-specialized-epic-evo','factory_installed','https://www.specialized.com/us/en/s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate/p/4221540','2026-08-17','Official Specialized S-Works Epic 8 EVO page lists SRAM XX SL Eagle AXS.'),
  ('specialized-s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate-2026-global','sram-motive-ultimate-oem-specialized-epic-evo','factory_installed','https://www.specialized.com/us/en/s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate/p/4221540','2026-08-17','Official Specialized page lists SRAM Motive Ultimate 4-piston brakes with 180 mm front/rear rotors.'),
  ('specialized-s-works-tarmac-sl8-sram-red-axs-2026-global','sram-red-axs-e1-oem-specialized-tarmac','factory_installed','https://www.specialized.com/ch/en/s-works-tarmac-sl8-sram-red-axs/p/4221554','2026-08-17','Official Specialized S-Works Tarmac SL8 page lists SRAM RED AXS E1 12-speed.'),
  ('specialized-s-works-tarmac-sl8-sram-red-axs-2026-global','sram-red-e1-brake-oem-specialized-tarmac','factory_installed','https://www.specialized.com/ch/en/s-works-tarmac-sl8-sram-red-axs/p/4221554','2026-08-17','Official Specialized page lists SRAM RED E1 hydraulic disc brakes.')
on conflict (bike_id, component_id, fitment_type) do update set evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, notes=excluded.notes;

commit;
