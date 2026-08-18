begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

select has_table('public', 'platform_ride_ingest_tickets', 'platform ride ticket table exists');
select ok(
  to_regprocedure('public.issue_platform_ride_ingest_ticket(uuid,text,text)') is not null,
  'platform ticket issue function exists'
);
select ok(
  to_regprocedure('public.process_ride_alpha_with_platform_ticket(uuid,text,text,text,text,timestamptz,timestamptz,integer,double precision,double precision,double precision,jsonb,text[],text,numeric,boolean,uuid)') is not null,
  'atomic platform ride wrapper exists'
);
select ok(
  not has_table_privilege('authenticated', 'public.platform_ride_ingest_tickets', 'SELECT'),
  'authenticated clients cannot read platform tickets'
);
select ok(
  not has_function_privilege('authenticated', 'public.issue_platform_ride_ingest_ticket(uuid,text,text)', 'EXECUTE'),
  'authenticated clients cannot mint tickets directly'
);
select ok(
  has_function_privilege('service_role', 'public.issue_platform_ride_ingest_ticket(uuid,text,text)', 'EXECUTE'),
  'service role can issue platform tickets'
);

insert into auth.users (id, email)
values ('77777777-7777-4777-8777-777777777777', 'platform-ride@veloquest.test');

insert into public.quest_templates (code, name, description, metric, default_target, reward_xp, enabled, sort_order)
values ('platform-ticket-test', 'Platform test', 'Platform ticket transactional test', 'moving_minutes', 5, 25, true, 999)
on conflict (code) do update set enabled = true;

create temp table issued_platform_ticket as
select public.issue_platform_ride_ingest_ticket(
  '77777777-7777-4777-8777-777777777777',
  'healthkit',
  repeat('a', 64)
) as id;

select ok((select id is not null from issued_platform_ticket), 'service issues an opaque platform ticket');
select ok(
  (select expires_at > now() + interval '4 minutes' and expires_at <= now() + interval '6 minutes'
   from public.platform_ride_ingest_tickets
   where id = (select id from issued_platform_ticket)),
  'platform ticket is short lived'
);

create temp table first_platform_result as
select public.process_ride_alpha_with_platform_ticket(
  p_user_id => '77777777-7777-4777-8777-777777777777',
  p_source_kind => 'healthkit',
  p_external_ride_id => 'healthkit-test-1',
  p_source_fingerprint => repeat('a', 64),
  p_cross_source_fingerprint => repeat('b', 64),
  p_started_at => now() - interval '20 minutes',
  p_ended_at => now() - interval '10 minutes',
  p_moving_time_seconds => 600,
  p_distance_meters => 5000,
  p_elevation_gain_meters => 50,
  p_average_speed_mps => 8.33,
  p_route_geojson => '{"type":"LineString","coordinates":[[8.0,47.0],[8.01,47.01]]}'::jsonb,
  p_h3_cells => '{}'::text[],
  p_quest_code => 'platform-ticket-test',
  p_loop_value => 0,
  p_reward_candidate => true,
  p_platform_ticket => (select id from issued_platform_ticket)
) as result;

select is(
  (select result #>> '{quest,rewardEligible}' from first_platform_result),
  'true',
  'valid platform ticket allows reward candidate inside the ride transaction'
);
select ok(
  (select consumed_at is not null from public.platform_ride_ingest_tickets where id = (select id from issued_platform_ticket)),
  'successful ride transaction consumes the ticket exactly once'
);

create temp table second_platform_result as
select public.process_ride_alpha_with_platform_ticket(
  p_user_id => '77777777-7777-4777-8777-777777777777',
  p_source_kind => 'healthkit',
  p_external_ride_id => 'healthkit-test-1',
  p_source_fingerprint => repeat('a', 64),
  p_cross_source_fingerprint => repeat('b', 64),
  p_started_at => now() - interval '20 minutes',
  p_ended_at => now() - interval '10 minutes',
  p_moving_time_seconds => 600,
  p_distance_meters => 5000,
  p_elevation_gain_meters => 50,
  p_average_speed_mps => 8.33,
  p_route_geojson => '{"type":"LineString","coordinates":[[8.0,47.0],[8.01,47.01]]}'::jsonb,
  p_h3_cells => '{}'::text[],
  p_quest_code => 'platform-ticket-test',
  p_loop_value => 0,
  p_reward_candidate => true,
  p_platform_ticket => (select id from issued_platform_ticket)
) as result;

select ok(
  coalesce((select (result #>> '{quest,rewardEligible}')::boolean from second_platform_result), false) = false,
  'reused ticket cannot mint a second reward'
);

select * from finish();
rollback;
