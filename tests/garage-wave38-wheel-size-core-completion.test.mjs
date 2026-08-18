import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_38_wheel_size_core_completion_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817172000_garage_enrichment_wave38.sql')
  ? fs.readFileSync('supabase/migrations/20260817172000_garage_enrichment_wave38.sql', 'utf8') : '';

const expected = new Map([
  ['giant-defy-advanced-2-2026-us', '700C'],
  ['cannondale-superx-3-2025-us', '700C'],
  ['norco-optic-c2-gen3-2025-global', '29'],
  ['specialized-crux-dsw-comp-sram-apex-xplr-2025-global', '700C'],
  ['specialized-crux-pro-2025-us', '700C'],
  ['specialized-roubaix-sl8-comp-2025-us', '700C'],
  ['specialized-tarmac-sl8-pro-ultegra-2025-us', '700C'],
]);

for (const [id, size] of expected) {
  test(`Wave38 assigns explicit wheel size ${size} to ${id}`, () => {
    assert.match(sql, new RegExp(`"wheel_size":"${size.replace('.', '\\.')}`));
    assert.match(sql, new RegExp(`where id = '${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  });
}

test('Wave38 changes wheel-size evidence only and does not infer compatibility', () => {
  assert.doesNotMatch(sql, /garage_components|garage_compatibility|bike_catalog_component_fitments|garage_recommendation_outcomes/i);
  assert.doesNotMatch(sql, /manufacturer_approved|no_upgrade/i);
  assert.equal((sql.match(/"wheel_size"/g) ?? []).length, expected.size);
});

test('Wave38 has deterministic migration', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_38_wheel_size_core_completion_2026_08_17\.sql/);
});
