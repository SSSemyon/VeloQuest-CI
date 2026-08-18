alter table public.xp_ledger
  drop constraint if exists xp_ledger_entry_type_check;
alter table public.xp_ledger
  add constraint xp_ledger_entry_type_check
  check (entry_type in ('ride', 'quest', 'season', 'migration', 'correction', 'achievement'));

create unique index if not exists xp_ledger_one_achievement_award_idx
  on public.xp_ledger (user_id, reason)
  where entry_type = 'achievement';

create table if not exists public.cosmetic_rewards (
  code text primary key,
  display_name text not null,
  reward_kind text not null check (reward_kind in ('badge', 'title', 'profile_theme', 'bike_cosmetic')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.achievement_definitions (
  code text not null,
  version integer not null check (version > 0),
  display_name text not null,
  description text not null,
  category text not null check (category in ('ride', 'distance', 'elevation', 'regularity', 'quest', 'territory', 'regional', 'cadence', 'tempo')),
  criteria jsonb not null check (jsonb_typeof(criteria) = 'object'),
  xp_reward integer not null check (xp_reward between 0 and 25),
  cosmetic_reward_code text references public.cosmetic_rewards(code),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  primary key (code, version)
);

create unique index if not exists achievement_definitions_one_active_version_idx
  on public.achievement_definitions (code)
  where active;

create table if not exists public.achievement_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_code text not null,
  definition_version integer not null,
  progress_value numeric not null default 0 check (progress_value >= 0),
  target_value numeric not null check (target_value > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_code),
  foreign key (achievement_code, definition_version)
    references public.achievement_definitions(code, version)
);

create table if not exists public.achievement_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ride_id uuid not null references public.rides(id) on delete cascade,
  event_key text not null unique,
  metrics jsonb not null check (jsonb_typeof(metrics) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, ride_id)
);

create table if not exists public.achievement_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_code text not null,
  definition_version integer not null,
  ride_id uuid references public.rides(id) on delete set null,
  reward_key text not null unique,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_code),
  foreign key (achievement_code, definition_version)
    references public.achievement_definitions(code, version)
);

create table if not exists public.user_cosmetic_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_code text not null references public.cosmetic_rewards(code),
  achievement_code text not null,
  reward_key text not null unique,
  granted_at timestamptz not null default now(),
  primary key (user_id, reward_code)
);

create index if not exists achievement_progress_user_updated_idx
  on public.achievement_progress (user_id, updated_at desc);
create index if not exists achievement_unlocks_user_unlocked_idx
  on public.achievement_unlocks (user_id, unlocked_at desc);
create index if not exists achievement_events_user_created_idx
  on public.achievement_events (user_id, created_at desc);

alter table public.cosmetic_rewards enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.achievement_progress enable row level security;
alter table public.achievement_events enable row level security;
alter table public.achievement_unlocks enable row level security;
alter table public.user_cosmetic_rewards enable row level security;

revoke all on table public.cosmetic_rewards from anon, authenticated;
revoke all on table public.achievement_definitions from anon, authenticated;
revoke all on table public.achievement_progress from anon, authenticated;
revoke all on table public.achievement_events from anon, authenticated;
revoke all on table public.achievement_unlocks from anon, authenticated;
revoke all on table public.user_cosmetic_rewards from anon, authenticated;

grant select on table public.cosmetic_rewards to authenticated;
grant select on table public.achievement_definitions to authenticated;
grant select on table public.achievement_progress to authenticated;
grant select on table public.achievement_unlocks to authenticated;
grant select on table public.user_cosmetic_rewards to authenticated;

drop policy if exists cosmetic_rewards_read on public.cosmetic_rewards;
create policy cosmetic_rewards_read on public.cosmetic_rewards
for select to authenticated using (active = true);

drop policy if exists achievement_definitions_read on public.achievement_definitions;
create policy achievement_definitions_read on public.achievement_definitions
for select to authenticated using (active = true);

