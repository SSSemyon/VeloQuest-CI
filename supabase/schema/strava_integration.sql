create table if not exists public.strava_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  scope text not null default 'read,activity:read',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strava_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  app_redirect text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.strava_webhook_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  object_type text not null,
  object_id bigint not null,
  aspect_type text not null,
  event_time bigint not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (user_id, object_type, object_id, aspect_type, event_time)
);

alter table public.strava_credentials enable row level security;
alter table public.strava_oauth_states enable row level security;
alter table public.strava_webhook_events enable row level security;

revoke all on table public.strava_credentials, public.strava_oauth_states, public.strava_webhook_events from public, anon, authenticated;
grant select, insert, update, delete on table public.strava_credentials, public.strava_oauth_states, public.strava_webhook_events to service_role;
grant usage on sequence public.strava_webhook_events_id_seq to service_role;

drop policy if exists strava_credentials_service_only on public.strava_credentials;
create policy strava_credentials_service_only on public.strava_credentials
for all to service_role using (true) with check (true);

drop policy if exists strava_oauth_states_service_only on public.strava_oauth_states;
create policy strava_oauth_states_service_only on public.strava_oauth_states
for all to service_role using (true) with check (true);

drop policy if exists strava_webhook_events_service_only on public.strava_webhook_events;
create policy strava_webhook_events_service_only on public.strava_webhook_events
for all to service_role using (true) with check (true);

create index if not exists strava_oauth_states_expiry_idx on public.strava_oauth_states (expires_at);
create index if not exists strava_webhook_events_pending_idx on public.strava_webhook_events (user_id, received_at) where processed_at is null;
