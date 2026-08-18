import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { loadAchievementSnapshotGuarded, mapAchievementSnapshot } from '../src/backend/achievements.ts';

const schemaPath = new URL('../supabase/schema/achievements.sql', import.meta.url);

test('achievement grants have immutable and idempotent keys', () => {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  assert.match(sql, /unique\s*\(user_id, achievement_code\)/i);
  assert.match(sql, /reward_key\s+text\s+not null\s+unique/i);
  assert.match(sql, /on conflict\s*\(user_id, achievement_code\)\s+do nothing/i);
  assert.match(sql, /insert into public\.xp_ledger/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
});

test('clients cannot write achievement progression or grants', () => {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  for (const table of ['achievement_progress', 'achievement_events', 'achievement_unlocks', 'user_cosmetic_rewards']) {
    assert.doesNotMatch(
      sql,
      new RegExp('create policy[^;]+on public\\.' + table + '[^;]+for (insert|update|delete)', 'i'),
    );
  }
  assert.match(sql, /revoke all on function public\.evaluate_ride_achievements/i);
  assert.match(sql, /grant execute on function public\.evaluate_ride_achievements[^;]+to service_role/i);
});

test('achievement criteria never reward maximum speed', () => {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  assert.doesNotMatch(sql, /max(?:imum)?[_ ]speed|top[_ ]speed/i);
  for (const code of [
    'ride-first-verified',
    'distance-10',
    'distance-50',
    'elevation-500',
    'regular-three-in-seven',
    'quest-first',
    'territory-25',
    'regional-adventure',
    'cadence-consistent-20',
    'tempo-consistent-30',
  ]) {
    assert.equal(sql.includes(code), true, `missing definition ${code}`);
  }
});

test('historical, manual, duplicate and invalid GPS events are rejected server-side', () => {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  assert.match(sql, /is_historical\s*=\s*false/i);
  assert.match(sql, /source_kind\s*=\s*'gpx_fit'/i);
  assert.match(sql, /p_metrics\s*->>\s*'duplicate'/i);
  assert.match(sql, /p_metrics\s*->>\s*'gpsValid'/i);
  assert.match(sql, /unique\s*\(user_id, ride_id\)/i);
});

test('achievement snapshot contains only the requested user and cosmetic game rewards', () => {
  const snapshot = mapAchievementSnapshot('user-a', {
    definitions: [{
      code: 'ride-first-verified',
      version: 1,
      display_name: 'Первая поездка',
      description: 'Подтверждённая поездка',
      xp_reward: 10,
      cosmetic_reward_code: 'bike-decal',
    }],
    progress: [
      { user_id: 'user-a', achievement_code: 'ride-first-verified', definition_version: 1, progress_value: 1, target_value: 1 },
      { user_id: 'user-b', achievement_code: 'ride-first-verified', definition_version: 1, progress_value: 999, target_value: 1 },
    ],
    unlocks: [
      { user_id: 'user-a', achievement_code: 'ride-first-verified', definition_version: 1, unlocked_at: '2026-08-14T20:00:00Z' },
      { user_id: 'user-b', achievement_code: 'ride-first-verified', definition_version: 1, unlocked_at: '2026-08-14T20:00:00Z' },
    ],
    grants: [{ user_id: 'user-a', reward_code: 'bike-decal', achievement_code: 'ride-first-verified' }],
    cosmetics: [{ code: 'bike-decal', display_name: 'Декаль', reward_kind: 'bike_cosmetic', payload: {} }],
  });

  assert.equal(snapshot.items.length, 1);
  assert.equal(snapshot.items[0].progressValue, 1);
  assert.equal(snapshot.items[0].unlocked, true);
  assert.deepEqual(snapshot.cosmetics, [{
    code: 'bike-decal',
    displayName: 'Декаль',
    kind: 'VeloQuest Bike',
  }]);
  assert.equal('realComponent' in snapshot.cosmetics[0], false);
});

test('stale achievement loading discards rows after an account switch', async () => {
  let activeUser = 'user-a';
  let resolveRows;
  const rows = new Promise((resolve) => {
    resolveRows = resolve;
  });
  const pending = loadAchievementSnapshotGuarded('user-a', {
    currentUserId: async () => activeUser,
    loadRows: async () => rows,
  });

  activeUser = 'user-b';
  resolveRows({
    definitions: [],
    progress: [{ user_id: 'user-a', achievement_code: 'secret', definition_version: 1, progress_value: 1, target_value: 1 }],
    unlocks: [],
    grants: [],
    cosmetics: [],
  });

  assert.deepEqual(await pending, { kind: 'discarded' });
});
