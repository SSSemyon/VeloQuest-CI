-- VeloQuest catalog enrichment wave 40.
-- Russia-first pass: exact 2026 HAGEN product pages only.
-- Adds verified official media, explicit product specs and factory-installed
-- rear-derailleur fitment. Missing/ambiguous material or wheel size stays unknown.

begin;

update public.bike_catalog_models
set specs = specs || '{"drivetrain":"Shimano CUES U6000 1x10","rear_derailleur":"Shimano RD U6000 Cues 10","brakes":"Shimano MT-200 180/160mm","cassette":"Sunshine HR10 11-48T","tires":"Kenda 1259 2.25","drivetrain_evidence":"https://hagen.bike/mtbthreeten2026","brakes_evidence":"https://hagen.bike/mtbthreeten2026","cassette_evidence":"https://hagen.bike/mtbthreeten2026","tires_evidence":"https://hagen.bike/mtbthreeten2026"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'hagen-3-10-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"drivetrain":"Shimano CUES U6000 1x11","rear_derailleur":"Shimano RD U6000 Cues 11","brakes":"Shimano MT-200 180/160mm","cassette":"Sunshine HR11 11-50T","tires":"Kenda 1259 2.25","drivetrain_evidence":"https://hagen.bike/mtbthreeeleven2026","brakes_evidence":"https://hagen.bike/mtbthreeeleven2026","cassette_evidence":"https://hagen.bike/mtbthreeeleven2026","tires_evidence":"https://hagen.bike/mtbthreeeleven2026"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'hagen-3-11-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"drivetrain":"Shimano Deore M6100 1x12","rear_derailleur":"Shimano RD-M6100 Deore 12","brakes":"Shimano MT-200 180/160mm","cassette":"Sunshine HR12A 11-51T","tires":"Kenda 1259 2.25","drivetrain_evidence":"https://hagen.bike/mtbthreetwelve2026","brakes_evidence":"https://hagen.bike/mtbthreetwelve2026","cassette_evidence":"https://hagen.bike/mtbthreetwelve2026","tires_evidence":"https://hagen.bike/mtbthreetwelve2026"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'hagen-3-12-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"29","drivetrain":"Shimano CUES U4000 1x9","rear_derailleur":"Shimano RD U4000 Cues 9","brakes":"Shimano MT-200 180/160mm","cassette":"Shimano CS-LG300-9 CUES 11-46T","tires":"Maxxis Rekon Race 29x2.25 60TPI EXO","wheel_size_evidence":"https://hagen.bike/mtbfivenine2026","drivetrain_evidence":"https://hagen.bike/mtbfivenine2026","brakes_evidence":"https://hagen.bike/mtbfivenine2026","cassette_evidence":"https://hagen.bike/mtbfivenine2026","tires_evidence":"https://hagen.bike/mtbfivenine2026"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'hagen-5-9-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"aluminum","wheel_size":"29","drivetrain":"Shimano Deore M6100 1x12","rear_derailleur":"Shimano RD-M6100 Deore 12","brakes":"Shimano MT-200 180/160mm","cassette":"Shimano CS-M6100-12 Deore 10-51T","tires":"Maxxis Rekon Race 29x2.25 60TPI EXO","frame_material_evidence":"https://hagen.bike/mtbfivetwelve2026","wheel_size_evidence":"https://hagen.bike/mtbfivetwelve2026","drivetrain_evidence":"https://hagen.bike/mtbfivetwelve2026","brakes_evidence":"https://hagen.bike/mtbfivetwelve2026","cassette_evidence":"https://hagen.bike/mtbfivetwelve2026","tires_evidence":"https://hagen.bike/mtbfivetwelve2026"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'hagen-5-12-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"wheel_size":"29","drivetrain":"SRAM NX Eagle 1x12","rear_derailleur":"SRAM NX Eagle 12-speed","brakes":"SRAM Level hydraulic disc 180/160mm","cassette":"SRAM PG1210 SX Eagle 11-50T","tires":"Maxxis Rekon Race 29x2.25 60TPI EXO","wheel_size_evidence":"https://hagen.bike/mtbsixtwelve2026","drivetrain_evidence":"https://hagen.bike/mtbsixtwelve2026","brakes_evidence":"https://hagen.bike/mtbsixtwelve2026","cassette_evidence":"https://hagen.bike/mtbsixtwelve2026","tires_evidence":"https://hagen.bike/mtbsixtwelve2026"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'hagen-6-12-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","wheel_size":"29","drivetrain":"Shimano Deore M6100 1x12","rear_derailleur":"Shimano Deore RD-M6100 12-speed","brakes":"Shimano MT-410 hydraulic disc 180/160mm","cassette":"Shimano Deore CS-M6100-12 10-51T","tires":"Maxxis Rekon Race 29x2.35 60TPI EXO/TR","frame_material_evidence":"https://hagen.bike/mtbseventwelve2026","wheel_size_evidence":"https://hagen.bike/mtbseventwelve2026","drivetrain_evidence":"https://hagen.bike/mtbseventwelve2026","brakes_evidence":"https://hagen.bike/mtbseventwelve2026","cassette_evidence":"https://hagen.bike/mtbseventwelve2026","tires_evidence":"https://hagen.bike/mtbseventwelve2026"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'hagen-7-12-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","wheel_size":"29","drivetrain":"Shimano GRX RX822/RX820 1x12","rear_derailleur":"Shimano GRX RD-RX822 12-speed","brakes":"Shimano GRX RX820 hydraulic disc 180/160mm","cassette":"Shimano Deore CS-M6100-12 10-51T","tires":"Maxxis Rekon Race 29x2.35 60TPI EXO/TR","frame_material_evidence":"https://hagen.bike/mtbseventwelvegr2026","wheel_size_evidence":"https://hagen.bike/mtbseventwelvegr2026","drivetrain_evidence":"https://hagen.bike/mtbseventwelvegr2026","brakes_evidence":"https://hagen.bike/mtbseventwelvegr2026","cassette_evidence":"https://hagen.bike/mtbseventwelvegr2026","tires_evidence":"https://hagen.bike/mtbseventwelvegr2026"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'hagen-7-12gr-2026-ru';

