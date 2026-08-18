import assert from 'node:assert/strict';
import test from 'node:test';

import { buildManualResolutionQueue } from '../catalog-harvester/manual-resolution-queue-core.mjs';

const enrichmentQueue = {
  catalog_models: 3,
  entries: [
    { id: 'bike-a', brand: 'Brand A', model: 'A', model_year: 2026, manufacturer_url: 'https://a.example/model-a', gaps: ['photo', 'exact_fitment'] },
    { id: 'bike-b', brand: 'Brand B', model: 'B', model_year: 2025, manufacturer_url: 'https://b.example/model-b', gaps: ['recommendation_outcome'] },
    { id: 'bike-c', brand: 'Brand C', model: 'C', model_year: 2024, manufacturer_url: 'https://c.example/model-c', gaps: [] },
  ],
};

const deferrals = {
  entries: [
    { path: 'product_evidence', bike_id: 'bike-a', attempts: 3, manual_resolution_required: true, last_status: 'identity_mismatch', last_error: 'wrong page', last_checked_at: '2026-08-17' },
    { path: 'url_resolution', bike_id: 'bike-a', attempts: 3, manual_resolution_required: true, last_status: 'no_match', last_error: null, last_checked_at: '2026-08-17' },
    { path: 'product_evidence', bike_id: 'bike-b', attempts: 1, manual_resolution_required: false, last_status: 'fetch_error' },
  ],
};

const compatibilityManifest = {
  unresolved_sources: [
    { component_id: 'component-b', brand: 'Example', model: 'B', category: 'fork', impact_bikes: 1, bike_ids: ['bike-b'], reason: 'official compatibility source not registered', retry_attempts: 0 },
  ],
};

test('manual queue never drops exhausted bikes or unresolved compatibility demand', () => {
  const result = buildManualResolutionQueue({ enrichmentQueue, deferrals, compatibilityManifest });
  assert.equal(result.target_percent, 100);
  assert.equal(result.catalog_models, 3);
  assert.equal(result.unresolved_bikes, 2);
  assert.deepEqual(result.bike_evidence.map((item) => item.bike_id), ['bike-a']);
  assert.deepEqual(result.bike_evidence[0].gaps, ['exact_fitment', 'photo']);
  assert.equal(result.bike_evidence[0].exhausted_paths.length, 2);
  assert.deepEqual(result.compatibility_sources[0].bike_ids, ['bike-b']);
});

test('non-exhausted retries do not enter manual queue', () => {
  const result = buildManualResolutionQueue({ enrichmentQueue, deferrals, compatibilityManifest: { unresolved_sources: [] } });
  assert.equal(result.bike_evidence.some((item) => item.bike_id === 'bike-b'), false);
});

test('category-only gaps enter manual queue immediately instead of becoming invisible core blockers', () => {
  const categoryQueue = {
    catalog_models: 1,
    entries: [{
      id: 'bike-category', brand: 'Brand C', model: 'Unknown Type', model_year: 2026,
      manufacturer_url: 'https://c.example/unknown-type', gaps: ['category'],
    }],
  };
  const result = buildManualResolutionQueue({
    enrichmentQueue: categoryQueue,
    deferrals: { entries: [] },
    compatibilityManifest: { unresolved_sources: [] },
  });
  assert.equal(result.unresolved_bikes, 1);
  assert.deepEqual(result.bike_evidence[0].gaps, ['category']);
  assert.deepEqual(result.bike_evidence[0].exhausted_paths, [{
    path: 'manual_category_classification',
    attempts: 0,
    last_status: 'manual_resolution_required',
    last_error: null,
    last_checked_at: null,
  }]);
});
