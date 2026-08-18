import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_27_kellys_corratec_lapierre_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817153000_garage_enrichment_wave27.sql')
  ? fs.readFileSync('supabase/migrations/20260817153000_garage_enrichment_wave27.sql', 'utf8')
  : '';

for (const id of [
  'kellys-theos-rs90-p-royal-purple-2026-global',
  'corratec-revo-bow-ilink-sl-pro-2026-global',
  'lapierre-xelius-drs-team-replica-2026-global',
]) test(`wave 27 contains ${id}`, () => assert.match(sql, new RegExp(id)));

test('Kellys THEOS exact card keeps published e-MTB specification and change caveat', () => {
  assert.match(sql, /"frame_material":"Al 6061-T6"/);
  assert.match(sql, /"wheel_size":"29\/27.5"/);
  assert.match(sql, /"rear_derailleur":"SHIMANO Deore XT Di2 M8250 \(direct mount\)"/);
  assert.match(sql, /"brakes":"SHIMANO Deore XT M8120 Hydraulic Disc"/);
  assert.match(sql, /"battery_wh":900/);
  assert.match(sql, /right to make changes.*equipment, specifications, models, colours, and materials/i);
});

test('Corratec exact card uses its 2026 product specification and manufacturer image', () => {
  assert.match(sql, /"frame_material":"Carbon"/);
  assert.match(sql, /"wheel_size":"29"/);
  assert.match(sql, /"rear_derailleur":"SRAM X0 EAGLE AXS T-TYPE 12-SPEED"/);
  assert.match(sql, /"brakes":"SRAM LEVEL SILVER STEALTH 4-Piston 180 mm front \/ 160 mm rear"/);
  assert.match(sql, /724bbfe0-3178-4ee7-afc9-a7273753d9d7\.jpg/);
  assert.match(sql, /source_type[\s\S]+manufacturer/i);
});

test('Lapierre Xelius exact card keeps published Dura-Ace factory spec and substitution caveat', () => {
  assert.match(sql, /"frame_material":"HIGH Carbon Uni"/);
  assert.match(sql, /"wheel_size":"28"/);
  assert.match(sql, /Shimano Dura-Ace Di2 RD-R9250 12s/);
  assert.match(sql, /Shimano Hydraulic Disc brake Dura-Ace BR-R9270/);
  assert.match(sql, /manufacturer reserves the right to replace individual components/i);
});

test('wave 27 remains factory-evidence only', () => {
  assert.match(sql, /factory_installed/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 27 migration follows dynamic late-wave naming', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_27_kellys_corratec_lapierre_2026_08_17\.sql/);
});
