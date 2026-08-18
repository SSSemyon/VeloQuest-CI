import assert from 'node:assert/strict';
import test from 'node:test';

import { runEvidenceManifest } from '../catalog-harvester/product-evidence-runner.mjs';

const config = {
  maxConcurrentHosts: 1,
  sources: [{ brand: 'Specialized', officialHosts: ['specialized.com', 'www.specialized.com'] }],
};

const manifest = {
  entries: [{
    bike_id: 'specialized-example-2026-global',
    brand: 'Specialized',
    model: 'Example',
    model_year: 2026,
    evidence_scope: 'product_candidate',
    manufacturer_url: 'https://www.specialized.com/us/en/example/p/123',
  }],
};

test('runner rejects an exact model when neither page identity nor URL proves the expected model year', async () => {
  const html = `
    <title>Example | Specialized</title>
    <meta property="og:title" content="Example">
    <meta property="og:image" content="https://assets.specialized.com/example.webp">
    <table><tr><th>Frame</th><td>FACT Carbon</td></tr></table>`;
  const result = await runEvidenceManifest({
    manifest,
    config,
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => html }),
    evidenceCheckedAt: '2026-08-18',
  });

  assert.equal(result.entries[0].status, 'identity_mismatch');
  assert.match(result.entries[0].error, /confirm model year/i);
  assert.deepEqual(result.entries[0].evidence.media, []);
});
