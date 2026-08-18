-- VeloQuest catalog enrichment wave 25.
-- Exact first-party Lapierre and KTM 2026 product pages only. Adds stated core
-- specs, one official Lapierre product image and factory component fitments.
-- Lapierre explicitly reserves the right to substitute equivalent/higher-grade
-- components, so these rows describe the published factory specification and
-- are never promoted to compatibility or upgrade recommendations.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"LOW Aluminium Low entry","wheel_size":"27.5","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 9-speed","rear_derailleur":"Shimano CUES RD-U3020-9s, Shadow","brakes":"Tektro Hydraulic Disc brake HD-M280, 2 pistons, resin pad, 203 mm","fork":"Suntour XCM32-Boost RL DS, 100 mm","cassette":"Shimano CUES CS-LG300-9, HG","crankset":"Crius ISIS Cranks + CR-E15 BDU 38 + Bashring","wheelset":"XLC WR-M37 Disc 30/584, 32H, 6,5 mm Valve","tires":"XLC VT-T45 Tourak 60-584","motor":"Bosch Performance line","battery_wh":540,"spec_evidence":"official Lapierre exact E-Explorer 5.5 2026 product page; manufacturer reserves the right to replace individual components with equivalent or higher-quality components"}'::jsonb,
    manufacturer_url = 'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub',
    evidence_checked_at = '2026-08-17'
where id = 'lapierre-e-explorer-5-5-low-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"LOW Aluminium Low entry","wheel_size":"27.5","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 9-speed","rear_derailleur":"Shimano CUES RD-U3020-9s, Shadow","brakes":"Tektro Hydraulic Disc brake HD-M280, 2 pistons, resin pad, 203 mm","fork":"Suntour XCM32-Boost RL DS, 110 mm","cassette":"Shimano CUES CS-LG300-9, HG","crankset":"Crius ISIS Cranks + CR-E15 BDU 38 + Bashring","wheelset":"XLC WR-M37 Disc 30/584, 32H, 6,5 mm Valve","tires":"XLC VT-T45 Tourak 60-584","motor":"Bosch Performance Line PX","battery_wh":500,"spec_evidence":"official Lapierre exact E-Explorer 6.5 2026 product page; manufacturer reserves the right to replace individual components with equivalent or higher-quality components"}'::jsonb,
    manufacturer_url = 'https://lapierrebikes.com/en-ch/products/e-explorer-65-llcub',
    evidence_checked_at = '2026-08-17'
where id = 'lapierre-e-explorer-6-5-low-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Gravelator Premium Carbon/R6990","wheel_size":"622x32TC","drivetrain_brand":"SRAM","drivetrain":"SRAM RED XPLR AXS 1x13","rear_derailleur":"SRAM RED XPLR AXS 13s","brakes":"SRAM RED AXS E1 HRD / SRAM Paceline-X CL 160","fork":"Gravel Carbon Fork F18 Race w/o mount","cassette":"SRAM RED XPLR E1 XG-1391 / 10-46","crankset":"SRAM RED XPLR AXS 13s 42T","wheelset":"Zipp 303 XPLR SW CL 100/12TA|622x32TC TLR / Zipp 303 XPLR SW CL 142/12TA |622x32TC XDR TLR","tires":"Goodyear XPLR Intermediate 45-622","weight_kg":7.8,"spec_evidence":"official KTM exact Gravelator Exonic 2026 product page"}'::jsonb,
    manufacturer_url = 'https://www.ktm-bikes.at/bikes/detail/mx1260460115-gravelator-exonic-m-55-mx1260460115-gravelator-exonic-spotted-white-ornge-blk-grey-1x13-sram-red-xplr-axs-2026/MX1260460115',
    evidence_checked_at = '2026-08-17'
