begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(29);

insert into auth.users (id, email)
values
  ('44444444-4444-4444-8444-444444444444', 'achievement-a@veloquest.test'),
  ('55555555-5555-4555-8555-555555555555', 'achievement-b@veloquest.test'),
  ('77777777-7777-4777-8777-777777777777', 'achievement-delete@veloquest.test');

select results_eq(
  $q$select count(*)::bigint from public.achievement_definitions where active$q$,
  $q$values (8::bigint)$q$,
  'only achievements backed by current server signals are active'
);

insert into public.rides (
  id, user_id, cross_source_fingerprint, started_at, ended_at,
  moving_time_seconds, distance_meters, elevation_gain_meters,
  average_speed_mps, is_historical, processing_status
)
values
  ('aaaaaaaa-4444-4444-8444-444444444441', '44444444-4444-4444-8444-444444444444', 'achievement-real-1', now() - interval '2 hours', now() - interval '1 hour', 3600, 5000, 100, 5, false, 'ready'),
  ('aaaaaaaa-4444-4444-8444-444444444442', '44444444-4444-4444-8444-444444444444', 'achievement-historical', now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 3600, 5000, 100, 5, true, 'ready'),
  ('aaaaaaaa-4444-4444-8444-444444444443', '44444444-4444-4444-8444-444444444444', 'achievement-manual', now() - interval '1 day', now() - interval '1 day' + interval '1 hour', 3600, 5000, 100, 5, false, 'ready'),
  ('aaaaaaaa-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', 'achievement-real-2', now() - interval '30 minutes', now(), 1800, 5000, 100, 5, false, 'ready'),
  ('aaaaaaaa-4444-4444-8444-444444444445', '44444444-4444-4444-8444-444444444444', 'achievement-gps-invalid', now() - interval '4 hours', now() - interval '3 hours', 3600, 5000, 100, 5, false, 'ready');

insert into public.ride_imports (
  user_id, canonical_ride_id, source_kind, source_fingerprint,
  cross_source_fingerprint, started_at, ended_at, moving_time_seconds,
  distance_meters, elevation_gain_meters, average_speed_mps, processing_status
)
values
  ('44444444-4444-4444-8444-444444444444', 'aaaaaaaa-4444-4444-8444-444444444441', 'healthkit', 'health-real-1', 'achievement-real-1', now() - interval '2 hours', now() - interval '1 hour', 3600, 5000, 100, 5, 'processed'),
  ('44444444-4444-4444-8444-444444444444', 'aaaaaaaa-4444-4444-8444-444444444443', 'gpx_fit', 'manual-file-1', 'achievement-manual', now() - interval '1 day', now() - interval '1 day' + interval '1 hour', 3600, 5000, 100, 5, 'processed'),
  ('44444444-4444-4444-8444-444444444444', 'aaaaaaaa-4444-4444-8444-444444444444', 'healthkit', 'health-real-2', 'achievement-real-2', now() - interval '30 minutes', now(), 1800, 5000, 100, 5, 'processed'),
  ('44444444-4444-4444-8444-444444444444', 'aaaaaaaa-4444-4444-8444-444444444445', 'healthkit', 'health-gps-invalid', 'achievement-gps-invalid', now() - interval '4 hours', now() - interval '3 hours', 3600, 5000, 100, 5, 'processed');

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select throws_ok(
  $q$insert into public.achievement_progress (user_id, achievement_code, definition_version, progress_value, target_value) values ('44444444-4444-4444-8444-444444444444', 'ride-first-verified', 1, 999, 1)$q$,
  '42501',
  'permission denied for table achievement_progress',
  'a client cannot forge achievement progress'
);
select throws_ok(
  $q$insert into public.xp_ledger (user_id, entry_type, delta, reason) values ('44444444-4444-4444-8444-444444444444', 'achievement', 999, 'forged')$q$,
  '42501',
  'permission denied for table xp_ledger',
  'a client cannot forge XP'
);
select throws_ok(
  $q$insert into public.achievement_events (user_id, ride_id, event_key, metrics) values ('44444444-4444-4444-8444-444444444444', 'aaaaaaaa-4444-4444-8444-444444444441', 'forged:event', '{}'::jsonb)$q$,
  '42501',
  'permission denied for table achievement_events',
  'a client cannot forge achievement events'
);
select throws_ok(
  $q$insert into public.achievement_unlocks (user_id, achievement_code, definition_version, reward_key) values ('44444444-4444-4444-8444-444444444444', 'ride-first-verified', 1, 'forged:unlock')$q$,
  '42501',
  'permission denied for table achievement_unlocks',
  'a client cannot forge unlocks'
);
select throws_ok(
  $q$insert into public.user_cosmetic_rewards (user_id, reward_code, achievement_code, reward_key) values ('44444444-4444-4444-8444-444444444444', 'badge-first-ride', 'ride-first-verified', 'forged:cosmetic')$q$,
  '42501',
  'permission denied for table user_cosmetic_rewards',
  'a client cannot forge cosmetic grants'
);
select throws_ok(
  $q$select public.evaluate_ride_achievements('44444444-4444-4444-8444-444444444444', 'aaaaaaaa-4444-4444-8444-444444444441', 'forged:evaluator', '{}'::jsonb)$q$,
  '42501',
  'permission denied for function evaluate_ride_achievements',
  'a client cannot invoke the server evaluator'
);
reset role;

