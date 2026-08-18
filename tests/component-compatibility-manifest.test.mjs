import assert from 'node:assert/strict';
import test from 'node:test';

import { buildComponentCompatibilityManifest } from '../catalog-harvester/component-compatibility-manifest.mjs';

const registry = {
  sources: [
    { brands: ['Shimano'], official_hosts: ['productinfo.shimano.com'], index_url: 'https://productinfo.shimano.com/en/compatibility', strategy: 'html-compatibility-index' },
    { brands: ['SRAM', 'RockShox'], official_hosts: ['sram.com', 'www.sram.com'], index_url: 'https://www.sram.com/en/service/manuals--documents/compatability-map?showRecent=false', strategy: 'service-compatibility-map' },
  ],
};

const demand = {
  active_bikes: 10,
  covered_bikes: 4,
  uncovered_bikes: 6,
  demand: [
    { component_id: 'shimano-rd-m6100-sgs', brand: 'Shimano', model: 'RD-M6100-SGS', category: 'rear_derailleur', impact_bikes: 3, bike_ids: ['c', 'a', 'b'], exact_component_ids: ['oem-b', 'oem-a'] },
    { component_id: 'sram-rd-x0-e-b1', brand: 'SRAM', model: 'RD-X0-E-B1', category: 'rear_derailleur', impact_bikes: 2, bike_ids: ['e', 'd'], exact_component_ids: ['oem-sram'] },
    { component_id: 'example-fork', brand: 'Example', model: 'Fork', category: 'fork', impact_bikes: 1, bike_ids: ['f'], exact_component_ids: ['example-fork'] },
  ],
};

test('manifest prioritizes highest-impact official manufacturer sources', () => {
  const result = buildComponentCompatibilityManifest({ demand, registry, deferrals: { entries: [] }, limit: 100 });
  assert.deepEqual(result.entries.map((entry) => entry.component_id), ['shimano-rd-m6100-sgs', 'sram-rd-x0-e-b1']);
  assert.deepEqual(result.entries[0].bike_ids, ['a', 'b', 'c']);
  assert.deepEqual(result.entries[0].exact_component_ids, ['oem-a', 'oem-b']);
  assert.equal(result.entries[0].index_url, 'https://productinfo.shimano.com/en/compatibility');
  assert.equal(result.unresolved_sources[0].component_id, 'example-fork');
});

test('manual-resolution compatibility components stay unresolved and never count as covered', () => {
  const deferrals = {
    max_auto_attempts: 3,
    entries: [{ path: 'component_compatibility_discovery', bike_id: 'shimano-rd-m6100-sgs', attempts: 3, manual_resolution_required: true }],
  };
  const result = buildComponentCompatibilityManifest({ demand, registry, deferrals, limit: 100 });
  assert.equal(result.entries.some((entry) => entry.component_id === 'shimano-rd-m6100-sgs'), false);
  const unresolved = result.unresolved_sources.find((entry) => entry.component_id === 'shimano-rd-m6100-sgs');
  assert.ok(unresolved);
  assert.match(unresolved.reason, /exhausted/i);
  assert.equal(result.uncovered_bikes, 6);
});

test('manifest is bounded to 100 compatibility research items', () => {
  const many = {
    ...demand,
    demand: Array.from({ length: 140 }, (_, index) => ({
      component_id: `shimano-rd-${index}`,
      brand: 'Shimano',
      model: `RD-${index}`,
      category: 'rear_derailleur',
      impact_bikes: 140 - index,
      bike_ids: [`bike-${index}`],
      exact_component_ids: [`shimano-rd-${index}`],
    })),
  };
  const result = buildComponentCompatibilityManifest({ demand: many, registry, deferrals: { entries: [] }, limit: 1000 });
  assert.equal(result.entries.length, 100);
  assert.equal(result.batch_size, 100);
});
