import assert from 'node:assert/strict';
import test from 'node:test';

import { runProductUrlResolution } from '../catalog-harvester/product-url-resolution-runner.mjs';

const config = { sources: [{ brand: 'Rocky Mountain', officialHosts: ['bikes.com'] }] };
const manifest = {
  entries: [{
    bike_id: 'a',
    brand: 'Rocky Mountain',
    model: 'Element Carbon 70',
    model_year: 2025,
    source_url: 'https://bikes.com/archive/2025',
  }],
};

test('resolver preserves exact model/year proof when the exact product URL itself is yearless', async () => {
  const fetchImpl = async (url) => {
    assert.equal(url, 'https://bikes.com/archive/2025');
    return {
      ok: true,
      status: 200,
      text: async () => '<a href="/products/element-carbon-70">2025 Element Carbon 70</a>',
    };
  };
  const result = await runProductUrlResolution({
    manifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'resolved');
  assert.equal(result.entries[0].manufacturer_url, 'https://bikes.com/products/element-carbon-70');
  assert.deepEqual(result.entries[0].model_year_evidence, {
    source_url: 'https://bikes.com/archive/2025',
    identity: '2025 Element Carbon 70',
    evidence_scope: 'official_archive_link',
  });
});

test('resolver does not invent model-year proof when neither link text nor candidate URL contains the year', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    text: async () => '<a href="/products/element-carbon-70">Element Carbon 70</a>',
  });
  const result = await runProductUrlResolution({
    manifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'resolved');
  assert.equal(result.entries[0].model_year_evidence, undefined);
});
