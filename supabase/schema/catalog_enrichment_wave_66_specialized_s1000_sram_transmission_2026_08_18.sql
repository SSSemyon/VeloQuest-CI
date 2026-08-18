-- VeloQuest catalog enrichment wave 66.
-- Specialized exact 2026 product evidence in Wave28 identifies two bike-scoped SRAM S-1000 rear derailleurs as Eagle Transmission / T-Type 12-speed.
-- Wave65 registers four exact official non-DH SRAM T-Type Eagle Transmission cassette targets.
-- SRAM's official Eagle Transmission maintenance guide states that T-Type parts are engineered for Transmission and that Eagle components may be mixed within the same system, while XX DH is excluded.
-- This wave materializes component-to-component compatibility only. It does not infer aliases, manufacturer-approved bike upgrades, or no-upgrade outcomes.

begin;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at, evidence_notes)
values
  ('sram-s1000-eagle-transmission-oem-specialized', 'sram-cs-xs-1275-a1', 'compatible',
   'SRAM permits T-Type Eagle Transmission components to be mixed within the standard Eagle Transmission system; both source and target are identified as non-DH Eagle Transmission / T-Type components.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-18',
   'Source identity: Specialized Epic 8 Comp 2026 exact page in Wave28 lists SRAM S-1000 Eagle AXS / T-Type 12-speed and SRAM S-1000 Eagle Transmission. Target identity/specification: official SRAM CS-XS-1275-A1 evidence in Wave65.'),
  ('sram-s1000-eagle-transmission-oem-specialized', 'sram-cs-xs-1295-a1', 'compatible',
   'SRAM permits T-Type Eagle Transmission components to be mixed within the standard Eagle Transmission system; both source and target are identified as non-DH Eagle Transmission / T-Type components.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-18',
   'Source identity: Specialized Epic 8 Comp 2026 exact page in Wave28 lists SRAM S-1000 Eagle AXS / T-Type 12-speed and SRAM S-1000 Eagle Transmission. Target identity/specification: official SRAM CS-XS-1295-A1 evidence in Wave65.'),
  ('sram-s1000-eagle-transmission-oem-specialized', 'sram-cs-xs-1297-a1', 'compatible',
   'SRAM permits T-Type Eagle Transmission components to be mixed within the standard Eagle Transmission system; both source and target are identified as non-DH Eagle Transmission / T-Type components.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-18',
   'Source identity: Specialized Epic 8 Comp 2026 exact page in Wave28 lists SRAM S-1000 Eagle AXS / T-Type 12-speed and SRAM S-1000 Eagle Transmission. Target identity/specification: official SRAM CS-XS-1297-A1 evidence in Wave65.'),
  ('sram-s1000-eagle-transmission-oem-specialized', 'sram-cs-xs-1299-a1', 'compatible',
   'SRAM permits T-Type Eagle Transmission components to be mixed within the standard Eagle Transmission system; both source and target are identified as non-DH Eagle Transmission / T-Type components.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-18',
   'Source identity: Specialized Epic 8 Comp 2026 exact page in Wave28 lists SRAM S-1000 Eagle AXS / T-Type 12-speed and SRAM S-1000 Eagle Transmission. Target identity/specification: official SRAM CS-XS-1299-A1 evidence in Wave65.'),
  ('sram-s1000-eagle-axs-oem-specialized-levo', 'sram-cs-xs-1275-a1', 'compatible',
   'SRAM permits T-Type Eagle Transmission components to be mixed within the standard Eagle Transmission system; both source and target are identified as non-DH Eagle Transmission / T-Type components.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-18',
   'Source identity: Specialized Turbo Levo 4 Comp 2026 exact page in Wave28 lists SRAM S1000 Eagle T-Type AXS and SRAM S-1000 Eagle AXS Transmission. Target identity/specification: official SRAM CS-XS-1275-A1 evidence in Wave65.'),
  ('sram-s1000-eagle-axs-oem-specialized-levo', 'sram-cs-xs-1295-a1', 'compatible',
   'SRAM permits T-Type Eagle Transmission components to be mixed within the standard Eagle Transmission system; both source and target are identified as non-DH Eagle Transmission / T-Type components.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-18',
   'Source identity: Specialized Turbo Levo 4 Comp 2026 exact page in Wave28 lists SRAM S1000 Eagle T-Type AXS and SRAM S-1000 Eagle AXS Transmission. Target identity/specification: official SRAM CS-XS-1295-A1 evidence in Wave65.'),
  ('sram-s1000-eagle-axs-oem-specialized-levo', 'sram-cs-xs-1297-a1', 'compatible',
   'SRAM permits T-Type Eagle Transmission components to be mixed within the standard Eagle Transmission system; both source and target are identified as non-DH Eagle Transmission / T-Type components.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-18',
   'Source identity: Specialized Turbo Levo 4 Comp 2026 exact page in Wave28 lists SRAM S1000 Eagle T-Type AXS and SRAM S-1000 Eagle AXS Transmission. Target identity/specification: official SRAM CS-XS-1297-A1 evidence in Wave65.'),
  ('sram-s1000-eagle-axs-oem-specialized-levo', 'sram-cs-xs-1299-a1', 'compatible',
   'SRAM permits T-Type Eagle Transmission components to be mixed within the standard Eagle Transmission system; both source and target are identified as non-DH Eagle Transmission / T-Type components.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-18',
   'Source identity: Specialized Turbo Levo 4 Comp 2026 exact page in Wave28 lists SRAM S1000 Eagle T-Type AXS and SRAM S-1000 Eagle AXS Transmission. Target identity/specification: official SRAM CS-XS-1299-A1 evidence in Wave65.')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  evidence_notes = excluded.evidence_notes;

commit;
