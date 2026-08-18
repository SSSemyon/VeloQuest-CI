create table if not exists public.client_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in (
    'cloud_hydration_failed',
    'ride_sync_succeeded',
    'ride_sync_failed',
    'source_disconnected',
    'account_delete_requested',
    'bike_cache_write_failed'
  )),
  severity text not null default 'info' check (severity in ('info', 'warning', 'error')),
  source_kind text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.client_events enable row level security;
revoke all on table public.client_events from anon, authenticated;
grant select, insert on table public.client_events to authenticated;
grant usage on sequence public.client_events_id_seq to authenticated;

drop policy if exists client_events_select_own on public.client_events;
create policy client_events_select_own
on public.client_events for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists client_events_insert_own on public.client_events;
create policy client_events_insert_own
on public.client_events for insert
to authenticated
with check ((select auth.uid()) = user_id);

create index if not exists client_events_user_created_idx
on public.client_events (user_id, created_at desc);
