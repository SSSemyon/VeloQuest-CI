-- VeloQuest catalog enrichment wave 52.
-- Russia-first Hagen Teen / Teen Pro 2026 exact-product cohort.
-- Exact core specifications, manufacturer media (all assets independently
-- verified HTTP 200 over HTTPS on 2026-08-17), and factory-installed rear
-- derailleur identities. No compatibility/manufacturer-approved/no-upgrade inference.

begin;

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminum","wheel_size":"20","drivetrain_brand":"Microshift","drivetrain":"Microshift Acolyte 1x8 (RD-M5180S / SL-M6180)","groupset":"Microshift Acolyte","brakes":"Solon SL-M520 hydraulic disc 160/160 mm","cassette":"Sunshine HR8 11-36T","tires":"Kenda Booster K1227 20x2.2","weight_kg":12.3,"frame_material_evidence":"https://hagen.bike/teen20_2026","wheel_size_evidence":"https://hagen.bike/teen20_2026","drivetrain_evidence":"https://hagen.bike/teen20_2026","brakes_evidence":"https://hagen.bike/teen20_2026"}'::jsonb,
    manufacturer_url = 'https://hagen.bike/teen20_2026', evidence_checked_at = greatest(evidence_checked_at,'2026-08-17')
where id='hagen-teen-20-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminum","wheel_size":"20","drivetrain_brand":"Microshift","drivetrain":"Microshift Acolyte 1x8 (RD-M5180S / SL-M6180)","groupset":"Microshift Acolyte","brakes":"Solon SL-M520 hydraulic disc 160/160 mm","cassette":"Sunshine HR8 11-36T","fork":"rigid aluminum","tires":"Kenda Booster K1227 20x2.2","weight_kg":10.0,"frame_material_evidence":"https://hagen.bike/teen20r_2026","wheel_size_evidence":"https://hagen.bike/teen20r_2026","drivetrain_evidence":"https://hagen.bike/teen20r_2026","brakes_evidence":"https://hagen.bike/teen20r_2026"}'::jsonb,
    manufacturer_url = 'https://hagen.bike/teen20r_2026', evidence_checked_at = greatest(evidence_checked_at,'2026-08-17')
where id='hagen-teen-20-r-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminum","wheel_size":"24","drivetrain_brand":"Shimano","drivetrain":"Shimano Tourney/Altus 1x8 (RD-TX800 / SL-M315)","groupset":"Shimano Tourney/Altus","brakes":"Solon SL-M520 hydraulic disc 160/160 mm","cassette":"Sunshine HR8 11-36T","tires":"Kenda Booster K1227 24x2.2","weight_kg":12.6,"frame_material_evidence":"https://hagen.bike/teen24_2026","wheel_size_evidence":"https://hagen.bike/teen24_2026","drivetrain_evidence":"https://hagen.bike/teen24_2026","brakes_evidence":"https://hagen.bike/teen24_2026"}'::jsonb,
    manufacturer_url = 'https://hagen.bike/teen24_2026', evidence_checked_at = greatest(evidence_checked_at,'2026-08-17')
where id='hagen-teen-24-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminum","wheel_size":"24","drivetrain_brand":"Shimano","drivetrain":"Shimano Tourney/Altus 1x8 (RD-TX800 / SL-M315)","groupset":"Shimano Tourney/Altus","brakes":"Solon SL-M520 hydraulic disc 160/160 mm","cassette":"Sunshine HR8 11-36T","fork":"rigid aluminum","tires":"Kenda Booster K1227 24x2.2","weight_kg":11.1,"frame_material_evidence":"https://hagen.bike/teen24r_2026","wheel_size_evidence":"https://hagen.bike/teen24r_2026","drivetrain_evidence":"https://hagen.bike/teen24r_2026","brakes_evidence":"https://hagen.bike/teen24r_2026"}'::jsonb,
    manufacturer_url = 'https://hagen.bike/teen24r_2026', evidence_checked_at = greatest(evidence_checked_at,'2026-08-17')
