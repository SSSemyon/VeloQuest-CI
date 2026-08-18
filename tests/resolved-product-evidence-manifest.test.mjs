import assert from 'node:assert/strict';
import test from 'node:test';

import { buildResolvedProductEvidenceManifest } from '../catalog-harvester/resolved-product-evidence-manifest.mjs';

const run = {
  schema_version: 1,
  generated_at: '2026-08-17',
  entries: [
    {
      bike_id: 'a', brand: 'Rocky Mountain', model: 'Element Carbon 70', model_year: 2025,
      source_url: 'https://bikes.com/archive/2025', status: 'resolved',
      manufacturer_url: 'https://bikes.com/products/element-carbon-70',
    },
    {
      bike_id: 'b', brand: 'Rocky Mountain', model: 'Instinct Carbon 50', model_year: 2025,
      source_url: 'https://bikes.com/archive/2025', status: 'ambiguous', candidates: [],
    },
  ],
};

test('resolved evidence manifest contains only resolved exact official product URLs', () => {
  const manifest = buildResolvedProductEvidenceManifest(run);
  assert.equal(manifest.entries.length, 1);
  assert.deepEqual(manifest.entries[0], {
    bike_id: 'a',
    brand: 'Rocky Mountain',
    model: 'Element Carbon 70',
    model_year: 2025,
    manufacturer_url: 'https://bikes.com/products/element-carbon-70',
    evidence_scope: 'resolved_product_candidate',
  });
});

test('resolved evidence manifest can be empty without manufacturing evidence', () => {
  const empty = buildResolvedProductEvidenceManifest({ ...run, entries: [run.entries[1]] });
  assert.deepEqual(empty.entries, []);
  assert.equal(empty.schema_version, 1);
});

test('resolved evidence manifest refuses more than 100 accepted entries', () => {
  const entries = Array.from({ length: 101 }, (_, index) => ({
    bike_id: `bike-${index}`, brand: 'Rocky Mountain', model: `Model ${index}`, model_year: 2025,
    source_url: 'https://bikes.com/archive/2025', status: 'resolved',
    manufacturer_url: `https://bikes.com/products/model-${index}`,
  }));
  assert.throws(() => buildResolvedProductEvidenceManifest({ schema_version: 1, generated_at: '2026-08-17', entries }), /more than 100/i);
});
