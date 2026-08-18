import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sourcePath = 'supabase/schema/catalog_enrichment_wave_65_sram_eagle_transmission_registry_2026_08_18.sql';
const migrationPath = 'supabase/migrations/20260817215000_garage_enrichment_wave65.sql';

test('Wave65 registers four standard Eagle Transmission derailleurs and four T-Type cassette targets', () => {
  const sql = fs.readFileSync(sourcePath, 'utf8');
  for (const id of [
    'sram-rd-gx-e-b1', 'sram-rd-x0-e-b1', 'sram-rd-xx-e-b1', 'sram-rd-xx-sle-b1',
    'sram-cs-xs-1275-a1', 'sram-cs-xs-1295-a1', 'sram-cs-xs-1297-a1', 'sram-cs-xs-1299-a1',
  ]) assert.match(sql, new RegExp(id));
  assert.equal((sql.match(/"speeds":12/g) ?? []).length, 8);
  assert.equal((sql.match(/"chain_technology":"T-Type"/g) ?? []).length, 8);
  assert.equal((sql.match(/"system":"Eagle Transmission"/g) ?? []).length, 8);
});

test('Wave65 is identity/spec evidence only and excludes DH or inferred compatibility', () => {
  const sql = fs.readFileSync(sourcePath, 'utf8');
  assert.doesNotMatch(sql, /XX DH Transmission/i);
  assert.doesNotMatch(sql, /garage_compatibility/i);
  assert.doesNotMatch(sql, /bike_catalog_component_fitments/i);
  assert.doesNotMatch(sql, /manufacturer_approved|no_upgrade/i);
});

test('Wave65 deterministic migration is exact raw source SQL', () => {
  assert.equal(fs.readFileSync(migrationPath, 'utf8'), fs.readFileSync(sourcePath, 'utf8'));
});
