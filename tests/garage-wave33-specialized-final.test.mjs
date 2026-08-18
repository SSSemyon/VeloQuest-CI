import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_33_specialized_final_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817163000_garage_enrichment_wave33.sql')
  ? fs.readFileSync('supabase/migrations/20260817163000_garage_enrichment_wave33.sql', 'utf8')
  : '';

for (const id of [
  'specialized-epic-8-expert-sram-gx-axs-rockshox-select-2026-global',
  'specialized-s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate-2026-global',
  'specialized-s-works-tarmac-sl8-sram-red-axs-2026-global',
]) test(`wave 33 contains ${id}`, () => assert.match(sql, new RegExp(id)));

test('Epic 8 Expert preserves exact GX / Motive Bronze / RockShox Select+ spec', () => {
  assert.match(sql, /"frame_material":"FACT 11m Carbon"/);
  assert.match(sql, /"rear_travel_mm":120/);
  assert.match(sql, /"fork":"RockShox SID Select\+/);
  assert.match(sql, /"rear_shock":"RockShox SIDLuxe Select\+/);
  assert.match(sql, /"rear_derailleur":"SRAM GX Eagle AXS Transmission"/);
  assert.match(sql, /"brakes":"SRAM Motive Bronze, 4-piston, 180 mm front \/ 160 mm rear"/);
  assert.match(sql, /"weight_kg":11.15/);
  assert.match(sql, /epic-8-expert-sram-gx-axs-rockshox-select\/p\/4221521/);
  assert.doesNotMatch(sql, /specialized-epic-8-expert-sram-gx-axs-rockshox-ultimate-2026-global/);
});

test('S-Works Epic 8 EVO preserves exact XX SL / Motive Ultimate / Pike Ultimate spec', () => {
  assert.match(sql, /"frame_material":"S-Works FACT 12m Carbon"/);
  assert.match(sql, /"fork":"RockShox Pike ULTIMATE, 130mm"/);
  assert.match(sql, /"rear_derailleur":"SRAM XX SL Eagle AXS"/);
  assert.match(sql, /"brakes":"SRAM Motive Ultimate, 4-piston, 180 mm front \/ 180 mm rear"/);
  assert.match(sql, /"weight_kg":11.02/);
});

test('S-Works Tarmac SL8 preserves exact RED AXS E1 / Rapide CLX III spec', () => {
  assert.match(sql, /"frame_material":"S-Works Tarmac SL8 FACT 12r Carbon"/);
  assert.match(sql, /"wheel_size":"700C"/);
  assert.match(sql, /"rear_derailleur":"SRAM RED AXS E1, 12-speed"/);
  assert.match(sql, /"brakes":"SRAM RED E1 hydraulic disc"/);
  assert.match(sql, /"cassette":"SRAM RED XG-1290 E1, 12-speed, 10-33t"/);
  assert.match(sql, /"weight_kg":6.62/);
});

test('wave 33 remains factory evidence only', () => {
  assert.match(sql, /factory_installed/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 33 uses dynamic late-wave migration naming', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_33_specialized_final_2026_08_17\.sql/);
});
