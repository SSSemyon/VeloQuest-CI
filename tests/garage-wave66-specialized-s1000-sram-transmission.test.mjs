import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sourcePath = 'supabase/schema/catalog_enrichment_wave_66_specialized_s1000_sram_transmission_2026_08_18.sql';
const migrationPath = 'supabase/migrations/20260817220000_garage_enrichment_wave66.sql';

test('Wave66 creates four T-Type cassette compatibility targets for each exact Specialized S-1000 Transmission source', () => {
  const sql = fs.readFileSync(sourcePath, 'utf8');
  for (const source of ['sram-s1000-eagle-transmission-oem-specialized', 'sram-s1000-eagle-axs-oem-specialized-levo']) {
    assert.equal((sql.match(new RegExp(source, 'g')) ?? []).length, 4);
  }
  for (const target of ['sram-cs-xs-1275-a1', 'sram-cs-xs-1295-a1', 'sram-cs-xs-1297-a1', 'sram-cs-xs-1299-a1']) {
    assert.equal((sql.match(new RegExp(target, 'g')) ?? []).length, 2);
  }
  assert.equal((sql.match(/'compatible'/g) ?? []).length, 8);
  assert.equal((sql.match(/https:\/\/www\.sram\.com\/en\/learn\/eagle-transmission-welcome-guide\/easy-maintenance/g) ?? []).length, 8);
});

test('Wave66 remains component-level and does not manufacture bike approval or no-upgrade outcomes', () => {
  const sql = fs.readFileSync(sourcePath, 'utf8');
  assert.doesNotMatch(sql, /garage_component_aliases/i);
  assert.doesNotMatch(sql, /bike_catalog_component_fitments/i);
  assert.doesNotMatch(sql, /garage_recommendation_outcomes/i);
  assert.doesNotMatch(sql, /manufacturer_approved|no_upgrade/i);
});

test('Wave66 deterministic migration is exact raw source SQL', () => {
  assert.equal(fs.readFileSync(migrationPath, 'utf8'), fs.readFileSync(sourcePath, 'utf8'));
});
