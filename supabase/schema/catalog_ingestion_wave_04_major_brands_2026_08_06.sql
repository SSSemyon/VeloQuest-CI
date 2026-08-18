-- VeloQuest verified major-brand expansion wave.
-- Every row has an explicit first-party model-year signal and satisfies model_year >= 2020.

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  ('specialized-crux-comp-2025-us', 'Specialized', 'Crux Comp', 2025, 'gravel', 'US',
   '{"model_year_evidence":"official Specialized Bike Archive lists 2025 Crux Comp","model_year_evidence_url":"https://www.specialized.com/us/en/bike-archive"}'::jsonb,
   'https://www.specialized.com/us/en/bike-archive', '2026-08-06'),

  ('cube-agree-c62-2025-global', 'CUBE', 'Agree C:62', 2025, 'road_race', 'global',
   '{"family_level":true,"frame_material":"carbon","model_year_evidence":"official CUBE product-safety notice explicitly identifies Agree C:62 bikes from model years 2025 and 2026","model_year_evidence_url":"https://www.cube.eu/support/customer-support/safety-recalls/product-safety-recall-agree-c-62-models-2025-2026"}'::jsonb,
   'https://www.cube.eu/support/customer-support/safety-recalls/product-safety-recall-agree-c-62-models-2025-2026', '2026-08-06'),

  ('orbea-orca-m20i-ltd-2025-global', 'Orbea', 'Orca M20i LTD', 2025, 'road_race', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official Orbea story states the M20i LTD replica edition is new for 2025","model_year_evidence_url":"https://stories.orbea.com/en/new-year-new-goals-and-new-orbea-bikes-for-lotto/"}'::jsonb,
   'https://stories.orbea.com/en/new-year-new-goals-and-new-orbea-bikes-for-lotto/', '2026-08-06'),
  ('orbea-orca-aero-m20i-ltd-2025-global', 'Orbea', 'Orca Aero M20i LTD', 2025, 'road_aero', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official Orbea story states the M20i LTD replica edition is new for 2025","model_year_evidence_url":"https://stories.orbea.com/en/new-year-new-goals-and-new-orbea-bikes-for-lotto/"}'::jsonb,
   'https://stories.orbea.com/en/new-year-new-goals-and-new-orbea-bikes-for-lotto/', '2026-08-06'),

  ('cannondale-superx-3-2025-us', 'Cannondale', 'SuperX 3', 2025, 'gravel_race', 'US',
   '{"model_year_evidence":"official Cannondale product URL identifies SuperX 3 as 2025","model_year_evidence_url":"https://www.cannondale.com/en-us/bikes/road/gravel/superx/superx-3/2025"}'::jsonb,
   'https://www.cannondale.com/en-us/bikes/road/gravel/superx/superx-3/2025', '2026-08-06'),
  ('cannondale-supersix-evo-lab71-team-2025-global', 'Cannondale', 'SuperSix EVO LAB71 Team', 2025, 'road_race', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official Cannondale page identifies the bike as a replica of the 2025 team bike","model_year_evidence_url":"https://www.cannondale.com/en/bikes/road/race/supersix-evo/supersix-evo-lab71-team"}'::jsonb,
   'https://www.cannondale.com/en/bikes/road/race/supersix-evo/supersix-evo-lab71-team', '2026-08-06'),

  ('scott-addict-rc-2025-global', 'SCOTT', 'Addict RC', 2025, 'road_race', 'global',
   '{"frame_material":"carbon","family_level":true,"model_year_evidence":"official SCOTT press page is titled New SCOTT Addict RC 2025","model_year_evidence_url":"https://www.scott-sports.com/us/en/press/bike/sco-bike-product-press-gran-fondo-magazine-addict-rc-031224"}'::jsonb,
   'https://www.scott-sports.com/us/en/press/bike/sco-bike-product-press-gran-fondo-magazine-addict-rc-031224', '2026-08-06'),

  ('santa-cruz-hightower-s-2025-us', 'Santa Cruz', 'Hightower S', 2025, 'trail', 'US',
   '{"model_year_evidence":"official Santa Cruz product URL identifies Hightower S as 2025","model_year_evidence_url":"https://www.santacruzbicycles.com/products/hightower-s-2025"}'::jsonb,
   'https://www.santacruzbicycles.com/products/hightower-s-2025', '2026-08-06'),
  ('santa-cruz-v10-dh-x01-2025-us', 'Santa Cruz', 'V10 DH X01', 2025, 'downhill', 'US',
   '{"model_year_evidence":"official Santa Cruz product URL identifies V10 DH X01 as 2025","model_year_evidence_url":"https://www.santacruzbicycles.com/products/v-10-dh-x-01-2025"}'::jsonb,
   'https://www.santacruzbicycles.com/products/v-10-dh-x-01-2025', '2026-08-06'),
  ('santa-cruz-blur-xx-axs-tr-rsv-2025-us', 'Santa Cruz', 'Blur XX AXS Trail RSV', 2025, 'xc_full_suspension', 'US',
   '{"model_year_evidence":"official Santa Cruz product URL identifies Blur XX AXS Trail RSV as 2025","model_year_evidence_url":"https://www.santacruzbicycles.com/collections/blur/products/blur-xx-axs-tr-rsv-2025"}'::jsonb,
   'https://www.santacruzbicycles.com/collections/blur/products/blur-xx-axs-tr-rsv-2025', '2026-08-06'),

  ('pinarello-dogma-f-2025-global', 'Pinarello', 'DOGMA F', 2025, 'road_race', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official Pinarello story explicitly identifies The New DOGMA F 2025","model_year_evidence_url":"https://pinarello.com/europe/en/news/the-new-dogma-f-2025"}'::jsonb,
   'https://pinarello.com/europe/en/news/the-new-dogma-f-2025', '2026-08-06'),
  ('pinarello-dogma-x-2025-global', 'Pinarello', 'DOGMA X', 2025, 'road_endurance', 'global',
   '{"frame_material":"carbon","model_year_evidence":"official Pinarello news index labels DOGMA X MY25","model_year_evidence_url":"https://pinarello.com/global/en/news"}'::jsonb,
   'https://pinarello.com/global/en/news', '2026-08-06')
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
