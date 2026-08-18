-- SOURCE: supabase/schema/catalog_enrichment_wave_27_kellys_corratec_lapierre_2026_08_17.sql
-- VeloQuest catalog enrichment wave 27.
-- Exact first-party Kellys, Corratec and Lapierre product pages only. Adds
-- explicit published specs, one Corratec manufacturer image and factory
-- fitments. Manufacturer substitution/change caveats are retained; no upgrade
-- compatibility or recommendation outcome is inferred.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Al 6061-T6","wheel_size":"29/27.5","rear_travel_mm":140,"fork":"ROCK SHOX Lyric Select (29) Boost, 160 mm, DebonAir+ / Charger RC damper","rear_shock":"ROCK SHOX Super Deluxe, DebonAir+ / R Hydraulic Bottom Out (210x55 mm)","drivetrain_brand":"Shimano","drivetrain":"SHIMANO Deore XT Di2 12-speed","rear_derailleur":"SHIMANO Deore XT Di2 M8250 (direct mount)","brakes":"SHIMANO Deore XT M8120 Hydraulic Disc","cassette":"SHIMANO CS-M7100-12 (10-51T)","crankset":"MIRANDA Miranda (34T), 170 mm","hubs":"SHIMANO Deore XT M8210-B Disc Center Lock","wheelset":"DT SWISS H 552 Disc 622x30 front / 584x30 rear","tires":"SCHWALBE Albert Evo Trail Pro 63-622 front / 63-584 rear","motor":"PANASONIC GXM AMXXPRO, 105 Nm","battery_wh":900,"weight_kg":22.98,"spec_evidence":"official Kellys exact THEOS RS90 P Royal Purple 2026 product page; Kellys reserves the right to make changes to product information including equipment, specifications, models, colours, and materials"}'::jsonb,
    manufacturer_url = 'https://kellysbike.com/e-fullsuspension/theos-rs90-p-royal-purple-29-27-5-900-wh_11011_8980',
    evidence_checked_at = '2026-08-17'
where id = 'kellys-theos-rs90-p-royal-purple-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"Carbon","wheel_size":"29","fork":"ROCK SHOX SID SELECT 3 POS 29 15x110 120mm","rear_shock":"ROCK SHOX SID SELECT+ O3 190x45","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 EAGLE AXS T-TYPE 12-SPEED","rear_derailleur":"SRAM X0 EAGLE AXS T-TYPE 12-SPEED","brakes":"SRAM LEVEL SILVER STEALTH 4-Piston 180 mm front / 160 mm rear","cassette":"SRAM CS XS 1275 T-TYPE 10-52T","crankset":"SRAM XX EAGLE Q174 CL55 DUB 170 34 T-TYPE","wheelset":"DT SWISS XMC 1501 SPLINE 29 30 mm CL Tubeless XD","tires":"Schwalbe RACING RAY Evo 60-622 front / RACING RALPH Evo 60-622 rear","weight_kg":12.7,"spec_evidence":"official Corratec exact Revo Bow iLink SL Pro product page, model year 2026; subject to technical changes, errors and omissions"}'::jsonb,
    manufacturer_url = 'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html',
    evidence_checked_at = '2026-08-17'
where id = 'corratec-revo-bow-ilink-sl-pro-2026-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"HIGH Carbon Uni","wheel_size":"28","fork":"Lapierre Own-Developed Carbon Fork Xelius DRS Replica","drivetrain_brand":"Shimano","drivetrain":"Shimano Dura-Ace Di2 2x12","rear_derailleur":"Shimano Dura-Ace Di2 RD-R9250 12s, Shadow, wireless","brakes":"Shimano Hydraulic Disc brake Dura-Ace BR-R9270, 160 mm front / 140 mm rear","cassette":"Shimano Dura-Ace CS-R9200-12, MICRO SPLINE","crankset":"Dura-Ace FC-R9200-P w/Power-Meter, HOLLOWTECH 2","wheelset":"Ursus Proxima 40 Team Edition, 24H, 15x110 mm, CL","tires":"Vittoria Corsa PRO, foldable, Tubeless-Ready 28-622","spec_evidence":"official Lapierre exact Xelius DRS Team Replica 2026 product page; manufacturer reserves the right to replace individual components shown with equivalent or higher-quality components"}'::jsonb,
    manufacturer_url = 'https://lapierrebikes.com/en-ch/products/xelius-drs-team-replica-lxhua',
    evidence_checked_at = '2026-08-17'
