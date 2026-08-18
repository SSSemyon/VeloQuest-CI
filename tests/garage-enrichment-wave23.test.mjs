import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const source = read('supabase/schema/catalog_enrichment_wave_23_rocky_mountain_instinct_reaper_fitment_2026_08_17.sql');
const migration = read('supabase/migrations/20260817100000_garage_enrichment_wave23.sql');
const generator = read('scripts/build-supabase-migrations.mjs');
const backendAudit = read('scripts/audit-backend-repro.mjs');
const queue = JSON.parse(read('catalog-harvester/enrichment-queue.json'));

const ids = [
  'rocky-mountain-instinct-powerplay-alloy-70-2024-global',
  'rocky-mountain-instinct-powerplay-alloy-50-2024-global',
  'rocky-mountain-instinct-powerplay-carbon-50-2024-global',
  'rocky-mountain-instinct-alloy-30-2024-global',
  'rocky-mountain-instinct-carbon-30-2024-global',
  'rocky-mountain-instinct-alloy-50-2024-global',
  'rocky-mountain-instinct-powerplay-carbon-70-2024-global',
  'rocky-mountain-instinct-carbon-99-2024-global',
  'rocky-mountain-instinct-carbon-90-2024-global',
  'rocky-mountain-instinct-carbon-70-2024-global',
  'rocky-mountain-instinct-carbon-70-2024-sram-x0-transmission-global',
  'rocky-mountain-instinct-carbon-50-2024-global',
  'rocky-mountain-reaper-powerplay-24-2024-global',
  'rocky-mountain-reaper-powerplay-26-2024-global',
];

test('wave 23 is archive fitment-only and contains no recommendation inference', () => {
  for (const id of ids) assert.match(source, new RegExp(id));
  assert.match(source, /factory_installed/);
  assert.match(source, /RockShox Lyrik Select/);
  assert.match(source, /Fox 36 Performance Elite/);
  assert.match(source, /RockShox Reba R 140mm/);
  assert.doesNotMatch(source, /update\s+public\.bike_catalog_models/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.bike_catalog_images/i);
  assert.doesNotMatch(source, /manufacturer_approved/);
  assert.doesNotMatch(source, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('all wave 23 bikes exist in the baseline enrichment queue', () => {
  const entries = new Map(queue.entries.map((entry) => [entry.id, entry]));
  for (const id of ids) assert.ok(entries.has(id), `${id} must exist in enrichment queue`);
});

test('wave 23 migration is unreleased and production remains through Hagen', () => {
  assert.match(generator, /garageEnrichmentWave23Order/);
  assert.match(generator, /20260817100000_garage_enrichment_wave23\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_23_rocky_mountain_instinct_reaper_fitment_2026_08_17\.sql/);
  assert.match(backendAudit, /20260817100000_garage_enrichment_wave23\.sql/);
  assert.match(backendAudit, /productionMigrations = expectedMigrations\.slice\(0, -6\)/);
});
