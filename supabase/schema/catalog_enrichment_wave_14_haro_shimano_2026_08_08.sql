begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('shimano-rd-m8050-gs', 'Shimano', 'RD-M8050-GS', 'rear_derailleur', 'DEORE XT Di2 RD-M8050-GS',
   '{"speeds":11,"compatible_cassette_range":"11-40T / 11-42T / 11-46T"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-08'),
  ('shimano-cs-m8000-11', 'Shimano', 'CS-M8000', 'cassette', 'DEORE XT CS-M8000 11-46T',
   '{"speeds":11,"range":"11-46T"}'::jsonb, 3,
   'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-08'),
  ('shimano-br-mt520', 'Shimano', 'BR-MT520', 'brake_caliper', 'Shimano BR-MT520',
   '{"brake_type":"hydraulic_disc","pistons":4,"compatible_rotor_sizes_mm":[140,160,180,200,203]}'::jsonb, 3,
   'https://productinfo.shimano.com/en/product/BR-MT520', '2026-08-08')
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
  ('shimano-rd-m8050-gs', 'shimano-cs-m8000-11', 'compatible',
   'Shimano C-433 lists RD-M8050-GS with CS-M8000 11-speed 11-46T among supported MTB combinations.',
   'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-08')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('haro-shift-io-9-2021-global', 'shimano-cs-m8000-11', 'factory_installed',
   'https://archive.harobikes.com/mtb/2021-mtb/shift-io-9-2021', '2026-08-08',
   'Haro exact product page specifies Shimano Deore XT M8000 11-speed 11-46T cassette.'),
  ('haro-shift-io-9-2021-global', 'shimano-br-mt520', 'factory_installed',
   'https://archive.harobikes.com/mtb/2021-mtb/shift-io-9-2021', '2026-08-08',
   'Haro exact product page specifies Shimano BR-MT520 brakes with 203 mm rotors.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
