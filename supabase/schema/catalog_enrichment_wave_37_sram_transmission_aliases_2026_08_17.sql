-- VeloQuest catalog enrichment wave 37.
-- Canonicalizes exact SRAM GX/XX/X0 Eagle Transmission OEM rear derailleurs
-- from Specialized exact product evidence. SRAM explicitly distinguishes Eagle
-- Drivetrain from Eagle Transmission and states that T-Type parts are engineered
-- to work within the Transmission system. Legacy XG-1275 Eagle is therefore a
-- fail-safe incompatible target for these T-Type rear derailleurs.
-- No positive cassette upgrade or bike-level outcome is inferred.

begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('sram-rd-gx-e-b1', 'SRAM', 'RD-GX-E-B1', 'rear_derailleur', 'SRAM GX Eagle Transmission Derailleur',
   '{"speeds":12,"chain_technology":"T-Type","interface":"Full Mount","evidence_scope":"SRAM official product identity"}'::jsonb,
   1, 'https://www.sram.com/en/sram/models/rd-gx-e-b1', '2026-08-17', true),
  ('sram-rd-xx-e-b1', 'SRAM', 'RD-XX-E-B1', 'rear_derailleur', 'SRAM XX Eagle Transmission Derailleur',
   '{"speeds":12,"chain_technology":"T-Type","interface":"Full Mount","evidence_scope":"SRAM official product identity"}'::jsonb,
   1, 'https://www.sram.com/en/sram/models/rd-xx-e-b1', '2026-08-17', true),
  ('sram-rd-x0-e-b1', 'SRAM', 'RD-X0-E-B1', 'rear_derailleur', 'SRAM X0 Eagle Transmission Derailleur',
   '{"speeds":12,"chain_technology":"T-Type","interface":"Full Mount","evidence_scope":"SRAM official product identity"}'::jsonb,
   1, 'https://www.sram.com/en/sram/models/rd-x0-e-b1', '2026-08-17', true)
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at, evidence_notes)
values
  ('sram-rd-gx-e-b1', 'sram-cs-xg-1275-b1', 'incompatible',
   'SRAM separates Eagle Drivetrain from Eagle Transmission: T-Type parts are engineered for the Transmission system, while XG-1275 is a legacy Eagle Drivetrain cassette.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-17',
   'Fail-safe verdict only. No positive T-Type cassette recommendation is created until exact installed cassette identity is materialized.'),
  ('sram-rd-xx-e-b1', 'sram-cs-xg-1275-b1', 'incompatible',
   'SRAM separates Eagle Drivetrain from Eagle Transmission: T-Type parts are engineered for the Transmission system, while XG-1275 is a legacy Eagle Drivetrain cassette.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-17',
   'Fail-safe verdict only. No positive T-Type cassette recommendation is created until exact installed cassette identity is materialized.'),
  ('sram-rd-x0-e-b1', 'sram-cs-xg-1275-b1', 'incompatible',
   'SRAM separates Eagle Drivetrain from Eagle Transmission: T-Type parts are engineered for the Transmission system, while XG-1275 is a legacy Eagle Drivetrain cassette.',
   'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance', '2026-08-17',
   'Fail-safe verdict only. No positive T-Type cassette recommendation is created until exact installed cassette identity is materialized.')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  evidence_notes = excluded.evidence_notes;

insert into public.garage_component_aliases
  (alias_component_id, canonical_component_id, evidence_url, evidence_checked_at, notes)
values
  ('sram-gx-eagle-transmission-oem-specialized-levo-expert', 'sram-rd-gx-e-b1',
   'https://www.specialized.com/ch/en/turbo-levo-4-expert/p/4218705', '2026-08-17',
   'Specialized exact Turbo Levo 4 Expert page lists SRAM GX Eagle Transmission.'),
  ('sram-gx-eagle-transmission-oem-specialized-epic-expert', 'sram-rd-gx-e-b1',
   'https://www.specialized.com/us/en/epic-8-expert-sram-gx-axs-rockshox-select/p/4221521', '2026-08-17',
   'Specialized exact Epic 8 Expert page lists SRAM GX Eagle AXS Transmission.'),
  ('sram-xx-eagle-transmission-oem-specialized-levo', 'sram-rd-xx-e-b1',
   'https://www.specialized.com/ch/en/s-works-turbo-levo-4/p/4291510', '2026-08-17',
   'Specialized exact S-Works Turbo Levo 4 page lists SRAM XX Eagle Transmission.'),
  ('sram-x0-eagle-transmission-oem-specialized-epic-pro', 'sram-rd-x0-e-b1',
   'https://www.specialized.com/us/en/epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant/p/4221523', '2026-08-17',
   'Specialized exact Epic 8 Pro page lists SRAM X0 Eagle Transmission.'),
  ('sram-x0-eagle-transmission-oem-specialized-levo-pro', 'sram-rd-x0-e-b1',
   'https://www.specialized.com/ch/en/turbo-levo-4-pro/p/4221339', '2026-08-17',
   'Specialized exact Turbo Levo 4 Pro page lists SRAM X0 Eagle Transmission.')
on conflict (alias_component_id) do update set
  canonical_component_id = excluded.canonical_component_id,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