where id='hagen-teen-24-r-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminum","wheel_size":"26","drivetrain_brand":"Shimano","drivetrain":"Shimano Tourney/Altus 1x8 (RD-TX800 / SL-M315)","groupset":"Shimano Tourney/Altus","brakes":"Solon SL-M520 hydraulic disc 160/160 mm","cassette":"Sunshine HR8 11-36T","tires":"Kenda Booster K1227 26x2.2","weight_kg":12.9,"frame_material_evidence":"https://hagen.bike/teen26_2026","wheel_size_evidence":"https://hagen.bike/teen26_2026","drivetrain_evidence":"https://hagen.bike/teen26_2026","brakes_evidence":"https://hagen.bike/teen26_2026"}'::jsonb,
    manufacturer_url = 'https://hagen.bike/teen26_2026', evidence_checked_at = greatest(evidence_checked_at,'2026-08-17')
where id='hagen-teen-26-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminum","wheel_size":"20","drivetrain_brand":"Microshift","drivetrain":"Microshift Advent 1x9 (RD-M6195S)","groupset":"Microshift Advent","brakes":"Shimano MT-200 hydraulic disc","cassette":"Sunshine HR9 11-36T","fork":"rigid carbon","weight_kg":9.8,"frame_material_evidence":"https://hagen.bike/teenpro20carbon2026","wheel_size_evidence":"https://hagen.bike/teenpro20carbon2026","drivetrain_evidence":"https://hagen.bike/teenpro20carbon2026","brakes_evidence":"https://hagen.bike/teenpro20carbon2026"}'::jsonb,
    manufacturer_url = 'https://hagen.bike/teenpro20carbon2026', evidence_checked_at = greatest(evidence_checked_at,'2026-08-17')
where id='hagen-teen-pro-20-carbon-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminum","wheel_size":"24","drivetrain_brand":"Shimano","drivetrain":"Shimano Alivio 1x9 (RD-M3100)","groupset":"Shimano Alivio","brakes":"Shimano MT-200 hydraulic disc","cassette":"Sunshine HR9 11-36T","fork":"rigid carbon","weight_kg":10.7,"frame_material_evidence":"https://hagen.bike/teenpro24carbon2026","wheel_size_evidence":"https://hagen.bike/teenpro24carbon2026","drivetrain_evidence":"https://hagen.bike/teenpro24carbon2026","brakes_evidence":"https://hagen.bike/teenpro24carbon2026"}'::jsonb,
    manufacturer_url = 'https://hagen.bike/teenpro24carbon2026', evidence_checked_at = greatest(evidence_checked_at,'2026-08-17')
where id='hagen-teen-pro-24-carbon-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminum","wheel_size":"24","drivetrain_brand":"Shimano","drivetrain":"Shimano Alivio 1x9 (RD-M3100)","groupset":"Shimano Alivio","brakes":"Shimano MT-200 hydraulic disc","cassette":"Sunshine HR9 11-36T","fork":"H24 AIR Pro 80mm","weight_kg":11.6,"frame_material_evidence":"https://hagen.bike/teenpro24air2026","wheel_size_evidence":"https://hagen.bike/teenpro24air2026","drivetrain_evidence":"https://hagen.bike/teenpro24air2026","brakes_evidence":"https://hagen.bike/teenpro24air2026"}'::jsonb,
    manufacturer_url = 'https://hagen.bike/teenpro24air2026', evidence_checked_at = greatest(evidence_checked_at,'2026-08-17')
where id='hagen-teen-pro-24-air-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminum","wheel_size":"26","drivetrain_brand":"Shimano","drivetrain":"Shimano Alivio 1x9 (RD-M3100)","groupset":"Shimano Alivio","brakes":"Shimano MT-200 hydraulic disc","cassette":"Sunshine HR9 11-36T","fork":"D3 AIR 100mm","weight_kg":12.8,"frame_material_evidence":"https://hagen.bike/teenpro26air2026","wheel_size_evidence":"https://hagen.bike/teenpro26air2026","drivetrain_evidence":"https://hagen.bike/teenpro26air2026","brakes_evidence":"https://hagen.bike/teenpro26air2026"}'::jsonb,
    manufacturer_url = 'https://hagen.bike/teenpro26air2026', evidence_checked_at = greatest(evidence_checked_at,'2026-08-17')
