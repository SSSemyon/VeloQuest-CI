-- VeloQuest catalog enrichment wave 08.
-- Deepens verified 2024 BMC factory specifications and introduces an explicit
-- Bike -> factory component evidence layer. Unknown fitments remain default-deny.

create table if not exists public.bike_catalog_component_fitments (
  bike_id text not null references public.bike_catalog_models(id) on delete cascade,
  component_id text not null references public.garage_components(id) on delete cascade,
  fitment_type text not null check (fitment_type in ('factory_installed', 'manufacturer_approved', 'incompatible')),
  evidence_url text not null check (evidence_url ~ '^https://'),
  evidence_checked_at date not null,
  notes text not null default '',
  primary key (bike_id, component_id, fitment_type)
);

create index if not exists bike_catalog_component_fitments_lookup_idx
on public.bike_catalog_component_fitments (bike_id, fitment_type, component_id);

alter table public.bike_catalog_component_fitments enable row level security;
revoke all on table public.bike_catalog_component_fitments from anon, authenticated;
grant select on table public.bike_catalog_component_fitments to authenticated;

drop policy if exists bike_catalog_component_fitments_read on public.bike_catalog_component_fitments;
create policy bike_catalog_component_fitments_read on public.bike_catalog_component_fitments
for select to authenticated using (
  exists (
    select 1 from public.bike_catalog_models bike
    where bike.id = bike_id and bike.enabled = true and bike.model_year >= 2020
  )
  and exists (
    select 1 from public.garage_components component
    where component.id = component_id and component.enabled = true
  )
);

comment on table public.bike_catalog_component_fitments is
'Evidence-backed links between verified catalog bicycles and exact components. Missing rows mean unknown; clients must not infer fitment.';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":120,"rear_travel_mm":100,"suspension_brand":"Ohlins","fork":"Ohlins RXC34 Carbon, 120 mm","rear_shock":"Ohlins TXC2 Air","drivetrain_brand":"SRAM","drivetrain":"SRAM XX SL Eagle Transmission 1x12","rear_derailleur":"SRAM XX SL Eagle Transmission","cassette":"SRAM XX SL Eagle Transmission XS-1299 10-52T","crankset":"SRAM XX SL Eagle Carbon 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level Ultimate; HS2 rotors","wheelset":"Duke Lucky Jack SLS4","hubs":"Duke Madmax","tires":"Pirelli Scorpion XC RC 2.4 in","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":62,"spec_evidence":"official BMC 2024 Fourstroke 01 TEAM archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-team-bikes-bmc-24a-000004',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-01-team-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":110,"rear_travel_mm":100,"suspension_brand":"FOX","fork":"FOX Float 34 SC Factory FIT4, 110 mm","rear_shock":"FOX Float DPS EVOL LV Factory","drivetrain_brand":"SRAM","drivetrain":"SRAM XX SL Eagle Transmission 1x12","rear_derailleur":"SRAM XX SL Eagle Transmission","cassette":"SRAM XX SL Eagle Transmission XS-1299 10-52T","crankset":"SRAM XX SL Eagle Carbon 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level Ultimate; HS2 Centerlock rotors","wheelset":"DT Swiss XRC 1200, 30 mm internal","hubs":"DT Swiss 180 Straightpull, Ratchet EXP 36, SINC ceramic bearings","tires":"Vittoria Mezcal 2.35 in","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":62,"weight_kg":10.7,"spec_evidence":"official BMC 2024 Fourstroke 01 LTD archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-ltd-bikes-bmc-24-10503-003',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-01-ltd-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":110,"rear_travel_mm":100,"suspension_brand":"RockShox","fork":"RockShox SID Ultimate 3P, 110 mm","rear_shock":"RockShox SIDLUXE Ultimate","drivetrain_brand":"SRAM","drivetrain":"SRAM X0 Eagle Transmission 1x12","rear_derailleur":"SRAM X0 Eagle Transmission","cassette":"SRAM X0 Eagle Transmission XS-1295 10-52T","crankset":"SRAM X0 Eagle 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level Ultimate; HS2 rotors","wheelset":"DT Swiss XRC 1501, 30 mm internal","hubs":"DT Swiss 240 Straightpull, Ratchet EXP 36","tires":"Vittoria Mezcal 2.35 in","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":62,"weight_kg":11.1,"spec_evidence":"official BMC 2024 Fourstroke 01 ONE archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-one-bikes-bmc-24-10503-002',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-01-one-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":110,"rear_travel_mm":100,"suspension_brand":"RockShox","fork":"RockShox SID SL Select+, 110 mm","rear_shock":"RockShox SIDLUXE Select+","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle Transmission 1x12","rear_derailleur":"SRAM GX Eagle Transmission","cassette":"SRAM XS-1275 Eagle Transmission CS-XS-1275-A1 10-52T","crankset":"SRAM GX Eagle 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level TLM; HS2 rotors","wheelset":"XCD-30W Carbon, 30 mm internal","hubs":"XCD-30W","tires":"Vittoria Mezcal 2.35 in","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":62,"weight_kg":11.4,"spec_evidence":"official BMC 2024 Fourstroke 01 TWO archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-two-bikes-bmc-24-10503-001',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-01-two-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":120,"rear_travel_mm":120,"suspension_brand":"RockShox","fork":"RockShox SID Select+ 3P, 120 mm","rear_shock":"RockShox SIDLUXE Select+","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle 1x12","rear_derailleur":"SRAM GX Eagle","cassette":"SRAM XG-1275 Eagle 10-52T","crankset":"SRAM Stylo 6K Eagle 32T","brake_type":"hydraulic_disc","brakes":"SRAM G2 RS; Centerline 180/180 mm rotors","wheelset":"DT Swiss M 1900, 30 mm internal","hubs":"DT Swiss 370, Ratchet LN18","tires":"Maxxis Rekon 2.4 in EXO TR","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":62,"weight_kg":12.6,"spec_evidence":"official BMC 2024 Fourstroke LT ONE archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-lt-one-bikes-bmc-24-10517-006',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-fourstroke-lt-one-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":100,"suspension_brand":"RockShox","fork":"RockShox SID SL Select 3P, 100 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM X01/GX Eagle 1x12","rear_derailleur":"SRAM X01 Eagle","cassette":"SRAM CS-XG-1275-B1 10-52T","crankset":"SRAM X1 Eagle DUB 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level Silver Stealth; Centerline rotors","wheelset":"DT Swiss XR 1700, 25 mm internal","hubs":"DT Swiss 350 Straightpull, Ratchet 36 SL","tires":"Vittoria Barzo 2.25 in tubeless","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":58,"spec_evidence":"official BMC 2024 Twostroke 01 ONE archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/twostroke-01-one-bikes-bmc-24-10515-001',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-twostroke-01-one-2024-global';

