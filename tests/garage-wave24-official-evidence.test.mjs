import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_24_giant_corratec_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817150000_garage_enrichment_wave24.sql')
  ? fs.readFileSync('supabase/migrations/20260817150000_garage_enrichment_wave24.sql', 'utf8')
  : '';
const builder = fs.readFileSync('scripts/build-supabase-migrations.mjs', 'utf8');

const giant = 'giant-defy-advanced-eplus-elite-1-2026-us';
const corratec = 'corratec-allroad-travel-eq-2026-global';

test('wave 24 uses exact first-party Giant and Corratec evidence', () => {
  for (const id of [giant, corratec]) assert.match(sql, new RegExp(id));
  assert.match(sql, /https:\/\/www\.giant-bicycles\.com\/us\/defy-advanced-eplus-elite-1/);
  assert.match(sql, /https:\/\/www\.corratec\.com\/en\/Bikes\//);
  assert.match(sql, /source_type[^\n]+manufacturer/i);
  assert.match(sql, /factory_installed/i);
});

test('Giant exact card contains official core specs without compatibility inference', () => {
  assert.match(sql, /"frame_material":"Advanced-grade composite"/);
  assert.match(sql, /"wheel_size":"700C"/);
  assert.match(sql, /"drivetrain":"SRAM Force AXS"/i);
  assert.match(sql, /"brakes":"SRAM Force AXS HRD/);
  assert.match(sql, /"battery_wh":400/);
});

test('Corratec keeps unknown frame material unknown while storing explicit OEM specs', () => {
  assert.match(sql, /"drivetrain":"SHIMANO CUES 2x10"/);
  assert.match(sql, /"brakes":"SHIMANO BR-U6030 CUES 160"/);
  assert.match(sql, /"wheel_size":"622-24"/);
  assert.doesNotMatch(sql, /corratec-allroad-travel-eq-2026-global[^;]+frame_material/is);
});

test('wave 24 never manufactures upgrade/compatibility outcomes', () => {
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 24 is wired as an idempotent generated forward migration', () => {
  assert.match(builder, /garageEnrichmentWave24Order/);
  assert.match(builder, /20260817150000_garage_enrichment_wave24\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_24_giant_corratec_2026_08_17\.sql/);
});
