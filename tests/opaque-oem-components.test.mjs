import assert from 'node:assert/strict';
import test from 'node:test';

import { extractOpaqueOemComponents } from '../catalog-harvester/opaque-oem-components.mjs';

test('keeps explicit unbranded OEM strings as bike-specific evidence candidates', () => {
  const result = extractOpaqueOemComponents({
    properties: [
      { label: 'Fork', value: 'Custom Factory Air 140mm' },
      { label: 'Rear Brake', value: 'HD-M275 hydraulic disc' },
      { label: 'Color', value: 'Black' },
    ],
    components: {},
  });
  assert.deepEqual(result.map((item) => [item.category, item.display_name]), [
    ['fork', 'Custom Factory Air 140mm'],
    ['brake_caliper', 'HD-M275 hydraulic disc'],
  ]);
  assert.equal(result[0].manufacturer_unstated, true);
  assert.equal(result[0].identity_scope, 'bike_specific_exact_listing');
});

test('does not duplicate a reusable recognized component already extracted', () => {
  const result = extractOpaqueOemComponents({
    properties: [{ label: 'Rear Derailleur', value: 'Shimano Deore RD-M6100' }],
    components: {
      rear_derailleur: { source_value: 'Shimano Deore RD-M6100', display_name: 'Shimano Deore RD-M6100' },
    },
  });
  assert.deepEqual(result, []);
});

test('ignores unknown placeholders instead of manufacturing fitment evidence', () => {
  const result = extractOpaqueOemComponents({
    properties: [
      { label: 'Fork', value: 'N/A' },
      { label: 'Cassette', value: 'Unknown' },
      { label: 'Motor', value: '-' },
    ],
    components: {},
  });
  assert.deepEqual(result, []);
});
