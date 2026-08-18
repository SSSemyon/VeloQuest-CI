-- VeloQuest Garage enrichment wave 58.
-- Materializes exact manufacturer component identities for five current STEVENS
-- product pages and two Marin 2025 exact product pages. Exact SKU is used only
-- where the manufacturer page exposes it; otherwise the published component
-- family label is retained literally. No compatibility or recommendation inference.

begin;

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
('oem-stevens-amant-5-2-forma-2026-hub','Shimano','Nexus SG-C6001-8D','hub','Shimano Nexus SG-C6001-8D','{"speeds":8,"internal_geared_hub":true,"drive":"Gates CDN belt","evidence_scope":"STEVENS exact-product specification"}'::jsonb,1,'https://www.stevensbikes.de/en/de/urban/amant-5.2-forma','2026-08-17',true),
('oem-stevens-caleta-7-2-lt-2026-hub','Shimano','Alfine SG-S7001-11','hub','Shimano Alfine SG-S7001-11','{"speeds":11,"internal_geared_hub":true,"drive":"Gates CDC belt","evidence_scope":"STEVENS exact-product specification"}'::jsonb,1,'https://www.stevensbikes.de/en/de/allround/caleta-7.2-lt','2026-08-17',true),
('oem-stevens-camino-pro-di2-2026-rd','Shimano','GRX 825 Di2 2x12','rear_derailleur','Shimano GRX 825 Di2 2x12','{"speeds":12,"electronic":true,"evidence_scope":"STEVENS exact-product family label; rear-derailleur SKU not inferred"}'::jsonb,1,'https://www.stevensbikes.de/en/de/gravel/gravel/camino-pro-di2/','2026-08-17',true),
('oem-stevens-colorado-401-2026-rd','Shimano','Deore XT/SLX 1x12','rear_derailleur','Shimano Deore XT/SLX 1x12','{"speeds":12,"evidence_scope":"STEVENS exact-product family label; rear-derailleur SKU not inferred"}'::jsonb,1,'https://www.stevensbikes.de/en/de/mtb/colorado-401/','2026-08-17',true),
('oem-stevens-gavere-pro-feq-2026-rd','SRAM','Apex XPLR AXS RD-APX-1E-D1','rear_derailleur','SRAM Apex XPLR AXS RD-APX-1E-D1','{"speeds":12,"electronic":true,"evidence_scope":"STEVENS exact-product specification"}'::jsonb,1,'https://www.stevensbikes.de/en/de/gravel/gravel/gavere-pro-feq/','2026-08-17',true),
('oem-marin-rift-zone-el-xr-2025-rd','SRAM','GX AXS T-Type','rear_derailleur','SRAM GX AXS T-Type','{"speeds":12,"evidence_scope":"Marin exact-product specification"}'::jsonb,1,'https://marinbikes.com/products/2025-rift-zone-el-xr-int','2026-08-17',true),
('oem-marin-rift-zone-el2-2025-rd','SRAM','Eagle 90','rear_derailleur','SRAM Eagle 90','{"speeds":12,"evidence_scope":"Marin exact-product specification"}'::jsonb,1,'https://marinbikes.com/products/2025-rift-zone-el2-int','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,
 display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,
 evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
('stevens-amant-5-2-forma-2026-de','oem-stevens-amant-5-2-forma-2026-hub','factory_installed','https://www.stevensbikes.de/en/de/urban/amant-5.2-forma','2026-08-17','STEVENS exact product page identifies Shimano Nexus SG-C6001-8D 8-speed internal gear hub.'),
('stevens-caleta-7-2-lt-2026-de','oem-stevens-caleta-7-2-lt-2026-hub','factory_installed','https://www.stevensbikes.de/en/de/allround/caleta-7.2-lt','2026-08-17','STEVENS exact product page identifies Shimano Alfine SG-S7001-11 11-speed internal gear hub.'),
('stevens-camino-pro-di2-2026-de','oem-stevens-camino-pro-di2-2026-rd','factory_installed','https://www.stevensbikes.de/en/de/gravel/gravel/camino-pro-di2/','2026-08-17','STEVENS exact product page identifies Shimano GRX 825 Di2 2x12; rear-derailleur SKU intentionally not inferred.'),
('stevens-colorado-401-2026-de','oem-stevens-colorado-401-2026-rd','factory_installed','https://www.stevensbikes.de/en/de/mtb/colorado-401/','2026-08-17','STEVENS exact product page identifies Shimano Deore XT/SLX 1x12; rear-derailleur SKU intentionally not inferred.'),
('stevens-gavere-pro-feq-2026-de','oem-stevens-gavere-pro-feq-2026-rd','factory_installed','https://www.stevensbikes.de/en/de/gravel/gravel/gavere-pro-feq/','2026-08-17','STEVENS exact product page identifies SRAM Apex XPLR AXS rear derailleur RD-APX-1E-D1.'),
('marin-rift-zone-el-xr-2025-int','oem-marin-rift-zone-el-xr-2025-rd','factory_installed','https://marinbikes.com/products/2025-rift-zone-el-xr-int','2026-08-17','Marin exact 2025 product specification identifies SRAM GX AXS T-Type rear derailleur.'),
('marin-rift-zone-el2-2025-int','oem-marin-rift-zone-el2-2025-rd','factory_installed','https://marinbikes.com/products/2025-rift-zone-el2-int','2026-08-17','Marin exact 2025 international product specification identifies SRAM Eagle 90 rear derailleur.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,
 evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
