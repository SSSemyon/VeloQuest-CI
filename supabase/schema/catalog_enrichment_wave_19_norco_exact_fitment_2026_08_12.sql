-- VeloQuest catalog enrichment wave 19.
-- Exact first-party Norco 2025 Optic product specifications only.
-- Adds factory-installed component fitments; no inferred upgrade recommendation
-- or photo URL is added without separate first-party evidence.

begin;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('norco-optic-a1-gen3-2025-ca', 'sram-rd-gx-e-b1', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a1/', '2026-08-12',
   'Official Norco Optic A1 specification lists SRAM GX Eagle AXS T-Type rear derailleur.'),
  ('norco-optic-a1-gen3-2025-ca', 'sram-cs-xs-1275-a1', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a1/', '2026-08-12',
   'Official Norco Optic A1 specification lists SRAM 1275 Eagle T-Type 10-52T cassette.'),
  ('norco-optic-a2-gen3-2025-ca', 'shimano-rd-m6100-sgs', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a2/', '2026-08-12',
   'Official Norco Optic A2 specification lists Shimano Deore RD-M6100 12-speed rear derailleur.'),
  ('norco-optic-a2-gen3-2025-ca', 'shimano-cs-m6100-12', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a2/', '2026-08-12',
   'Official Norco Optic A2 specification lists Shimano Deore CS-M6100-12 10-51T cassette.'),
  ('norco-optic-a2-gen3-2025-ca', 'shimano-br-mt520', 'factory_installed',
   'https://www.norco.com/bikes/mountain/trail/optic/25-optic-a2/', '2026-08-12',
   'Official Norco Optic A2 specification lists Shimano Deore MT520 four-piston brakes.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
