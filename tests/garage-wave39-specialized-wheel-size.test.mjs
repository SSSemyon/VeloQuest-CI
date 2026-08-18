import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_39_specialized_wheel_size_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817173000_garage_enrichment_wave39.sql')
  ? fs.readFileSync('supabase/migrations/20260817173000_garage_enrichment_wave39.sql', 'utf8') : '';

const ids = [
  'specialized-diverge-comp-carbon-sram-apex-etap-axs-2025-global',
  'specialized-roubaix-sl8-expert-sram-rival-etap-axs-2025-global',
  'specialized-tarmac-sl7-sport-shimano-105-2025-global',
  'specialized-tarmac-sl8-pro-sram-force-etap-axs-2025-global',
];

for (const id of ids) test(`Wave39 records exact 700C wheel size for ${id}`, () => {
  assert.match(sql, /"wheel_size":"700C"/);
  assert.match(sql, new RegExp(`where id = '${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
});

test('Wave39 is wheel-size evidence only', () => {
  assert.equal((sql.match(/"wheel_size":"700C"/g) ?? []).length, ids.length);
  assert.doesNotMatch(sql, /garage_components|garage_compatibility|bike_catalog_component_fitments|garage_recommendation_outcomes/i);
});

test('Wave39 has deterministic migration', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_39_specialized_wheel_size_2026_08_17\.sql/);
});
