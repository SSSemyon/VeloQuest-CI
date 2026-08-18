import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const source = read('supabase/schema/catalog_enrichment_wave_22_rocky_mountain_archive_fitment_2026_08_17.sql');
const migration = read('supabase/migrations/20260817095000_garage_enrichment_wave22.sql');
const generator = read('scripts/build-supabase-migrations.mjs');
const backendAudit = read('scripts/audit-backend-repro.mjs');
const queue = JSON.parse(read('catalog-harvester/enrichment-queue.json'));

const ids = [
  'rocky-mountain-altitude-alloy-50-2024-global',
  'rocky-mountain-blizzard-powerplay-alloy-30-2024-global',
  'rocky-mountain-blizzard-powerplay-alloy-50-2024-global',
  'rocky-mountain-fusion-powerplay-30-2024-global',
];

test('wave 22 is deliberately fitment-only official archive evidence', () => {
  for (const id of ids) assert.match(source, new RegExp(id));
  for (const label of ['Shimano SLX Trail 4 Piston', 'SRAM Level 2 Piston', 'SRAM G2 R 4 Piston', 'Shimano MT4100 2 Piston']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /factory_installed/);
  assert.doesNotMatch(source, /update\s+public\.bike_catalog_models/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.bike_catalog_images/i);
  assert.doesNotMatch(source, /manufacturer_approved/);
  assert.doesNotMatch(source, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('baseline queue requires exact fitment for all four wave 22 bikes', () => {
  const entries = new Map(queue.entries.map((entry) => [entry.id, entry]));
  for (const id of ids) {
    const entry = entries.get(id);
    assert.ok(entry, `${id} must exist in enrichment queue`);
    assert.ok(entry.gaps.includes('exact_fitment'), `${id} must have exact_fitment gap before wave 22`);
  }
  assert.equal(queue.current.exact_fitment + ids.length, 35);
});

test('wave 22 is a dedicated unreleased forward migration', () => {
  assert.match(generator, /garageEnrichmentWave22Order/);
  assert.match(generator, /20260817095000_garage_enrichment_wave22\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_22_rocky_mountain_archive_fitment_2026_08_17\.sql/);
  assert.match(backendAudit, /20260817095000_garage_enrichment_wave22\.sql/);
  assert.match(backendAudit, /productionMigrations = expectedMigrations\.slice\(0, -5\)/);
});