drop policy if exists achievement_progress_owner_read on public.achievement_progress;
create policy achievement_progress_owner_read on public.achievement_progress
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists achievement_unlocks_owner_read on public.achievement_unlocks;
create policy achievement_unlocks_owner_read on public.achievement_unlocks
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists user_cosmetic_rewards_owner_read on public.user_cosmetic_rewards;
create policy user_cosmetic_rewards_owner_read on public.user_cosmetic_rewards
for select to authenticated using ((select auth.uid()) = user_id);

create or replace function private.reject_achievement_grant_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Direct mutation is forbidden, but nested FK cascades must allow account deletion.
  if pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'achievement_grants_are_immutable' using errcode = '55000';
end;
$$;

drop trigger if exists achievement_unlocks_immutable on public.achievement_unlocks;
create trigger achievement_unlocks_immutable
before update or delete on public.achievement_unlocks
for each row execute function private.reject_achievement_grant_mutation();

drop trigger if exists user_cosmetic_rewards_immutable on public.user_cosmetic_rewards;
create trigger user_cosmetic_rewards_immutable
before update or delete on public.user_cosmetic_rewards
for each row execute function private.reject_achievement_grant_mutation();

insert into public.cosmetic_rewards (code, display_name, reward_kind, payload)
values
  ('badge-first-ride', 'Первый след', 'badge', '{"icon":"bicycle"}'),
  ('badge-distance-10', 'Первые 10 км', 'badge', '{"icon":"map"}'),
  ('title-distance-50', 'Дальнобойщик', 'title', '{"title":"Дальнобойщик"}'),
  ('badge-elevation-500', 'Выше облаков', 'badge', '{"icon":"trending-up"}'),
  ('profile-regularity', 'Ритм недели', 'profile_theme', '{"accent":"sage"}'),
  ('badge-first-quest', 'Искатель', 'badge', '{"icon":"flag"}'),
  ('bike-territory-25', 'Территориальный декаль', 'bike_cosmetic', '{"slot":"decal","theme":"territory"}'),
  ('title-regional', 'Региональный исследователь', 'title', '{"title":"Региональный исследователь"}'),
  ('badge-cadence', 'Ровный каденс', 'badge', '{"icon":"sync"}'),
  ('profile-tempo', 'Устойчивый темп', 'profile_theme', '{"accent":"forest"}')
on conflict (code) do update set
  display_name = excluded.display_name,
  reward_kind = excluded.reward_kind,
  payload = excluded.payload,
  active = true;

insert into public.achievement_definitions (
  code, version, display_name, description, category, criteria, xp_reward, cosmetic_reward_code
)
values
  ('ride-first-verified', 1, 'Первая подтверждённая поездка', 'Заверши первую подтверждённую реальную поездку.', 'ride', '{"target":1}', 10, 'badge-first-ride'),
  ('distance-10', 1, 'Первые 10 км', 'Набери 10 км в подтверждённых поездках.', 'distance', '{"target":10,"unit":"km"}', 10, 'badge-distance-10'),
  ('distance-50', 1, 'Пятьдесят километров', 'Набери 50 км в подтверждённых поездках.', 'distance', '{"target":50,"unit":"km"}', 20, 'title-distance-50'),
  ('elevation-500', 1, 'Пятьсот метров вверх', 'Набери 500 м высоты в подтверждённых поездках.', 'elevation', '{"target":500,"unit":"m"}', 15, 'badge-elevation-500'),
  ('regular-three-in-seven', 1, 'Регулярный ритм', 'Совершай три подтверждённые поездки за семь дней.', 'regularity', '{"target":3,"windowDays":7}', 15, 'profile-regularity'),
  ('quest-first', 1, 'Первый квест', 'Заверши первый серверный квест.', 'quest', '{"target":1}', 10, 'badge-first-quest'),
  ('territory-25', 1, 'Новые территории', 'Открой 25 подтверждённых H3-территорий.', 'territory', '{"target":25,"unit":"h3"}', 20, 'bike-territory-25'),
  ('regional-adventure', 1, 'Regional Adventure', 'Заверши подтверждённое региональное приключение.', 'regional', '{"target":1}', 25, 'title-regional'),
  ('cadence-consistent-20', 1, 'Стабильный каденс', 'Поддерживай достоверный стабильный каденс 20 минут.', 'cadence', '{"target":20,"unit":"minutes","requiresServerSamples":true}', 15, 'badge-cadence'),
  ('tempo-consistent-30', 1, 'Устойчивый темп', 'Поддерживай безопасный устойчивый темп 30 минут.', 'tempo', '{"target":30,"unit":"minutes","requiresValidGps":true}', 15, 'profile-tempo')
