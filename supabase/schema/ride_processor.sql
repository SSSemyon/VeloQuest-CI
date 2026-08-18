create or replace function public.process_ride_alpha(
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
  p_reward_eligible boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_existing_import public.ride_imports%rowtype;
  v_ride_id uuid;
  v_inserted_ride_id uuid;
  v_new_cells text[] := '{}'::text[];
  v_template public.quest_templates%rowtype;
  v_quest public.quest_runs%rowtype;
  v_metric_value numeric := 0;
  v_next_progress numeric := 0;
  v_quest_completed boolean := false;
  v_xp_awarded integer := 0;
  v_total_xp integer := 0;
  v_season_xp integer := 0;
  v_specialization text := null;
begin
  if p_user_id is null then
    raise exception 'user_required';
  end if;

  select * into v_template
  from public.quest_templates
  where code = p_quest_code and enabled = true;
  if not found then
    raise exception 'invalid_quest';
  end if;

  select * into v_existing_import
  from public.ride_imports
  where user_id = p_user_id
    and source_kind = p_source_kind
    and source_fingerprint = p_source_fingerprint;

  if found then
    select coalesce(adventure_xp, 0) into v_total_xp
    from public.player_progress where user_id = p_user_id;
    return jsonb_build_object(
      'duplicate', true,
      'rideId', v_existing_import.canonical_ride_id,
      'newCells', '[]'::jsonb,
      'xpAwarded', 0,
      'totalXp', coalesce(v_total_xp, 0),
      'quest', jsonb_build_object('code', p_quest_code, 'completed', false)
    );
  end if;

  insert into public.rides (
    user_id, bike_id, cross_source_fingerprint, started_at, ended_at,
    moving_time_seconds, distance_meters, elevation_gain_meters,
    average_speed_mps, route_geojson, is_historical, processing_status
  ) values (
    p_user_id,
    (select id from public.bikes where user_id = p_user_id and is_active = true order by updated_at desc limit 1),
    p_cross_source_fingerprint, p_started_at, p_ended_at,
    p_moving_time_seconds, p_distance_meters, p_elevation_gain_meters,
    p_average_speed_mps, p_route_geojson, not p_reward_eligible, 'ready'
  )
  on conflict (user_id, cross_source_fingerprint) do nothing
  returning id into v_inserted_ride_id;

  if v_inserted_ride_id is null then
    select id into v_ride_id from public.rides
    where user_id = p_user_id and cross_source_fingerprint = p_cross_source_fingerprint;

    insert into public.ride_imports (
      user_id, canonical_ride_id, source_kind, external_ride_id,
      source_fingerprint, cross_source_fingerprint, started_at, ended_at,
      moving_time_seconds, distance_meters, elevation_gain_meters,
      average_speed_mps, route_geojson, processing_status, source_metadata
    ) values (
      p_user_id, v_ride_id, p_source_kind, p_external_ride_id,
      p_source_fingerprint, p_cross_source_fingerprint, p_started_at, p_ended_at,
      p_moving_time_seconds, p_distance_meters, p_elevation_gain_meters,
      p_average_speed_mps, p_route_geojson, 'duplicate',
      jsonb_build_object('processor', '0.8.0', 'reason', 'cross_source_duplicate')
    )
    on conflict (user_id, source_kind, source_fingerprint) do nothing;

    insert into public.ride_inbox (
      user_id, source_kind, source_fingerprint, candidate_ride_id, reason, details
    ) values (
      p_user_id, p_source_kind, p_source_fingerprint, v_ride_id,
      'cross_source_duplicate',
      jsonb_build_object('processor', '0.8.0', 'match', 'exact_cross_source_fingerprint')
    )
    on conflict (user_id, source_kind, source_fingerprint) do nothing;

    select coalesce(adventure_xp, 0) into v_total_xp
    from public.player_progress where user_id = p_user_id;
    return jsonb_build_object(
      'duplicate', true,
      'rideId', v_ride_id,
      'newCells', '[]'::jsonb,
      'xpAwarded', 0,
      'totalXp', coalesce(v_total_xp, 0),
      'quest', jsonb_build_object('code', p_quest_code, 'completed', false)
    );
  end if;

  v_ride_id := v_inserted_ride_id;

  insert into public.ride_imports (
    user_id, canonical_ride_id, source_kind, external_ride_id,
    source_fingerprint, cross_source_fingerprint, started_at, ended_at,
    moving_time_seconds, distance_meters, elevation_gain_meters,
    average_speed_mps, route_geojson, processing_status, source_metadata
  ) values (
    p_user_id, v_ride_id, p_source_kind, p_external_ride_id,
    p_source_fingerprint, p_cross_source_fingerprint, p_started_at, p_ended_at,
    p_moving_time_seconds, p_distance_meters, p_elevation_gain_meters,
    p_average_speed_mps, p_route_geojson, 'processed',
    jsonb_build_object('processor', '0.8.0')
  );

  with inserted as (
    insert into public.explored_cells (
      user_id, h3_index, h3_resolution, first_ride_id, origin
    )
    select p_user_id, lower(cell), 8, v_ride_id,
           case when p_reward_eligible then 'earned' else 'historical' end
    from unnest(coalesce(p_h3_cells, '{}'::text[])) as cell
    on conflict (user_id, h3_index) do nothing
    returning h3_index
  )
  select coalesce(array_agg(h3_index), '{}'::text[]) into v_new_cells from inserted;

  if p_reward_eligible then
    select * into v_quest
    from public.quest_runs
    where user_id = p_user_id and status = 'active'
    for update;

    if found and v_quest.template_code <> p_quest_code and v_quest.progress_value > 0 then
      raise exception 'active_quest_conflict';
    end if;

    if found and v_quest.template_code <> p_quest_code then
      update public.quest_runs set status = 'abandoned'
      where id = v_quest.id;
      v_quest.id := null;
    end if;

    if v_quest.id is null then
      insert into public.quest_runs (
        user_id, template_code, target_value, progress_value, reward_xp, status
      ) values (
        p_user_id, v_template.code, v_template.default_target, 0, v_template.reward_xp, 'active'
      ) returning * into v_quest;
    end if;

    v_metric_value := case v_template.metric
      when 'new_cells' then cardinality(v_new_cells)::numeric
      when 'moving_minutes' then p_moving_time_seconds::numeric / 60
      when 'elevation_meters' then coalesce(p_elevation_gain_meters, 0)::numeric
      when 'loop' then greatest(0, least(1, coalesce(p_loop_value, 0)))
      else 0
    end;

    if v_template.metric = 'loop' then
      v_next_progress := greatest(v_quest.progress_value, v_metric_value);
    else
      v_next_progress := v_quest.progress_value + v_metric_value;
    end if;
    v_quest_completed := v_next_progress >= v_quest.target_value;

    update public.quest_runs set
      progress_value = v_next_progress,
      status = case when v_quest_completed then 'completed' else 'active' end,
      completed_at = case when v_quest_completed then now() else null end,
      completed_by_ride_id = case when v_quest_completed then v_ride_id else null end
    where id = v_quest.id;

    if v_quest_completed then
      insert into public.xp_ledger (
        user_id, ride_id, quest_run_id, entry_type, delta, reason
      ) values (
        p_user_id, v_ride_id, v_quest.id, 'quest', v_quest.reward_xp,
        'quest:' || p_quest_code
      )
      on conflict do nothing;
      if found then v_xp_awarded := v_quest.reward_xp; end if;
    end if;
  end if;

  select
    coalesce(sum(delta), 0)::integer,
    coalesce(sum(delta) filter (where entry_type <> 'migration'), 0)::integer
  into v_total_xp, v_season_xp
  from public.xp_ledger where user_id = p_user_id;

  insert into public.player_progress (user_id, adventure_xp, level, season_xp, specialization, specialization_changed_at, updated_at)
  values (
    p_user_id,
    v_total_xp,
    least(10, floor(v_total_xp / 500.0)::integer + 1),
    greatest(0, v_season_xp),
    v_specialization,
    case when v_specialization is null then null else now() end,
    now()
  )
  on conflict (user_id) do update set
    adventure_xp = excluded.adventure_xp,
    level = excluded.level,
    season_xp = excluded.season_xp,
    specialization = player_progress.specialization,
    specialization_changed_at = player_progress.specialization_changed_at,
    updated_at = now();

  return jsonb_build_object(
    'duplicate', false,
    'rideId', v_ride_id,
    'newCells', to_jsonb(v_new_cells),
    'xpAwarded', v_xp_awarded,
    'totalXp', v_total_xp,
    'quest', jsonb_build_object(
      'code', p_quest_code,
      'completed', v_quest_completed,
      'progressValue', case when p_reward_eligible then v_next_progress else 0 end,
      'targetValue', v_template.default_target,
      'rewardXp', v_template.reward_xp,
      'rewardEligible', p_reward_eligible
    )
  );
end;
$$;

revoke all on function public.process_ride_alpha(
  uuid, text, text, text, text, timestamptz, timestamptz, integer,
  double precision, double precision, double precision, jsonb, text[], text,
  numeric, boolean
) from public, anon, authenticated;

grant execute on function public.process_ride_alpha(
  uuid, text, text, text, text, timestamptz, timestamptz, integer,
  double precision, double precision, double precision, jsonb, text[], text,
  numeric, boolean
) to service_role;
