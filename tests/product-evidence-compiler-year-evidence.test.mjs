import assert from 'node:assert/strict';
import test from 'node:test';

import { compileProductEvidence } from '../catalog-harvester/product-evidence-compiler-core.mjs';

const config = {
  sources: [{ brand: 'Specialized', officialHosts: ['specialized.com', 'www.specialized.com'] }],
};

const base = {
  bike_id: 'specialized-example-2026-global',
  brand: 'Specialized',
  model: 'Example',
  model_year: 2026,
  manufacturer_url: 'https://www.specialized.com/us/en/example/p/123',
  evidence_checked_at: '2026-08-18',
  status: 'ok',
  evidence: {
    identities: ['Example | Specialized'],
    source_url: 'https://www.specialized.com/us/en/example/p/123',
    model_year_evidence: {
      source_url: 'https://www.specialized.com/us/en/archive/2026',
      identity: '2026 Example | Specialized',
      evidence_scope: 'official_archive_link',
    },
    media: [],
    canonical: {},
    components: {},
    ambiguities: [],
  },
};

test('compiler accepts yearless exact page only with verified resolver year provenance and persists it', () => {
  const sql = compileProductEvidence({
    run: { schema_version: 1, generated_at: '2026-08-18', entries: [base] },
    config,
    knownBikeIds: new Set([base.bike_id]),
  });
  assert.match(sql, /"product_evidence_url":"https:\/\/www\.specialized\.com\/us\/en\/example\/p\/123"/);
  assert.match(sql, /"product_model_year_evidence":/);
  assert.match(sql, /official_archive_link/);
});

test('compiler rejects tampered resolver year provenance', () => {
  const bad = structuredClone(base);
  bad.evidence.model_year_evidence.identity = '2026 Example Pro | Specialized';
  assert.throws(() => compileProductEvidence({
    run: { schema_version: 1, generated_at: '2026-08-18', entries: [bad] },
    config,
    knownBikeIds: new Set([bad.bike_id]),
  }), /model-year evidence verification failed/i);
});

test('compiler rejects resolver year provenance from non-official source', () => {
  const bad = structuredClone(base);
  bad.evidence.model_year_evidence.source_url = 'https://example.com/archive/2026';
  assert.throws(() => compileProductEvidence({
    run: { schema_version: 1, generated_at: '2026-08-18', entries: [bad] },
    config,
    knownBikeIds: new Set([bad.bike_id]),
  }), /non-official model-year evidence source/i);
});
