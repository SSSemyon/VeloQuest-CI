import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_30_specialized_sworks_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817160000_garage_enrichment_wave30.sql')
  ? fs.readFileSync('supabase/migrations/20260817160000_garage_enrichment_wave30.sql', 'utf8')
  : '';

for (const id of [
  'specialized-s-works-crux-sram-red-xplr-2026-global',
  'specialized-s-works-epic-8-sram-xx-sl-axs-rockshox-ultimate-flight-attendant-2026-global',
  'specialized-s-works-turbo-levo-4-2026-global',
]) test(`wave 30 contains ${id}`, () => assert.match(sql, new RegExp(id)));

test('S-Works Crux stores only explicit RED XPLR evidence and does not invent brake caliper model', () => {
  assert.match(sql, /"frame_material":"S-Works Crux FACT 12r Carbon"/);
  assert.match(sql, /"wheel_size":"700C"/);
  assert.match(sql, /"rear_derailleur":"SRAM RED AXS XPLR E1, 13-speed"/);
  assert.match(sql, /"cassette":"SRAM RED XPLR E1, 13-speed, 10-46t"/);
  assert.match(sql, /"weight_kg":6.94/);
  assert.doesNotMatch(sql, /s-works-crux-sram-red-xplr-2026-global[^;]+"brakes"/is);
});

test('S-Works Epic 8 preserves Flight Attendant and Motive Ultimate factory spec', () => {
  assert.match(sql, /"frame_material":"S-Works FACT 12m Carbon"/);
  assert.match(sql, /"rear_travel_mm":120/);
  assert.match(sql, /"rear_derailleur":"SRAM XX SL Eagle AXS"/);
  assert.match(sql, /"brakes":"SRAM Motive Ultimate, 4-piston, 180 mm front \/ 160 mm rear"/);
  assert.match(sql, /"weight_kg":10/);
});

test('S-Works Levo 4 preserves exact 111Nm/840Wh XX/Maven factory spec', () => {
  assert.match(sql, /"frame_material":"FACT 11m Carbon"/);
  assert.match(sql, /"wheel_size":"29\/27.5"/);
  assert.match(sql, /"rear_derailleur":"SRAM XX Eagle Transmission Derailleur"/);
  assert.match(sql, /"brakes":"SRAM Maven Ultimate, 4-piston hydraulic disc"/);
  assert.match(sql, /"battery_wh":840/);
  assert.match(sql, /"motor":"Specialized 3.1 S-Works, 111Nm, 850W"/);
  assert.match(sql, /"weight_kg":23.68/);
});

test('wave 30 keeps factory evidence separate from recommendations', () => {
  assert.match(sql, /factory_installed/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 30 uses dynamic late-wave migration naming', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_30_specialized_sworks_2026_08_17\.sql/);
});
