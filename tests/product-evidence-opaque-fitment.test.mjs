import assert from 'node:assert/strict';
import test from 'node:test';

import { compileProductEvidence } from '../catalog-harvester/product-evidence-compiler-core.mjs';

const config = { sources: [{ brand: 'Example Bikes', officialHosts: ['example-bikes.com'] }] };

const entry = {
  bike_id: 'example-bike-2026-global',
  brand: 'Example Bikes',
  manufacturer_url: 'https://example-bikes.com/bikes/example-2026',
  evidence_checked_at: '2026-08-17',
  status: 'ok',
  evidence: {
    media: [],
    canonical: {},
    components: {},
    opaque_components: [{
      category: 'fork',
      display_name: 'Factory Air 140mm',
      source_label: 'Fork',
      source_value: 'Factory Air 140mm',
      manufacturer_unstated: true,
      identity_scope: 'bike_specific_exact_listing',
    }],
    ambiguities: [],
  },
};

test('compiler materializes opaque OEM evidence only as bike-scoped factory fitment', () => {
  const sql = compileProductEvidence({
    run: { entries: [entry] },
    config,
    knownBikeIds: new Set([entry.bike_id]),
  });
  assert.match(sql, /Unspecified OEM/);
  assert.match(sql, /bike_specific_exact_listing/);
  assert.match(sql, /factory_installed/);
  assert.match(sql, /component manufacturer is not stated/i);
  assert.doesNotMatch(sql, /garage_component_aliases/);
  assert.doesNotMatch(sql, /garage_compatibility/);
  assert.doesNotMatch(sql, /manufacturer_approved/);
  assert.doesNotMatch(sql, /no_upgrade/);
});

test('opaque OEM component id is bike-scoped and deterministic', () => {
  const first = compileProductEvidence({ run: { entries: [entry] }, config, knownBikeIds: new Set([entry.bike_id]) });
  const second = compileProductEvidence({ run: { entries: [structuredClone(entry)] }, config, knownBikeIds: new Set([entry.bike_id]) });
  const idPattern = /oem-bike-example-bike-2026-global-fork-[a-f0-9]{10}/;
  assert.match(first, idPattern);
  assert.equal(first.match(idPattern)?.[0], second.match(idPattern)?.[0]);
});