update public.bike_catalog_models
set specs = specs || '{"drivetrain":"Shimano Altus 1x8","rear_derailleur":"Shimano RD-M310 Altus 8","brakes":"Solon SL M-520 hydraulic disc 160/160mm","cassette":"Sunshine HR8 11-34T","tires":"Kenda Aptor 1153 2.1","drivetrain_evidence":"https://hagen.bike/mtbzeroeight","brakes_evidence":"https://hagen.bike/mtbzeroeight","cassette_evidence":"https://hagen.bike/mtbzeroeight","tires_evidence":"https://hagen.bike/mtbzeroeight"}'::jsonb,
    evidence_checked_at = greatest(evidence_checked_at, '2026-08-17'::date)
where id = 'hagen-zero-8-2026-ru';

insert into public.bike_catalog_images
  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)
values
  ('hagen-3-10-2026-ru','https://thb.tildacdn.com/tild6230-6136-4331-b463-353939643637/-/resize/504x/310_-_1.JPG','manufacturer','HAGEN','https://hagen.bike/mtbthreeten2026',10,'2026-08-17',true),
  ('hagen-3-11-2026-ru','https://thb.tildacdn.com/tild6364-3363-4730-b766-333239636237/-/resize/504x/311_-_1.JPG','manufacturer','HAGEN','https://hagen.bike/mtbthreeeleven2026',10,'2026-08-17',true),
  ('hagen-3-12-2026-ru','https://thb.tildacdn.com/tild3530-6566-4465-a166-383561376437/-/resize/504x/312_-_1.JPG','manufacturer','HAGEN','https://hagen.bike/mtbthreetwelve2026',10,'2026-08-17',true),
  ('hagen-5-9-2026-ru','https://thb.tildacdn.com/tild3339-6233-4464-a538-346330633761/-/resize/504x/59_2.jpeg','manufacturer','HAGEN','https://hagen.bike/mtbfivenine2026',10,'2026-08-17',true),
  ('hagen-5-12-2026-ru','https://thb.tildacdn.com/tild3234-6330-4362-b038-323666623765/-/resize/504x/512_4.jpeg','manufacturer','HAGEN','https://hagen.bike/mtbfivetwelve2026',10,'2026-08-17',true),
  ('hagen-6-12-2026-ru','https://thb.tildacdn.com/tild3762-3162-4236-b932-326334393964/-/resize/504x/612.JPG','manufacturer','HAGEN','https://hagen.bike/mtbsixtwelve2026',10,'2026-08-17',true),
  ('hagen-7-12-2026-ru','https://thb.tildacdn.com/tild3339-3339-4736-b539-623465363865/-/resize/504x/IMG_0181.jpeg','manufacturer','HAGEN','https://hagen.bike/mtbseventwelve2026',10,'2026-08-17',true),
  ('hagen-7-12gr-2026-ru','https://static.tildacdn.com/tild3730-3334-4965-a233-343264643434/IMG_3126.JPG','manufacturer','HAGEN','https://hagen.bike/mtbseventwelvegr2026',10,'2026-08-17',true),
  ('hagen-zero-8-2026-ru','https://static.tildacdn.com/tild6361-3133-4666-a538-396435626164/Zero_8_flat_.png','manufacturer','HAGEN','https://hagen.bike/mtbzeroeight',10,'2026-08-17',true)
on conflict (bike_id, image_url) do update set
  source_type=excluded.source_type, source_name=excluded.source_name,
  source_page_url=excluded.source_page_url, priority=least(public.bike_catalog_images.priority, excluded.priority),
  checked_at=excluded.checked_at, enabled=true;

