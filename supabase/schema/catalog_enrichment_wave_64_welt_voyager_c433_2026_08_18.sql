-- VeloQuest catalog enrichment wave 64.
-- WELT Voyager 1.0 2026 already has exact factory fitment evidence for Shimano ESSA RD-U2000-GS in Wave46.
-- Wave63 registers official Shimano 7-speed CS-HG200-7 cassette targets.
-- Shimano C-433 explicitly states that an 8-speed rear derailleur can also be used for a 7-speed MTB drivetrain.
-- This wave materializes only those component-to-component compatibility verdicts. No canonical alias, manufacturer-approved bike upgrade, or no-upgrade outcome is inferred.

begin;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at, evidence_notes)
values
  (
    'oem-welt-voyager-1-0-2026-rd',
    'shimano-cs-hg200-7-12-28',
    'compatible',
    'Shimano C-433 states that an 8-speed rear derailleur can also be used for a 7-speed MTB drivetrain; the WELT Voyager 1.0 2026 exact OEM fitment identifies Shimano ESSA RD-U2000-GS as an 8-speed rear derailleur.',
    'https://productinfo.shimano.com/en/compatibility/C-433',
    '2026-08-17',
    'Source component fitment evidence: WELT Voyager 1.0 2026 exact product page in Wave46. Target component identity/specification: Shimano CS-HG200-7 official product page in Wave63.'
  ),
  (
    'oem-welt-voyager-1-0-2026-rd',
    'shimano-cs-hg200-7-12-32',
    'compatible',
    'Shimano C-433 states that an 8-speed rear derailleur can also be used for a 7-speed MTB drivetrain; the WELT Voyager 1.0 2026 exact OEM fitment identifies Shimano ESSA RD-U2000-GS as an 8-speed rear derailleur.',
    'https://productinfo.shimano.com/en/compatibility/C-433',
    '2026-08-17',
    'Source component fitment evidence: WELT Voyager 1.0 2026 exact product page in Wave46. Target component identity/specification: Shimano CS-HG200-7 official product page in Wave63.'
  )
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  evidence_notes = excluded.evidence_notes;

commit;
