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
    manufacturer_url: 'https://www.specialized.com/us/en/example/p/123',
    evidence_scope: 'product_candidate',
  }],
};

test('runner keeps useful specs but refuses a generic social image as photo evidence', async () => {
  const html = `
    <html><head>
      <title>2026 Example | Specialized</title>
      <meta property="og:image" content="https://assets.specialized.com/social-share.jpg">
    </head><body>
      <h1>2026 Example</h1>
      <table>
        <tr><th>Frame</th><td>FACT 11m Carbon</td></tr>
        <tr><th>Wheel Size</th><td>29</td></tr>
        <tr><th>Rear Derailleur</th><td>SRAM GX Eagle Transmission</td></tr>
        <tr><th>Brakes</th><td>SRAM Maven Silver</td></tr>
      </table>
    </body></html>`;
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => html });
  const result = await runEvidenceManifest({ manifest, config, fetchImpl, evidenceCheckedAt: '2026-08-17' });
  assert.equal(result.entries[0].status, 'ok');
  assert.equal(result.entries[0].evidence.media.length, 0);
  assert.equal(result.entries[0].evidence.canonical.frame_material.value, 'Carbon');
});

test('runner accepts a model-bound gallery image only after the exact product identity is confirmed', async () => {
  const html = `
    <html><head><title>2026 Example | Specialized</title></head><body>
      <h1>2026 Example</h1>
      <img src="https://assets.specialized.com/gallery/other-bike.webp" alt="Other Bike">
      <img data-src="https://assets.specialized.com/gallery/example-side.webp" alt="Example side view">
      <img src="https://assets.specialized.com/banners/example-banner.webp" alt="Example">
      <table><tr><th>Frame</th><td>FACT 11m Carbon</td></tr></table>
    </body></html>`;
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => html });
  const result = await runEvidenceManifest({ manifest, config, fetchImpl, evidenceCheckedAt: '2026-08-18' });
  assert.equal(result.entries[0].status, 'ok');
  assert.deepEqual(result.entries[0].evidence.media.map((item) => item.image_url), [
    'https://assets.specialized.com/gallery/example-side.webp',
  ]);
  assert.equal(result.entries[0].evidence.media[0].discovered_from, 'gallery');
});

test('runner never accepts gallery media when the official page fails model identity', async () => {
  const html = `
    <html><head><title>2026 Different Bike | Specialized</title></head><body>
      <h1>2026 Different Bike</h1>
      <img src="https://assets.specialized.com/gallery/example-side.webp" alt="Example side view">
    </body></html>`;
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => html });
  const result = await runEvidenceManifest({ manifest, config, fetchImpl, evidenceCheckedAt: '2026-08-18' });
  assert.equal(result.entries[0].status, 'identity_mismatch');
});