insert into public.garage_components
  (id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
  ('oem-hagen-3-10-2026-rd','Shimano','RD U6000 Cues 10','rear_derailleur','Shimano RD U6000 Cues 10','{"evidence_scope":"HAGEN exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/mtbthreeten2026','2026-08-17',true),
  ('oem-hagen-3-11-2026-rd','Shimano','RD U6000 Cues 11','rear_derailleur','Shimano RD U6000 Cues 11','{"evidence_scope":"HAGEN exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/mtbthreeeleven2026','2026-08-17',true),
  ('oem-hagen-3-12-2026-rd','Shimano','RD M6100 Deore 12','rear_derailleur','Shimano RD M6100 Deore 12','{"evidence_scope":"HAGEN exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/mtbthreetwelve2026','2026-08-17',true),
  ('oem-hagen-5-9-2026-rd','Shimano','RD U4000 Cues 9','rear_derailleur','Shimano RD U4000 Cues 9','{"evidence_scope":"HAGEN exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/mtbfivenine2026','2026-08-17',true),
  ('oem-hagen-5-12-2026-rd','Shimano','RD M6100 Deore 12','rear_derailleur','Shimano RD M6100 Deore 12','{"evidence_scope":"HAGEN exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/mtbfivetwelve2026','2026-08-17',true),
  ('oem-hagen-6-12-2026-rd','SRAM','NX Eagle 12-speed','rear_derailleur','SRAM NX Eagle 12-speed','{"evidence_scope":"HAGEN exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/mtbsixtwelve2026','2026-08-17',true),
  ('oem-hagen-7-12-2026-rd','Shimano','Deore RD-M6100 12-speed','rear_derailleur','Shimano Deore RD-M6100 12-speed','{"evidence_scope":"HAGEN exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/mtbseventwelve2026','2026-08-17',true),
  ('oem-hagen-7-12gr-2026-rd','Shimano','GRX RD-RX822 12-speed','rear_derailleur','Shimano GRX RD-RX822 12-speed','{"evidence_scope":"HAGEN exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/mtbseventwelvegr2026','2026-08-17',true),
  ('oem-hagen-zero-8-2026-rd','Shimano','RD M310 Altus 8','rear_derailleur','Shimano RD M310 Altus 8','{"evidence_scope":"HAGEN exact-product OEM specification"}'::jsonb,1,'https://hagen.bike/mtbzeroeight','2026-08-17',true)
on conflict (id) do update set
  brand=excluded.brand, model=excluded.model, category=excluded.category, display_name=excluded.display_name,
  specs=excluded.specs, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, enabled=true;

insert into public.bike_catalog_component_fitments
  (bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
  ('hagen-3-10-2026-ru','oem-hagen-3-10-2026-rd','factory_installed','https://hagen.bike/mtbthreeten2026','2026-08-17','Exact HAGEN 2026 product specification.'),
  ('hagen-3-11-2026-ru','oem-hagen-3-11-2026-rd','factory_installed','https://hagen.bike/mtbthreeeleven2026','2026-08-17','Exact HAGEN 2026 product specification.'),
  ('hagen-3-12-2026-ru','oem-hagen-3-12-2026-rd','factory_installed','https://hagen.bike/mtbthreetwelve2026','2026-08-17','Exact HAGEN 2026 product specification.'),
  ('hagen-5-9-2026-ru','oem-hagen-5-9-2026-rd','factory_installed','https://hagen.bike/mtbfivenine2026','2026-08-17','Exact HAGEN 2026 product specification.'),
  ('hagen-5-12-2026-ru','oem-hagen-5-12-2026-rd','factory_installed','https://hagen.bike/mtbfivetwelve2026','2026-08-17','Exact HAGEN 2026 product specification.'),
  ('hagen-6-12-2026-ru','oem-hagen-6-12-2026-rd','factory_installed','https://hagen.bike/mtbsixtwelve2026','2026-08-17','Exact HAGEN 2026 product specification.'),
  ('hagen-7-12-2026-ru','oem-hagen-7-12-2026-rd','factory_installed','https://hagen.bike/mtbseventwelve2026','2026-08-17','Exact HAGEN 2026 product specification.'),
  ('hagen-7-12gr-2026-ru','oem-hagen-7-12gr-2026-rd','factory_installed','https://hagen.bike/mtbseventwelvegr2026','2026-08-17','Exact HAGEN 2026 product specification.'),
  ('hagen-zero-8-2026-ru','oem-hagen-zero-8-2026-rd','factory_installed','https://hagen.bike/mtbzeroeight','2026-08-17','Exact HAGEN 2026 product specification.')
on conflict (bike_id,component_id,fitment_type) do update set
  evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, notes=excluded.notes;

commit;
