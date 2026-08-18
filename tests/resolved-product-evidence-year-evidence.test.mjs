import assert from 'node:assert/strict';
import test from 'node:test';

import { buildResolvedProductEvidenceManifest } from '../catalog-harvester/resolved-product-evidence-manifest.mjs';

test('resolved product evidence manifest carries verified model-year provenance forward', () => {
  const manifest = buildResolvedProductEvidenceManifest({
    schema_version: 1,
    generated_at: '2026-08-18',
    entries: [{
      bike_id: 'a',
      brand: 'Rocky Mountain',
      model: 'Element Carbon 70',
      model_year: 2025,
      source_url: 'https://bikes.com/archive/2025',
      status: 'resolved',
      manufacturer_url: 'https://bikes.com/products/element-carbon-70',
      model_year_evidence: {
        source_url: 'https://bikes.com/archive/2025',
        identity: '2025 Element Carbon 70',
        evidence_scope: 'official_archive_link',
      },
    }],
  });
  assert.deepEqual(manifest.entries[0].model_year_evidence, {
    source_url: 'https://bikes.com/archive/2025',
    identity: '2025 Element Carbon 70',
    evidence_scope: 'official_archive_link',
  });
});