on conflict (code, version) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  category = excluded.category,
  criteria = excluded.criteria,
  xp_reward = excluded.xp_reward,
  cosmetic_reward_code = excluded.cosmetic_reward_code;

-- Keep definitions dormant until their metrics are emitted by a trusted server connector.
update public.achievement_definitions
set active = false
where (code, version) in (
  ('regional-adventure', 1),
  ('cadence-consistent-20', 1)
);

create or replace function public.evaluate_ride_achievements(
  p_user_id uuid,
  p_ride_id uuid,
  p_event_key text,
  p_metrics jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_definition public.achievement_definitions%rowtype;
  v_started_at timestamptz;
  v_progress numeric;
  v_target numeric;
  v_reward_key text;
  v_unlocked text[] := '{}'::text[];
  v_total_xp integer;
  v_season_xp integer;
begin
  if p_user_id is null or p_ride_id is null or p_event_key is null or length(p_event_key) < 8 then
    return jsonb_build_object('accepted', false, 'reason', 'invalid_request', 'unlocked', '[]'::jsonb);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 889));

  select ride.started_at
  into v_started_at
  from public.rides as ride
  where ride.id = p_ride_id
    and ride.user_id = p_user_id
    and ride.processing_status = 'ready'
    and ride.is_historical = false;

  if not found
    or coalesce(p_metrics->>'rewardEligible', 'false') <> 'true'
    or coalesce(p_metrics->>'duplicate', 'false') = 'true'
    or coalesce(p_metrics->>'historical', 'false') = 'true'
    or coalesce(p_metrics->>'manualFile', 'false') = 'true'
    or coalesce(p_metrics->>'gpsValid', 'false') <> 'true'
    or exists (
      select 1
      from public.ride_imports as ride_import
      where ride_import.canonical_ride_id = p_ride_id
        and ride_import.source_kind = 'gpx_fit'
    )
  then
    return jsonb_build_object('accepted', false, 'reason', 'ineligible', 'unlocked', '[]'::jsonb);
  end if;

  insert into public.achievement_events (user_id, ride_id, event_key, metrics)
  values (p_user_id, p_ride_id, p_event_key, p_metrics)
  on conflict do nothing;
  if not found then
    return jsonb_build_object('accepted', false, 'reason', 'duplicate', 'unlocked', '[]'::jsonb);
  end if;

  for v_definition in
    select definition.*
    from public.achievement_definitions as definition
    where definition.active = true
    order by definition.code
  loop
    v_target := (v_definition.criteria->>'target')::numeric;
    v_progress := case v_definition.code
      when 'ride-first-verified' then 1
      when 'distance-10' then (
        select coalesce(sum(
          case when jsonb_typeof(event.metrics->'distanceMeters') = 'number'
            then (event.metrics->>'distanceMeters')::numeric else 0 end
        ), 0) / 1000
        from public.achievement_events as event
        where event.user_id = p_user_id
      )
      when 'distance-50' then (
        select coalesce(sum(
          case when jsonb_typeof(event.metrics->'distanceMeters') = 'number'
            then (event.metrics->>'distanceMeters')::numeric else 0 end
        ), 0) / 1000
        from public.achievement_events as event
        where event.user_id = p_user_id
      )
      when 'elevation-500' then (
        select coalesce(sum(
          case when jsonb_typeof(event.metrics->'elevationGainMeters') = 'number'
            then (event.metrics->>'elevationGainMeters')::numeric else 0 end
        ), 0)
        from public.achievement_events as event
        where event.user_id = p_user_id
      )
      when 'regular-three-in-seven' then (
        select count(*)::numeric
        from public.achievement_events as event
        join public.rides as ride on ride.id = event.ride_id
        where event.user_id = p_user_id
          and ride.started_at between v_started_at - interval '6 days' and v_started_at
      )
      when 'quest-first' then (
        select count(*)::numeric
        from public.achievement_events as event
        where event.user_id = p_user_id
          and event.metrics->'questCompleted' = 'true'::jsonb
      )
      when 'territory-25' then (
        select coalesce(sum(
          case when jsonb_typeof(event.metrics->'newCellCount') = 'number'
            then (event.metrics->>'newCellCount')::numeric else 0 end
        ), 0)
        from public.achievement_events as event
        where event.user_id = p_user_id
      )
      when 'regional-adventure' then (
        select count(*)::numeric
        from public.achievement_events as event
        where event.user_id = p_user_id
          and event.metrics->'regionalAdventure' = 'true'::jsonb
      )
      when 'cadence-consistent-20' then (
        select coalesce(max(
          case when jsonb_typeof(event.metrics->'cadenceConsistentMinutes') = 'number'
            then (event.metrics->>'cadenceConsistentMinutes')::numeric else 0 end
        ), 0)
        from public.achievement_events as event
        where event.user_id = p_user_id
      )
      when 'tempo-consistent-30' then (
        select coalesce(max(
          case when jsonb_typeof(event.metrics->'tempoConsistentMinutes') = 'number'
            then (event.metrics->>'tempoConsistentMinutes')::numeric else 0 end
        ), 0)
        from public.achievement_events as event
        where event.user_id = p_user_id
      )
      else 0
    end;

    insert into public.achievement_progress (
      user_id,
      achievement_code,
      definition_version,
      progress_value,
      target_value,
      updated_at
    )
    values (
      p_user_id,
      v_definition.code,
      v_definition.version,
      least(v_progress, v_target),
      v_target,
      now()
    )
    on conflict (user_id, achievement_code) do update set
      definition_version = excluded.definition_version,
      progress_value = greatest(public.achievement_progress.progress_value, excluded.progress_value),
      target_value = excluded.target_value,
      updated_at = now();

    v_reward_key := null;
    if v_progress >= v_target then
      insert into public.achievement_unlocks (
        user_id,
        achievement_code,
        definition_version,
        ride_id,
        reward_key
      )
      values (
        p_user_id,
        v_definition.code,
        v_definition.version,
        p_ride_id,
        'achievement:' || p_user_id::text || ':' || v_definition.code || ':v' || v_definition.version
      )
      on conflict (user_id, achievement_code) do nothing
      returning reward_key into v_reward_key;

      if v_reward_key is not null then
        v_unlocked := array_append(v_unlocked, v_definition.code);
        if v_definition.xp_reward > 0 then
          insert into public.xp_ledger (
            user_id,
            ride_id,
            entry_type,
            delta,
            reason
          )
          values (
            p_user_id,
            p_ride_id,
            'achievement',
            v_definition.xp_reward,
            v_reward_key
          )
          on conflict do nothing;
        end if;

        if v_definition.cosmetic_reward_code is not null then
          insert into public.user_cosmetic_rewards (
            user_id,
            reward_code,
            achievement_code,
            reward_key
          )
          values (
            p_user_id,
            v_definition.cosmetic_reward_code,
            v_definition.code,
            v_reward_key || ':cosmetic'
          )
          on conflict (user_id, reward_code) do nothing;
        end if;
      end if;
    end if;
  end loop;

  select
    coalesce(sum(ledger.delta), 0)::integer,
    coalesce(sum(ledger.delta) filter (where ledger.entry_type <> 'migration'), 0)::integer
  into v_total_xp, v_season_xp
  from public.xp_ledger as ledger
  where ledger.user_id = p_user_id;

  update public.player_progress
  set
    adventure_xp = v_total_xp,
    season_xp = greatest(0, v_season_xp),
    level = least(10, floor(v_total_xp / 500.0)::integer + 1),
    updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'accepted', true,
    'reason', 'processed',
    'unlocked', to_jsonb(v_unlocked)
  );
end;
$$;

revoke all on function public.evaluate_ride_achievements(uuid, uuid, text, jsonb)
from public, anon, authenticated;
grant execute on function public.evaluate_ride_achievements(uuid, uuid, text, jsonb)
to service_role;
