-- SOURCE: supabase/schema/catalog_enrichment_wave_46_welt_russia_2026_08_17.sql
-- VeloQuest catalog enrichment wave 46.
-- Russia-first WELT 2026 cohort. Model year and core/OEM fitment are taken only
-- from exact official WELT Russian-market product pages.
-- Media is intentionally omitted because image asset URLs were not independently verified.
-- No compatibility/manufacturer-approved/no-upgrade inference.

begin;

insert into public.bike_catalog_models
(id,brand,model,model_year,trim,category,market,specs,manufacturer_url,evidence_checked_at,enabled)
values
('welt-ranger-3-0-2026-ru','WELT','Ranger 3.0',2026,'','XC MTB','ru','{"frame_material":"aluminum","wheel_size":"27.5/29","drivetrain":"Shimano Cues RD-U6020 1x11","rear_derailleur":"Shimano Cues RD-U6020","brakes":"Shimano MT-200 hydraulic disc 180/160 mm","cassette":"Sunshine HR11-46 11-46T","tires":"Kenda K1259 27/29x2.25","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/ranger3_2026?optionId=1116"}'::jsonb,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/ranger3_2026?optionId=1116','2026-08-17',true),
('welt-voyager-1-0-2026-ru','WELT','Voyager 1.0',2026,'','Gravel','ru','{"frame_material":"aluminum","wheel_size":"700C","drivetrain":"Shimano Essa RD-U2000-GS 1x8","rear_derailleur":"Shimano Essa RD-U2000-GS","brakes":"LB-DX2001 mechanical disc flat mount","cassette":"Sunshine CS-HR8-40 11-40T","tires":"Innova IB3010 700x50c","source_scope":"official_manufacturer_russia","model_year_evidence":"https://www.welt-bikes.com/ru/ru/vse-velosipedy/gravijnye/Voyager_1_2026?optionId=1185"}'::jsonb,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gravijnye/Voyager_1_2026?optionId=1185','2026-08-17',true)
on conflict (brand,model,model_year,trim,market) do update set category=excluded.category,specs=excluded.specs||public.bike_catalog_models.specs,manufacturer_url=excluded.manufacturer_url,evidence_checked_at=greatest(public.bike_catalog_models.evidence_checked_at,excluded.evidence_checked_at),enabled=true;

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
('oem-welt-ranger-3-0-2026-rd','Shimano','Cues RD-U6020','rear_derailleur','Shimano Cues RD-U6020','{"speeds":11,"evidence_scope":"WELT exact-product OEM specification; cage suffix not inferred"}'::jsonb,1,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/ranger3_2026?optionId=1116','2026-08-17',true),
('oem-welt-voyager-1-0-2026-rd','Shimano','Essa RD-U2000-GS','rear_derailleur','Shimano Essa RD-U2000-GS','{"speeds":8,"evidence_scope":"WELT exact-product OEM specification"}'::jsonb,1,'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gravijnye/Voyager_1_2026?optionId=1185','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
select m.id,'oem-welt-ranger-3-0-2026-rd','factory_installed','https://www.welt-bikes.com/ru/ru/vse-velosipedy/gornye/ranger3_2026?optionId=1116','2026-08-17','Exact WELT Ranger 3.0 2026 Russian-market product specification.'
from public.bike_catalog_models m
where m.brand='WELT' and m.model='Ranger 3.0' and m.model_year=2026 and m.trim='' and m.market='ru'
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
select m.id,'oem-welt-voyager-1-0-2026-rd','factory_installed','https://www.welt-bikes.com/ru/ru/vse-velosipedy/gravijnye/Voyager_1_2026?optionId=1185','2026-08-17','Exact WELT Voyager 1.0 2026 Russian-market product specification.'
from public.bike_catalog_models m
where m.brand='WELT' and m.model='Voyager 1.0' and m.model_year=2026 and m.trim='' and m.market='ru'
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
