import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_29_specialized_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817155000_garage_enrichment_wave29.sql')
  ? fs.readFileSync('supabase/migrations/20260817155000_garage_enrichment_wave29.sql', 'utf8')
  : '';

for (const id of [
  'specialized-crux-comp-shimano-grx-2026-global',
  'specialized-epic-8-expert-shimano-xt-di2-rockshox-select-2026-global',
  'specialized-turbo-levo-4-expert-2026-global',
]) test(`wave 29 contains ${id}`, () => assert.match(sql, new RegExp(id)));

test('Crux Comp preserves exact FACT 10r / GRX 12-speed factory spec', () => {
  assert.match(sql, /"frame_material":"Crux FACT 10r Carbon"/);
  assert.match(sql, /"wheel_size":"700C"/);
  assert.match(sql, /"rear_derailleur":"Shimano GRX RD-RX822-GS, 12-speed"/);
  assert.match(sql, /"brakes":"Shimano GRX BR-RX820 hydraulic disc"/);
  assert.match(sql, /"cassette":"Shimano XT CS-M8100, 12-speed, 10-45t"/);
  assert.match(sql, /"weight_kg":8.66/);
});

test('Epic 8 Expert preserves exact XT Di2 / SID Select+ spec', () => {
  assert.match(sql, /"frame_material":"FACT 11m Carbon"/);
  assert.match(sql, /"rear_travel_mm":120/);
  assert.match(sql, /"rear_derailleur":"Shimano XT Di2, 12-speed"/);
  assert.match(sql, /"brakes":"Shimano XT 8200, 2-piston, 180 mm front \/ 180 mm rear"/);
  assert.match(sql, /"rear_shock":"RockShox SIDLuxe Select\+.*190x45mm"/);
  assert.match(sql, /"weight_kg":11.17/);
});

test('Turbo Levo 4 Expert preserves exact GX/Maven/FOX e-MTB spec', () => {
  assert.match(sql, /"frame_material":"FACT 11m Carbon"/);
  assert.match(sql, /"wheel_size":"29\/27.5"/);
  assert.match(sql, /"rear_travel_mm":150/);
  assert.match(sql, /"rear_derailleur":"SRAM GX Eagle Transmission"/);
  assert.match(sql, /"brakes":"SRAM Maven Silver, 4-piston, 220 mm front \/ 200 mm rear"/);
  assert.match(sql, /"battery_wh":840/);
  assert.match(sql, /"weight_kg":24.41/);
});

test('wave 29 adds official Specialized hero media and factory fitment only', () => {
  for (const token of ['91426-50_CRUX-COMP', '90326-32_EPIC-8-EXPERT-DI2', '95224-31_LEVO-EXPERT-CARBON-G4']) assert.match(sql, new RegExp(token));
  assert.match(sql, /source_type[\s\S]+manufacturer/i);
  assert.match(sql, /factory_installed/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 29 uses dynamic late-wave migration naming', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_29_specialized_2026_08_17\.sql/);
});