select is(
  public.evaluate_ride_achievements(
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-4444-4444-8444-444444444441',
    'ride:real:one',
    '{"rewardEligible":true,"duplicate":false,"historical":false,"manualFile":false,"gpsValid":true,"distanceMeters":5000,"elevationGainMeters":100}'::jsonb
  )->>'reason',
  'processed',
  'an eligible canonical ride is processed'
);

select results_eq(
  $q$select count(*)::bigint from public.achievement_events where user_id = '44444444-4444-4444-8444-444444444444'$q$,
  $q$values (1::bigint)$q$,
  'one server event is recorded'
);

select results_eq(
  $q$select achievement_code from public.achievement_unlocks where user_id = '44444444-4444-4444-8444-444444444444' order by achievement_code$q$,
  $q$values ('ride-first-verified'::text)$q$,
  'the first verified ride unlocks exactly once'
);

select results_eq(
  $q$select delta from public.xp_ledger where user_id = '44444444-4444-4444-8444-444444444444' and entry_type = 'achievement'$q$,
  $q$values (10::integer)$q$,
  'the one-time achievement XP uses the server ledger'
);

select is(
  public.evaluate_ride_achievements(
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-4444-4444-8444-444444444441',
    'ride:real:replay',
    '{"rewardEligible":true,"duplicate":false,"historical":false,"manualFile":false,"gpsValid":true,"distanceMeters":5000,"elevationGainMeters":100}'::jsonb
  )->>'reason',
  'duplicate',
  'the same canonical ride cannot be rewarded under another event key'
);

select results_eq(
  $q$select count(*)::bigint from public.xp_ledger where user_id = '44444444-4444-4444-8444-444444444444' and reason like '%:ride-first-verified:%'$q$,
  $q$values (1::bigint)$q$,
  'duplicate processing cannot mint a second reward'
);

select is(
  public.evaluate_ride_achievements(
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-4444-4444-8444-444444444442',
    'ride:historical:one',
    '{"rewardEligible":true,"duplicate":false,"historical":false,"manualFile":false,"gpsValid":true,"distanceMeters":5000}'::jsonb
  )->>'reason',
  'ineligible',
  'a historical ride remains ineligible even with forged flags'
);

select results_eq(
  $q$select count(*)::bigint from public.achievement_events where event_key = 'ride:historical:one'$q$,
  $q$values (0::bigint)$q$,
  'historical rides do not create achievement events'
);

select is(
  public.evaluate_ride_achievements(
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-4444-4444-8444-444444444443',
    'ride:manual:one',
    '{"rewardEligible":true,"duplicate":false,"historical":false,"manualFile":false,"gpsValid":true,"distanceMeters":5000}'::jsonb
  )->>'reason',
  'ineligible',
  'manual GPX or FIT remains ineligible based on server imports'
);

