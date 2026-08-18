-- VeloQuest catalog enrichment wave 63.
-- Canonical Shimano 7-speed cassette targets required by the strict C-433 adapter.
-- Exact component identity/specification comes from the official Shimano CS-HG200-7 product page.
-- This wave adds component evidence only. It does not infer bike fitment, compatibility, manufacturer-approved upgrades, or no-upgrade outcomes.

begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  (
    'shimano-cs-hg200-7-12-28',
    'Shimano',
    'CS-HG200-7 12-28T',
    'cassette',
    'Shimano CS-HG200-7 12-28T',
    '{"speeds":7,"range":"12-28T","type":"HG","compatible_chain":"IG, HG 8/7/6-speed","spline":"HG spline S (7-speed)","evidence_scope":"Shimano official exact product specification"}'::jsonb,
    1,
    'https://productinfo.shimano.com/en/product/CS-HG200-7',
    '2026-08-17',
    true
  ),
  (
    'shimano-cs-hg200-7-12-32',
    'Shimano',
    'CS-HG200-7 12-32T',
    'cassette',
    'Shimano CS-HG200-7 12-32T',
    '{"speeds":7,"range":"12-32T","type":"HG","compatible_chain":"IG, HG 8/7/6-speed","spline":"HG spline S (7-speed)","evidence_scope":"Shimano official exact product specification"}'::jsonb,
    1,
    'https://productinfo.shimano.com/en/product/CS-HG200-7',
    '2026-08-17',
    true
  )
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

commit;
