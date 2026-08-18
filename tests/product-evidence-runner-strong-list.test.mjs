import assert from 'node:assert/strict';
import test from 'node:test';

import { runEvidenceManifest } from '../catalog-harvester/product-evidence-runner.mjs';

const config = { maxConcurrentHosts: 1, sources: [{ brand: 'Example', officialHosts: ['example.com'] }] };
const manifest = { entries: [{ bike_id: 'example-bike-2026', brand: 'Example', model: 'Example Bike', model_year: 2026, manufacturer_url: 'https://example.com/example-bike-2026', evidence_scope: 'product_candidate' }] };

test('runner fills missing core finder fields from exact strong-list labels on an identity-confirmed page', async () => {
  const html = `
    <html><head><title>2026 Example Bike</title></head><body>
      <h1>2026 Example Bike</h1>
      <ul>
        <li><strong>Frame</strong> AL 6061 Alloy</li>
        <li><strong>Wheel Size</strong> 29</li>
        <li><strong>Rear Derailleur</strong> Shimano Deore RD-M6100</li>
        <li><strong>Brakes</strong> Shimano MT200 hydraulic disc</li>
      </ul>
    </body></html>`;
  const result = await runEvidenceManifest({ manifest, config, fetchImpl: async () => ({ ok: true, status: 200, text: async () => html }), evidenceCheckedAt: '2026-08-18' });
  assert.equal(result.entries[0].status, 'ok');
  assert.equal(result.entries[0].evidence.canonical.frame_material.value, 'Aluminum');
  assert.equal(result.entries[0].evidence.canonical.wheel_size.value, '29');
  assert.equal(result.entries[0].evidence.canonical.drivetrain.value, 'Shimano Deore RD-M6100');
  assert.equal(result.entries[0].evidence.canonical.brakes.value, 'Shimano MT200 hydraulic disc');
  assert.equal(result.entries[0].evidence.components.rear_derailleur.brand, 'Shimano');
  assert.equal(result.entries[0].evidence.opaque_components.some((item) => item.category === 'rear_derailleur'), false);
});

test('runner exposes unknown strong-list component rows to bike-scoped opaque OEM fitment extraction', async () => {
  const html = `
    <html><head><title>2026 Example Bike</title></head><body>
      <h1>2026 Example Bike</h1>
      <ul>
        <li><strong>Frame</strong> AL 6061 Alloy</li>
        <li><strong>Fork</strong> Custom Factory Air 140mm</li>
        <li><strong>Optimized geometry</strong> Fast and stable</li>
      </ul>
    </body></html>`;
  const result = await runEvidenceManifest({ manifest, config, fetchImpl: async () => ({ ok: true, status: 200, text: async () => html }), evidenceCheckedAt: '2026-08-18' });
  assert.equal(result.entries[0].status, 'ok');
  assert.deepEqual(result.entries[0].evidence.opaque_components.map((item) => [item.category, item.display_name, item.identity_scope]), [
    ['fork', 'Custom Factory Air 140mm', 'bike_specific_exact_listing'],
  ]);
});

test('runner marks conflicting strong-list evidence ambiguous instead of overwriting primary table evidence', async () => {
  const html = `
    <html><head><title>2026 Example Bike</title></head><body>
      <h1>2026 Example Bike</h1>
      <table><tr><th>Wheel Size</th><td>27.5</td></tr></table>
      <ul><li><strong>Wheel Size</strong>29</li></ul>
    </body></html>`;
  const result = await runEvidenceManifest({ manifest, config, fetchImpl: async () => ({ ok: true, status: 200, text: async () => html }), evidenceCheckedAt: '2026-08-18' });
  assert.equal(result.entries[0].status, 'ambiguous');
  assert.equal(result.entries[0].evidence.canonical.wheel_size.value, '27.5');
  assert.ok(result.entries[0].evidence.ambiguities.some((item) => item.field === 'wheel_size'));
});
