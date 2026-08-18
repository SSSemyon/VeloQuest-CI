-- VeloQuest catalog enrichment wave 44.
-- Russia-first Aspect cohort: only exact product pages whose own description
-- explicitly places the model line in 2026. Core fields come from product tables.
-- Five official images were independently HEAD-verified HTTP 200 on 2026-08-17.
-- OEM identity is preserved exactly; cage/SKU detail is not inferred.

begin;

insert into public.bike_catalog_models
(id,brand,model,model_year,trim,category,market,specs,manufacturer_url,evidence_checked_at,enabled)
values
('aspect-allroad-elite-2026-ru','Aspect','ALLROAD ELITE',2026,'','Gravel','ru','{"frame_material":"aluminum","wheel_size":"700C","drivetrain":"Shimano GRX RD-RX822 1x12","rear_derailleur":"Shimano GRX RD-RX822","brakes":"Shimano BR-RX410-F/BR-RX410-R","cassette":"Shimano CS-M6100-12 10-51T","tires":"MAXXIS RAMBLER 700X45C TANWALL EXO/TR","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.aspect-bikes.ru/catalog/aspect-allroad-elite/"}'::jsonb,'https://www.aspect-bikes.ru/catalog/aspect-allroad-elite/','2026-08-17',true),
('aspect-cobalt-29-2026-ru','Aspect','COBALT 29',2026,'','Hardtail Trekking','ru','{"frame_material":"aluminum","wheel_size":"29","drivetrain":"Shimano CUES RD-U3020 1x9","rear_derailleur":"Shimano CUES RD-U3020","brakes":"Shimano MT200 Hydraulic disc","cassette":"Sunshine MTB-CS-HR9-40 9S","tires":"Kenda Booster K1227 Skin wall 29x2.2","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.aspect-bikes.ru/catalog/aspect-cobalt-29/"}'::jsonb,'https://www.aspect-bikes.ru/catalog/aspect-cobalt-29/','2026-08-17',true),
('aspect-cobalt-elite-29-2026-ru','Aspect','COBALT ELITE 29',2026,'','Hardtail Trekking','ru','{"frame_material":"aluminum","wheel_size":"29","drivetrain":"Shimano DEORE RD-M6100 1x12","rear_derailleur":"Shimano DEORE RD-M6100 Shadow Plus","brakes":"Shimano MT200 Hydraulic disc","cassette":"Sunshine CS-HR12-50T 12S 11-50T","tires":"Kenda Booster K1227 Skin wall 29x2.2","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.aspect-bikes.ru/catalog/aspect-cobalt-elite-29/"}'::jsonb,'https://www.aspect-bikes.ru/catalog/aspect-cobalt-elite-29/','2026-08-17',true),
('aspect-cobalt-expert-29-2026-ru','Aspect','COBALT EXPERT 29',2026,'','Hardtail Trekking','ru','{"frame_material":"aluminum","wheel_size":"29","drivetrain":"Shimano DEORE RD-M6100 1x12","rear_derailleur":"Shimano DEORE RD-M6100 Shadow Plus","brakes":"Shimano MT200 Hydraulic disc","cassette":"Sunshine CS-HR12-50T 12S 11-50T","tires":"Kenda Booster K1227 Skin wall 29x2.2","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.aspect-bikes.ru/catalog/aspect-cobalt-expert-29/"}'::jsonb,'https://www.aspect-bikes.ru/catalog/aspect-cobalt-expert-29/','2026-08-17',true),
('aspect-cobalt-pro-29-2026-ru','Aspect','COBALT PRO 29',2026,'','Hardtail Trekking','ru','{"frame_material":"aluminum","wheel_size":"29","drivetrain":"Shimano Deore RD-M5130 1x10","rear_derailleur":"Shimano Deore RD-M5130 Shadow Plus","brakes":"Shimano MT200 Hydraulic disc","cassette":"SunShine MTB-CS-HR10-46 10S 11-46T","tires":"Kenda Booster K1227 Skin wall 29x2.2","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.aspect-bikes.ru/catalog/aspect-cobalt-pro-29/"}'::jsonb,'https://www.aspect-bikes.ru/catalog/aspect-cobalt-pro-29/','2026-08-17',true)
on conflict (brand,model,model_year,trim,market) do update set category=excluded.category,specs=excluded.specs||public.bike_catalog_models.specs,manufacturer_url=excluded.manufacturer_url,evidence_checked_at=greatest(public.bike_catalog_models.evidence_checked_at,excluded.evidence_checked_at),enabled=true;

