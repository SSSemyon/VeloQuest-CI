-- VeloQuest Garage enrichment wave 61.
-- Two remaining exact/model-specific drivetrain-evidence rows not already
-- covered by prior waves. Lapierre exposes exact RD-R9250; Santa Cruz exposes
-- only SRAM GX Eagle family, so no SRAM SKU/T-Type generation is inferred.
-- No compatibility or recommendation inference.

begin;

update public.bike_catalog_models
set manufacturer_url='https://lapierrebikes.com/en-int/pages/bikes/xelius-drs-team-replica',
    specs=specs||'{"rear_derailleur":"Shimano Dura-Ace Di2 RD-R9250 12s","rear_derailleur_evidence":"https://lapierrebikes.com/en-int/pages/bikes/xelius-drs-team-replica"}'::jsonb,
    evidence_checked_at=greatest(evidence_checked_at,'2026-08-17')
where id='lapierre-xelius-drs-team-replica-2026-global';

insert into public.garage_components
(id,brand,model,category,display_name,specs,unlock_level,evidence_url,evidence_checked_at,enabled)
values
('oem-lapierre-xelius-drs-team-replica-2026-rd','Shimano','Dura-Ace Di2 RD-R9250','rear_derailleur','Shimano Dura-Ace Di2 RD-R9250','{"speeds":12,"electronic":true,"evidence_scope":"Lapierre exact-product specification"}'::jsonb,1,'https://lapierrebikes.com/en-int/pages/bikes/xelius-drs-team-replica','2026-08-17',true),
('oem-santacruz-hightower-s-2025-rd','SRAM','GX Eagle family','rear_derailleur','SRAM GX Eagle · Hightower S 2025','{"speeds":12,"evidence_scope":"Santa Cruz exact-product drivetrain family label; generation/SKU not inferred"}'::jsonb,1,'https://www.santacruzbicycles.com/en-eu/products/hightower-s-2025','2026-08-17',true)
on conflict (id) do update set brand=excluded.brand,model=excluded.model,category=excluded.category,
 display_name=excluded.display_name,specs=excluded.specs,evidence_url=excluded.evidence_url,
 evidence_checked_at=excluded.evidence_checked_at,enabled=true;

insert into public.bike_catalog_component_fitments
(bike_id,component_id,fitment_type,evidence_url,evidence_checked_at,notes)
values
('lapierre-xelius-drs-team-replica-2026-global','oem-lapierre-xelius-drs-team-replica-2026-rd','factory_installed','https://lapierrebikes.com/en-int/pages/bikes/xelius-drs-team-replica','2026-08-17','Lapierre official product catalog identifies Shimano Dura-Ace Di2 RD-R9250 12s.'),
('santa-cruz-hightower-s-2025-us','oem-santacruz-hightower-s-2025-rd','factory_installed','https://www.santacruzbicycles.com/en-eu/products/hightower-s-2025','2026-08-17','Santa Cruz Hightower S 2025 exact page identifies SRAM GX Eagle drivetrain; rear-derailleur generation/SKU not inferred.')
on conflict (bike_id,component_id,fitment_type) do update set evidence_url=excluded.evidence_url,
 evidence_checked_at=excluded.evidence_checked_at,notes=excluded.notes;

commit;
