-- VeloQuest catalog enrichment wave 50.
-- Russia-first WELT 2026 exact-product cohort.
-- Core specifications and OEM rear-derailleur fitments come only from exact
-- official Russian-market WELT pages. Media is omitted because those pages do
-- not expose an unambiguous OpenGraph product image to the evidence worker.
-- Rambler 3.0 has a source inconsistency: marketing copy says 140 mm fork,
-- while the structured specification table says 120 mm. This wave records the
-- structured specification and preserves the conflict in source_conflict_note.
-- No compatibility/manufacturer-approved/no-upgrade inference.

begin;

insert into public.bike_catalog_models
(id,brand,model,model_year,trim,category,market,specs,manufacturer_url,evidence_checked_at,enabled)
values
('welt-ranger-1-0-2026-ru','WELT','Ranger 1.0',2026,'','XC MTB','ru','{"frame_material":"aluminum 6061","wheel_size":"27.5/29","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 1x9 (RD-U3020 / SL-U4010)","groupset":"Shimano CUES","brakes":"Shimano MT-200 hydraulic disc 180/160 mm","cassette":"Sunshine HR9-36 11-36T","fork":"2ROXX 362 110mm","wheelset":"DP27 alloy tubeless ready","hubs":"SL-DH802 F/R sealed bearings","tires":"Kenda K1259 27/29x2.25","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/ranger1_2026?optionId=1087"}'::jsonb,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/ranger1_2026?optionId=1087','2026-08-17',true),
('welt-icon-1-0-2026-ru','WELT','Icon 1.0',2026,'','Trail MTB','ru','{"frame_material":"aluminum 6061","wheel_size":"27.5/29","drivetrain_brand":"Shimano","drivetrain":"Shimano Essa 1x8 (RD-U2000-GS / SL-M315)","groupset":"Shimano Essa","brakes":"Shimano MT-200 hydraulic disc 180/160 mm","cassette":"Sunshine CS-HR8-42 11-42T","fork":"2ROXX MD-999 120mm","wheelset":"R30-2C alloy tubeless ready","hubs":"WZ A382 F/R sealed bearings","tires":"Wanda 1226 27/29x2.25","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/icon1_2026?optionId=1141"}'::jsonb,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/icon1_2026?optionId=1141','2026-08-17',true),
('welt-icon-3-0-2026-ru','WELT','Icon 3.0',2026,'','Trail MTB','ru','{"frame_material":"aluminum 6061","wheel_size":"27.5/29","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 1x10 (RD-U6020 / SL-U6000)","groupset":"Shimano CUES","brakes":"Shimano MT-200 hydraulic disc 180/160 mm","cassette":"Sunshine CS-HR10-46L-QS 11-46T CUES compatible","fork":"2ROXX MD-999 air 120mm","wheelset":"R30-2C alloy tubeless ready","hubs":"WZ A707 F/R sealed bearings","tires":"Wanda 1226 27/29x2.25","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/icon3_2026?optionId=1161"}'::jsonb,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/icon3_2026?optionId=1161','2026-08-17',true),
('welt-falcon-2026-ru','WELT','Falcon',2026,'','XC MTB','ru','{"frame_material":"carbon T6810","wheel_size":"29","drivetrain_brand":"Shimano","drivetrain":"Shimano XT 1x12 (official WELT spec: RD-8100)","groupset":"Shimano XT","brakes":"Tektro M-530 hydraulic 4/2 piston 180/160 mm","cassette":"Sunshine HR-12-50L 11-50T","fork":"Suntour Raidon 34 Boost EQ 120mm","wheelset":"R30-2C alloy tubeless ready","hubs":"DH-536T sealed bearings 6 pawls","tires":"Maxxis Rekon Race 29x2.35 EXO/TR Tanwall","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/falcon_2026?optionId=1179"}'::jsonb,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/falcon_2026?optionId=1179','2026-08-17',true),
('welt-rambler-3-0-2026-ru','WELT','Rambler 3.0',2026,'','Downcountry MTB','ru','{"frame_material":"aluminum 6061","wheel_size":"29","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore 1x12 (RD-M6100 / SL-M6100-R)","groupset":"Shimano Deore M6100","brakes":"Shimano MT-200 hydraulic disc","cassette":"Sunshine HR12-50L 11-50T","fork":"Suntour XCR 34 air 120mm","wheelset":"DR-300 tubeless ready","hubs":"DH908T sealed bearings 6 pawls","tires":"Maxxis Rekon Race 29x2.4 EXO/TR Tanwall","source_conflict_note":"Official marketing copy mentions 140 mm fork, but the structured specification table states Suntour XCR 34 120 mm; structured specification used.","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/Rambler_3.0_2026?optionId=1256"}'::jsonb,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/Rambler_3.0_2026?optionId=1256','2026-08-17',true)
on conflict (brand,model,model_year,trim,market) do update set category=excluded.category,specs=excluded.specs||public.bike_catalog_models.specs,manufacturer_url=excluded.manufacturer_url,evidence_checked_at=greatest(public.bike_catalog_models.evidence_checked_at,excluded.evidence_checked_at),enabled=true;

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
('oem-welt-ranger-1-0-2026-rd','Shimano','CUES RD-U3020 9sp','rear_derailleur','Shimano CUES RD-U3020 9sp','{"speeds":9,"evidence_scope":"WELT exact-product OEM specification"}'::jsonb,1,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/ranger1_2026?optionId=1087','2026-08-17',true),
('oem-welt-icon-1-0-2026-rd','Shimano','Essa RD-U2000-GS 8sp','rear_derailleur','Shimano Essa RD-U2000-GS 8sp','{"speeds":8,"evidence_scope":"WELT exact-product OEM specification"}'::jsonb,1,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/icon1_2026?optionId=1141','2026-08-17',true),
('oem-welt-icon-3-0-2026-rd','Shimano','CUES RD-U6020 10sp','rear_derailleur','Shimano CUES RD-U6020 10sp','{"speeds":10,"evidence_scope":"WELT exact-product OEM specification; cage suffix not inferred"}'::jsonb,1,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/icon3_2026?optionId=1161','2026-08-17',true),
('oem-welt-falcon-2026-rd','Shimano','XT RD-8100 12sp','rear_derailleur','Shimano XT RD-8100 12sp','{"speeds":12,"evidence_scope":"Literal WELT structured specification; no normalization to another Shimano part number inferred"}'::jsonb,1,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/falcon_2026?optionId=1179','2026-08-17',true),
('oem-welt-rambler-3-0-2026-rd','Shimano','Deore RD-M6100 12sp','rear_derailleur','Shimano Deore RD-M6100 12sp','{"speeds":12,"evidence_scope":"WELT exact-product OEM specification"}'::jsonb,1,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/Rambler_3.0_2026?optionId=1256','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
('welt-ranger-1-0-2026-ru','oem-welt-ranger-1-0-2026-rd','factory_installed','https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/ranger1_2026?optionId=1087','2026-08-17','Exact WELT Ranger 1.0 2026 Russian-market product specification.'),
('welt-icon-1-0-2026-ru','oem-welt-icon-1-0-2026-rd','factory_installed','https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/icon1_2026?optionId=1141','2026-08-17','Exact WELT Icon 1.0 2026 Russian-market product specification.'),
('welt-icon-3-0-2026-ru','oem-welt-icon-3-0-2026-rd','factory_installed','https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/icon3_2026?optionId=1161','2026-08-17','Exact WELT Icon 3.0 2026 Russian-market product specification.'),
('welt-falcon-2026-ru','oem-welt-falcon-2026-rd','factory_installed','https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/falcon_2026?optionId=1179','2026-08-17','Exact WELT Falcon 2026 Russian-market product specification; derailleur part number preserved literally from WELT.'),
('welt-rambler-3-0-2026-ru','oem-welt-rambler-3-0-2026-rd','factory_installed','https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/Rambler_3.0_2026?optionId=1256','2026-08-17','Exact WELT Rambler 3.0 2026 Russian-market product specification; structured table used where marketing copy conflicts.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
