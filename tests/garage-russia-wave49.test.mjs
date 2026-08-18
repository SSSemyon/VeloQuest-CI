import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sourcePath = 'supabase/schema/catalog_enrichment_wave_49_stels_russia_exact_2026_08_17.sql';
const migrationPath = 'supabase/migrations/20260817191000_garage_enrichment_wave49.sql';
const read = (path) => fs.readFileSync(path, 'utf8');

test('Wave49 migration is byte-derived from its STELS source', () => {
  const source = read(sourcePath);
  const migration = read(migrationPath);
  assert.equal(migration, `-- SOURCE: ${sourcePath}\n${source}`);
});

test('Wave49 keeps STELS evidence exact and does not infer compatibility or outcomes', () => {
  const sql = read(sourcePath);
  assert.match(sql, /stels-navigator-970-d-29-2025-ru/);
  assert.match(sql, /Shimano CUES RD-U6000/);
  assert.equal((sql.match(/'manufacturer',\s*\n\s*'STELS'/g) ?? []).length, 1);
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, 1);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /no_upgrade/i);
});
