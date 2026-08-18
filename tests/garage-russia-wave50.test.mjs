import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sourcePath = 'supabase/schema/catalog_enrichment_wave_50_welt_russia_exact_2026_08_17.sql';
const migrationPath = 'supabase/migrations/20260817192000_garage_enrichment_wave50.sql';
const read = (path) => fs.readFileSync(path, 'utf8');

test('Wave50 migration is byte-derived from its WELT source', () => {
  const source = read(sourcePath);
  const migration = read(migrationPath);
  assert.equal(migration, `-- SOURCE: ${sourcePath}\n${source}`);
});

test('Wave50 adds five exact WELT 2026 cards and preserves source conflicts without inference', () => {
  const sql = read(sourcePath);
  for (const id of [
    'welt-ranger-1-0-2026-ru',
    'welt-icon-1-0-2026-ru',
    'welt-icon-3-0-2026-ru',
    'welt-falcon-2026-ru',
    'welt-rambler-3-0-2026-ru',
  ]) assert.match(sql, new RegExp(id));
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, 5);
  assert.match(sql, /source_conflict_note/);
  assert.match(sql, /structured specification table states Suntour XCR 34 120 mm/);
  assert.match(sql, /no normalization to another Shimano part number inferred/);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.bike_catalog_images/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /no_upgrade/i);
});
