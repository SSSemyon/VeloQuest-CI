import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_31_specialized_pro_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817161000_garage_enrichment_wave31.sql')
  ? fs.readFileSync('supabase/migrations/20260817161000_garage_enrichment_wave31.sql', 'utf8')
  : '';

for (const id of [
  'specialized-epic-8-pro-sram-x0-axs-rockshox-ultimate-flight-attendant-2026-global',
  'specialized-s-works-epic-8-evo-shimano-xtr-di2-fox-factory-2026-global',
  'specialized-turbo-levo-4-pro-2026-global',
]) test(`wave 31 contains ${id}`, () => assert.match(sql, new RegExp(id)));

test('Epic 8 Pro preserves exact X0 / Motive Silver / Flight Attendant spec', () => {
  assert.match(sql, /"frame_material":"FACT 11m Carbon"/);
  assert.match(sql, /"rear_travel_mm":120/);
  assert.match(sql, /"rear_derailleur":"SRAM X0 Eagle Transmission"/);
  assert.match(sql, /"brakes":"SRAM Motive Silver, 4-piston, 180 mm front \/ 160 mm rear"/);
  assert.match(sql, /"weight_kg":10.82/);
});

test('S-Works Epic 8 EVO preserves exact XTR Di2 / FOX Factory downcountry spec', () => {
  assert.match(sql, /"frame_material":"S-Works FACT 12m Carbon"/);
  assert.match(sql, /"fork":"FOX 34 SL Factory, GRIP X.*130mm"/);
  assert.match(sql, /"rear_derailleur":"Shimano XTR Di2, 12-speed"/);
  assert.match(sql, /"brakes":"Shimano XTR 9220, 4-piston, 180 mm front \/ 180 mm rear"/);
  assert.match(sql, /"weight_kg":11.17/);
});

test('Turbo Levo 4 Pro follows detailed technical spec rather than marketing shorthand', () => {
  assert.match(sql, /"frame_material":"FACT 11m Carbon"/);
  assert.match(sql, /"wheel_size":"29\/27.5"/);
  assert.match(sql, /"fork":"FOX 38 Performance Elite, GRIP X2, 160 mm"/);
  assert.match(sql, /"rear_derailleur":"SRAM X0 Eagle Transmission"/);
  assert.match(sql, /"brakes":"SRAM Maven Silver, 4-piston hydraulic disc"/);
  assert.match(sql, /"battery_wh":840/);
  assert.match(sql, /"weight_kg":23.94/);
  assert.doesNotMatch(sql, /"fork":"FOX 38 Factory/);
});

test('wave 31 remains factory-evidence only', () => {
  assert.match(sql, /factory_installed/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 31 uses dynamic late-wave migration naming', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_31_specialized_pro_2026_08_17\.sql/);
});
