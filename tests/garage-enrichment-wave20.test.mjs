import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const source = read('supabase/schema/catalog_enrichment_wave_20_official_specs_fitment_2026_08_17.sql');
const migration = read('supabase/migrations/20260817093000_garage_enrichment_wave20.sql');
const generator = read('scripts/build-supabase-migrations.mjs');
const backendAudit = read('scripts/audit-backend-repro.mjs');
const queue = JSON.parse(read('catalog-harvester/enrichment-queue.json'));

const bikeIds = [
  'trek-domane-al-4-gen-4-2026-us',
  'specialized-epic-8-pro-2025-us',
  'specialized-epic-8-evo-expert-sram-gx-axs-fox-performance-elite-2025-global',
  'specialized-stumpjumper-15-expert-2025-us',
];

test('wave 20 contains exact first-party core specs for four catalog bikes', () => {
  assert.match(source, /official Trek exact 2026 Domane AL 4 Gen 4 specification/);
  assert.match(source, /official Specialized exact 2025 Epic 8 Pro specification/);
  assert.match(source, /official Specialized exact 2025 Epic 8 EVO Expert specification/);
  assert.match(source, /official Specialized exact 2025 Stumpjumper 15 Expert specification/);
  for (const id of bikeIds) assert.match(source, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const key of ['frame_material', 'wheel_size', 'drivetrain_brand', 'drivetrain', 'brake_type', 'brakes']) {
    assert.match(source, new RegExp(`\\"${key}\\"`));
  }
});

test('wave 20 records factory fitment only and never invents an upgrade recommendation', () => {
  assert.match(source, /factory_installed/);
  assert.match(source, /sram-rd-x0-e-b1/);
  assert.match(source, /sram-rd-gx-e-b1/);
  assert.match(source, /shimano-rd-4700-gs/);
  assert.doesNotMatch(source, /manufacturer_approved/);
  assert.doesNotMatch(source, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 20 closes exactly two baseline core gaps and one exact-fitment gap', () => {
  const entries = new Map(queue.entries.map((entry) => [entry.id, entry]));
  const trek = entries.get('trek-domane-al-4-gen-4-2026-us');
  const epicPro = entries.get('specialized-epic-8-pro-2025-us');
  const epicEvo = entries.get('specialized-epic-8-evo-expert-sram-gx-axs-fox-performance-elite-2025-global');
  const stumpjumper = entries.get('specialized-stumpjumper-15-expert-2025-us');

  assert.equal(trek?.existing_core_fields, 3);
  assert.ok(trek?.gaps.includes('wheel_size'));
  assert.ok(trek?.gaps.includes('exact_fitment'));
  assert.equal(epicPro?.existing_core_fields, 3);
  assert.ok(epicPro?.gaps.includes('frame_material'));
  assert.equal(epicEvo?.existing_core_fields, 4);
  assert.ok(!epicEvo?.gaps.includes('exact_fitment'));
  assert.equal(stumpjumper?.existing_core_fields, 4);
  assert.ok(!stumpjumper?.gaps.includes('exact_fitment'));

  assert.equal(queue.current.core_specs + 2, 43);
  assert.equal(queue.current.exact_fitment + 1, 32);
  assert.equal(queue.shortfall.core_specs - 2, 532);
  assert.equal(queue.shortfall.exact_fitment - 1, 399);
});

test('wave 20 is a dedicated unreleased forward migration', () => {
  assert.match(generator, /garageEnrichmentWave20Order/);
  assert.match(generator, /20260817093000_garage_enrichment_wave20\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_20_official_specs_fitment_2026_08_17\.sql/);
  assert.match(backendAudit, /20260817093000_garage_enrichment_wave20\.sql/);
  assert.match(backendAudit, /productionMigrations = expectedMigrations\.slice\(0, -3\)/);
});
