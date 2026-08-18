import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const source = read('supabase/schema/catalog_enrichment_wave_21_rocky_mountain_media_fitment_2026_08_17.sql');
const migration = read('supabase/migrations/20260817094000_garage_enrichment_wave21.sql');
const generator = read('scripts/build-supabase-migrations.mjs');
const backendAudit = read('scripts/audit-backend-repro.mjs');
const queue = JSON.parse(read('catalog-harvester/enrichment-queue.json'));

const altitude = 'rocky-mountain-altitude-alloy-70-coil-2025-int';
const element = 'rocky-mountain-element-carbon-70-2025-int';

test('wave 21 uses exact Rocky Mountain product pages and manufacturer CDN media', () => {
  for (const id of [altitude, element]) assert.match(source, new RegExp(id));
  assert.match(source, /https:\/\/bikes\.com\/cdn\/shop\/files\/Web_MY25_Altitude_A70_Coil_C2_29_Profile\.jpg\?v=1743703648/);
  assert.match(source, /https:\/\/bikes\.com\/cdn\/shop\/files\/Web_MY25_Element_C70_C2_29_Profile\.jpg\?v=1743703738/);
  assert.match(source, /'manufacturer', 'Rocky Mountain'/);
  assert.match(source, /source_page_url/);
});

test('wave 21 adds only evidence-backed core fields and factory fitment', () => {
  assert.match(source, /"frame_material":"FORM Alloy"/);
  assert.match(source, /"wheel_size":"27\.5 SM \/ 29 MD-LG-XL; MD-LG-XL MX compatible"/);
  assert.match(source, /"frame_material":"SMOOTHWALL Carbon"/);
  assert.match(source, /"wheel_size":"27\.5 XS \/ 29 SM-MD-LG-XL"/);
  assert.match(source, /Shimano XT Trail 4 Piston/);
  assert.match(source, /RD-GX-E-B1/);
  assert.match(source, /factory_installed/);
  assert.doesNotMatch(source, /manufacturer_approved/);
  assert.doesNotMatch(source, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
  assert.doesNotMatch(source, /front_travel_mm/);
});

test('baseline queue proves +2 photo, at least +1 core and +2 exact-fitment opportunity', () => {
  const entries = new Map(queue.entries.map((entry) => [entry.id, entry]));
  const altitudeEntry = entries.get(altitude);
  const elementEntry = entries.get(element);
  assert.ok(altitudeEntry?.gaps.includes('photo'));
  assert.ok(altitudeEntry?.gaps.includes('wheel_size'));
  assert.ok(altitudeEntry?.gaps.includes('exact_fitment'));
  assert.equal(altitudeEntry?.existing_core_fields, 3);
  assert.ok(elementEntry?.gaps.includes('photo'));
  assert.ok(elementEntry?.gaps.includes('wheel_size'));
  assert.ok(elementEntry?.gaps.includes('exact_fitment'));
  assert.equal(elementEntry?.existing_core_fields, 2);

  assert.equal(queue.current.photo + 2, 24);
  assert.ok(queue.current.core_specs + 1 >= 42);
  assert.equal(queue.current.exact_fitment + 2, 33);
});

test('wave 21 is a dedicated unreleased forward migration', () => {
  assert.match(generator, /garageEnrichmentWave21Order/);
  assert.match(generator, /20260817094000_garage_enrichment_wave21\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_21_rocky_mountain_media_fitment_2026_08_17\.sql/);
  assert.match(backendAudit, /20260817094000_garage_enrichment_wave21\.sql/);
  assert.match(backendAudit, /productionMigrations = expectedMigrations\.slice\(0, -4\)/);
});
