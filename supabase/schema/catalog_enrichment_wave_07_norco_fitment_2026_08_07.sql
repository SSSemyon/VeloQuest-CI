-- VeloQuest catalog enrichment wave 07.
-- Deepens existing 2025 Norco Optic Gen 3 records and adds verified SRAM Transmission fitment.
-- Component compatibility remains default-deny: only explicitly sourced pairs are inserted.

update public.bike_catalog_models
set specs = specs || '{"suspension_brand":"FOX","fork":"FOX 34 Factory Float, Grip X, 140 mm, 44 mm offset","rear_shock":"FOX Float X Factory, 185x50 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle AXS T-Type 12-speed","cassette":"SRAM 1275 Eagle T-Type 10-52T 12-speed","brake_type":"hydraulic_disc","brakes":"SRAM Code Silver Stealth 4-piston","bottom_bracket":"SRAM DUB BSA 73 mm MTB Wide","udh_compatible":true,"spec_evidence":"official Norco 2025 Optic A1 product specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'norco-optic-a1-gen3-2025-ca';

update public.bike_catalog_models
set specs = specs || '{"suspension_brand":"RockShox","fork":"RockShox Pike Base, 140 mm, 44 mm offset","rear_shock":"RockShox Super Deluxe Select+, 185x50 mm","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore M6100 1x12","rear_derailleur":"Shimano Deore RD-M6100","cassette":"Shimano Deore CS-M6100-12 10-51T","brake_type":"hydraulic_disc","brakes":"Shimano Deore MT520 4-piston, RT-64 180/180 mm rotors","wheelset":"WTB ST i30 TCS 2.0 29 in","tires":"Maxxis Minion DHF 29x2.5 front / Dissector 29x2.4 rear","front_axle":"15x110 Boost","rear_axle":"12x148 Boost","rear_freehub":"MICRO SPLINE","udh_compatible":true,"weight_kg":17.2,"spec_evidence":"official Norco 2025 Optic A2 product specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'norco-optic-a2-gen3-2025-ca';

update public.bike_catalog_models
set specs = specs || '{"suspension_brand":"RockShox","fork":"RockShox Pike Select+, Charger 3.1, 140 mm","rear_shock":"RockShox Super Deluxe Select+, 185x50 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle AXS T-Type 12-speed","brake_type":"hydraulic_disc","brakes":"SRAM Code Silver Stealth 4-piston","udh_compatible":true,"spec_evidence":"official Norco 2025 Optic C2 product specification"}'::jsonb,
    evidence_checked_at = '2026-08-07'
where id = 'norco-optic-c2-gen3-2025-global';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('sram-rd-gx-e-b1', 'SRAM', 'RD-GX-E-B1', 'rear_derailleur', 'GX Eagle Transmission Derailleur',
   '{"speeds":12,"system":"Eagle Transmission","t_type":true,"axs":true,"mount":"Full Mount / hangerless"}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/rd-gx-e-b1', '2026-08-07'),
  ('sram-cs-xs-1275-a1', 'SRAM', 'CS-XS-1275-A1', 'cassette', 'XS-1275 Eagle Transmission Cassette',
   '{"speeds":12,"range":"10-52T","system":"Eagle Transmission","t_type":true,"freehub":"XD"}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/cs-xs-1275-a1', '2026-08-07')
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
  ('sram-rd-gx-e-b1', 'sram-cs-xs-1275-a1', 'compatible',
   'SRAM GX Eagle AXS Transmission groupset pairs the GX Eagle Transmission derailleur with the 10-52T T-Type Eagle Transmission cassette family; XS-1275 is the GX-level 10-52T T-Type cassette.',
   'https://www.sram.com/en/sram/models/gs-gx-e-d1', '2026-08-07')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;
