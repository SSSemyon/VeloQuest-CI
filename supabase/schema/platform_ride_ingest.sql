-- Short-lived, one-time server capabilities for fresh HealthKit / Health Connect
-- imports. The client-declared source is never sufficient for rewards.
create table if not exists public.platform_ride_ingest_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('healthkit', 'health_connect')),
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  consumed_at timestamptz,
  check (expires_at > issued_at),
  check (consumed_at is null or consumed_at >= issued_at)
);

create index if not exists platform_ride_ingest_tickets_user_recent_idx
  on public.platform_ride_ingest_tickets (user_id, issued_at desc);
create index if not exists platform_ride_ingest_tickets_active_idx
  on public.platform_ride_ingest_tickets (id, user_id, source_kind, source_fingerprint)
  where consumed_at is null;

alter table public.platform_ride_ingest_tickets enable row level security;
revoke all on public.platform_ride_ingest_tickets from anon, authenticated;
grant select, insert, update, delete on public.platform_ride_ingest_tickets to service_role;

create or replace function public.issue_platform_ride_ingest_ticket(
  p_user_id uuid,
  p_source_kind text,
  p_source_fingerprint text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_hour_count integer;
  v_day_count integer;
  v_ticket_id uuid;
begin
  if p_user_id is null then raise exception 'user_required'; end if;
  if p_source_kind not in ('healthkit', 'health_connect') then raise exception 'invalid_platform_source'; end if;
  if p_source_fingerprint is null or p_source_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_source_fingerprint'; end if;

  select count(*) into v_hour_count
  from public.platform_ride_ingest_tickets
  where user_id = p_user_id and issued_at > now() - interval '1 hour';
  if v_hour_count >= 12 then raise exception 'platform_ticket_rate_limited_hour'; end if;

  select count(*) into v_day_count
  from public.platform_ride_ingest_tickets
  where user_id = p_user_id and issued_at > now() - interval '1 day';
  if v_day_count >= 50 then raise exception 'platform_ticket_rate_limited_day'; end if;

  insert into public.platform_ride_ingest_tickets (user_id, source_kind, source_fingerprint)
  values (p_user_id, p_source_kind, p_source_fingerprint)
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$;

revoke all on function public.issue_platform_ride_ingest_ticket(uuid, text, text) from public, anon, authenticated;
grant execute on function public.issue_platform_ride_ingest_ticket(uuid, text, text) to service_role;

create or replace function public.process_ride_alpha_with_platform_ticket(
  p_user_id uuid,
  p_source_kind text,
  p_external_ride_id text,
  p_source_fingerprint text,
  p_cross_source_fingerprint text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_moving_time_seconds integer,
  p_distance_meters double precision,
  p_elevation_gain_meters double precision,
  p_average_speed_mps double precision,
  p_route_geojson jsonb,
  p_h3_cells text[],
  p_quest_code text,
  p_loop_value numeric,
  p_reward_candidate boolean,
  p_platform_ticket uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_reward_eligible boolean := coalesce(p_reward_candidate, false);
  v_consumed_ticket uuid;
  v_result jsonb;
begin
  if p_source_kind in ('healthkit', 'health_connect') then
    v_reward_eligible := false;

    if p_platform_ticket is not null then
      update public.platform_ride_ingest_tickets
      set consumed_at = now()
      where id = p_platform_ticket
        and user_id = p_user_id
        and source_kind = p_source_kind
        and source_fingerprint = p_source_fingerprint
        and consumed_at is null
        and expires_at > now()
      returning id into v_consumed_ticket;

      v_reward_eligible := coalesce(p_reward_candidate, false) and v_consumed_ticket is not null;
    end if;
  elsif p_platform_ticket is not null then
    raise exception 'platform_ticket_for_non_platform_source';
  end if;

  select public.process_ride_alpha(
    p_user_id => p_user_id,
    p_source_kind => p_source_kind,
    p_external_ride_id => p_external_ride_id,
    p_source_fingerprint => p_source_fingerprint,
    p_cross_source_fingerprint => p_cross_source_fingerprint,
    p_started_at => p_started_at,
    p_ended_at => p_ended_at,
    p_moving_time_seconds => p_moving_time_seconds,
    p_distance_meters => p_distance_meters,
    p_elevation_gain_meters => p_elevation_gain_meters,
    p_average_speed_mps => p_average_speed_mps,
    p_route_geojson => p_route_geojson,
    p_h3_cells => p_h3_cells,
    p_quest_code => p_quest_code,
    p_loop_value => p_loop_value,
    p_reward_eligible => v_reward_eligible
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.process_ride_alpha_with_platform_ticket(
  uuid, text, text, text, text, timestamptz, timestamptz, integer,
  double precision, double precision, double precision, jsonb, text[], text,
  numeric, boolean, uuid
) from public, anon, authenticated;
grant execute on function public.process_ride_alpha_with_platform_ticket(
  uuid, text, text, text, text, timestamptz, timestamptz, integer,
  double precision, double precision, double precision, jsonb, text[], text,
  numeric, boolean, uuid
) to service_role;
