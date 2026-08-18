create table if not exists public.client_migrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  migration_key text not null,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, migration_key)
);

alter table public.client_migrations enable row level security;
revoke all on table public.client_migrations from anon, authenticated;
grant select on table public.client_migrations to authenticated;

drop policy if exists client_migrations_select_own on public.client_migrations;
create policy client_migrations_select_own
on public.client_migrations for select
to authenticated
using ((select auth.uid()) = user_id);

create unique index if not exists xp_ledger_one_migration_award_idx
on public.xp_ledger (user_id, entry_type, reason)
where entry_type = 'migration';
