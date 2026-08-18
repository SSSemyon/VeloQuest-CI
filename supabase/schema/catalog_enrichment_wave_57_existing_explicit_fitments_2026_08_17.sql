-- VeloQuest Garage enrichment wave 57.
-- Materializes the remaining explicit rear-derailleur rows already present in
-- the catalog from exact / official manufacturer product evidence.
-- No compatibility or recommendation inference is added.

begin;

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
('oem-commencal-meta-sx-v5-signature-2026-rd','SRAM','Eagle 90 12-speed','rear_derailleur','SRAM Eagle 90 12-speed','{"speeds":12,"evidence_scope":"existing catalog official exact-product OEM specification"}'::jsonb,1,'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US','2026-08-17',true),
('oem-commencal-meta-v5-signature-2025-rd','SRAM','GX Eagle T-Type','rear_derailleur','SRAM GX Eagle T-Type','{"speeds":12,"evidence_scope":"existing catalog official exact-product OEM specification"}'::jsonb,1,'https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20v5/BT4MTRV5SGEU3.html?lang=en_US','2026-08-17',true),
('oem-ktm-gravelator-exonic-2026-rd','SRAM','RED XPLR AXS 13-speed','rear_derailleur','SRAM RED XPLR AXS 13-speed','{"speeds":13,"evidence_scope":"existing catalog official exact-product OEM specification"}'::jsonb,1,'https://www.ktm-bikes.at/bikes/detail/mx1260460115-gravelator-exonic-m-55-mx1260460115-gravelator-exonic-spotted-white-ornge-blk-grey-1x13-sram-red-xplr-axs-2026','2026-08-17',true),
('oem-mondraker-crafty-rr-2024-rd','SRAM','GX Eagle','rear_derailleur','SRAM GX Eagle','{"speeds":12,"evidence_scope":"existing catalog official season-history product specification"}'::jsonb,1,'https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr','2026-08-17',true),
('oem-ns-bikes-e-fine-2-2024-rd','Shimano','Deore RD-M5100','rear_derailleur','Shimano Deore RD-M5100','{"speeds":11,"evidence_scope":"existing catalog official exact-year product specification"}'::jsonb,1,'https://www.nsbikes.com/2024/e-fine-2%2C628%2Cpl.html','2026-08-17',true),
('oem-haro-double-peak-29-sport-2021-rd','Shimano','Altus RD-M310','rear_derailleur','Shimano Altus RD-M310','{"evidence_scope":"existing catalog official Haro archive specification"}'::jsonb,1,'https://archive.harobikes.com/mtb/2021-mtb/double-peak-29-sport-2021','2026-08-17',true),
('oem-trek-madone-sl7-gen8-2026-rd','Shimano','Ultegra R8150 Di2','rear_derailleur','Shimano Ultegra Di2 RD-R8150','{"speeds":12,"evidence_scope":"existing catalog official exact-product specification"}'::jsonb,1,'https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/madone-sl/madone-sl-7-gen-8/p/46220/','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,
 display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,
 evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
('commencal-meta-sx-v5-signature-2026-us','oem-commencal-meta-sx-v5-signature-2026-rd','factory_installed','https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20sx%20v5/BT5MSXV5SGEU1.html?lang=en_US','2026-08-17','Materialized from existing official COMMENCAL exact product specification: SRAM Eagle 90 12-speed.'),
('commencal-meta-v5-signature-2025-us','oem-commencal-meta-v5-signature-2025-rd','factory_installed','https://www.commencal.com/us/en/bikes/bikes/enduro/meta%20v5/BT4MTRV5SGEU3.html?lang=en_US','2026-08-17','Materialized from existing official COMMENCAL exact product specification: SRAM GX Eagle T-Type.'),
('ktm-gravelator-exonic-2026-global','oem-ktm-gravelator-exonic-2026-rd','factory_installed','https://www.ktm-bikes.at/bikes/detail/mx1260460115-gravelator-exonic-m-55-mx1260460115-gravelator-exonic-spotted-white-ornge-blk-grey-1x13-sram-red-xplr-axs-2026','2026-08-17','Materialized from existing official KTM exact product specification: SRAM RED XPLR AXS 13-speed.'),
('mondraker-crafty-rr-2024-global','oem-mondraker-crafty-rr-2024-rd','factory_installed','https://mondraker.com/mx/en/season-history/detail/15-2024/crafty-rr','2026-08-17','Materialized from existing official Mondraker season-history product specification: SRAM GX Eagle.'),
('ns-bikes-e-fine-2-2024-global','oem-ns-bikes-e-fine-2-2024-rd','factory_installed','https://www.nsbikes.com/2024/e-fine-2%2C628%2Cpl.html','2026-08-17','Materialized from existing official NS Bikes 2024 product specification: Shimano Deore RD-M5100.'),
('haro-double-peak-29-sport-2021-global','oem-haro-double-peak-29-sport-2021-rd','factory_installed','https://archive.harobikes.com/mtb/2021-mtb/double-peak-29-sport-2021','2026-08-17','Materialized from existing official Haro archive specification: Shimano Altus RD-M310.'),
('trek-madone-sl-7-gen-8-2026-us','oem-trek-madone-sl7-gen8-2026-rd','factory_installed','https://www.trekbikes.com/us/en_US/bikes/road-bikes/performance-road-bikes/madone/madone-sl/madone-sl-7-gen-8/p/46220/','2026-08-17','Materialized from existing official Trek exact product specification: Shimano Ultegra R8150 Di2.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,
 evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
