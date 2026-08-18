import assert from 'node:assert/strict';
import test from 'node:test';

import { runEvidenceManifest } from '../catalog-harvester/product-evidence-runner.mjs';

const config = {
  maxConcurrentHosts: 1,
  sources: [{ brand: 'Specialized', officialHosts: ['www.specialized.com'] }],
};

const baseEntry = {
  bike_id: 'specialized-example-2026-global',
  brand: 'Specialized',
  model: 'Example',
  model_year: 2026,
  manufacturer_url: 'https://www.specialized.com/us/en/example/example-pro/p/124',
};

const siblingHtml = `
  <title>2026 Example Pro | Specialized</title>
  <meta property="og:title" content="2026 Example Pro">
  <meta property="og:image" content="https://assets.specialized.com/example-pro.webp">
  <h1>Example Pro</h1>
  <table><tr><th>Wheel Size</th><td>29</td></tr></table>`;

test('page model identity overrides a weaker family segment in the official URL path', async () => {
  const result = await runEvidenceManifest({
    manifest: { entries: [baseEntry] },
    config,
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => siblingHtml }),
    evidenceCheckedAt: '2026-08-18',
  });

  assert.equal(result.entries[0].status, 'identity_mismatch');
  assert.match(result.entries[0].error, /model identity/i);
  assert.deepEqual(result.entries[0].evidence.media, []);
});
