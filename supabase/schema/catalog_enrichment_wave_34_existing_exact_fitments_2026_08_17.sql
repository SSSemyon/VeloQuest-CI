-- VeloQuest catalog enrichment wave 34.
-- Materializes factory-installed fitment from exact/product-level official
-- specifications already stored in the catalog with manufacturer provenance.
-- This wave does not add or reinterpret bike specs and does not infer
-- compatibility, manufacturer-approved upgrades, or recommendation outcomes.

begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('oem-bmc-urs-al-one-2025-rd', 'SRAM', 'Apex Eagle', 'rear_derailleur', 'SRAM Apex Eagle', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://us.bmc-switzerland.com/collections/bike-archive/products/urs-al-one-bordeaux-red-gravel-exploration-bikes-bmc-25e-000012', '2026-08-17', true),
  ('oem-bmc-fourstroke-lt-one-2024-rd', 'SRAM', 'GX Eagle', 'rear_derailleur', 'SRAM GX Eagle', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-lt-one-bikes-bmc-24-10517-006', '2026-08-17', true),
  ('oem-bmc-speedmachine-01-ltd-2024-rd', 'SRAM', 'Red AXS', 'rear_derailleur', 'SRAM Red AXS', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://us.bmc-switzerland.com/collections/bike-archive/products/speedmachine-01-ltd-bikes-bmc-24-10627-001', '2026-08-17', true),
  ('oem-bmc-speedmachine-01-one-2024-rd', 'SRAM', 'Red AXS', 'rear_derailleur', 'SRAM Red AXS', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://us.bmc-switzerland.com/collections/bike-archive/products/speedmachine-01-one-bikes-bmc-24-10627-004', '2026-08-17', true),
  ('oem-bmc-teammachine-r-01-one-2024-rd', 'SRAM', 'Red AXS', 'rear_derailleur', 'SRAM Red AXS', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://us.bmc-switzerland.com/collections/bike-archive/products/teammachine-r-01-one-bikes-bmc-24-10628-005', '2026-08-17', true),
  ('oem-cannondale-superx-3-2025-rd', 'Shimano', 'GRX 820 Shadow RD+', 'rear_derailleur', 'Shimano GRX 820 Shadow RD+', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://www.cannondale.com/en-us/bikes/road/gravel/superx/superx-3/2025', '2026-08-17', true),
  ('oem-giant-defy-advanced-2-2026-rd', 'Shimano', '105', 'rear_derailleur', 'Shimano 105', '{"evidence_scope":"existing catalog exact-product OEM label; exact Shimano SKU not inferred"}'::jsonb, 1, 'https://www.giant-bicycles.com/us/defy-advanced-2', '2026-08-17', true),
  ('oem-norco-optic-c2-gen3-2025-brake', 'SRAM', 'Code Silver Stealth 4-piston', 'brake_caliper', 'SRAM Code Silver Stealth 4-piston', '{"pistons":4,"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://www.norco.com/bikes/mountain/trail/optic/25-optic-C2/', '2026-08-17', true),
  ('oem-salsa-beargrease-c-xt-2025-rd', 'Shimano', 'Deore XT M8100', 'rear_derailleur', 'Shimano Deore XT M8100', '{"evidence_scope":"existing catalog archived exact build-kit specification"}'::jsonb, 1, 'https://www.salsacycles.com/products/2025-beargrease-c-xt', '2026-08-17', true),
  ('oem-specialized-crux-dsw-comp-2025-rd', 'SRAM', 'Apex XPLR mechanical', 'rear_derailleur', 'SRAM Apex XPLR mechanical', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://www.specialized.com/us/en/crux-dsw-comp-sram-apex-xplr/p/4221802', '2026-08-17', true),
  ('oem-specialized-crux-pro-2025-rd', 'SRAM', 'Force XPLR eTap AXS', 'rear_derailleur', 'SRAM Force XPLR eTap AXS', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://www.specialized.com/us/en/crux-pro-sram-force-xplr-etap-axs/p/4223481', '2026-08-17', true),
  ('oem-specialized-diverge-comp-carbon-2025-rd', 'SRAM', 'X1 Eagle AXS', 'rear_derailleur', 'SRAM X1 Eagle AXS', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://www.specialized.com/us/en/diverge-comp-carbon-sram-apex-etap-axs/p/4223498', '2026-08-17', true),
  ('oem-specialized-roubaix-sl8-comp-2025-rd', 'Shimano', '105 Di2 R7150', 'rear_derailleur', 'Shimano 105 Di2 R7150', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://www.specialized.com/us/en/roubaix-sl8-comp-shimano-105-di2/p/4221823', '2026-08-17', true),
  ('oem-specialized-roubaix-sl8-expert-2025-rd', 'SRAM', 'Rival eTap AXS 12-speed', 'rear_derailleur', 'SRAM Rival eTap AXS 12-speed', '{"speeds":12,"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://www.specialized.com/us/en/roubaix-sl8-expert-sram-rival-etap-axs/p/4221821', '2026-08-17', true),
  ('oem-specialized-tarmac-sl7-sport-2025-rd', 'Shimano', '105 12-speed mechanical', 'rear_derailleur', 'Shimano 105 12-speed mechanical', '{"speeds":12,"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://www.specialized.com/us/en/tarmac-sl7-sport-shimano-105/p/4221542', '2026-08-17', true),
  ('oem-specialized-tarmac-sl8-pro-ultegra-2025-rd', 'Shimano', 'Ultegra Di2 R8150', 'rear_derailleur', 'Shimano Ultegra Di2 R8150', '{"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935', '2026-08-17', true),
  ('oem-specialized-tarmac-sl8-pro-force-2025-rd', 'SRAM', 'Force eTap AXS 12-speed', 'rear_derailleur', 'SRAM Force eTap AXS 12-speed', '{"speeds":12,"evidence_scope":"existing catalog exact-product OEM specification"}'::jsonb, 1, 'https://www.specialized.com/us/en/tarmac-sl8-pro-sram-force-etap-axs/p/4221537', '2026-08-17', true)
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
  ('bmc-urs-al-one-2025-us', 'oem-bmc-urs-al-one-2025-rd', 'factory_installed', 'https://us.bmc-switzerland.com/collections/bike-archive/products/urs-al-one-bordeaux-red-gravel-exploration-bikes-bmc-25e-000012', '2026-08-17', 'Materialized from existing catalog official BMC exact archive technical specification: SRAM Apex Eagle.'),
  ('bmc-fourstroke-lt-one-2024-global', 'oem-bmc-fourstroke-lt-one-2024-rd', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-lt-one-bikes-bmc-24-10517-006', '2026-08-17', 'Materialized from existing catalog official BMC exact archive product technical specification: SRAM GX Eagle.'),
  ('bmc-speedmachine-01-ltd-2024-us', 'oem-bmc-speedmachine-01-ltd-2024-rd', 'factory_installed', 'https://us.bmc-switzerland.com/collections/bike-archive/products/speedmachine-01-ltd-bikes-bmc-24-10627-001', '2026-08-17', 'Materialized from existing catalog official BMC exact archive technical specification: SRAM Red AXS.'),
  ('bmc-speedmachine-01-one-2024-us', 'oem-bmc-speedmachine-01-one-2024-rd', 'factory_installed', 'https://us.bmc-switzerland.com/collections/bike-archive/products/speedmachine-01-one-bikes-bmc-24-10627-004', '2026-08-17', 'Materialized from existing catalog official BMC exact archive technical specification: SRAM Red AXS.'),
  ('bmc-teammachine-r-01-one-2024-us', 'oem-bmc-teammachine-r-01-one-2024-rd', 'factory_installed', 'https://us.bmc-switzerland.com/collections/bike-archive/products/teammachine-r-01-one-bikes-bmc-24-10628-005', '2026-08-17', 'Materialized from existing catalog official BMC exact archive technical specification: SRAM Red AXS.'),
  ('cannondale-superx-3-2025-us', 'oem-cannondale-superx-3-2025-rd', 'factory_installed', 'https://www.cannondale.com/en-us/bikes/road/gravel/superx/superx-3/2025', '2026-08-17', 'Materialized from existing catalog official Cannondale exact product specification: Shimano GRX 820 Shadow RD+.'),
  ('giant-defy-advanced-2-2026-us', 'oem-giant-defy-advanced-2-2026-rd', 'factory_installed', 'https://www.giant-bicycles.com/us/defy-advanced-2', '2026-08-17', 'Materialized from existing catalog official Giant exact product specification: Shimano 105 OEM label; SKU is not inferred.'),
  ('norco-optic-c2-gen3-2025-global', 'oem-norco-optic-c2-gen3-2025-brake', 'factory_installed', 'https://www.norco.com/bikes/mountain/trail/optic/25-optic-C2/', '2026-08-17', 'Materialized from existing catalog official Norco exact product specification: SRAM Code Silver Stealth 4-piston.'),
  ('salsa-beargrease-c-xt-2025-us', 'oem-salsa-beargrease-c-xt-2025-rd', 'factory_installed', 'https://www.salsacycles.com/products/2025-beargrease-c-xt', '2026-08-17', 'Materialized from existing catalog official Salsa archived exact build kit: Shimano Deore XT M8100.'),
  ('specialized-crux-dsw-comp-sram-apex-xplr-2025-global', 'oem-specialized-crux-dsw-comp-2025-rd', 'factory_installed', 'https://www.specialized.com/us/en/crux-dsw-comp-sram-apex-xplr/p/4221802', '2026-08-17', 'Materialized from existing catalog official Specialized exact product specification: SRAM Apex XPLR mechanical.'),
  ('specialized-crux-pro-2025-us', 'oem-specialized-crux-pro-2025-rd', 'factory_installed', 'https://www.specialized.com/us/en/crux-pro-sram-force-xplr-etap-axs/p/4223481', '2026-08-17', 'Materialized from existing catalog official Specialized exact product specification: SRAM Force XPLR eTap AXS.'),
  ('specialized-diverge-comp-carbon-sram-apex-etap-axs-2025-global', 'oem-specialized-diverge-comp-carbon-2025-rd', 'factory_installed', 'https://www.specialized.com/us/en/diverge-comp-carbon-sram-apex-etap-axs/p/4223498', '2026-08-17', 'Materialized from existing catalog official Specialized exact product specification: SRAM X1 Eagle AXS.'),
  ('specialized-roubaix-sl8-comp-2025-us', 'oem-specialized-roubaix-sl8-comp-2025-rd', 'factory_installed', 'https://www.specialized.com/us/en/roubaix-sl8-comp-shimano-105-di2/p/4221823', '2026-08-17', 'Materialized from existing catalog official Specialized exact product specification: Shimano 105 Di2 R7150.'),
  ('specialized-roubaix-sl8-expert-sram-rival-etap-axs-2025-global', 'oem-specialized-roubaix-sl8-expert-2025-rd', 'factory_installed', 'https://www.specialized.com/us/en/roubaix-sl8-expert-sram-rival-etap-axs/p/4221821', '2026-08-17', 'Materialized from existing catalog official Specialized exact product specification: SRAM Rival eTap AXS 12-speed.'),
  ('specialized-tarmac-sl7-sport-shimano-105-2025-global', 'oem-specialized-tarmac-sl7-sport-2025-rd', 'factory_installed', 'https://www.specialized.com/us/en/tarmac-sl7-sport-shimano-105/p/4221542', '2026-08-17', 'Materialized from existing catalog official Specialized exact product specification: Shimano 105 12-speed mechanical.'),
  ('specialized-tarmac-sl8-pro-ultegra-2025-us', 'oem-specialized-tarmac-sl8-pro-ultegra-2025-rd', 'factory_installed', 'https://www.specialized.com/us/en/tarmac-sl8-pro-shimano-ultegra-di2/p/4274935', '2026-08-17', 'Materialized from existing catalog official Specialized exact product specification: Shimano Ultegra Di2 R8150.'),
  ('specialized-tarmac-sl8-pro-sram-force-etap-axs-2025-global', 'oem-specialized-tarmac-sl8-pro-force-2025-rd', 'factory_installed', 'https://www.specialized.com/us/en/tarmac-sl8-pro-sram-force-etap-axs/p/4221537', '2026-08-17', 'Materialized from existing catalog official Specialized exact product specification: SRAM Force eTap AXS 12-speed.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
