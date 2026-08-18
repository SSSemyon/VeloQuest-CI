import assert from 'node:assert/strict';
import test from 'node:test';

import { recommendationCoverage } from '../scripts/garage-recommendation-coverage.mjs';

const fitments = [
  { bike_id: 'bike-compatible', component_id: 'source-a', fitment_type: 'factory_installed' },
  { bike_id: 'bike-conditional', component_id: 'source-b', fitment_type: 'factory_installed' },
  { bike_id: 'bike-incompatible', component_id: 'source-c', fitment_type: 'factory_installed' },
  { bike_id: 'bike-approved', component_id: 'target-direct', fitment_type: 'manufacturer_approved' },
  { bike_id: 'bike-no-path', component_id: 'source-d', fitment_type: 'factory_installed' },
];

const compatibility = [
  { source_component_id: 'source-a', target_component_id: 'target-a', status: 'compatible' },
  { source_component_id: 'source-b', target_component_id: 'target-b', status: 'conditional' },
  { source_component_id: 'source-c', target_component_id: 'target-c', status: 'incompatible' },
];

test('recommendation coverage counts all evidence-backed verdict statuses', () => {
  const result = recommendationCoverage({
    fitments,
    compatibility,
    aliases: [],
    activeModelIds: new Set(['bike-compatible','bike-conditional','bike-incompatible','bike-approved','bike-no-path']),
  });
  assert.deepEqual([...result.recommendationReadyBikeIds].sort(), [
    'bike-approved',
    'bike-compatible',
    'bike-conditional',
    'bike-incompatible',
  ]);
});

test('canonical alias lets exact OEM fitment inherit canonical compatibility rules', () => {
  const result = recommendationCoverage({
    fitments: [{ bike_id: 'bike', component_id: 'oem-r9250', fitment_type: 'factory_installed' }],
    aliases: [{ alias_component_id: 'oem-r9250', canonical_component_id: 'shimano-rd-r9250' }],
    compatibility: [{ source_component_id: 'shimano-rd-r9250', target_component_id: 'shimano-cs-r9200', status: 'compatible' }],
    activeModelIds: new Set(['bike']),
  });
  assert.deepEqual([...result.recommendationReadyBikeIds], ['bike']);
});

test('alias canonical identity is treated as installed when excluding self-target paths', () => {
  const result = recommendationCoverage({
    fitments: [
      { bike_id: 'bike', component_id: 'oem-r9250', fitment_type: 'factory_installed' },
      { bike_id: 'bike', component_id: 'shimano-cs-r9200', fitment_type: 'factory_installed' },
    ],
    aliases: [{ alias_component_id: 'oem-r9250', canonical_component_id: 'shimano-rd-r9250' }],
    compatibility: [{ source_component_id: 'shimano-rd-r9250', target_component_id: 'shimano-cs-r9200', status: 'compatible' }],
    activeModelIds: new Set(['bike']),
  });
  assert.equal(result.recommendationReadyBikeIds.size, 0);
});

test('a direct rule to a component already installed on the same bike is not an upgrade/outcome path', () => {
  const result = recommendationCoverage({
    fitments: [
      { bike_id: 'bike', component_id: 'source-a', fitment_type: 'factory_installed' },
      { bike_id: 'bike', component_id: 'target-a', fitment_type: 'factory_installed' },
    ],
    aliases: [],
    compatibility: [{ source_component_id: 'source-a', target_component_id: 'target-a', status: 'compatible' }],
    activeModelIds: new Set(['bike']),
  });
  assert.equal(result.recommendationReadyBikeIds.size, 0);
});
