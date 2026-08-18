-- VeloQuest catalog enrichment wave 54.
-- Russia-first Hagen exact-product batch 4: Queen Q8/Q9/Q10 and MTB 7.12R.
-- Exact OEM specs and manufacturer media, all image assets independently
-- verified HTTP 200 over HTTPS. Queen frame material is intentionally omitted:
-- the exact pages do not explicitly identify it. No compatibility or upgrade inference.

begin;

update public.bike_catalog_models set specs=specs||'{"wheel_size":"27.5","drivetrain_brand":"Shimano","drivetrain":"Shimano Acera/Altus 1x8 (RD-M3020-8 / SL-M315)","groupset":"Shimano Acera/Altus","brakes":"Shimano MT-200 hydraulic disc 160/160 mm","cassette":"Sunshine HR8 11-40T","tires":"Kenda Aptor 1153 2.1","weight_kg":13.8,"wheel_size_evidence":"https://hagen.bike/q8ambercopper2026","drivetrain_evidence":"https://hagen.bike/q8ambercopper2026","brakes_evidence":"https://hagen.bike/q8ambercopper2026"}'::jsonb,manufacturer_url='https://hagen.bike/q8ambercopper2026',evidence_checked_at=greatest(evidence_checked_at,'2026-08-17') where id='hagen-q8-2026-ru';
update public.bike_catalog_models set specs=specs||'{"wheel_size":"27.5","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 1x9 (RD-U4000 / SL-U4000)","groupset":"Shimano CUES","brakes":"Shimano MT-200 hydraulic disc 160/160 mm","cassette":"Sunshine HR9 11-42T","tires":"Kenda Aptor 1153 2.1","weight_kg":13.8,"wheel_size_evidence":"https://hagen.bike/q9pearlwhite2026","drivetrain_evidence":"https://hagen.bike/q9pearlwhite2026","brakes_evidence":"https://hagen.bike/q9pearlwhite2026"}'::jsonb,manufacturer_url='https://hagen.bike/q9pearlwhite2026',evidence_checked_at=greatest(evidence_checked_at,'2026-08-17') where id='hagen-q9-2026-ru';
update public.bike_catalog_models set specs=specs||'{"wheel_size":"27.5","drivetrain_brand":"Shimano","drivetrain":"Shimano CUES 1x10 (RD-U6000 / SL-U6000)","groupset":"Shimano CUES","brakes":"Shimano MT-200 hydraulic disc 160/160 mm","cassette":"Sunshine HR10 11-46T","tires":"Kenda Aptor 1153 2.1","weight_kg":13.0,"wheel_size_evidence":"https://hagen.bike/q10blackgem2026","drivetrain_evidence":"https://hagen.bike/q10blackgem2026","brakes_evidence":"https://hagen.bike/q10blackgem2026"}'::jsonb,manufacturer_url='https://hagen.bike/q10blackgem2026',evidence_checked_at=greatest(evidence_checked_at,'2026-08-17') where id='hagen-q10-2026-ru';
update public.bike_catalog_models set specs=specs||'{"frame_material":"carbon","wheel_size":"29","drivetrain_brand":"Shimano","drivetrain":"Shimano Deore 1x12 (RD-M6100)","groupset":"Shimano Deore M6100","brakes":"Shimano MT-410 hydraulic disc 180/160 mm","cassette":"Shimano CS-M6100-12 10-51T","tires":"Maxxis Rekon Race 29x2.35 60TPI EXO/TR","weight_kg":11.4,"frame_material_evidence":"https://hagen.bike/mtbseventwelver2026","wheel_size_evidence":"https://hagen.bike/mtbseventwelver2026","drivetrain_evidence":"https://hagen.bike/mtbseventwelver2026","brakes_evidence":"https://hagen.bike/mtbseventwelver2026"}'::jsonb,manufacturer_url='https://hagen.bike/mtbseventwelver2026',evidence_checked_at=greatest(evidence_checked_at,'2026-08-17') where id='hagen-7-12r-2026-ru';

insert into public.bike_catalog_images (bike_id,image_url,source_type,source_name,source_page_url,priority,checked_at,enabled) values
('hagen-q8-2026-ru','https://thb.tildacdn.com/tild3062-6466-4231-b563-653932343735/-/resize/504x/Q8amber-1.jpeg','manufacturer','Hagen','https://hagen.bike/q8ambercopper2026',10,'2026-08-17',true),
('hagen-q9-2026-ru','https://thb.tildacdn.com/tild6433-3933-4634-b635-613436353134/-/resize/504x/Q9white-1.jpeg','manufacturer','Hagen','https://hagen.bike/q9pearlwhite2026',10,'2026-08-17',true),
('hagen-q10-2026-ru','https://thb.tildacdn.com/tild3231-3830-4361-b334-633763663035/-/resize/504x/Q10black-1.jpeg','manufacturer','Hagen','https://hagen.bike/q10blackgem2026',10,'2026-08-17',true),
('hagen-7-12r-2026-ru','https://thb.tildacdn.com/tild6665-6432-4466-b666-363465313965/-/resize/504x/IMG_0189.jpeg','manufacturer','Hagen','https://hagen.bike/mtbseventwelver2026',10,'2026-08-17',true)
on conflict (bike_id,image_url) do update set source_type=excluded.source_type,source_name=excluded.source_name,source_page_url=excluded.source_page_url,priority=least(public.bike_catalog_images.priority,excluded.priority),checked_at=excluded.checked_at,enabled=true;

insert into public.garage_components (id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled) values
('oem-hagen-q8-2026-rd','Shimano','RD-M3020-8 Acera','rear_derailleur','Shimano RD-M3020-8 Acera','{"speeds":8}'::jsonb,1,'https://hagen.bike/q8ambercopper2026','2026-08-17',true),
('oem-hagen-q9-2026-rd','Shimano','RD-U4000 CUES 9','rear_derailleur','Shimano RD-U4000 CUES 9','{"speeds":9}'::jsonb,1,'https://hagen.bike/q9pearlwhite2026','2026-08-17',true),
('oem-hagen-q10-2026-rd','Shimano','RD-U6000 CUES 10','rear_derailleur','Shimano RD-U6000 CUES 10','{"speeds":10}'::jsonb,1,'https://hagen.bike/q10blackgem2026','2026-08-17',true),
('oem-hagen-7-12r-2026-rd','Shimano','RD-M6100 Deore 12','rear_derailleur','Shimano RD-M6100 Deore 12','{"speeds":12}'::jsonb,1,'https://hagen.bike/mtbseventwelver2026','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments (bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes) values
('hagen-q8-2026-ru','oem-hagen-q8-2026-rd','factory_installed','https://hagen.bike/q8ambercopper2026','2026-08-17','Exact Hagen Queen Q8 2026 OEM specification; frame material not inferred.'),
('hagen-q9-2026-ru','oem-hagen-q9-2026-rd','factory_installed','https://hagen.bike/q9pearlwhite2026','2026-08-17','Exact Hagen Queen Q9 2026 OEM specification; frame material not inferred.'),
('hagen-q10-2026-ru','oem-hagen-q10-2026-rd','factory_installed','https://hagen.bike/q10blackgem2026','2026-08-17','Exact Hagen Queen Q10 2026 OEM specification; frame material not inferred.'),
('hagen-7-12r-2026-ru','oem-hagen-7-12r-2026-rd','factory_installed','https://hagen.bike/mtbseventwelver2026','2026-08-17','Exact Hagen MTB 7.12R 2026 OEM specification.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
