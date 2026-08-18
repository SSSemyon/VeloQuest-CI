-- VeloQuest 0.8.0 functional-completion schema.
-- Product scope: persistent progression campaign, privacy controls,
-- merge review inbox and server-backed virtual bike rewards.

alter table public.profiles
  add column if not exists privacy_zone_enabled boolean not null default true;

alter table public.player_progress
  add column if not exists specialization_changes_used smallint not null default 0
  check (specialization_changes_used between 0 and 1);

create table if not exists public.season_chapters (
  season_id text not null,
  chapter_number smallint not null check (chapter_number between 1 and 4),
  title text not null,
  min_xp integer not null check (min_xp >= 0),
  objective text not null,
  primary key (season_id, chapter_number)
);

alter table public.season_chapters enable row level security;
revoke all on table public.season_chapters from anon, authenticated;
grant select on table public.season_chapters to authenticated;
drop policy if exists season_chapters_read on public.season_chapters;
create policy season_chapters_read on public.season_chapters
for select to authenticated using (true);

insert into public.season_chapters (season_id, chapter_number, title, min_xp, objective)
values
  ('alpha-1', 1, 'Первые следы', 0, 'Начни исследование и открой первые территории.'),
  ('alpha-1', 2, 'За горизонтом', 600, 'Расширяй карту и пробуй разные типы квестов.'),
  ('alpha-1', 3, 'Свой путь', 1300, 'Выбери специализацию и следуй своему стилю.'),
  ('alpha-1', 4, 'Край карты', 2000, 'Заверши сезон серией осмысленных исследовательских поездок.')
on conflict (season_id, chapter_number) do update set
  title = excluded.title,
  min_xp = excluded.min_xp,
  objective = excluded.objective;

create table if not exists public.quest_specialization_affinity (
  specialization text not null check (specialization in ('explorer', 'climber', 'stayer')),
  quest_code text not null references public.quest_templates(code) on delete cascade,
  weight smallint not null check (weight between 0 and 100),
  primary key (specialization, quest_code)
);

alter table public.quest_specialization_affinity enable row level security;
revoke all on table public.quest_specialization_affinity from anon, authenticated;
grant select on table public.quest_specialization_affinity to authenticated;
drop policy if exists quest_specialization_affinity_read on public.quest_specialization_affinity;
create policy quest_specialization_affinity_read on public.quest_specialization_affinity
for select to authenticated using (true);

insert into public.quest_specialization_affinity (specialization, quest_code, weight)
values
  ('explorer', 'new_land', 100), ('explorer', 'close_the_loop', 70), ('explorer', 'long_ride', 55), ('explorer', 'high_route', 40),
  ('climber', 'high_route', 100), ('climber', 'new_land', 65), ('climber', 'long_ride', 55), ('climber', 'close_the_loop', 40),
  ('stayer', 'long_ride', 100), ('stayer', 'close_the_loop', 75), ('stayer', 'new_land', 55), ('stayer', 'high_route', 40)
on conflict (specialization, quest_code) do update set weight = excluded.weight;

create table if not exists public.virtual_items (
  id text primary key,
  slot text not null check (slot in ('frame', 'wheels', 'cockpit', 'badge')),
  display_name text not null,
  description text not null,
  unlock_level smallint not null check (unlock_level between 1 and 10),
  rarity text not null check (rarity in ('standard', 'rare', 'epic')),
  enabled boolean not null default true
);

alter table public.virtual_items enable row level security;
revoke all on table public.virtual_items from anon, authenticated;
grant select on table public.virtual_items to authenticated;
drop policy if exists virtual_items_read on public.virtual_items;
create policy virtual_items_read on public.virtual_items
for select to authenticated using (enabled = true);

insert into public.virtual_items (id, slot, display_name, description, unlock_level, rarity)
values
  ('vqb-frame-ivory', 'frame', 'Ivory Explorer', 'Базовая рама VeloQuest Bike.', 1, 'standard'),
  ('vqb-wheels-trail', 'wheels', 'Trail 40', 'Игровой комплект колёс за первые исследования.', 2, 'standard'),
  ('vqb-badge-compass', 'badge', 'Compass Mark', 'Виртуальный знак исследователя.', 3, 'rare'),
  ('vqb-cockpit-summit', 'cockpit', 'Summit Cockpit', 'Игровой кокпит за стабильный прогресс.', 4, 'rare'),
  ('vqb-wheels-horizon', 'wheels', 'Horizon 50', 'Виртуальные колёса высокого уровня.', 6, 'epic'),
  ('vqb-frame-aurora', 'frame', 'Aurora Frame', 'Финальная виртуальная рама сезона.', 9, 'epic')