insert into public.bike_catalog_images
(bike_id,image_url,source_type,source_name,source_page_url,priority,checked_at,enabled)
values
('aspect-allroad-elite-2026-ru','https://www.aspect-bikes.ru/upload/products/compiled/420/full_142556.jpg','manufacturer','Aspect','https://www.aspect-bikes.ru/catalog/aspect-allroad-elite/',10,'2026-08-17',true),
('aspect-cobalt-29-2026-ru','https://www.aspect-bikes.ru/upload/products/compiled/417/full_142645.jpg','manufacturer','Aspect','https://www.aspect-bikes.ru/catalog/aspect-cobalt-29/',10,'2026-08-17',true),
('aspect-cobalt-elite-29-2026-ru','https://www.aspect-bikes.ru/upload/products/compiled/415/full_142690.jpg','manufacturer','Aspect','https://www.aspect-bikes.ru/catalog/aspect-cobalt-elite-29/',10,'2026-08-17',true),
('aspect-cobalt-expert-29-2026-ru','https://www.aspect-bikes.ru/upload/products/compiled/414/full_142680.jpg','manufacturer','Aspect','https://www.aspect-bikes.ru/catalog/aspect-cobalt-expert-29/',10,'2026-08-17',true),
('aspect-cobalt-pro-29-2026-ru','https://www.aspect-bikes.ru/upload/products/compiled/416/full_142750.jpg','manufacturer','Aspect','https://www.aspect-bikes.ru/catalog/aspect-cobalt-pro-29/',10,'2026-08-17',true)
on conflict (bike_id,image_url) do update set source_type=excluded.source_type,source_name=excluded.source_name,source_page_url=excluded.source_page_url,priority=least(public.bike_catalog_images.priority,excluded.priority),checked_at=excluded.checked_at,enabled=true;

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
('oem-aspect-allroad-elite-2026-rd','Shimano','GRX RD-RX822','rear_derailleur','Shimano GRX RD-RX822','{"evidence_scope":"Aspect exact-product OEM specification; cage not inferred"}'::jsonb,1,'https://www.aspect-bikes.ru/catalog/aspect-allroad-elite/','2026-08-17',true),
('oem-aspect-cobalt-29-2026-rd','Shimano','CUES RD-U3020','rear_derailleur','Shimano CUES RD-U3020','{"evidence_scope":"Aspect exact-product OEM specification"}'::jsonb,1,'https://www.aspect-bikes.ru/catalog/aspect-cobalt-29/','2026-08-17',true),
('oem-aspect-cobalt-elite-29-2026-rd','Shimano','DEORE RD-M6100','rear_derailleur','Shimano DEORE RD-M6100 Shadow Plus','{"evidence_scope":"Aspect exact-product OEM specification; cage not inferred"}'::jsonb,1,'https://www.aspect-bikes.ru/catalog/aspect-cobalt-elite-29/','2026-08-17',true),
('oem-aspect-cobalt-expert-29-2026-rd','Shimano','DEORE RD-M6100','rear_derailleur','Shimano DEORE RD-M6100 Shadow Plus','{"evidence_scope":"Aspect exact-product OEM specification; cage not inferred"}'::jsonb,1,'https://www.aspect-bikes.ru/catalog/aspect-cobalt-expert-29/','2026-08-17',true),
('oem-aspect-cobalt-pro-29-2026-rd','Shimano','Deore RD-M5130','rear_derailleur','Shimano Deore RD-M5130 Shadow Plus','{"evidence_scope":"Aspect exact-product OEM specification"}'::jsonb,1,'https://www.aspect-bikes.ru/catalog/aspect-cobalt-pro-29/','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
('aspect-allroad-elite-2026-ru','oem-aspect-allroad-elite-2026-rd','factory_installed','https://www.aspect-bikes.ru/catalog/aspect-allroad-elite/','2026-08-17','Exact Aspect 2026 product specification.'),
('aspect-cobalt-29-2026-ru','oem-aspect-cobalt-29-2026-rd','factory_installed','https://www.aspect-bikes.ru/catalog/aspect-cobalt-29/','2026-08-17','Exact Aspect 2026 product specification.'),
('aspect-cobalt-elite-29-2026-ru','oem-aspect-cobalt-elite-29-2026-rd','factory_installed','https://www.aspect-bikes.ru/catalog/aspect-cobalt-elite-29/','2026-08-17','Exact Aspect 2026 product specification.'),
('aspect-cobalt-expert-29-2026-ru','oem-aspect-cobalt-expert-29-2026-rd','factory_installed','https://www.aspect-bikes.ru/catalog/aspect-cobalt-expert-29/','2026-08-17','Exact Aspect 2026 product specification.'),
('aspect-cobalt-pro-29-2026-ru','oem-aspect-cobalt-pro-29-2026-rd','factory_installed','https://www.aspect-bikes.ru/catalog/aspect-cobalt-pro-29/','2026-08-17','Exact Aspect 2026 product specification.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
