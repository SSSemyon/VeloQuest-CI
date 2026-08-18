-- VeloQuest catalog enrichment wave 43.
-- Russia-first STARK 2026 exact product pages from the official STARK store.
-- Six cards have explicit year/frame/wheel/drivetrain/brakes/cassette and verified HTTPS media.
-- OEM fitment is product-page evidence only; no compatibility or outcome inference.

begin;

insert into public.bike_catalog_models
(id,brand,model,model_year,trim,category,market,specs,manufacturer_url,evidence_checked_at,enabled)
values
('stark-fat-26-3-hd-2026-ru','STARK','Fat 26.3 HD',2026,'','Fat bike','ru','{"source_scope":"official_brand_store","frame_material":"aluminum","wheel_size":"26","drivetrain":"Shimano Cues RD-U4000","brakes":"Tektro HD-M275 hydraulic disc","cassette":"Shimano Cues CS-LG300-9"}'::jsonb,'https://shop.stark.ru/bikes/velosipedy/fetbayki/fat/fat-26-3-hd-2026/','2026-08-17',true),
('stark-router-29-3-hd-2026-ru','STARK','Router 29.3 HD',2026,'','Cross country','ru','{"source_scope":"official_brand_store","frame_material":"aluminum","wheel_size":"29","drivetrain":"Shimano Cues RD-U4000","brakes":"Tektro HD-M275 hydraulic disc","cassette":"Shimano Cues CS-LG300-9"}'::jsonb,'https://shop.stark.ru/bikes/velosipedy/gornye/kross-kantri/router/router-29-3-hd-2026/','2026-08-17',true),
('stark-router-29-4-hd-2026-ru','STARK','Router 29.4 HD',2026,'','Cross country','ru','{"source_scope":"official_brand_store","frame_material":"aluminum","wheel_size":"29","drivetrain":"Shimano Cues RD-U6000-10","brakes":"Shimano MT-200 hydraulic disc","cassette":"Shimano Cues CS-LG300-10"}'::jsonb,'https://shop.stark.ru/bikes/velosipedy/gornye/kross-kantri/router/router-29-4-hd-2026/','2026-08-17',true),
('stark-hunter-29-3-hd-2026-ru','STARK','Hunter 29.3 HD',2026,'','Trekking hardtail','ru','{"source_scope":"official_brand_store","frame_material":"aluminum","wheel_size":"29","drivetrain":"Shimano Cues RD-U4000","brakes":"Tektro HD-M275 hydraulic disc","cassette":"Shimano Cues CS-LG300-9"}'::jsonb,'https://shop.stark.ru/bikes/velosipedy/gornye/trekking/hunter/hunter-29-3-hd-2026/','2026-08-17',true),
('stark-gravel-t-2-2026-ru','STARK','Gravel T 2',2026,'','Gravel','ru','{"source_scope":"official_brand_store","frame_material":"aluminum","wheel_size":"700C","drivetrain":"Shimano Essa RD-U2000","brakes":"Tektro MD-C310 mechanical disc 160 mm","cassette":"Shimano CS-LG300-8"}'::jsonb,'https://shop.stark.ru/bikes/velosipedy/graviynye/gravel/gravel-t-2-2026/','2026-08-17',true),
('stark-pusher-pro-hd-2026-ru','STARK','Pusher Pro HD',2026,'','Slopestyle','ru','{"source_scope":"official_brand_store","frame_material":"aluminum","wheel_size":"26","drivetrain":"single-speed","brakes":"Tektro HD-M275 hydraulic disc","cassette":"KT Driver 12T"}'::jsonb,'https://shop.stark.ru/bikes/velosipedy/sloupstayl-stant-tryuk/sloupstayl/pusher/pusher-pro-hd-2026/','2026-08-17',true)
on conflict (brand,model,model_year,trim,market) do update set category=excluded.category,specs=excluded.specs||public.bike_catalog_models.specs,manufacturer_url=excluded.manufacturer_url,evidence_checked_at=greatest(public.bike_catalog_models.evidence_checked_at,excluded.evidence_checked_at),enabled=true;

