import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_34_existing_exact_fitments_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817164000_garage_enrichment_wave34.sql')
  ? fs.readFileSync('supabase/migrations/20260817164000_garage_enrichment_wave34.sql', 'utf8')
  : '';

const bikes = [
  'bmc-urs-al-one-2025-us',
  'bmc-fourstroke-lt-one-2024-global',
  'bmc-speedmachine-01-ltd-2024-us',
  'bmc-speedmachine-01-one-2024-us',
  'bmc-teammachine-r-01-one-2024-us',
  'cannondale-superx-3-2025-us',
  'giant-defy-advanced-2-2026-us',
  'norco-optic-c2-gen3-2025-global',
  'salsa-beargrease-c-xt-2025-us',
  'specialized-crux-dsw-comp-sram-apex-xplr-2025-global',
  'specialized-crux-pro-2025-us',
  'specialized-diverge-comp-carbon-sram-apex-etap-axs-2025-global',
  'specialized-roubaix-sl8-comp-2025-us',
  'specialized-roubaix-sl8-expert-sram-rival-etap-axs-2025-global',
  'specialized-tarmac-sl7-sport-shimano-105-2025-global',
  'specialized-tarmac-sl8-pro-ultegra-2025-us',
  'specialized-tarmac-sl8-pro-sram-force-etap-axs-2025-global',
];

for (const id of bikes) test(`wave 34 materializes exact fitment for ${id}`, () => assert.match(sql, new RegExp(id)));

test('wave 34 creates exactly one factory-installed fitment per new bike', () => {
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, bikes.length);
});

test('wave 34 is provenance materialization only', () => {
  assert.doesNotMatch(sql, /update\s+public\.bike_catalog_models/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
  assert.doesNotMatch(sql, /no_upgrade/i);
});

test('wave 34 has deterministic generated migration', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_34_existing_exact_fitments_2026_08_17\.sql/);
});
