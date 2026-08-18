-- VeloQuest catalog enrichment wave 36.
-- Canonicalizes the exact Shimano GRX RD-RX822-GS OEM identity from the
-- Specialized Crux Comp evidence. Shimano compatibility chart C-254 explicitly
-- marks the GS rear derailleur compatible with a 12-speed 10-45T cassette.
-- No bike-level outcome or manufacturer-approved upgrade is inferred.

begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('shimano-rd-rx822-gs', 'Shimano', 'RD-RX822-GS', 'rear_derailleur', 'Shimano GRX RD-RX822-GS',
   '{"speeds":12,"cage":"GS","evidence_scope":"Shimano official compatibility component identity"}'::jsonb,
   1, 'https://productinfo.shimano.com/en/compatibility/C-254', '2026-08-17', true)
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
  ('shimano-rd-rx822-gs', 'shimano-cs-m8100-10-45', 'compatible',
   'Shimano C-254 marks RD-RX822-GS compatible with a 12-speed 10-45T cassette range.',
   'https://productinfo.shimano.com/en/compatibility/C-254', '2026-08-17',
   'ROAD/Gravel 12-speed chart distinguishes RD-RX822 GS (10-45T) from SGS (10-51T).')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  evidence_notes = excluded.evidence_notes;

insert into public.garage_component_aliases
  (alias_component_id, canonical_component_id, evidence_url, evidence_checked_at, notes)
values
  ('shimano-rd-rx822-gs-oem-specialized', 'shimano-rd-rx822-gs',
   'https://www.specialized.com/gb/en/crux-comp-shimano-grx/p/4223490', '2026-08-17',
   'Specialized exact Crux Comp product page names Shimano GRX RD-RX822-GS; canonical Shimano identity is RD-RX822-GS.')
on conflict (alias_component_id) do update set
  canonical_component_id = excluded.canonical_component_id,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
