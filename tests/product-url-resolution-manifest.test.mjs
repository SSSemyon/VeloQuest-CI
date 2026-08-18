import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProductUrlResolutionManifest } from '../catalog-harvester/product-url-resolution-manifest.mjs';

const config = {
  batchSize: 100,
  sources: [{ brand: 'Rocky Mountain', officialHosts: ['bikes.com'] }],
};

const queue = {
  generated_from_evidence_through: '2026-08-17',
  entries: [
    { id: 'a', brand: 'Rocky Mountain', model: 'Element Carbon 70', model_year: 2025, manufacturer_url: 'https://bikes.com/collections/2025-bikes', evidence_scope: 'official_index_or_archive', priority_score: 250, gaps: ['photo', 'wheel_size'] },
    { id: 'b', brand: 'Rocky Mountain', model: 'Instinct Carbon 50', model_year: 2024, manufacturer_url: 'https://bikes.com/collections/2024-bikes', evidence_scope: 'official_index_or_archive', priority_score: 200, gaps: ['exact_fitment'] },
    { id: 'c', brand: 'Rocky Mountain', model: 'Already Exact', model_year: 2025, manufacturer_url: 'https://bikes.com/products/exact', evidence_scope: 'product_candidate', priority_score: 999, gaps: ['photo'] },
    { id: 'd', brand: 'Rocky Mountain', model: 'Outcome Only', model_year: 2025, manufacturer_url: 'https://bikes.com/archive', evidence_scope: 'official_index_or_archive', priority_score: 300, gaps: ['recommendation_outcome'] },
    { id: 'e', brand: 'Rocky Mountain', model: 'Legacy Provenance', model_year: 2025, manufacturer_url: 'https://bikes.com/collections/2025-bikes', evidence_scope: 'official_index_or_archive', priority_score: 225, gaps: ['spec_evidence'] },
  ],
};

test('resolution manifest selects archive/index rows with product-extractable or spec-provenance gaps', () => {
  const manifest = buildProductUrlResolutionManifest({ queue, config, limit: 100 });
  assert.deepEqual(manifest.entries.map((entry) => entry.bike_id), ['a', 'e', 'b']);
  assert.equal(manifest.entries[0].model, 'Element Carbon 70');
  assert.equal(manifest.entries[0].model_year, 2025);
  assert.equal(manifest.entries[0].source_url, 'https://bikes.com/collections/2025-bikes');
  assert.deepEqual(manifest.entries[1].requested_gaps, ['spec_evidence']);
});

test('resolution manifest rotates failed archive lookups behind fresh rows', () => {
  const deferrals = {
    schema_version: 1,
    max_auto_attempts: 3,
    entries: [{ path: 'url_resolution', bike_id: 'a', attempts: 1, manual_resolution_required: false }],
  };
  const manifest = buildProductUrlResolutionManifest({ queue, config, deferrals, limit: 100 });
  assert.deepEqual(manifest.entries.map((entry) => entry.bike_id), ['e', 'b', 'a']);
  assert.equal(manifest.entries.at(-1).url_retry_attempts, 1);
});

test('resolution manifest removes automated rows after either archive or resolved-product path needs manual source work', () => {
  for (const path of ['url_resolution', 'resolved_product_evidence']) {
    const deferrals = {
      schema_version: 1,
      max_auto_attempts: 3,
      entries: [{ path, bike_id: 'a', attempts: 3, manual_resolution_required: true }],
    };
    const manifest = buildProductUrlResolutionManifest({ queue, config, deferrals, limit: 100 });
    assert.equal(manifest.entries.some((entry) => entry.bike_id === 'a'), false);
    assert.equal(queue.entries.some((entry) => entry.id === 'a'), true);
  }
});

test('resolution manifest never exceeds reviewed 100-row batch size', () => {
  const many = {
    entries: Array.from({ length: 140 }, (_, index) => ({
      id: `bike-${index}`,
      brand: 'Rocky Mountain',
      model: `Model ${index}`,
      model_year: 2025,
      manufacturer_url: 'https://bikes.com/archive/2025',
      evidence_scope: 'official_index_or_archive',
      priority_score: 1000 - index,
      gaps: ['photo'],
    })),
  };
  const manifest = buildProductUrlResolutionManifest({ queue: many, config, limit: 1000 });
  assert.equal(manifest.entries.length, 100);
  assert.equal(manifest.batch_size, 100);
});