where id='hagen-teen-pro-26-air-2026-ru';

insert into public.bike_catalog_images
(bike_id,image_url,source_type,source_name,source_page_url,priority,checked_at,enabled) values
('hagen-teen-20-2026-ru','https://thb.tildacdn.com/tild3965-6563-4864-a463-663739643164/-/resize/504x/teen20.JPG','manufacturer','Hagen','https://hagen.bike/teen20_2026',10,'2026-08-17',true),
('hagen-teen-20-r-2026-ru','https://thb.tildacdn.com/tild3762-6232-4232-a536-386337666536/-/resize/504x/teen20r.JPG','manufacturer','Hagen','https://hagen.bike/teen20r_2026',10,'2026-08-17',true),
('hagen-teen-24-2026-ru','https://thb.tildacdn.com/tild3562-3531-4162-a134-656262366439/-/resize/504x/teen24.JPG','manufacturer','Hagen','https://hagen.bike/teen24_2026',10,'2026-08-17',true),
('hagen-teen-24-r-2026-ru','https://thb.tildacdn.com/tild3337-3066-4532-b838-663537336335/-/resize/504x/teen24r.JPG','manufacturer','Hagen','https://hagen.bike/teen24r_2026',10,'2026-08-17',true),
('hagen-teen-26-2026-ru','https://thb.tildacdn.com/tild3963-3531-4261-b637-656264393964/-/resize/504x/teen26.JPG','manufacturer','Hagen','https://hagen.bike/teen26_2026',10,'2026-08-17',true),
('hagen-teen-pro-20-carbon-2026-ru','https://thb.tildacdn.com/tild3330-6433-4632-b962-626532656464/-/resize/504x/teen_pro_20_carbon.JPG','manufacturer','Hagen','https://hagen.bike/teenpro20carbon2026',10,'2026-08-17',true),
('hagen-teen-pro-24-carbon-2026-ru','https://thb.tildacdn.com/tild6234-3631-4965-b939-313437323536/-/resize/504x/teen_pro_24_carbon.JPG','manufacturer','Hagen','https://hagen.bike/teenpro24carbon2026',10,'2026-08-17',true),
('hagen-teen-pro-24-air-2026-ru','https://thb.tildacdn.com/tild6635-3138-4366-b062-313864313936/-/resize/504x/teen_pro_24_air.JPG','manufacturer','Hagen','https://hagen.bike/teenpro24air2026',10,'2026-08-17',true),
('hagen-teen-pro-26-air-2026-ru','https://thb.tildacdn.com/tild3363-3237-4431-a134-393430363365/-/resize/504x/teen_pro_26_air.JPG','manufacturer','Hagen','https://hagen.bike/teenpro26air2026',10,'2026-08-17',true)
on conflict (bike_id,image_url) do update set source_type=excluded.source_type,source_name=excluded.source_name,source_page_url=excluded.source_page_url,priority=least(public.bike_catalog_images.priority,excluded.priority),checked_at=excluded.checked_at,enabled=true;

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled) values
('oem-hagen-teen-20-2026-rd','Microshift','Acolyte RD-M5180S','rear_derailleur','Microshift Acolyte RD-M5180S','{"speeds":8,"evidence_scope":"Hagen exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/teen20_2026','2026-08-17',true),
('oem-hagen-teen-20-r-2026-rd','Microshift','Acolyte RD-M5180S','rear_derailleur','Microshift Acolyte RD-M5180S','{"speeds":8,"evidence_scope":"Hagen exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/teen20r_2026','2026-08-17',true),
('oem-hagen-teen-24-2026-rd','Shimano','RD-TX800','rear_derailleur','Shimano RD-TX800','{"speeds":8,"evidence_scope":"Hagen exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/teen24_2026','2026-08-17',true),
('oem-hagen-teen-24-r-2026-rd','Shimano','RD-TX800','rear_derailleur','Shimano RD-TX800','{"speeds":8,"evidence_scope":"Hagen exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/teen24r_2026','2026-08-17',true),
('oem-hagen-teen-26-2026-rd','Shimano','RD-TX800','rear_derailleur','Shimano RD-TX800','{"speeds":8,"evidence_scope":"Hagen exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/teen26_2026','2026-08-17',true),
('oem-hagen-teen-pro-20-carbon-2026-rd','Microshift','Advent RD-M6195S','rear_derailleur','Microshift Advent RD-M6195S','{"speeds":9,"evidence_scope":"Hagen exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/teenpro20carbon2026','2026-08-17',true),
('oem-hagen-teen-pro-24-carbon-2026-rd','Shimano','Alivio RD-M3100','rear_derailleur','Shimano Alivio RD-M3100','{"speeds":9,"evidence_scope":"Hagen exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/teenpro24carbon2026','2026-08-17',true),
('oem-hagen-teen-pro-24-air-2026-rd','Shimano','Alivio RD-M3100','rear_derailleur','Shimano Alivio RD-M3100','{"speeds":9,"evidence_scope":"Hagen exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/teenpro24air2026','2026-08-17',true),
('oem-hagen-teen-pro-26-air-2026-rd','Shimano','Alivio RD-M3100','rear_derailleur','Shimano Alivio RD-M3100','{"speeds":9,"evidence_scope":"Hagen exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/teenpro26air2026','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes) values
('hagen-teen-20-2026-ru','oem-hagen-teen-20-2026-rd','factory_installed','https://hagen.bike/teen20_2026','2026-08-17','Exact Hagen Teen 20 2026 OEM specification.'),
('hagen-teen-20-r-2026-ru','oem-hagen-teen-20-r-2026-rd','factory_installed','https://hagen.bike/teen20r_2026','2026-08-17','Exact Hagen Teen 20 R 2026 OEM specification.'),
('hagen-teen-24-2026-ru','oem-hagen-teen-24-2026-rd','factory_installed','https://hagen.bike/teen24_2026','2026-08-17','Exact Hagen Teen 24 2026 OEM specification.'),
('hagen-teen-24-r-2026-ru','oem-hagen-teen-24-r-2026-rd','factory_installed','https://hagen.bike/teen24r_2026','2026-08-17','Exact Hagen Teen 24 R 2026 OEM specification.'),
('hagen-teen-26-2026-ru','oem-hagen-teen-26-2026-rd','factory_installed','https://hagen.bike/teen26_2026','2026-08-17','Exact Hagen Teen 26 2026 OEM specification.'),
('hagen-teen-pro-20-carbon-2026-ru','oem-hagen-teen-pro-20-carbon-2026-rd','factory_installed','https://hagen.bike/teenpro20carbon2026','2026-08-17','Exact Hagen Teen Pro 20 Carbon 2026 OEM specification.'),
('hagen-teen-pro-24-carbon-2026-ru','oem-hagen-teen-pro-24-carbon-2026-rd','factory_installed','https://hagen.bike/teenpro24carbon2026','2026-08-17','Exact Hagen Teen Pro 24 Carbon 2026 OEM specification.'),
('hagen-teen-pro-24-air-2026-ru','oem-hagen-teen-pro-24-air-2026-rd','factory_installed','https://hagen.bike/teenpro24air2026','2026-08-17','Exact Hagen Teen Pro 24 Air 2026 OEM specification.'),
('hagen-teen-pro-26-air-2026-ru','oem-hagen-teen-pro-26-air-2026-rd','factory_installed','https://hagen.bike/teenpro26air2026','2026-08-17','Exact Hagen Teen Pro 26 Air 2026 OEM specification.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
