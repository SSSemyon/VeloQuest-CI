import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyNoUpgradeOutcomesToQueue, parseNoUpgradeOutcomeRows, validateNoUpgradeOutcomeRows } from '../scripts/garage-outcomes-core.mjs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const schema = read('supabase/schema/garage_recommendation_outcomes.sql');
const migrationBuilder = read('scripts/build-supabase-migrations.mjs');
const migration = read('supabase/migrations/20260817092000_garage_no_upgrade_outcomes.sql');
const client = read('src/backend/garageCatalog.ts');
const queueGate = read('catalog-harvester/check-enrichment-queue.mjs');
const outcomeAudit = read('scripts/audit-garage-outcomes.mjs');
const backendAudit = read('scripts/audit-backend-repro.mjs');

test('no-upgrade outcome has an evidence-only read model and forward migration', () => {
  assert.match(schema, /create table if not exists public\.garage_recommendation_outcomes/i);
  assert.match(schema, /outcome_type text not null check \(outcome_type in \('no_upgrade'\)\)/i);
  assert.match(schema, /evidence_url text not null/i);
  assert.match(schema, /evidence_checked_at date not null/i);
  assert.match(schema, /notes text not null/i);
  assert.match(schema, /grant select on table public\.garage_recommendation_outcomes to authenticated/i);
  assert.doesNotMatch(schema, /insert\s+into\s+public\.garage_recommendation_outcomes/i, 'capability migration must not invent evidence rows');
  assert.match(migrationBuilder, /garageRecommendationOutcomesOrder/);
  assert.match(migrationBuilder, /20260817092000_garage_no_upgrade_outcomes\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/garage_recommendation_outcomes\.sql/);
  assert.match(backendAudit, /expectedMigrations[\s\S]+20260817092000_garage_no_upgrade_outcomes\.sql/);
  assert.match(backendAudit, /productionMigrations = expectedMigrations\.slice\(0, -2\)/);
});

test('Garage client presents verified no-upgrade separately from unknown compatibility', () => {
  assert.match(client, /outcomeType\?: 'no_upgrade'/);
  assert.match(client, /\.from\('garage_recommendation_outcomes'\)/);
  assert.match(client, /\.eq\('outcome_type', 'no_upgrade'\)/);
  assert.match(client, /status: 'locked' as const/);
  assert.match(client, /outcomeType: 'no_upgrade' as const/);
  assert.match(client, /Апгрейд не рекомендуется/);
  assert.match(client, /outcomesResult\.error\.code === '42P01'/);
  assert.match(client, /outcomesResult\.error\.code === 'PGRST205'/);
  assert.match(client, /outcomesResult\.error && !outcomeRelationMissing/);
});

test('outcome parser rejects non-evidence rows and queue overlay counts only valid exact-bike outcomes', () => {
  const sql = `
    insert into public.garage_recommendation_outcomes
      (bike_id, scope_key, outcome_type, title, notes, evidence_url, evidence_checked_at, enabled)
    values
      ('bike-a', 'drivetrain', 'no_upgrade', 'Апгрейд не рекомендуется', 'Производитель указывает штатную конфигурацию как единственную поддерживаемую для этого узла.', 'https://manufacturer.example/bike-a', '2026-08-17', true),
      ('bike-b', 'brakes', 'no_upgrade', 'Апгрейд не рекомендуется', 'Слишком короткое', 'http://invalid.example/bike-b', '17-08-2026', true)
    on conflict (bike_id, scope_key, outcome_type) do update set enabled = excluded.enabled;
  `;
  const rows = parseNoUpgradeOutcomeRows(sql, 'fixture.sql');
  const validation = validateNoUpgradeOutcomeRows(rows);
  assert.equal(rows.length, 2);
  assert.equal(validation.valid.length, 1);
  assert.equal(validation.invalid.length, 1);

  const queue = {
    schema_version: 2,
    current: { recommendation_outcome: 8 },
    required: { recommendation_outcome: 431 },
    shortfall: { recommendation_outcome: 423 },
    work_cohorts: { recommendation_outcome: ['bike-a', 'bike-b', 'bike-c'] },
    entries: [
      { id: 'bike-a', gaps: ['recommendation_outcome', 'photo'] },
      { id: 'bike-b', gaps: ['recommendation_outcome'] },
      { id: 'bike-c', gaps: ['recommendation_outcome'] },
    ],
  };
  const applied = applyNoUpgradeOutcomesToQueue(queue, validation.valid);
  assert.equal(applied.current.recommendation_outcome, 9);
  assert.equal(applied.shortfall.recommendation_outcome, 422);
  assert.deepEqual(applied.entries[0].gaps, ['photo']);
  assert.deepEqual(applied.entries[1].gaps, ['recommendation_outcome']);
  assert.deepEqual(applied.work_cohorts.recommendation_outcome, ['bike-b', 'bike-c']);
});

test('outcome parser keeps semicolons inside quoted notes', () => {
  const sql = `
    insert into public.garage_recommendation_outcomes
      (bike_id, scope_key, outcome_type, title, notes, evidence_url, evidence_checked_at, enabled)
    values
      ('bike-semicolon', 'cassette_range', 'no_upgrade', 'Диапазон уже на пределе', 'Производитель подтверждает штатную конфигурацию; больший диапазон официально не заявлен.', 'https://manufacturer.example/bike-semicolon', '2026-08-17', true)
    on conflict (bike_id, scope_key, outcome_type) do update set enabled = excluded.enabled;
  `;
  const rows = parseNoUpgradeOutcomeRows(sql, 'semicolon-fixture.sql');
  const validation = validateNoUpgradeOutcomeRows(rows);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bike_id, 'bike-semicolon');
  assert.match(rows[0].notes, /;/);
  assert.equal(validation.invalid.length, 0);
});

test('release catalog gate and standalone audit validate no-upgrade evidence', () => {
  assert.match(queueGate, /applyNoUpgradeOutcomesToQueue/);
  assert.match(queueGate, /outcomeValidation\.invalid/);
  assert.match(outcomeAudit, /bikesWithNoUpgradeOutcome/);
  assert.match(outcomeAudit, /invalidNoUpgradeOutcomes/);
});
