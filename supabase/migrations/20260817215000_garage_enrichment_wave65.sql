-- VeloQuest catalog enrichment wave 65.
-- Canonical SRAM standard Eagle Transmission component registry from exact official SRAM model/service pages.
-- All rows are 12-speed T-Type Eagle Transmission components. XX DH Transmission is intentionally excluded.
-- Component identity/spec evidence only: no bike fitment, compatibility verdict, manufacturer-approved upgrade, or no-upgrade outcome is inferred here.

begin;

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
values
  ('sram-rd-gx-e-b1','SRAM','RD-GX-E-B1','rear_derailleur','GX Eagle Transmission Derailleur','{"speeds":12,"chain_technology":"T-Type","system":"Eagle Transmission","max_tooth":52,"drivetrain_configuration":"1x","evidence_scope":"SRAM official exact service model"}'::jsonb,1,'https://www.sram.com/en/service/models/rd-gx-e-b1','2026-08-17',true),
  ('sram-rd-x0-e-b1','SRAM','RD-X0-E-B1','rear_derailleur','X0 Eagle Transmission Derailleur','{"speeds":12,"chain_technology":"T-Type","system":"Eagle Transmission","max_tooth":52,"drivetrain_configuration":"1x","evidence_scope":"SRAM official exact service model"}'::jsonb,1,'https://www.sram.com/en/service/models/rd-x0-e-b1','2026-08-17',true),
  ('sram-rd-xx-e-b1','SRAM','RD-XX-E-B1','rear_derailleur','XX Eagle Transmission Derailleur','{"speeds":12,"chain_technology":"T-Type","system":"Eagle Transmission","max_tooth":52,"drivetrain_configuration":"1x","evidence_scope":"SRAM official exact service model"}'::jsonb,1,'https://www.sram.com/en/service/models/rd-xx-e-b1','2026-08-17',true),
  ('sram-rd-xx-sle-b1','SRAM','RD-XX-SLE-B1','rear_derailleur','XX SL Eagle Transmission Derailleur','{"speeds":12,"chain_technology":"T-Type","system":"Eagle Transmission","max_tooth":52,"drivetrain_configuration":"1x","evidence_scope":"SRAM official exact service model"}'::jsonb,1,'https://www.sram.com/en/service/models/rd-xx-sle-b1','2026-08-17',true),
  ('sram-cs-xs-1275-a1','SRAM','CS-XS-1275-A1','cassette','XS-1275 Eagle Transmission Cassette','{"speeds":12,"range":"10-52T","chain_technology":"T-Type","system":"Eagle Transmission","driver_body":"XD","evidence_scope":"SRAM official exact service model"}'::jsonb,1,'https://www.sram.com/en/service/models/cs-xs-1275-a1','2026-08-17',true),
  ('sram-cs-xs-1295-a1','SRAM','CS-XS-1295-A1','cassette','XS-1295 Eagle Transmission Cassette','{"speeds":12,"range":"10-52T","chain_technology":"T-Type","system":"Eagle Transmission","driver_body":"XD","evidence_scope":"SRAM official exact service model"}'::jsonb,1,'https://www.sram.com/en/service/models/cs-xs-1295-a1','2026-08-17',true),
  ('sram-cs-xs-1297-a1','SRAM','CS-XS-1297-A1','cassette','XS-1297 Eagle Transmission Cassette','{"speeds":12,"range":"10-52T","chain_technology":"T-Type","system":"Eagle Transmission","driver_body":"XD","evidence_scope":"SRAM official exact model"}'::jsonb,1,'https://www.sram.com/en/sram/models/cs-xs-1297-a1','2026-08-17',true),
  ('sram-cs-xs-1299-a1','SRAM','CS-XS-1299-A1','cassette','XS-1299 Eagle Transmission Cassette','{"speeds":12,"range":"10-52T","chain_technology":"T-Type","system":"Eagle Transmission","driver_body":"XD","evidence_scope":"SRAM official exact service model"}'::jsonb,1,'https://www.sram.com/en/service/models/cs-xs-1299-a1','2026-08-17',true)
on conflict (id) do update set
  brand=excluded.brand, model=excluded.model, category=excluded.category, display_name=excluded.display_name,
  specs=excluded.specs, evidence_url=excluded.evidence_url, evidence_checked_at=excluded.evidence_checked_at, enabled=true;

commit;