where id = 'lapierre-xelius-drs-team-replica-2026-global';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('corratec-revo-bow-ilink-sl-pro-2026-global',
   'https://www.corratec.com/out/pictures/master/product/1/724bbfe0-3178-4ee7-afc9-a7273753d9d7.jpg',
   'manufacturer', 'Corratec', 'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html', 10, '2026-08-17', true)
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
  ('shimano-rd-m8250-oem-kellys', 'Shimano', 'Deore XT Di2 M8250', 'rear_derailleur', 'SHIMANO Deore XT Di2 M8250 (direct mount)',
   '{"speeds":12,"evidence_scope":"Kellys exact-product OEM listing"}'::jsonb,
   1, 'https://kellysbike.com/e-fullsuspension/theos-rs90-p-royal-purple-29-27-5-900-wh_11011_8980', '2026-08-17', true),
  ('shimano-m8120-oem-kellys', 'Shimano', 'Deore XT M8120', 'brake_caliper', 'SHIMANO Deore XT M8120 Hydraulic Disc',
   '{"rotor_front_mm":203,"rotor_rear_mm":203,"evidence_scope":"Kellys exact-product OEM listing"}'::jsonb,
   1, 'https://kellysbike.com/e-fullsuspension/theos-rs90-p-royal-purple-29-27-5-900-wh_11011_8980', '2026-08-17', true),
  ('sram-x0-eagle-axs-ttype-oem-corratec', 'SRAM', 'X0 EAGLE AXS T-TYPE 12-SPEED', 'rear_derailleur', 'SRAM X0 EAGLE AXS T-TYPE 12-SPEED',
   '{"speeds":12,"evidence_scope":"Corratec exact-product OEM listing"}'::jsonb,
   1, 'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html', '2026-08-17', true),
  ('sram-level-silver-stealth-oem-corratec', 'SRAM', 'LEVEL SILVER STEALTH', 'brake_caliper', 'SRAM LEVEL SILVER STEALTH 4-Piston',
   '{"pistons":4,"rotor_front_mm":180,"rotor_rear_mm":160,"evidence_scope":"Corratec exact-product OEM listing"}'::jsonb,
   1, 'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html', '2026-08-17', true),
  ('shimano-rd-r9250-oem-lapierre', 'Shimano', 'RD-R9250', 'rear_derailleur', 'Shimano Dura-Ace Di2 RD-R9250 12s',
   '{"speeds":12,"evidence_scope":"Lapierre exact-product OEM listing"}'::jsonb,
   1, 'https://lapierrebikes.com/en-ch/products/xelius-drs-team-replica-lxhua', '2026-08-17', true),
  ('shimano-br-r9270-oem-lapierre', 'Shimano', 'BR-R9270', 'brake_caliper', 'Shimano Dura-Ace BR-R9270',
   '{"pistons":2,"rotor_front_mm":160,"rotor_rear_mm":140,"evidence_scope":"Lapierre exact-product OEM listing"}'::jsonb,
   1, 'https://lapierrebikes.com/en-ch/products/xelius-drs-team-replica-lxhua', '2026-08-17', true)
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
  ('kellys-theos-rs90-p-royal-purple-2026-global', 'shimano-rd-m8250-oem-kellys', 'factory_installed',
   'https://kellysbike.com/e-fullsuspension/theos-rs90-p-royal-purple-29-27-5-900-wh_11011_8980', '2026-08-17',
   'Official Kellys THEOS RS90 P 2026 product page lists SHIMANO Deore XT Di2 M8250 direct-mount rear derailleur; Kellys product-change caveat retained.'),
  ('kellys-theos-rs90-p-royal-purple-2026-global', 'shimano-m8120-oem-kellys', 'factory_installed',
   'https://kellysbike.com/e-fullsuspension/theos-rs90-p-royal-purple-29-27-5-900-wh_11011_8980', '2026-08-17',
   'Official Kellys page lists SHIMANO Deore XT M8120 hydraulic brakes and 203 mm front/rear rotors; product-change caveat retained.'),
  ('corratec-revo-bow-ilink-sl-pro-2026-global', 'sram-x0-eagle-axs-ttype-oem-corratec', 'factory_installed',
   'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html', '2026-08-17',
   'Official Corratec Revo Bow iLink SL Pro page lists SRAM X0 EAGLE AXS T-TYPE 12-SPEED.'),
  ('corratec-revo-bow-ilink-sl-pro-2026-global', 'sram-level-silver-stealth-oem-corratec', 'factory_installed',
   'https://www.corratec.com/en/Bike-Archive/Revo-Bow-iLink-SL-Pro-Grey-Black-Light-Grey-M.html', '2026-08-17',
   'Official Corratec page lists SRAM LEVEL SILVER STEALTH 4-piston brakes, 180 mm front / 160 mm rear.'),
  ('lapierre-xelius-drs-team-replica-2026-global', 'shimano-rd-r9250-oem-lapierre', 'factory_installed',
   'https://lapierrebikes.com/en-ch/products/xelius-drs-team-replica-lxhua', '2026-08-17',
   'Official Lapierre Xelius DRS Team Replica page lists Shimano Dura-Ace Di2 RD-R9250 12s; manufacturer substitution caveat retained.'),
  ('lapierre-xelius-drs-team-replica-2026-global', 'shimano-br-r9270-oem-lapierre', 'factory_installed',
   'https://lapierrebikes.com/en-ch/products/xelius-drs-team-replica-lxhua', '2026-08-17',
   'Official Lapierre page lists Dura-Ace BR-R9270 front/rear brakes; manufacturer substitution caveat retained.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;

commit;
