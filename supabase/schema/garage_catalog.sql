create table if not exists public.garage_components (
  id text primary key,
  brand text not null,
  model text not null,
  category text not null check (category in (
    'rear_derailleur','front_derailleur','cassette','chain','crankset','chainring',
    'bottom_bracket','shifter','brake_caliper','brake_lever','brake_adapter','rotor','wheelset',
    'hub','tire','fork','rear_shock','seatpost','dropper_post','saddle','handlebar',
    'stem','pedal','e_bike_system','motor','battery','range_extender','controller'
  )),
  display_name text not null,
  specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  unlock_level smallint not null default 1 check (unlock_level between 1 and 10),
  evidence_url text not null,
  evidence_checked_at date not null,
  enabled boolean not null default true
);

create table if not exists public.garage_compatibility (
  source_component_id text not null references public.garage_components(id) on delete cascade,
  target_component_id text not null references public.garage_components(id) on delete cascade,
  status text not null check (status in ('compatible', 'conditional', 'incompatible')),
  rule_summary text not null,
  evidence_url text not null,
  evidence_checked_at date not null,
  primary key (source_component_id, target_component_id)
);

alter table public.garage_components enable row level security;
alter table public.garage_compatibility enable row level security;
revoke all on table public.garage_components, public.garage_compatibility from anon, authenticated;
grant select on table public.garage_components, public.garage_compatibility to authenticated;

drop policy if exists garage_components_read on public.garage_components;
create policy garage_components_read on public.garage_components
for select to authenticated using (enabled = true);

drop policy if exists garage_compatibility_read on public.garage_compatibility;
create policy garage_compatibility_read on public.garage_compatibility
for select to authenticated using (true);

insert into public.garage_components (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
values
  ('shimano-rd-m6100-sgs', 'Shimano', 'RD-M6100-SGS', 'rear_derailleur', 'DEORE RD-M6100-SGS', '{"speeds":12,"drivetrain":"1x12"}'::jsonb, 1, 'https://productinfo.shimano.com/en/lineup/deore-1x12', '2026-08-05'),
  ('shimano-cs-m6100-12', 'Shimano', 'CS-M6100-12', 'cassette', 'DEORE CS-M6100-12 10-51T', '{"speeds":12,"range":"10-51T","freehub":"MICRO SPLINE"}'::jsonb, 3, 'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-05'),
  ('sram-rd-gx-1-b2', 'SRAM', 'RD-GX-1-B2', 'rear_derailleur', 'GX Eagle Rear Derailleur', '{"speeds":12,"max_cassette":"52T"}'::jsonb, 1, 'https://www.sram.com/en/sram/models/rd-gx-1-b2', '2026-08-05'),
  ('sram-cs-xg-1275-b1', 'SRAM', 'CS-XG-1275-B1', 'cassette', 'XG-1275 Eagle 10-52T', '{"speeds":12,"range":"10-52T","freehub":"XD"}'::jsonb, 3, 'https://www.sram.com/en/sram/models/cs-xg-1275-b1', '2026-08-05')
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

insert into public.garage_compatibility (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)
values
  ('shimano-rd-m6100-sgs', 'shimano-cs-m6100-12', 'compatible', 'Shimano 1x12 MTB compatibility lists RD-M6100-SGS with CS-M6100-12 10-51T.', 'https://productinfo.shimano.com/en/compatibility/C-433', '2026-08-05'),
  ('sram-rd-gx-1-b2', 'sram-cs-xg-1275-b1', 'compatible', 'GX Eagle RD-GX-1-B2 supports 10-52T Eagle cassettes; XG-1275 is a 12-speed 10-52T Eagle cassette.', 'https://www.sram.com/en/sram/models/rd-gx-1-b2', '2026-08-05')
on conflict (source_component_id, target_component_id) do update set
  status = excluded.status,
  rule_summary = excluded.rule_summary,
  evidence_url = excluded.evidence_url,
  evidence_checked_at = excluded.evidence_checked_at;