update public.bike_catalog_models
set specs = specs || '{"frame_material":"carbon","front_travel_mm":100,"suspension_brand":"RockShox","fork":"RockShox Reba RL R, 100 mm","drivetrain_brand":"SRAM","drivetrain":"SRAM GX Eagle 1x12","rear_derailleur":"SRAM GX Eagle","cassette":"SRAM CS-XG-1275-B1 10-52T","crankset":"SRAM GX Eagle DUB 34T","brake_type":"hydraulic_disc","brakes":"SRAM Level Bronze Stealth; Centerline rotors","wheelset":"DT Swiss X 1900, 25 mm internal","hubs":"DT Swiss 370, Ratchet LN18","tires":"Vittoria Barzo 2.25 in tubeless","rear_axle":"12x148 Boost","bottom_bracket":"PF92","max_tire_clearance_mm":58,"spec_evidence":"official BMC 2024 Twostroke 01 TWO archive product technical overview"}'::jsonb,
    manufacturer_url = 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/twostroke-01-two-bikes-bmc-24-10515-002',
    evidence_checked_at = '2026-08-07'
where id = 'bmc-twostroke-01-two-2024-global';

insert into public.garage_components
  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('sram-rd-x0-e-b1', 'SRAM', 'RD-X0-E-B1', 'rear_derailleur', 'X0 Eagle Transmission Derailleur',
   '{"speeds":12,"system":"Eagle Transmission","t_type":true,"axs":true,"mount":"Full Mount / hangerless","max_cassette":"52T"}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/rd-x0-e-b1', '2026-08-07'),
  ('sram-cs-xs-1295-a1', 'SRAM', 'CS-XS-1295-A1', 'cassette', 'XS-1295 Eagle Transmission Cassette',
   '{"speeds":12,"range":"10-52T","system":"Eagle Transmission","t_type":true,"chainline_mm":55}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/cs-xs-1295-a1', '2026-08-07'),
  ('sram-rd-xx-sle-b1', 'SRAM', 'RD-XX-SLE-B1', 'rear_derailleur', 'XX SL Eagle Transmission Derailleur',
   '{"speeds":12,"system":"Eagle Transmission","t_type":true,"axs":true,"mount":"Full Mount / hangerless","max_cassette":"52T"}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/rd-xx-sle-b1', '2026-08-07'),
  ('sram-cs-xs-1299-a1', 'SRAM', 'CS-XS-1299-A1', 'cassette', 'XS-1299 Eagle Transmission Cassette',
   '{"speeds":12,"range":"10-52T","system":"Eagle Transmission","t_type":true,"freehub":"XD","chainline_mm":55}'::jsonb, 3,
   'https://www.sram.com/en/sram/models/cs-xs-1299-a1', '2026-08-07')
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  category = excluded.category,
  display_name = excluded.display_name,
  specs = excluded.specs,
  unlock_level = excluded.unlock_level,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  enabled = true;

