import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCompatibilityDemand,
  parseSqlInsertRows,
} from '../scripts/garage-compatibility-demand-core.mjs';

const activeModelIds = new Set([
  'bike-a', 'bike-b', 'bike-c', 'bike-covered', 'bike-outcome', 'bike-approved',
]);

const fitments = [
  { bike_id: 'bike-a', component_id: 'oem-a-rd', fitment_type: 'factory_installed' },
  { bike_id: 'bike-b', component_id: 'oem-b-rd', fitment_type: 'factory_installed' },
  { bike_id: 'bike-c', component_id: 'component-c', fitment_type: 'factory_installed' },
  { bike_id: 'bike-covered', component_id: 'canonical-covered', fitment_type: 'factory_installed' },
  { bike_id: 'bike-outcome', component_id: 'component-outcome', fitment_type: 'factory_installed' },
  { bike_id: 'bike-approved', component_id: 'target-approved', fitment_type: 'manufacturer_approved' },
];

const aliases = [
  { alias_component_id: 'oem-a-rd', canonical_component_id: 'shimano-rd-m6100-sgs' },
  { alias_component_id: 'oem-b-rd', canonical_component_id: 'shimano-rd-m6100-sgs' },
];

const compatibility = [
  { source_component_id: 'canonical-covered', target_component_id: 'target-new', status: 'compatible' },
];

const components = [
  { id: 'oem-a-rd', brand: 'Shimano', model: 'RD-M6100-SGS OEM A', category: 'rear_derailleur' },
  { id: 'oem-b-rd', brand: 'Shimano', model: 'RD-M6100-SGS OEM B', category: 'rear_derailleur' },
  { id: 'shimano-rd-m6100-sgs', brand: 'Shimano', model: 'RD-M6100-SGS', category: 'rear_derailleur' },
  { id: 'component-c', brand: 'Example', model: 'C', category: 'fork' },
  { id: 'canonical-covered', brand: 'Example', model: 'Covered', category: 'rear_derailleur' },
  { id: 'target-new', brand: 'Example', model: 'Target', category: 'cassette' },
  { id: 'component-outcome', brand: 'Example', model: 'Outcome', category: 'fork' },
  { id: 'target-approved', brand: 'Example', model: 'Approved', category: 'fork' },
];

test('planner excludes bikes already covered by graph, manufacturer-approved fitment, or explicit outcome', () => {
  const result = buildCompatibilityDemand({
    activeModelIds,
    fitments,
    aliases,
    compatibility,
    explicitOutcomeBikeIds: new Set(['bike-outcome']),
    components,
  });

  assert.deepEqual([...result.uncoveredBikeIds].sort(), ['bike-a', 'bike-b', 'bike-c']);
});

test('planner aggregates exact OEM aliases under one canonical research demand', () => {
  const result = buildCompatibilityDemand({
    activeModelIds,
    fitments,
    aliases,
    compatibility,
    explicitOutcomeBikeIds: new Set(['bike-outcome']),
    components,
  });

  const demand = result.demand.find((item) => item.component_id === 'shimano-rd-m6100-sgs');
  assert.ok(demand);
  assert.equal(demand.impact_bikes, 2);
  assert.deepEqual(demand.bike_ids, ['bike-a', 'bike-b']);
  assert.deepEqual(demand.exact_component_ids, ['oem-a-rd', 'oem-b-rd']);
  assert.equal(demand.brand, 'Shimano');
  assert.equal(demand.category, 'rear_derailleur');
});

test('planner ranks largest uncovered-bike impact first with deterministic tie breaks', () => {
  const result = buildCompatibilityDemand({
    activeModelIds,
    fitments,
    aliases,
    compatibility,
    explicitOutcomeBikeIds: new Set(['bike-outcome']),
    components,
  });

  assert.deepEqual(result.demand.map((item) => [item.component_id, item.impact_bikes]), [
    ['shimano-rd-m6100-sgs', 2],
    ['component-c', 1],
  ]);
});

test('planner never treats unknown compatibility as covered', () => {
  const result = buildCompatibilityDemand({
    activeModelIds: new Set(['bike']),
    fitments: [{ bike_id: 'bike', component_id: 'unknown-source', fitment_type: 'factory_installed' }],
    aliases: [],
    compatibility: [],
    explicitOutcomeBikeIds: new Set(),
    components: [{ id: 'unknown-source', brand: 'Example', model: 'Unknown', category: 'fork' }],
  });

  assert.deepEqual([...result.uncoveredBikeIds], ['bike']);
  assert.equal(result.demand[0].component_id, 'unknown-source');
  assert.equal(result.demand[0].impact_bikes, 1);
});

test('SQL inventory parser reads explicit INSERT tuples and ignores other tables', () => {
  const sql = `
    insert into public.garage_components
      (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)
    values
      ('shimano-rd-m6100-sgs', 'Shimano', 'RD-M6100-SGS', 'rear_derailleur', 'Shimano RD-M6100-SGS', '{"speeds":12}'::jsonb, 1, 'https://productinfo.shimano.com/a', '2026-08-17', true),
      ('quoted-id', 'Maker', 'O''Brien', 'fork', 'Maker O''Brien', '{}'::jsonb, 1, 'https://maker.example/a', '2026-08-17', true)
    on conflict (id) do update set enabled=true;
    insert into public.other_table (id) values ('ignore-me');
  `;

  const rows = parseSqlInsertRows(sql, 'garage_components');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 'shimano-rd-m6100-sgs');
  assert.equal(rows[0].unlock_level, 1);
  assert.equal(rows[0].enabled, true);
  assert.equal(rows[1].model, "O'Brien");
});
