-- VeloQuest catalog enrichment wave 45.
-- Russia-first SHULZ 2026 models. Model year is evidenced by SHULZ's own dated
-- March 2026 launch/review articles; core and OEM fitment come from exact product pages.
-- Media is intentionally omitted because the origin timed out during independent verification.
-- No compatibility/manufacturer-approved/no-upgrade inference.

begin;

insert into public.bike_catalog_models
(id,brand,model,model_year,trim,category,market,specs,manufacturer_url,evidence_checked_at,enabled)
values
('shulz-big-time-2026-ru','SHULZ','Big Time',2026,'','Trail MTB','ru','{"frame_material":"aluminum","wheel_size":"27.5","drivetrain":"S-Ride RD-M520 1x11","rear_derailleur":"S-Ride RD-M520","brakes":"Shimano BR-MT200 hydraulic disc 160/160 mm","cassette":"SunShine 11-50T","tires":"WTB Trail Boss 27.5x2.4","source_scope":"official_manufacturer_russia","model_year_evidence":"https://shulz.ru/blog/shulz-big-time-review"}'::jsonb,'https://shulz.ru/catalog/bikes/mtb/shulz-big-time/1940','2026-08-17',true),
('shulz-sunday-2026-ru','SHULZ','Sunday',2026,'','Hardtail MTB','ru','{"frame_material":"aluminum","wheel_size":"27.5","drivetrain":"S-Ride RD-M420C 1x9","rear_derailleur":"S-Ride RD-M420C","brakes":"Shimano BR-MT200 hydraulic disc 160/160 mm","cassette":"SunShine 11-42T","tires":"Wanda W1102 27.5x2.35","source_scope":"official_manufacturer_russia","model_year_evidence":"https://shulz.ru/blog/shulz-sunday-review"}'::jsonb,'https://shulz.ru/catalog/bikes/mtb/shulz-sunday/1948','2026-08-17',true),
('shulz-mountain-monster-2026-ru','SHULZ','Mountain Monster',2026,'','Touring MTB','ru','{"frame_material":"chromoly","wheel_size":"29","drivetrain":"S-Ride RD-M520 1x11","rear_derailleur":"S-Ride RD-M520","brakes":"Shimano BR-MT200 hydraulic disc 180/180 mm","cassette":"SunRace 11-50T","tires":"WTB Ranger 29x3.0","source_scope":"official_manufacturer_russia","model_year_evidence":"https://shulz.ru/blog/shulz-mountain-monster-review"}'::jsonb,'https://shulz.ru/catalog/bikes/mtb/shulz-mountain-monster/1952','2026-08-17',true),
('shulz-kukisvumchorr-25-km-2026-ru','SHULZ','Кукисвумчорр 25-й километр',2026,'','Fat bike','ru','{"frame_material":"chromoly","wheel_size":"26","drivetrain":"S-Ride RD-M520 1x12","rear_derailleur":"S-Ride RD-M520","brakes":"Tektro Gemini HD-M3520 hydraulic disc 180/180 mm","cassette":"SunRace 11-50T","tires":"ChaoYang Big Daddy H5176 26x4.9","source_scope":"official_manufacturer_russia","model_year_evidence":"https://shulz.ru/blog/shulz-kukisvumchorr-25-km-review"}'::jsonb,'https://shulz.ru/catalog/bikes/mtb/shulz-kukisvumcorr-25-i-kilometr/1955','2026-08-17',true)
on conflict (brand,model,model_year,trim,market) do update set category=excluded.category,specs=excluded.specs||public.bike_catalog_models.specs,manufacturer_url=excluded.manufacturer_url,evidence_checked_at=greatest(public.bike_catalog_models.evidence_checked_at,excluded.evidence_checked_at),enabled=true;

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
('oem-shulz-big-time-2026-rd','S-Ride','RD-M520','rear_derailleur','S-Ride RD-M520','{"evidence_scope":"SHULZ exact-product OEM specification"}'::jsonb,1,'https://shulz.ru/catalog/bikes/mtb/shulz-big-time/1940','2026-08-17',true),
('oem-shulz-sunday-2026-rd','S-Ride','RD-M420C','rear_derailleur','S-Ride RD-M420C','{"evidence_scope":"SHULZ exact-product OEM specification"}'::jsonb,1,'https://shulz.ru/catalog/bikes/mtb/shulz-sunday/1948','2026-08-17',true),
('oem-shulz-mountain-monster-2026-rd','S-Ride','RD-M520','rear_derailleur','S-Ride RD-M520','{"evidence_scope":"SHULZ exact-product OEM specification"}'::jsonb,1,'https://shulz.ru/catalog/bikes/mtb/shulz-mountain-monster/1952','2026-08-17',true),
('oem-shulz-kukisvumchorr-25-km-2026-rd','S-Ride','RD-M520','rear_derailleur','S-Ride RD-M520','{"evidence_scope":"SHULZ exact-product OEM specification; product page states 12 speeds"}'::jsonb,1,'https://shulz.ru/catalog/bikes/mtb/shulz-kukisvumcorr-25-i-kilometr/1955','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
('shulz-big-time-2026-ru','oem-shulz-big-time-2026-rd','factory_installed','https://shulz.ru/catalog/bikes/mtb/shulz-big-time/1940','2026-08-17','Exact SHULZ 2026 product specification; launch review dated 2026-03-27.'),
('shulz-sunday-2026-ru','oem-shulz-sunday-2026-rd','factory_installed','https://shulz.ru/catalog/bikes/mtb/shulz-sunday/1948','2026-08-17','Exact SHULZ 2026 product specification; launch review dated 2026-03-24.'),
('shulz-mountain-monster-2026-ru','oem-shulz-mountain-monster-2026-rd','factory_installed','https://shulz.ru/catalog/bikes/mtb/shulz-mountain-monster/1952','2026-08-17','Exact SHULZ 2026 product specification; launch review dated 2026-03-12.'),
('shulz-kukisvumchorr-25-km-2026-ru','oem-shulz-kukisvumchorr-25-km-2026-rd','factory_installed','https://shulz.ru/catalog/bikes/mtb/shulz-kukisvumcorr-25-i-kilometr/1955','2026-08-17','Exact SHULZ 2026 product specification; launch review dated 2026-03-02.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
