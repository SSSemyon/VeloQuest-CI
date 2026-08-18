import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_32_specialized_gravel_levo_sl_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817162000_garage_enrichment_wave32.sql')
  ? fs.readFileSync('supabase/migrations/20260817162000_garage_enrichment_wave32.sql', 'utf8')
  : '';

for (const id of [
  'specialized-crux-pro-sram-force-xplr-axs-2026-global',
  'specialized-diverge-4-pro-ltd-sram-red-xplr-2026-global',
  'specialized-turbo-levo-sl-2-expert-di2-2026-global',
]) test(`wave 32 contains ${id}`, () => assert.match(sql, new RegExp(id)));

test('Crux Pro preserves exact FACT 10r / Force XPLR AXS factory spec', () => {
  assert.match(sql, /"frame_material":"Crux FACT 10r Carbon"/);
  assert.match(sql, /"wheel_size":"700C"/);
  assert.match(sql, /"rear_derailleur":"SRAM Force XPLR AXS E1, 13-speed"/);
  assert.match(sql, /"brakes":"SRAM Force E1 hydraulic disc, Paceline 160 mm front \/ 160 mm rear"/);
  assert.match(sql, /"cassette":"SRAM Force XPLR XG-1371, 13-speed, 10-46t"/);
  assert.match(sql, /"weight_kg":7.62/);
});

test('Diverge 4 Pro LTD uses current exact product identity and preserves asymmetric brake evidence', () => {
  assert.match(sql, /specialized-diverge-4-pro-ltd-sram-red-xplr-2026-global/);
  assert.doesNotMatch(sql, /specialized-diverge-4-pro-ltd-sram-red-xplr-axs-2026-global/);
  assert.match(sql, /https:\/\/www\.specialized\.com\/us\/en\/diverge-4-pro-ltd-sram-red-xplr\/p\/4294387/);
  assert.match(sql, /"frame_material":"Diverge 4 FACT 9r Carbon"/);
  assert.match(sql, /"wheel_size":"700C"/);
  assert.match(sql, /"rear_derailleur":"SRAM RED AXS XPLR E1, 13-speed"/);
  assert.match(sql, /"brakes":"SRAM RED AXS front \/ SRAM RED E1 rear, hydraulic disc"/);
  assert.match(sql, /"cassette":"SRAM RED XPLR E1, 13-speed, 10-46t"/);
  assert.match(sql, /"weight_kg":8.01/);
  assert.doesNotMatch(sql, /sram-red-axs-e1-brake-oem-specialized-diverge/);
});

test('Levo SL 2 Expert Di2 preserves exact lightweight e-MTB spec', () => {
  assert.match(sql, /"frame_material":"FACT 11m Carbon"/);
  assert.match(sql, /"wheel_size":"29\/27.5"/);
  assert.match(sql, /"rear_travel_mm":150/);
  assert.match(sql, /"rear_derailleur":"Shimano XT Di2, 12-speed"/);
  assert.match(sql, /"brakes":"Shimano Deore XT, 4-piston, 203 mm front \/ 203 mm rear"/);
  assert.match(sql, /"motor":"Specialized SL 1.2, 50Nm, 320W"/);
  assert.match(sql, /"battery_wh":320/);
  assert.match(sql, /"weight_kg":18.92/);
});

test('wave 32 remains factory evidence only', () => {
  assert.match(sql, /factory_installed/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 32 uses dynamic late-wave migration naming', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_32_specialized_gravel_levo_sl_2026_08_17\.sql/);
});
