import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sourcePath = 'supabase/schema/catalog_enrichment_wave_64_welt_voyager_c433_2026_08_18.sql';
const migrationPath = 'supabase/migrations/20260817214000_garage_enrichment_wave64.sql';

test('Wave64 creates only evidence-backed WELT Voyager ESSA C-433 compatibility paths', () => {
  const sql = fs.readFileSync(sourcePath, 'utf8');
  assert.equal((sql.match(/oem-welt-voyager-1-0-2026-rd/g) ?? []).length, 2);
  assert.match(sql, /shimano-cs-hg200-7-12-28/);
  assert.match(sql, /shimano-cs-hg200-7-12-32/);
  assert.equal((sql.match(/https:\/\/productinfo\.shimano\.com\/en\/compatibility\/C-433/g) ?? []).length, 2);
  assert.equal((sql.match(/'compatible'/g) ?? []).length, 2);
});

test('Wave64 does not create aliases, bike fitments, approved upgrades, or synthetic outcomes', () => {
  const sql = fs.readFileSync(sourcePath, 'utf8');
  assert.doesNotMatch(sql, /garage_component_aliases/i);
  assert.doesNotMatch(sql, /bike_catalog_component_fitments/i);
  assert.doesNotMatch(sql, /manufacturer_approved|no_upgrade/i);
  assert.doesNotMatch(sql, /garage_recommendation_outcomes/i);
});

test('Wave64 deterministic migration is exact raw source SQL', () => {
  assert.equal(fs.readFileSync(migrationPath, 'utf8'), fs.readFileSync(sourcePath, 'utf8'));
});
