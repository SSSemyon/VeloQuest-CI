-- SOURCE: supabase/schema/catalog_enrichment_wave_42_format_russia_fitment_2026_08_17.sql
-- VeloQuest catalog enrichment wave 42.
-- Explicit FORMAT Russia OEM rear-derailleur identities for Wave41 bikes.
-- Exact product-page fitment only. No compatibility/manufacturer-approved/no-upgrade inference.

begin;

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
('oem-format-1213-29-2026-ru-rd','Shimano','Cues U4000','rear_derailleur','Shimano Cues U4000','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1213-29-2/','2026-08-17',true),
('oem-format-1312-29-2026-ru-rd','Shimano','Deore M6100','rear_derailleur','Shimano Deore M6100','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1312-29/','2026-08-17',true),
('oem-format-1313-29-2026-ru-rd','Shimano','Cues U6000','rear_derailleur','Shimano Cues U6000','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1313-29-2/','2026-08-17',true),
('oem-format-1314-plus-275-2026-ru-rd','Shimano','Cues U3020','rear_derailleur','Shimano Cues U3020','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1314-plus-27-5-2/','2026-08-17',true),
('oem-format-1412-29-2026-ru-rd','Shimano','Cues U6000','rear_derailleur','Shimano Cues U6000','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1412-29-2/','2026-08-17',true),
('oem-format-1413-29-2026-ru-rd','Shimano','Cues U3020','rear_derailleur','Shimano Cues U3020','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1413-29-2/','2026-08-17',true),
('oem-format-1443-700c-2026-ru-rd','Shimano','Essa U2000','rear_derailleur','Shimano Essa U2000','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1443-700s/','2026-08-17',true),
('oem-format-2222-700c-2026-ru-rd','Shimano','Cues U6020-10','rear_derailleur','Shimano Cues U6020-10','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/2222-700s/','2026-08-17',true),
('oem-format-2322-700c-2026-ru-rd','Shimano','Cues U6000','rear_derailleur','Shimano Cues U6000','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/2322-700s/','2026-08-17',true),
('oem-format-5413-26-2026-ru-rd','Shimano','Tourney TX800','rear_derailleur','Shimano Tourney TX800','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/5413-26-2/','2026-08-17',true),
('oem-format-6413-24-2026-ru-rd','Shimano','Tourney TY21','rear_derailleur','Shimano Tourney TY21','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/6414-24-2/','2026-08-17',true),
('oem-format-7413-20-2026-ru-rd','Shimano','Tourney TY21','rear_derailleur','Shimano Tourney TY21','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/7413-20-2/','2026-08-17',true),
('oem-format-1122-29-2026-ru-rd','Shimano','Deore M6100','rear_derailleur','Shimano Deore M6100','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1122-29/','2026-08-17',true),
('oem-format-1212-29-2026-ru-rd','Shimano','Cues U6000','rear_derailleur','Shimano Cues U6000','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1212-29/','2026-08-17',true),
('oem-format-1213-29-2025-ru-rd','Shimano','Cues U6000 Shadow+','rear_derailleur','Shimano Cues U6000 Shadow+','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1213-29/','2026-08-17',true),
('oem-format-1313-29-2025-ru-rd','Microshift','Advent M6195M','rear_derailleur','Microshift Advent M6195M','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1313-29/','2026-08-17',true),
('oem-format-1314-plus-275-2025-ru-rd','Microshift','Acolyte M5180M','rear_derailleur','Microshift Acolyte M5180M','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1314-plus-27-5/','2026-08-17',true),
('oem-format-1315-275-2025-ru-rd','Shimano','Acera M3020','rear_derailleur','Shimano Acera M3020','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1315-27-5/','2026-08-17',true),
('oem-format-1413-29-2025-ru-rd','Shimano','Acera M3020','rear_derailleur','Shimano Acera M3020','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/1413-29/','2026-08-17',true),
('oem-format-2232-700c-2025-ru-rd','Shimano','Tourney A070','rear_derailleur','Shimano Tourney A070','{"evidence_scope":"FORMAT Russia exact-product OEM specification"}'::jsonb,1,'https://www.format.bike/bike/2232-700s/','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
('format-1213-29-2026-ru','oem-format-1213-29-2026-ru-rd','factory_installed','https://www.format.bike/bike/1213-29-2/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1312-29-2026-ru','oem-format-1312-29-2026-ru-rd','factory_installed','https://www.format.bike/bike/1312-29/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1313-29-2026-ru','oem-format-1313-29-2026-ru-rd','factory_installed','https://www.format.bike/bike/1313-29-2/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1314-plus-275-2026-ru','oem-format-1314-plus-275-2026-ru-rd','factory_installed','https://www.format.bike/bike/1314-plus-27-5-2/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1412-29-2026-ru','oem-format-1412-29-2026-ru-rd','factory_installed','https://www.format.bike/bike/1412-29-2/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1413-29-2026-ru','oem-format-1413-29-2026-ru-rd','factory_installed','https://www.format.bike/bike/1413-29-2/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1443-700c-2026-ru','oem-format-1443-700c-2026-ru-rd','factory_installed','https://www.format.bike/bike/1443-700s/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-2222-700c-2026-ru','oem-format-2222-700c-2026-ru-rd','factory_installed','https://www.format.bike/bike/2222-700s/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-2322-700c-2026-ru','oem-format-2322-700c-2026-ru-rd','factory_installed','https://www.format.bike/bike/2322-700s/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-5413-26-2026-ru','oem-format-5413-26-2026-ru-rd','factory_installed','https://www.format.bike/bike/5413-26-2/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-6413-24-2026-ru','oem-format-6413-24-2026-ru-rd','factory_installed','https://www.format.bike/bike/6414-24-2/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-7413-20-2026-ru','oem-format-7413-20-2026-ru-rd','factory_installed','https://www.format.bike/bike/7413-20-2/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1122-29-2026-ru','oem-format-1122-29-2026-ru-rd','factory_installed','https://www.format.bike/bike/1122-29/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1212-29-2026-ru','oem-format-1212-29-2026-ru-rd','factory_installed','https://www.format.bike/bike/1212-29/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1213-29-2025-ru','oem-format-1213-29-2025-ru-rd','factory_installed','https://www.format.bike/bike/1213-29/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1313-29-2025-ru','oem-format-1313-29-2025-ru-rd','factory_installed','https://www.format.bike/bike/1313-29/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1314-plus-275-2025-ru','oem-format-1314-plus-275-2025-ru-rd','factory_installed','https://www.format.bike/bike/1314-plus-27-5/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1315-275-2025-ru','oem-format-1315-275-2025-ru-rd','factory_installed','https://www.format.bike/bike/1315-27-5/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-1413-29-2025-ru','oem-format-1413-29-2025-ru-rd','factory_installed','https://www.format.bike/bike/1413-29/','2026-08-17','Exact FORMAT Russia product specification.'),
('format-2232-700c-2025-ru','oem-format-2232-700c-2025-ru-rd','factory_installed','https://www.format.bike/bike/2232-700s/','2026-08-17','Exact FORMAT Russia product specification.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
