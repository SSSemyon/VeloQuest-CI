-- VeloQuest catalog expansion wave 12.
-- Cervelo generations are sourced from the official Bike Archive/support pages.
-- Each row uses an explicitly supported model year >= 2020; no year is inferred
-- from paint, component generation, retailer listings, or current availability.

insert into public.bike_catalog_models
  (id, brand, model, model_year, category, market, specs, manufacturer_url, evidence_checked_at)
values
  ('cervelo-r5-disc-mk4-2023-global', 'Cervelo', 'R5 Disc MK4', 2023, 'road_race', 'global',
   '{"family_level":true,"wheel_size":"700C","front_axle":"12x100 mm","model_year_evidence":"official Cervelo support identifies R5 Disc MK4 first model year 2023 and current archive generation"}'::jsonb,
   'https://www.cervelo.com/en-US/support/R5%20DISC%20MK4', '2026-08-07'),
  ('cervelo-s5-disc-mk4-2023-global', 'Cervelo', 'S5 Disc MK4', 2023, 'road_aero', 'global',
   '{"family_level":true,"wheel_size":"700C","front_axle":"12x100 mm","model_year_evidence":"official Cervelo support identifies S5 Disc MK4 first model year 2023 and current archive generation"}'::jsonb,
   'https://www.cervelo.com/en-US/support/S5%20DISC%20MK4', '2026-08-07'),
  ('cervelo-soloist-disc-mk1-2023-global', 'Cervelo', 'Soloist Disc MK1', 2023, 'road_race', 'global',
   '{"family_level":true,"wheel_size":"700C","front_axle":"12x100 mm","model_year_evidence":"official Cervelo support identifies Soloist Disc MK1 first model year 2023 and current archive generation"}'::jsonb,
   'https://www.cervelo.com/en-US/support/SOLOIST%20DISC%20MK1', '2026-08-07'),
  ('cervelo-zfs-5-disc-mk1-2024-global', 'Cervelo', 'ZFS-5 Disc MK1', 2024, 'xc_full_suspension', 'global',
   '{"family_level":true,"frame_material":"carbon","wheel_size":"29","rear_axle":"12x148 mm","model_year_evidence":"official Cervelo support identifies ZFS-5 Disc MK1 first model year 2024 and current archive generation"}'::jsonb,
   'https://www.cervelo.com/en-US/support/ZFS-5%20DISC%20MK1', '2026-08-07'),
  ('cervelo-caledonia-5-disc-mk1-2021-global', 'Cervelo', 'Caledonia-5 Disc MK1', 2021, 'road_endurance', 'global',
   '{"family_level":true,"wheel_size":"700C","model_year_evidence":"official Cervelo support identifies Caledonia-5 Disc MK1 first model year 2021 and current archive generation"}'::jsonb,
   'https://www.cervelo.com/en-US/support/CALEDONIA-5%20DISC%20MK1', '2026-08-07'),
  ('cervelo-caledonia-disc-mk1-2021-global', 'Cervelo', 'Caledonia Disc MK1', 2021, 'road_endurance', 'global',
   '{"family_level":true,"model_year_evidence":"official Cervelo Bike Archive lists Caledonia Disc MK1 as 2021-present"}'::jsonb,
   'https://www.cervelo.com/en-US/support/archive', '2026-08-07'),
  ('cervelo-p5-disc-mk2-2020-global', 'Cervelo', 'P5 Disc MK2', 2020, 'triathlon_tt', 'global',
   '{"family_level":true,"model_year_evidence":"official Cervelo support lists P5 Disc MK2 from model year 2019-present; 2020 is explicitly inside the supported generation range"}'::jsonb,
   'https://www.cervelo.com/en-US/support/P5%20DISC%20MK2', '2026-08-07')
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
