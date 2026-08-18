-- VeloQuest catalog enrichment wave 23.
-- Official Rocky Mountain 2024 archive collection evidence only. The archive
-- explicitly lists exact bike model cards next to OEM fork labels. This wave
-- records factory-installed fitment only; exact aftermarket SKU, compatibility,
-- core specs, media and upgrade recommendations are intentionally not inferred.

begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('rockshox-lyrik-select-oem', 'RockShox', 'Lyrik Select', 'fork', 'RockShox Lyrik Select', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes', '2026-08-17', true),
  ('rockshox-revelation-select-rc-oem', 'RockShox', 'Revelation Select RC', 'fork', 'RockShox Revelation Select RC', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes', '2026-08-17', true),
  ('rockshox-35-gold-rl-oem', 'RockShox', '35 Gold RL', 'fork', 'RockShox 35 Gold RL', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes', '2026-08-17', true),
  ('marzocchi-z2-rail-oem', 'Marzocchi', 'Z2 Rail', 'fork', 'Marzocchi Z2 Rail', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes', '2026-08-17', true),
  ('fox-36-grip-performance-oem', 'Fox', '36 GRIP Performance', 'fork', 'Fox 36 GRIP Performance', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes', '2026-08-17', true),
  ('fox-36-e-mtb-float-evol-grip-performance-oem', 'Fox', '36 E-MTB Float EVOL GRIP Performance', 'fork', 'Fox 36 E-MTB Float EVOL GRIP Performance', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', true),
  ('rockshox-lyrik-ultimate-flight-attendant-oem', 'RockShox', 'Lyrik Ultimate Flight Attendant', 'fork', 'RockShox Lyrik Ultimate Flight Attendant', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', true),
  ('fox-36-grip2-factory-oem', 'Fox', '36 Grip 2 Factory', 'fork', 'Fox 36 Grip 2 Factory', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', true),
  ('fox-36-performance-elite-oem', 'Fox', '36 Performance Elite', 'fork', 'Fox 36 Performance Elite', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', true),
  ('rockshox-lyrik-select-plus-oem', 'RockShox', 'Lyrik Select+', 'fork', 'RockShox Lyrik Select+', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', true),
  ('rockshox-lyrik-select-rc-oem', 'RockShox', 'Lyrik Select RC', 'fork', 'RockShox Lyrik Select RC', '{"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', true),
  ('rockshox-reba-r-120-oem', 'RockShox', 'Reba R 120mm', 'fork', 'RockShox Reba R 120mm', '{"travel_mm":120,"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes', '2026-08-17', true),
  ('rockshox-reba-r-140-oem', 'RockShox', 'Reba R 140mm', 'fork', 'RockShox Reba R 140mm', '{"travel_mm":140,"evidence_scope":"Rocky Mountain 2024 archive OEM label; exact aftermarket SKU not inferred"}'::jsonb, 1, 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', true)
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('rocky-mountain-instinct-powerplay-alloy-70-2024-global', 'rockshox-lyrik-select-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Instinct Powerplay Alloy 70 with RockShox Lyrik Select.'),
  ('rocky-mountain-instinct-powerplay-alloy-50-2024-global', 'rockshox-revelation-select-rc-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Instinct Powerplay Alloy 50 with RockShox Revelation Select RC.'),
  ('rocky-mountain-instinct-powerplay-carbon-50-2024-global', 'rockshox-lyrik-select-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Instinct Powerplay Carbon 50 with RockShox Lyrik Select.'),
  ('rocky-mountain-instinct-alloy-30-2024-global', 'rockshox-35-gold-rl-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Instinct Alloy 30 with RockShox 35 Gold RL.'),
  ('rocky-mountain-instinct-carbon-30-2024-global', 'marzocchi-z2-rail-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Instinct Carbon 30 with Marzocchi Z2 Rail.'),
  ('rocky-mountain-instinct-alloy-50-2024-global', 'fox-36-grip-performance-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Instinct Alloy 50 with Fox 36 GRIP Performance.'),
  ('rocky-mountain-instinct-powerplay-carbon-70-2024-global', 'fox-36-e-mtb-float-evol-grip-performance-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Instinct Powerplay Carbon 70 with Fox 36 E-MTB Float EVOL GRIP Performance.'),
  ('rocky-mountain-instinct-carbon-99-2024-global', 'rockshox-lyrik-ultimate-flight-attendant-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Instinct Carbon 99 with RockShox Lyrik Ultimate Flight Attendant.'),
  ('rocky-mountain-instinct-carbon-90-2024-global', 'fox-36-grip2-factory-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Instinct Carbon 90 with Fox 36 Grip 2 Factory.'),
  ('rocky-mountain-instinct-carbon-70-2024-global', 'fox-36-performance-elite-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', 'Official Rocky Mountain 2024 archive Shimano build card lists Instinct Carbon 70 with Fox 36 Performance Elite.'),
  ('rocky-mountain-instinct-carbon-70-2024-sram-x0-transmission-global', 'rockshox-lyrik-select-plus-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', 'Official Rocky Mountain 2024 archive SRAM X0 build card lists Instinct Carbon 70 with RockShox Lyrik Select+.'),
  ('rocky-mountain-instinct-carbon-50-2024-global', 'rockshox-lyrik-select-rc-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Instinct Carbon 50 with RockShox Lyrik Select RC.'),
  ('rocky-mountain-reaper-powerplay-24-2024-global', 'rockshox-reba-r-120-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Reaper Powerplay 24 with RockShox Reba R 120mm.'),
  ('rocky-mountain-reaper-powerplay-26-2024-global', 'rockshox-reba-r-140-oem', 'factory_installed', 'https://bikes.com/collections/2024-bikes?page=2', '2026-08-17', 'Official Rocky Mountain 2024 archive lists Reaper Powerplay 26 with RockShox Reba R 140mm.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
