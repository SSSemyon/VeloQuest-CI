import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_26_commencal_meta_2026_08_17.sql', 'utf8');
const builder = fs.readFileSync('scripts/build-supabase-migrations.mjs', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817152000_garage_enrichment_wave26.sql')
  ? fs.readFileSync('supabase/migrations/20260817152000_garage_enrichment_wave26.sql', 'utf8')
  : '';

const sx = 'commencal-meta-sx-v5-signature-2026-us';
const meta = 'commencal-meta-v5-signature-2025-us';

test('wave 26 contains both exact COMMENCAL META identities', () => {
  assert.match(sql, new RegExp(sx));
  assert.match(sql, new RegExp(meta));
  assert.match(sql, /https:\/\/www\.commencal\.com\/us\/en\/bikes\/bikes\/enduro\/meta%20sx%20v5\/BT5MSXV5SGEU1\.html\?lang=en_US/);
  assert.match(sql, /https:\/\/www\.commencal\.com\/us\/en\/bikes\/bikes\/enduro\/meta%20v5\/BT4MTRV5SGEU3\.html\?lang=en_US/);
});

test('META SX V5 exact factory card is evidence-backed', () => {
  assert.match(sql, /"frame_material":"AL 6066 T4, T6"/);
  assert.match(sql, /"wheel_size":"29\/27.5"/);
  assert.match(sql, /"fork":"FOX 38 Factory, 170 mm travel"/);
  assert.match(sql, /"rear_shock":"FOX Float X2 Factory"/);
  assert.match(sql, /"rear_derailleur":"SRAM Eagle 90 12s"/);
  assert.match(sql, /"brakes":"SHIMANO New XT, 4 pistons, resin pads; SHIMANO MT905 203 mm rotors"/);
  assert.match(sql, /"weight_kg":16.3/);
});

test('META V5 exact factory card is evidence-backed', () => {
  assert.match(sql, /"wheel_size":"29\/29"/);
  assert.match(sql, /"fork":"FOX 36 Factory, 160 mm travel"/);
  assert.match(sql, /"rear_shock":"FOX Float X Factory"/);
  assert.match(sql, /"rear_derailleur":"SRAM GX Eagle T-Type 12s"/);
  assert.match(sql, /"brakes":"TRP DH-R EVO PRO, 4 pistons, resin pads; TRP R2 203 mm rotors"/);
  assert.match(sql, /"weight_kg":15.9/);
});

test('COMMENCAL publication-change caveat is retained and no upgrade inference is added', () => {
  assert.match(sql, /specifications are subject to change without notice/i);
  assert.match(sql, /factory_installed/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});

test('wave 26 is wired as a generated forward migration', () => {
  assert.match(builder, /garageEnrichmentWave26Order/);
  assert.match(builder, /20260817152000_garage_enrichment_wave26\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_26_commencal_meta_2026_08_17\.sql/);
});
