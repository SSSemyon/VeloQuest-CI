-- VeloQuest catalog enrichment wave 35.
-- Canonicalizes exact Shimano ROAD rear-derailleur identities without replacing
-- the original OEM fitment evidence. Compatibility verdicts are copied from
-- Shimano compatibility chart C-254 only. No bike-level recommendation outcome
-- or manufacturer-approved upgrade is inferred.

begin;

-- First introduction of structured compatibility evidence notes. Keep this as
-- an incremental migration rather than rewriting the historical Garage baseline.
alter table public.garage_compatibility
  add column if not exists evidence_notes text;

create table if not exists public.garage_component_aliases (
  alias_component_id text primary key references public.garage_components(id) on delete cascade,
  canonical_component_id text not null references public.garage_components(id) on delete restrict,
  evidence_url text not null check (evidence_url ~ '^https://'),
  evidence_checked_at date not null,
  notes text,
  check (alias_component_id <> canonical_component_id)
);

alter table public.garage_component_aliases enable row level security;
drop policy if exists garage_component_aliases_read on public.garage_component_aliases;
create policy garage_component_aliases_read on public.garage_component_aliases
  for select to authenticated using (true);
revoke all on public.garage_component_aliases from anon;
grant select on public.garage_component_aliases to authenticated;
revoke insert, update, delete on public.garage_component_aliases from authenticated;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('shimano-rd-r7150', 'Shimano', 'RD-R7150', 'rear_derailleur', 'Shimano 105 Di2 RD-R7150',
   '{"speeds":12,"family":"105 Di2","evidence_scope":"Shimano official compatibility component identity"}'::jsonb,
   1, 'https://productinfo.shimano.com/en/compatibility/C-254', '2026-08-17', true),
  ('shimano-cs-r7101-12-11-34', 'Shimano', 'CS-R7101-12 11-34T', 'cassette', 'Shimano 105 CS-R7101-12 11-34T',
   '{"speeds":12,"range":"11-34T","evidence_scope":"Shimano official compatibility chart"}'::jsonb,
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
  ('shimano-rd-r9250', 'shimano-cs-r9200', 'compatible',
   'Shimano C-254 marks RD-R9250 compatible with a 12-speed 11-34T cassette range.',
   'https://productinfo.shimano.com/en/compatibility/C-254', '2026-08-17', 'ROAD/Gravel 12-speed chart; 11-34T is checked for RD-R9250.'),
  ('shimano-rd-r7150', 'shimano-cs-r7101-12-11-34', 'compatible',
   'Shimano C-254 marks RD-R7150 compatible with a 12-speed 11-34T cassette range.',
   'https://productinfo.shimano.com/en/compatibility/C-254', '2026-08-17', 'ROAD/Gravel 12-speed chart; 11-34T is checked for RD-R7150.'),
  ('shimano-rd-r7150', 'shimano-cs-hg710-12', 'compatible',
   'Shimano C-254 marks RD-R7150 compatible with a 12-speed 11-36T cassette range.',
   'https://productinfo.shimano.com/en/compatibility/C-254', '2026-08-17', 'ROAD/Gravel 12-speed chart; 11-36T is checked for RD-R7150.')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  evidence_notes = excluded.evidence_notes;

insert into public.garage_component_aliases
  (alias_component_id, canonical_component_id, evidence_url, evidence_checked_at, notes)
values
  ('shimano-rd-r9250-oem-specialized', 'shimano-rd-r9250',
   'https://www.specialized.com/ch/en/s-works-tarmac-sl8-shimano-dura-ace-di2/p/4221553', '2026-08-17',
   'Specialized exact product page names Shimano Dura-Ace R9250; canonical Shimano identity is RD-R9250.'),
  ('shimano-rd-r9250-oem-lapierre', 'shimano-rd-r9250',
   'https://lapierrebikes.com/en-ch/products/xelius-drs-team-replica-lxhua', '2026-08-17',
   'Lapierre exact product page names Shimano Dura-Ace Di2 RD-R9250; canonical Shimano identity is RD-R9250.'),
  ('oem-specialized-tarmac-sl8-pro-ultegra-2025-rd', 'shimano-rd-r8150',
   'https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935', '2026-08-17',
   'Specialized exact product page/catalog evidence names Shimano Ultegra Di2 R8150; canonical Shimano identity is RD-R8150.'),
  ('oem-specialized-roubaix-sl8-comp-2025-rd', 'shimano-rd-r7150',
   'https://www.specialized.com/us/en/roubaix-sl8-comp-shimano-105-di2/p/4221823', '2026-08-17',
   'Specialized exact product page/catalog evidence names Shimano 105 Di2 R7150; canonical Shimano identity is RD-R7150.')
on conflict (alias_component_id) do update set
  canonical_component_id = excluded.canonical_component_id,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
