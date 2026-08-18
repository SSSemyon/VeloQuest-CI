import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_25_lapierre_ktm_2026_08_17.sql', 'utf8');
const builder = fs.readFileSync('scripts/build-supabase-migrations.mjs', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817151000_garage_enrichment_wave25.sql')
  ? fs.readFileSync('supabase/migrations/20260817151000_garage_enrichment_wave25.sql', 'utf8')
  : '';

for (const id of [
  'lapierre-e-explorer-5-5-low-2026-global',
  'lapierre-e-explorer-6-5-low-2026-global',
  'ktm-gravelator-exonic-2026-global',
]) {
  test(`wave 25 contains exact model ${id}`, () => assert.match(sql, new RegExp(id)));
}

test('Lapierre cards preserve exact 27.5 aluminium/CUES/Tektro evidence', () => {
  assert.match(sql, /"frame_material":"LOW Aluminium Low entry"/);
  assert.match(sql, /"wheel_size":"27.5"/);
  assert.match(sql, /Shimano CUES RD-U3020-9s, Shadow/);
  assert.match(sql, /Tektro Hydraulic Disc brake HD-M280, 2 pistons, resin pad, 203 mm/);
  assert.match(sql, /manufacturer reserves the right to replace individual components/i);
});

test('KTM card preserves exact carbon/XPLR/Paceline factory specification', () => {
  assert.match(sql, /"frame_material":"Gravelator Premium Carbon\/R6990"/);
  assert.match(sql, /"drivetrain":"SRAM RED XPLR AXS 1x13"/);
  assert.match(sql, /"brakes":"SRAM Paceline-X CL 160"/);
  assert.match(sql, /"wheel_size":"622x32TC"/);
  assert.match(sql, /"weight_kg":7.8/);
});

test('wave 25 adds factory fitment only and no inferred recommendation', () => {
  assert.match(sql, /factory_installed/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 25 is generated as a forward migration', () => {
  assert.match(builder, /garageEnrichmentWave25Order/);
  assert.match(builder, /20260817151000_garage_enrichment_wave25\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_25_lapierre_ktm_2026_08_17\.sql/);
});