select results_eq(
  $q$select count(*)::bigint from public.achievement_events where event_key = 'ride:manual:one'$q$,
  $q$values (0::bigint)$q$,
  'manual files do not create achievement events'
);
select is(
  public.evaluate_ride_achievements(
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-4444-4444-8444-444444444445',
    'ride:gps:invalid',
    '{"rewardEligible":true,"duplicate":false,"historical":false,"manualFile":false,"gpsValid":false,"distanceMeters":5000}'::jsonb
  )->>'reason',
  'ineligible',
  'invalid GPS cannot earn achievements'
);
select results_eq(
  $q$select count(*)::bigint from public.achievement_events where event_key = 'ride:gps:invalid'$q$,
  $q$values (0::bigint)$q$,
  'invalid GPS does not create an achievement event'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select results_eq(
  $q$select count(*)::bigint from public.achievement_progress$q$,
  $q$values (8::bigint)$q$,
  'a user can read their own server progress'
);
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
select results_eq(
  $q$select count(*)::bigint from public.achievement_progress$q$,
  $q$values (0::bigint)$q$,
  'another user cannot read that progress'
);
select results_eq(
  $q$select count(*)::bigint from public.achievement_unlocks$q$,
  $q$values (0::bigint)$q$,
  'another user cannot read unlocks'
);
select results_eq(
  $q$select count(*)::bigint from public.user_cosmetic_rewards$q$,
  $q$values (0::bigint)$q$,
  'another user cannot read cosmetic grants'
);
reset role;

insert into public.achievement_unlocks (
  user_id, achievement_code, definition_version, reward_key
) values (
  '77777777-7777-4777-8777-777777777777', 'ride-first-verified', 1, 'delete-cascade:unlock'
);
insert into public.user_cosmetic_rewards (
  user_id, reward_code, achievement_code, reward_key
) values (
  '77777777-7777-4777-8777-777777777777', 'badge-first-ride', 'ride-first-verified', 'delete-cascade:cosmetic'
);
select lives_ok(
  $$delete from auth.users where id = '77777777-7777-4777-8777-777777777777'$$,
  'account deletion cascades through immutable achievement grants'
);
select results_eq(
  $$select count(*)::bigint from public.achievement_unlocks where user_id = '77777777-7777-4777-8777-777777777777'$$,
  $$values (0::bigint)$$,
  'account deletion removes achievement grants'
);

select throws_ok(
  $$update public.achievement_unlocks set unlocked_at = now() where achievement_code = 'ride-first-verified'$$,
  '55000',
  'achievement_grants_are_immutable',
  'an unlock cannot be mutated after issuance'
);

update public.achievement_definitions
set active = false, retired_at = now()
where code = 'ride-first-verified' and version = 1;

insert into public.achievement_definitions (
  code, version, display_name, description, category, criteria, xp_reward, cosmetic_reward_code, active
)
values (
  'ride-first-verified', 2, 'Первая подтверждённая поездка v2', 'Новая версия условия.', 'ride', '{"target":1}', 25, 'badge-first-ride', true
);

select is(
  public.evaluate_ride_achievements(
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-4444-4444-8444-444444444444',
    'ride:real:two',
    '{"rewardEligible":true,"duplicate":false,"historical":false,"manualFile":false,"gpsValid":true,"distanceMeters":5000,"elevationGainMeters":100}'::jsonb
  )->>'reason',
  'processed',
  'a later eligible ride evaluates the new active definition'
);

select results_eq(
  $q$select definition_version from public.achievement_unlocks where user_id = '44444444-4444-4444-8444-444444444444' and achievement_code = 'ride-first-verified'$q$,
  $q$values (1::integer)$q$,
  'an existing unlock preserves its original definition version'
);

select results_eq(
  $q$select count(*)::bigint from public.xp_ledger where user_id = '44444444-4444-4444-8444-444444444444' and reason like '%:ride-first-verified:%'$q$,
  $q$values (1::bigint)$q$,
  'a new definition version does not duplicate an existing unlock reward'
);

select * from finish();
rollback;
