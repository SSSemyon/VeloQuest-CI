import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sourcePath = 'supabase/schema/catalog_enrichment_wave_63_shimano_7speed_c433_targets_2026_08_18.sql';
const migrationPath = 'supabase/migrations/20260817213000_garage_enrichment_wave63.sql';

test('Wave63 registers exactly two official Shimano CS-HG200-7 range targets for C-433', () => {
  const sql = fs.readFileSync(sourcePath, 'utf8');
  assert.match(sql, /shimano-cs-hg200-7-12-28/);
  assert.match(sql, /shimano-cs-hg200-7-12-32/);
  assert.equal((sql.match(/https:\/\/productinfo\.shimano\.com\/en\/product\/CS-HG200-7/g) ?? []).length, 2);
  assert.equal((sql.match(/"speeds":7/g) ?? []).length, 2);
  assert.match(sql, /"range":"12-28T"/);
  assert.match(sql, /"range":"12-32T"/);
  assert.equal((sql.match(/"compatible_chain":"IG, HG 8\/7\/6-speed"/g) ?? []).length, 2);
});

test('Wave63 is component identity evidence only and cannot manufacture coverage by itself', () => {
  const sql = fs.readFileSync(sourcePath, 'utf8');
  assert.doesNotMatch(sql, /bike_catalog_component_fitments/i);
  assert.doesNotMatch(sql, /garage_component_aliases/i);
  assert.doesNotMatch(sql, /garage_compatibility/i);
  assert.doesNotMatch(sql, /garage_recommendation_outcomes/i);
  assert.doesNotMatch(sql, /manufacturer_approved|no_upgrade/i);
});

test('Wave63 deterministic migration is exact raw source SQL', () => {
  assert.equal(fs.readFileSync(migrationPath, 'utf8'), fs.readFileSync(sourcePath, 'utf8'));
});
