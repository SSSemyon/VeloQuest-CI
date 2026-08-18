import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProductEvidenceManifest } from '../catalog-harvester/product-evidence-manifest.mjs';

const config = {
  batchSize: 100,
  sources: [
    { brand: 'Specialized', officialHosts: ['specialized.com', 'www.specialized.com'], strategy: 'exact-product' },
    { brand: 'BMC', officialHosts: ['bmc-switzerland.com', 'us.bmc-switzerland.com'], strategy: 'exact-product-archive' },
    { brand: 'Rocky Mountain', officialHosts: ['bikes.com'], strategy: 'listing' },
  ],
};

const queue = {
  entries: [
    { id: 'a', brand: 'Specialized', model: 'Example A', model_year: 2026, manufacturer_url: 'https://www.specialized.com/us/en/example-a/p/1', evidence_scope: 'product_candidate', priority_score: 345, gaps: ['photo', 'frame_material'] },
    { id: 'b', brand: 'BMC', model: 'Example B', model_year: 2025, manufacturer_url: 'https://us.bmc-switzerland.com/products/example-b', evidence_scope: 'product_candidate', priority_score: 330, gaps: ['exact_fitment'] },
    { id: 'c', brand: 'Rocky Mountain', model: 'Archive C', model_year: 2024, manufacturer_url: 'https://bikes.com/collections/2024-bikes', evidence_scope: 'official_index_or_archive', priority_score: 50, gaps: ['photo'] },
    { id: 'd', brand: 'Specialized', model: 'Copied D', model_year: 2026, manufacturer_url: 'https://example.com/copied', evidence_scope: 'product_candidate', priority_score: 400, gaps: ['photo'] },
    { id: 'e', brand: 'Specialized', model: 'Example E', model_year: 2026, manufacturer_url: 'https://www.specialized.com/us/en/example-e/p/5', evidence_scope: 'product_candidate', priority_score: 100, gaps: ['recommendation_outcome'] },
    { id: 'f', brand: 'Rocky Mountain', model: 'Element Carbon 70', model_year: 2025, manufacturer_url: 'https://bikes.com/products/element-carbon-70', evidence_scope: 'official_page_unclassified', priority_score: 320, gaps: ['photo', 'wheel_size', 'exact_fitment'] },
  ],
};

test('manifest keeps safe exact/unclassified official pages with model identity in priority order', () => {
  const manifest = buildProductEvidenceManifest({ queue, config, limit: 50 });
  assert.deepEqual(manifest.entries.map((entry) => entry.bike_id), ['a', 'b', 'f']);
  assert.deepEqual(manifest.entries[0].requested_gaps, ['photo', 'frame_material']);
  assert.equal(manifest.entries[0].model, 'Example A');
  assert.equal(manifest.entries[0].model_year, 2026);
  assert.equal(manifest.entries[2].evidence_scope, 'official_page_unclassified');
});

test('manifest treats spec_evidence as an extractable exact-product gap', () => {
  const provenanceQueue = {
    entries: [{
      id: 'spec-gap',
      brand: 'Specialized',
      model: 'Example Spec Gap',
      model_year: 2026,
      manufacturer_url: 'https://www.specialized.com/us/en/example-spec-gap/p/7',
      evidence_scope: 'product_candidate',
      priority_score: 390,
      gaps: ['spec_evidence'],
    }],
  };
  const manifest = buildProductEvidenceManifest({ queue: provenanceQueue, config, limit: 50 });
  assert.equal(manifest.entries.length, 1);
  assert.deepEqual(manifest.entries[0].requested_gaps, ['spec_evidence']);
});

test('manifest excludes archive/index pages and recommendation-only gaps', () => {
  const manifest = buildProductEvidenceManifest({ queue, config, limit: 50 });
  assert.equal(manifest.entries.some((entry) => entry.bike_id === 'c'), false);
  assert.equal(manifest.entries.some((entry) => entry.bike_id === 'e'), false);
});

test('manifest rotates previously failed evidence behind fresh candidates', () => {
  const deferrals = {
    schema_version: 1,
    max_auto_attempts: 3,
    entries: [{ path: 'product_evidence', bike_id: 'a', attempts: 1, manual_resolution_required: false }],
  };
  const manifest = buildProductEvidenceManifest({ queue, config, deferrals, limit: 50 });
  assert.deepEqual(manifest.entries.map((entry) => entry.bike_id), ['b', 'f', 'a']);
  assert.equal(manifest.entries.at(-1).retry_attempts, 1);
});

test('manifest skips manual-resolution rows from automation without changing the source queue', () => {
  const deferrals = {
    schema_version: 1,
    max_auto_attempts: 3,
    entries: [{ path: 'product_evidence', bike_id: 'a', attempts: 3, manual_resolution_required: true }],
  };
  const manifest = buildProductEvidenceManifest({ queue, config, deferrals, limit: 50 });
  assert.equal(manifest.entries.some((entry) => entry.bike_id === 'a'), false);
  assert.equal(queue.entries.some((entry) => entry.id === 'a'), true);
});

test('manifest limit is deterministic', () => {
  const manifest = buildProductEvidenceManifest({ queue, config, limit: 1 });
  assert.deepEqual(manifest.entries.map((entry) => entry.bike_id), ['a']);
});

test('manifest never exceeds configured Garage evidence batch size', () => {
  const many = {
    entries: Array.from({ length: 150 }, (_, index) => ({
      id: `bike-${String(index).padStart(3, '0')}`,
      brand: 'Specialized',
      model: `Bike ${index}`,
      model_year: 2026,
      manufacturer_url: `https://www.specialized.com/us/en/bike-${index}/p/${index}`,
      evidence_scope: 'product_candidate',
      priority_score: 1000 - index,
      gaps: ['photo', 'frame_material', 'wheel_size', 'drivetrain', 'brakes', 'exact_fitment'],
    })),
  };

  const manifest = buildProductEvidenceManifest({ queue: many, config, limit: 1000 });
  assert.equal(manifest.entries.length, 100);
  assert.equal(manifest.batch_size, 100);
  assert.equal(manifest.entries[0].bike_id, 'bike-000');
  assert.equal(manifest.entries.at(-1).bike_id, 'bike-099');
});