where id = 'ktm-gravelator-exonic-2026-global';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('lapierre-e-explorer-5-5-low-2026-global',
   'https://lapierrebikes.com/cdn/shop/files/LAPIERRE_MY26_E-EXPLORER-5.5-Low_27.5Inch_90_LLBUB.png?v=1777973584&width=1946',
   'manufacturer', 'Lapierre', 'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', 10, '2026-08-17', true)
on conflict (bike_id, image_url) do update set
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  source_page_url = excluded.source_page_url,
  priority = excluded.priority,
  checked_at = excluded.checked_at,
  enabled = true;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('shimano-rd-u3020-9s-oem-lapierre', 'Shimano', 'RD-U3020-9s', 'rear_derailleur', 'Shimano CUES RD-U3020-9s, Shadow',
   '{"speeds":9,"family":"CUES","evidence_scope":"Lapierre exact-product OEM listing"}'::jsonb,
   1, 'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-17', true),
  ('tektro-hd-m280-oem-lapierre', 'Tektro', 'HD-M280', 'brake_caliper', 'Tektro Hydraulic Disc brake HD-M280',
   '{"pistons":2,"rotor_mm":203,"evidence_scope":"Lapierre exact-product OEM listing"}'::jsonb,
   1, 'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-17', true),
  ('sram-red-xplr-axs-13s-oem-ktm', 'SRAM', 'RED XPLR AXS 13s', 'rear_derailleur', 'SRAM RED XPLR AXS 13s',
   '{"speeds":13,"family":"RED XPLR AXS","evidence_scope":"KTM exact-product OEM listing; exact SRAM SKU not inferred"}'::jsonb,
   1, 'https://www.ktm-bikes.at/bikes/detail/mx1260460115-gravelator-exonic-m-55-mx1260460115-gravelator-exonic-spotted-white-ornge-blk-grey-1x13-sram-red-xplr-axs-2026/MX1260460115', '2026-08-17', true)
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
  ('lapierre-e-explorer-5-5-low-2026-global', 'shimano-rd-u3020-9s-oem-lapierre', 'factory_installed',
   'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-17',
   'Published Lapierre E-Explorer 5.5 factory specification lists Shimano CUES RD-U3020-9s. Lapierre notes equivalent/higher-quality component substitutions may occur.'),
  ('lapierre-e-explorer-5-5-low-2026-global', 'tektro-hd-m280-oem-lapierre', 'factory_installed',
   'https://lapierrebikes.com/en-int/products/e-explorer-55-llbub', '2026-08-17',
   'Published Lapierre E-Explorer 5.5 factory specification lists Tektro HD-M280 front and rear brakes; manufacturer substitution caveat retained.'),
  ('lapierre-e-explorer-6-5-low-2026-global', 'shimano-rd-u3020-9s-oem-lapierre', 'factory_installed',
   'https://lapierrebikes.com/en-ch/products/e-explorer-65-llcub', '2026-08-17',
   'Published Lapierre E-Explorer 6.5 factory specification lists Shimano CUES RD-U3020-9s. Lapierre notes equivalent/higher-quality component substitutions may occur.'),
  ('lapierre-e-explorer-6-5-low-2026-global', 'tektro-hd-m280-oem-lapierre', 'factory_installed',
   'https://lapierrebikes.com/en-ch/products/e-explorer-65-llcub', '2026-08-17',
   'Published Lapierre E-Explorer 6.5 factory specification lists Tektro HD-M280 front and rear brakes; manufacturer substitution caveat retained.'),
  ('ktm-gravelator-exonic-2026-global', 'sram-red-xplr-axs-13s-oem-ktm', 'factory_installed',
   'https://www.ktm-bikes.at/bikes/detail/mx1260460115-gravelator-exonic-m-55-mx1260460115-gravelator-exonic-spotted-white-ornge-blk-grey-1x13-sram-red-xplr-axs-2026/MX1260460115', '2026-08-17',
   'Official KTM Gravelator Exonic 2026 product page explicitly lists SRAM RED XPLR AXS 13s rear derailleur; exact SRAM SKU is intentionally not inferred.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
