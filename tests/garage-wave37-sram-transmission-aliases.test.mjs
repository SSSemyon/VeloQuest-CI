import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_37_sram_transmission_aliases_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817171000_garage_enrichment_wave37.sql')
  ? fs.readFileSync('supabase/migrations/20260817171000_garage_enrichment_wave37.sql', 'utf8') : '';

test('Wave37 aliases exact Specialized GX/XX/X0 Transmission OEM derailleurs', () => {
  for (const pair of [
    ['sram-gx-eagle-transmission-oem-specialized-levo-expert','sram-rd-gx-e-b1'],
    ['sram-gx-eagle-transmission-oem-specialized-epic-expert','sram-rd-gx-e-b1'],
    ['sram-xx-eagle-transmission-oem-specialized-levo','sram-rd-xx-e-b1'],
    ['sram-x0-eagle-transmission-oem-specialized-epic-pro','sram-rd-x0-e-b1'],
    ['sram-x0-eagle-transmission-oem-specialized-levo-pro','sram-rd-x0-e-b1'],
  ]) assert.match(sql, new RegExp(`'${pair[0]}'\\s*,\\s*'${pair[1]}'`));
});

test('Wave37 encodes legacy Eagle cassette as incompatible with T-Type Transmission derailleurs', () => {
  for (const source of ['sram-rd-gx-e-b1','sram-rd-xx-e-b1','sram-rd-x0-e-b1']) {
    assert.match(sql, new RegExp(`'${source}'\\s*,\\s*'sram-cs-xg-1275-b1'\\s*,\\s*'incompatible'`));
  }
  assert.match(sql, /sram\.com\/en\/learn\/eagle-transmission-welcome-guide\/easy-maintenance/);
  assert.doesNotMatch(sql, /manufacturer_approved|garage_recommendation_outcomes|no_upgrade/i);
});

test('Wave37 has deterministic migration', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_37_sram_transmission_aliases_2026_08_17\.sql/);
});