insert into public.bike_catalog_images
(bike_id,image_url,source_type,source_name,source_page_url,priority,checked_at,enabled)
values
('stark-fat-26-3-hd-2026-ru','https://shop.stark.ru/upload/iblock/473/xdmszt8kcc30yqi8aejh1hniku1od8q1.png','manufacturer','STARK official store','https://shop.stark.ru/bikes/velosipedy/fetbayki/fat/fat-26-3-hd-2026/',10,'2026-08-17',true),
('stark-router-29-3-hd-2026-ru','https://shop.stark.ru/upload/iblock/911/i7y70jpjvmraktv6fg80n2zsih1e789q.PNG','manufacturer','STARK official store','https://shop.stark.ru/bikes/velosipedy/gornye/kross-kantri/router/router-29-3-hd-2026/',10,'2026-08-17',true),
('stark-router-29-4-hd-2026-ru','https://shop.stark.ru/upload/iblock/ef5/gmz5qgqo4k6j3hy7gazwx2l6oufetv5u.PNG','manufacturer','STARK official store','https://shop.stark.ru/bikes/velosipedy/gornye/kross-kantri/router/router-29-4-hd-2026/',10,'2026-08-17',true),
('stark-hunter-29-3-hd-2026-ru','https://shop.stark.ru/upload/iblock/047/wc1fo4i1d1k8nth0pc9zhwggy3n23p3s.png','manufacturer','STARK official store','https://shop.stark.ru/bikes/velosipedy/gornye/trekking/hunter/hunter-29-3-hd-2026/',10,'2026-08-17',true),
('stark-gravel-t-2-2026-ru','https://shop.stark.ru/upload/iblock/ce5/iquroa1o7q0dkct24ir5egrfainvc91y.jpg','manufacturer','STARK official store','https://shop.stark.ru/bikes/velosipedy/graviynye/gravel/gravel-t-2-2026/',10,'2026-08-17',true),
('stark-pusher-pro-hd-2026-ru','https://shop.stark.ru/upload/iblock/dd4/esouay3m7bdnl3bru26641bw8253cft7.jpg','manufacturer','STARK official store','https://shop.stark.ru/bikes/velosipedy/sloupstayl-stant-tryuk/sloupstayl/pusher/pusher-pro-hd-2026/',10,'2026-08-17',true)
on conflict (bike_id,image_url) do update set source_type=excluded.source_type,source_name=excluded.source_name,source_page_url=excluded.source_page_url,priority=least(public.bike_catalog_images.priority,excluded.priority),checked_at=excluded.checked_at,enabled=true;

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
('oem-stark-fat-26-3-hd-2026-rd','Shimano','Cues RD-U4000','rear_derailleur','Shimano Cues RD-U4000','{"evidence_scope":"STARK exact-product OEM specification"}'::jsonb,1,'https://shop.stark.ru/bikes/velosipedy/fetbayki/fat/fat-26-3-hd-2026/','2026-08-17',true),
('oem-stark-router-29-3-hd-2026-rd','Shimano','Cues RD-U4000','rear_derailleur','Shimano Cues RD-U4000','{"evidence_scope":"STARK exact-product OEM specification"}'::jsonb,1,'https://shop.stark.ru/bikes/velosipedy/gornye/kross-kantri/router/router-29-3-hd-2026/','2026-08-17',true),
('oem-stark-router-29-4-hd-2026-rd','Shimano','Cues RD-U6000-10','rear_derailleur','Shimano Cues RD-U6000-10','{"evidence_scope":"STARK exact-product OEM specification"}'::jsonb,1,'https://shop.stark.ru/bikes/velosipedy/gornye/kross-kantri/router/router-29-4-hd-2026/','2026-08-17',true),
('oem-stark-hunter-29-3-hd-2026-rd','Shimano','Cues RD-U4000','rear_derailleur','Shimano Cues RD-U4000','{"evidence_scope":"STARK exact-product OEM specification"}'::jsonb,1,'https://shop.stark.ru/bikes/velosipedy/gornye/trekking/hunter/hunter-29-3-hd-2026/','2026-08-17',true),
('oem-stark-gravel-t-2-2026-rd','Shimano','Essa RD-U2000','rear_derailleur','Shimano Essa RD-U2000','{"evidence_scope":"STARK exact-product OEM specification"}'::jsonb,1,'https://shop.stark.ru/bikes/velosipedy/graviynye/gravel/gravel-t-2-2026/','2026-08-17',true),
('oem-stark-pusher-pro-hd-2026-brake','Tektro','HD-M275','brake_caliper','Tektro HD-M275','{"evidence_scope":"STARK exact-product OEM specification; single-speed bike has no rear derailleur"}'::jsonb,1,'https://shop.stark.ru/bikes/velosipedy/sloupstayl-stant-tryuk/sloupstayl/pusher/pusher-pro-hd-2026/','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
('stark-fat-26-3-hd-2026-ru','oem-stark-fat-26-3-hd-2026-rd','factory_installed','https://shop.stark.ru/bikes/velosipedy/fetbayki/fat/fat-26-3-hd-2026/','2026-08-17','Exact STARK product specification.'),
('stark-router-29-3-hd-2026-ru','oem-stark-router-29-3-hd-2026-rd','factory_installed','https://shop.stark.ru/bikes/velosipedy/gornye/kross-kantri/router/router-29-3-hd-2026/','2026-08-17','Exact STARK product specification.'),
('stark-router-29-4-hd-2026-ru','oem-stark-router-29-4-hd-2026-rd','factory_installed','https://shop.stark.ru/bikes/velosipedy/gornye/kross-kantri/router/router-29-4-hd-2026/','2026-08-17','Exact STARK product specification.'),
('stark-hunter-29-3-hd-2026-ru','oem-stark-hunter-29-3-hd-2026-rd','factory_installed','https://shop.stark.ru/bikes/velosipedy/gornye/trekking/hunter/hunter-29-3-hd-2026/','2026-08-17','Exact STARK product specification.'),
('stark-gravel-t-2-2026-ru','oem-stark-gravel-t-2-2026-rd','factory_installed','https://shop.stark.ru/bikes/velosipedy/graviynye/gravel/gravel-t-2-2026/','2026-08-17','Exact STARK product specification.'),
('stark-pusher-pro-hd-2026-ru','oem-stark-pusher-pro-hd-2026-brake','factory_installed','https://shop.stark.ru/bikes/velosipedy/sloupstayl-stant-tryuk/sloupstayl/pusher/pusher-pro-hd-2026/','2026-08-17','Exact STARK product specification; brake fitment used because bike is single-speed.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
