import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_28_specialized_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817154000_garage_enrichment_wave28.sql')
  ? fs.readFileSync('supabase/migrations/20260817154000_garage_enrichment_wave28.sql', 'utf8')
  : '';

const ids = [
  'specialized-epic-8-comp-sram-s-1000-axs-rockshox-select-2026-global',
  'specialized-s-works-tarmac-sl8-shimano-dura-ace-di2-2026-global',
  'specialized-turbo-levo-4-comp-2026-global',
];
for (const id of ids) test(`wave 28 contains ${id}`, () => assert.match(sql, new RegExp(id)));

test('Epic 8 Comp preserves exact carbon, 29er, SRAM and RockShox specification', () => {
  assert.match(sql, /"frame_material":"FACT 11m Carbon"/);
  assert.match(sql, /"wheel_size":"29"/);
  assert.match(sql, /"rear_derailleur":"SRAM S-1000 Eagle Transmission"/);
  assert.match(sql, /"brakes":"SRAM Level Bronze Stealth, 4-piston, 180 mm front \/ 160 mm rear"/);
  assert.match(sql, /"rear_shock":"RockShox SIDLuxe Select\+.*190x45mm"/);
  assert.match(sql, /"weight_kg":11.89/);
});

test('S-Works Tarmac SL8 preserves exact FACT 12r and Dura-Ace factory spec', () => {
  assert.match(sql, /"frame_material":"S-Works Tarmac SL8 FACT 12r Carbon"/);
  assert.match(sql, /"wheel_size":"700C"/);
  assert.match(sql, /"rear_derailleur":"Shimano Dura-Ace R9250, 12-speed"/);
  assert.match(sql, /"brakes":"Shimano Dura-Ace BR-R9270 hydraulic disc"/);
  assert.match(sql, /"weight_kg":6.67/);
});

test('Turbo Levo 4 Comp preserves exact carbon mixed-wheel e-MTB specification', () => {
  assert.match(sql, /"frame_material":"FACT 11m Carbon"/);
  assert.match(sql, /"wheel_size":"29\/27.5"/);
  assert.match(sql, /"rear_travel_mm":150/);
  assert.match(sql, /"rear_derailleur":"SRAM S-1000 Eagle AXS Transmission"/);
  assert.match(sql, /"brakes":"SRAM Maven Bronze, 4-piston hydraulic disc"/);
  assert.match(sql, /"battery_wh":840/);
  assert.match(sql, /"weight_kg":24.41/);
});

test('wave 28 stores official Specialized hero images and only factory fitment', () => {
  for (const token of ['90325-51_EPIC-8-COMP', '94926-01_TARMAC-SL8-SW-DI2', '95224-56_LEVO-COMP-CARBON-G4']) assert.match(sql, new RegExp(token));
  assert.match(sql, /source_type[\s\S]+manufacturer/i);
  assert.match(sql, /factory_installed/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 28 uses dynamic late-wave migration naming', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_28_specialized_2026_08_17\.sql/);
});
