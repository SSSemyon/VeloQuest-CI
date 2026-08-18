import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_36_shimano_grx_alias_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817170000_garage_enrichment_wave36.sql')
  ? fs.readFileSync('supabase/migrations/20260817170000_garage_enrichment_wave36.sql', 'utf8') : '';

test('Wave36 aliases exact Crux GRX RD-RX822-GS to canonical Shimano identity', () => {
  assert.match(sql, /'shimano-rd-rx822-gs-oem-specialized'\s*,\s*'shimano-rd-rx822-gs'/);
});

test('Wave36 uses only Shimano C-254 GS 10-45T verdict', () => {
  assert.match(sql, /'shimano-rd-rx822-gs'\s*,\s*'shimano-cs-m8100-10-45'\s*,\s*'compatible'/i);
  assert.match(sql, /productinfo\.shimano\.com\/en\/compatibility\/C-254/);
  assert.doesNotMatch(sql, /10-51T.*compatible/i);
  assert.doesNotMatch(sql, /manufacturer_approved|garage_recommendation_outcomes|no_upgrade/i);
});

test('Wave36 has deterministic migration', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_36_shimano_grx_alias_2026_08_17\.sql/);
});