insert into public.garage_compatibility
  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('sram-rd-x0-e-b1', 'sram-cs-xs-1295-a1', 'compatible',
   'SRAM X0 Eagle AXS Transmission groupset pairs the X0 T-Type derailleur with the 10-52T X0 Eagle Transmission cassette.',
   'https://www.sram.com/en/sram/models/gs-x0-e-d1', '2026-08-07'),
  ('sram-rd-xx-sle-b1', 'sram-cs-xs-1299-a1', 'compatible',
   'SRAM XX SL Eagle AXS Transmission groupset pairs the XX SL T-Type derailleur with the XS-1299 10-52T cassette family.',
   'https://www.sram.com/en/sram/models/gs-xx-sle-d1', '2026-08-07')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;

insert into public.bike_catalog_component_fitments
  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
values
  ('bmc-fourstroke-01-team-2024-global', 'sram-rd-xx-sle-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-team-bikes-bmc-24a-000004', '2026-08-07', 'BMC lists SRAM XX SL Eagle Transmission rear derailleur.'),
  ('bmc-fourstroke-01-team-2024-global', 'sram-cs-xs-1299-a1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-team-bikes-bmc-24a-000004', '2026-08-07', 'BMC lists SRAM XX SL Eagle Transmission XS-1299 cassette.'),
  ('bmc-fourstroke-01-ltd-2024-global', 'sram-rd-xx-sle-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-ltd-bikes-bmc-24-10503-003', '2026-08-07', 'BMC lists SRAM XX SL Eagle Transmission rear derailleur.'),
  ('bmc-fourstroke-01-ltd-2024-global', 'sram-cs-xs-1299-a1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-ltd-bikes-bmc-24-10503-003', '2026-08-07', 'BMC lists SRAM XX SL Eagle Transmission XS-1299 cassette.'),
  ('bmc-fourstroke-01-one-2024-global', 'sram-rd-x0-e-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-one-bikes-bmc-24-10503-002', '2026-08-07', 'BMC lists SRAM X0 Eagle Transmission rear derailleur.'),
  ('bmc-fourstroke-01-one-2024-global', 'sram-cs-xs-1295-a1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-one-bikes-bmc-24-10503-002', '2026-08-07', 'BMC lists SRAM X0 Eagle Transmission XS-1295 cassette.'),
  ('bmc-fourstroke-01-two-2024-global', 'sram-rd-gx-e-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-two-bikes-bmc-24-10503-001', '2026-08-07', 'BMC lists SRAM GX Eagle Transmission rear derailleur.'),
  ('bmc-fourstroke-01-two-2024-global', 'sram-cs-xs-1275-a1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/fourstroke-01-two-bikes-bmc-24-10503-001', '2026-08-07', 'BMC lists CS-XS-1275-A1 cassette explicitly.'),
  ('bmc-twostroke-01-one-2024-global', 'sram-cs-xg-1275-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/twostroke-01-one-bikes-bmc-24-10515-001', '2026-08-07', 'BMC lists CS-XG-1275-B1 cassette explicitly.'),
  ('bmc-twostroke-01-two-2024-global', 'sram-cs-xg-1275-b1', 'factory_installed', 'https://bmc-switzerland.com/collections/bike-archive-mountain/products/twostroke-01-two-bikes-bmc-24-10515-002', '2026-08-07', 'BMC lists CS-XG-1275-B1 cassette explicitly.')
on conflict (bike_id, component_id, fitment_type) do update set
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at,
  notes = excluded.notes;