on conflict (id) do update set
  slot = excluded.slot,
  display_name = excluded.display_name,
  description = excluded.description,
  unlock_level = excluded.unlock_level,
  rarity = excluded.rarity,
  enabled = true;

create table if not exists public.virtual_loadout (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('frame', 'wheels', 'cockpit', 'badge')),
  virtual_item_id text not null references public.virtual_items(id),
  installed_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.virtual_loadout enable row level security;
revoke all on table public.virtual_loadout from anon, authenticated;
grant select, insert, update, delete on table public.virtual_loadout to authenticated;
drop policy if exists virtual_loadout_select_own on public.virtual_loadout;
create policy virtual_loadout_select_own on public.virtual_loadout for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists virtual_loadout_insert_own on public.virtual_loadout;
create policy virtual_loadout_insert_own on public.virtual_loadout for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists virtual_loadout_update_own on public.virtual_loadout;
create policy virtual_loadout_update_own on public.virtual_loadout for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists virtual_loadout_delete_own on public.virtual_loadout;
create policy virtual_loadout_delete_own on public.virtual_loadout for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.enforce_virtual_item_unlock()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_required_level smallint;
  v_level smallint;
  v_slot text;
begin
  if new.user_id <> (select auth.uid()) then
    raise exception 'virtual_item_owner_mismatch';
  end if;
  select unlock_level, slot into v_required_level, v_slot
  from public.virtual_items where id = new.virtual_item_id and enabled = true;
  if not found or v_slot <> new.slot then raise exception 'invalid_virtual_item'; end if;
  select coalesce(level, 1) into v_level from public.player_progress where user_id = new.user_id;
  if coalesce(v_level, 1) < v_required_level then raise exception 'virtual_item_locked'; end if;
  new.installed_at := now();
  return new;
end;
$$;

drop trigger if exists virtual_loadout_unlock_guard on public.virtual_loadout;
create trigger virtual_loadout_unlock_guard
before insert or update on public.virtual_loadout
for each row execute function public.enforce_virtual_item_unlock();

create table if not exists public.ride_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null,
  source_fingerprint text not null,
  candidate_ride_id uuid references public.rides(id) on delete cascade,
  reason text not null,
  status text not null default 'needs_review' check (status in ('needs_review', 'confirmed_duplicate', 'dismissed')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, source_kind, source_fingerprint)
);

alter table public.ride_inbox enable row level security;
revoke all on table public.ride_inbox from anon, authenticated;
grant select, update on table public.ride_inbox to authenticated;
drop policy if exists ride_inbox_select_own on public.ride_inbox;
create policy ride_inbox_select_own on public.ride_inbox for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists ride_inbox_update_own on public.ride_inbox;
create policy ride_inbox_update_own on public.ride_inbox for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and status in ('confirmed_duplicate', 'dismissed'));

create or replace function public.guard_specialization_change()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.specialization is not distinct from old.specialization then
    new.specialization_changes_used := old.specialization_changes_used;
    new.specialization_changed_at := old.specialization_changed_at;
    return new;
  end if;
  if old.level < 3 then raise exception 'specialization_requires_level_3'; end if;
  if new.specialization not in ('explorer', 'climber', 'stayer') then raise exception 'invalid_specialization'; end if;
  if old.specialization is null then
    new.specialization_changes_used := 0;
  else
    if old.specialization_changes_used >= 1 then raise exception 'specialization_change_already_used'; end if;
    new.specialization_changes_used := old.specialization_changes_used + 1;
  end if;
  new.specialization_changed_at := now();
  return new;
end;
$$;

drop trigger if exists player_progress_specialization_guard on public.player_progress;
create trigger player_progress_specialization_guard
before update of specialization, specialization_changes_used, specialization_changed_at on public.player_progress
for each row execute function public.guard_specialization_change();

grant update (specialization, specialization_changes_used, specialization_changed_at)
on public.player_progress to authenticated;
drop policy if exists player_progress_update_specialization_own on public.player_progress;
create policy player_progress_update_specialization_own on public.player_progress for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Extend the bounded telemetry vocabulary used by the alpha.
alter table public.client_events drop constraint if exists client_events_event_name_check;
alter table public.client_events add constraint client_events_event_name_check check (event_name in (
  'cloud_hydration_failed', 'ride_sync_succeeded', 'ride_sync_failed',
  'source_disconnected', 'account_delete_requested', 'specialization_selected',
  'virtual_item_installed', 'ride_inbox_reviewed', 'privacy_zone_updated',
  'quest_selected', 'route_influence_reported', 'client_render_error', 'bike_cache_write_failed'
));
