-- SOURCE: supabase/schema/garage_recommendation_outcomes.sql
create table if not exists public.garage_recommendation_outcomes (
  bike_id text not null references public.bike_catalog_models(id) on delete cascade,
  scope_key text not null check (scope_key ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  outcome_type text not null check (outcome_type in ('no_upgrade')),
  title text not null check (char_length(trim(title)) between 3 and 160),
  notes text not null check (char_length(trim(notes)) between 20 and 1200),
  evidence_url text not null check (evidence_url ~ '^https://'),
  evidence_checked_at date not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (bike_id, scope_key, outcome_type)
);

alter table public.garage_recommendation_outcomes enable row level security;
revoke all on table public.garage_recommendation_outcomes from anon, authenticated;
grant select on table public.garage_recommendation_outcomes to authenticated;

drop policy if exists garage_recommendation_outcomes_read on public.garage_recommendation_outcomes;
create policy garage_recommendation_outcomes_read on public.garage_recommendation_outcomes
for select to authenticated using (enabled = true);
