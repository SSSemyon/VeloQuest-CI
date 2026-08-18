-- VeloQuest BMC archive ingestion wave.
-- Archive index labels model years explicitly; this is preferred over inferring
-- model year from current-product URLs or SKU prefixes.

-- These current BMC records were initially classified as 2026 from collection
-- context, but the individual product pages do not expose a sufficiently explicit
-- model-year field. Keep them for provenance, but remove them from Bike Finder
-- until the year is confirmed at product level.
update public.bike_catalog_models
set enabled = false
where id in (
  'bmc-fourstroke-r-01-one-2026-us',
  'bmc-twostroke-01-one-2026-us',
  'bmc-teammachine-slr-four-2026-us',
  'bmc-kaius-01-one-2026-us',
  'bmc-kaius-01-three-2026-us'
);

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  ('bmc-257-amp-al-speed-one-usa-2025-us', 'BMC', '257 AMP AL SPEED ONE USA', 2025, 'urban_fitness', 'US',
   '{"model_year_evidence":"official BMC Bike Archive lists 2025 Edition"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-urs-al-one-2025-us', 'BMC', 'URS AL ONE', 2025, 'gravel', 'US',
   '{"frame_material":"aluminium","model_year_evidence":"official BMC Bike Archive lists 2025 Edition"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-alpenchallenge-al-two-2025-us', 'BMC', 'Alpenchallenge AL TWO', 2025, 'urban_fitness', 'US',
   '{"frame_material":"aluminium","model_year_evidence":"official BMC Bike Archive lists 2025 Edition"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-alpenchallenge-al-three-2025-us', 'BMC', 'Alpenchallenge AL THREE', 2025, 'urban_fitness', 'US',
   '{"frame_material":"aluminium","model_year_evidence":"official BMC Bike Archive lists 2025 Edition"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-alpenchallenge-al-four-2025-us', 'BMC', 'Alpenchallenge AL FOUR', 2025, 'urban_fitness', 'US',
   '{"frame_material":"aluminium","model_year_evidence":"official BMC Bike Archive lists 2025 Edition"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),

  ('bmc-speedmachine-01-ltd-2024-us', 'BMC', 'Speedmachine 01 LTD', 2024, 'triathlon', 'US',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Bike Archive lists 2024"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-speedmachine-01-one-2024-us', 'BMC', 'Speedmachine 01 ONE', 2024, 'triathlon', 'US',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Bike Archive lists 2024"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),
  ('bmc-teammachine-r-01-one-2024-us', 'BMC', 'Teammachine R 01 ONE', 2024, 'road_race', 'US',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Bike Archive lists 2024"}'::jsonb,
   'https://us.bmc-switzerland.com/collections/bike-archive', '2026-08-06'),

  ('bmc-fourstroke-01-team-2024-global', 'BMC', 'Fourstroke 01 TEAM', 2024, 'xc_full_suspension', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-01-ltd-2024-global', 'BMC', 'Fourstroke 01 LTD', 2024, 'xc_full_suspension', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-lt-ltd-2024-global', 'BMC', 'Fourstroke LT LTD', 2024, 'trail_full_suspension', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-01-one-2024-global', 'BMC', 'Fourstroke 01 ONE', 2024, 'xc_full_suspension', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-01-two-2024-global', 'BMC', 'Fourstroke 01 TWO', 2024, 'xc_full_suspension', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-one-2024-global', 'BMC', 'Fourstroke ONE', 2024, 'xc_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-two-2024-global', 'BMC', 'Fourstroke TWO', 2024, 'xc_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-lt-one-2024-global', 'BMC', 'Fourstroke LT ONE', 2024, 'trail_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-twostroke-01-one-2024-global', 'BMC', 'Twostroke 01 ONE', 2024, 'xc_hardtail', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-three-2024-global', 'BMC', 'Fourstroke THREE', 2024, 'xc_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-four-2024-global', 'BMC', 'Fourstroke FOUR', 2024, 'xc_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-fourstroke-lt-two-2024-global', 'BMC', 'Fourstroke LT TWO', 2024, 'trail_full_suspension', 'global',
   '{"model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06'),
  ('bmc-twostroke-01-two-2024-global', 'BMC', 'Twostroke 01 TWO', 2024, 'xc_hardtail', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official BMC Mountain Bike Archive lists 2024"}'::jsonb,
   'https://bmc-switzerland.com/collections/bike-archive-mountain', '2026-08-06')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  category = excluded.category,
  market = excluded.market,
  specs = excluded.specs,
  manufacturer_url = excluded.manufacturer_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;
