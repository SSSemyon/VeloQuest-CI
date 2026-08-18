import assert from 'node:assert/strict';
import test from 'node:test';

import {
  runEvidenceManifest,
  validateEvidenceManifest,
} from '../catalog-harvester/product-evidence-runner.mjs';

const config = {
  maxConcurrentHosts: 2,
  sources: [
    { brand: 'Specialized', officialHosts: ['specialized.com', 'www.specialized.com'] },
  ],
};

const manifest = {
  entries: [
    {
      bike_id: 'specialized-example-2026-global',
      brand: 'Specialized',
      model: 'Example',
      model_year: 2026,
      evidence_scope: 'product_candidate',
      manufacturer_url: 'https://www.specialized.com/us/en/example/p/123',
    },
  ],
};

const evidenceHtml = `
  <title>2026 Example | Specialized</title>
  <meta property="og:title" content="2026 Example">
  <meta property="og:image" content="https://assets.specialized.com/example.webp">
  <table>
    <tr><th>Frame</th><td>FACT 11m Carbon</td></tr>
    <tr><th>Wheel Size</th><td>29</td></tr>
    <tr><th>Rear Derailleur</th><td>SRAM GX Eagle Transmission</td></tr>
    <tr><th>Brakes</th><td>SRAM Maven Silver</td></tr>
  </table>`;

test('manifest validation rejects non-official product URLs', () => {
  assert.throws(() => validateEvidenceManifest({ entries: [{
    bike_id: 'bad',
    brand: 'Specialized',
    model: 'Bad',
    model_year: 2026,
    manufacturer_url: 'https://example.com/not-official',
  }] }, config), /non-official manufacturer_url/);
});

test('manifest validation requires exact bike model and supported model year', () => {
  assert.throws(() => validateEvidenceManifest({ entries: [{
    bike_id: 'missing-model', brand: 'Specialized', model_year: 2026,
    manufacturer_url: 'https://www.specialized.com/missing-model',
  }] }, config), /model required/);
  assert.throws(() => validateEvidenceManifest({ entries: [{
    bike_id: 'bad-year', brand: 'Specialized', model: 'Example', model_year: 2019,
    manufacturer_url: 'https://www.specialized.com/example',
  }] }, config), /model_year must be 2020-2026/);
});

test('runner produces deterministic evidence candidate only when page identity matches bike', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => evidenceHtml });

  const result = await runEvidenceManifest({
    manifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
  });

  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].status, 'ok');
  assert.equal(result.entries[0].bike_id, 'specialized-example-2026-global');
  assert.equal(result.entries[0].model, 'Example');
  assert.equal(result.entries[0].model_year, 2026);
  assert.equal(result.entries[0].evidence_checked_at, '2026-08-17');
  assert.equal(result.entries[0].evidence.canonical.frame_material.value, 'Carbon');
  assert.equal(result.entries[0].evidence.media[0].image_url, 'https://assets.specialized.com/example.webp');
});

test('runner rejects official page for a different model instead of trusting its media/specs', async () => {
  const html = evidenceHtml.replaceAll('2026 Example', '2026 Stumpjumper');
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => html });
  const wrongUrlManifest = structuredClone(manifest);
  wrongUrlManifest.entries[0].manufacturer_url = 'https://www.specialized.com/us/en/stumpjumper/p/999';

  const result = await runEvidenceManifest({
    manifest: wrongUrlManifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
  });
  assert.equal(result.entries[0].status, 'identity_mismatch');
  assert.match(result.entries[0].error, /model identity/i);
});

test('runner rejects a sibling trim whose name only has the expected model as a prefix', async () => {
  const html = evidenceHtml
    .replaceAll('2026 Example', '2026 Example Pro')
    .replaceAll('example.webp', 'example-pro.webp');
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => html });
  const siblingManifest = structuredClone(manifest);
  siblingManifest.entries[0].manufacturer_url = 'https://www.specialized.com/us/en/example-pro/p/124';

  const result = await runEvidenceManifest({
    manifest: siblingManifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
  });

  assert.equal(result.entries[0].status, 'identity_mismatch');
  assert.match(result.entries[0].error, /model identity/i);
  assert.deepEqual(result.entries[0].evidence.media, []);
});

test('runner accepts exact model identity wrapped by year, brand and title separators without relying on URL model text', async () => {
  const html = evidenceHtml
    .replace('<title>2026 Example | Specialized</title>', '<title>Specialized | 2026 Example - Mountain Bike</title>')
    .replace('<meta property="og:title" content="2026 Example">', '<meta property="og:title" content="Specialized 2026 Example">');
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => html });
  const wrappedManifest = structuredClone(manifest);
  wrappedManifest.entries[0].manufacturer_url = 'https://www.specialized.com/us/en/p/123';

  const result = await runEvidenceManifest({
    manifest: wrappedManifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
  });

  assert.equal(result.entries[0].status, 'ok');
});

test('runner preserves punctuation that is part of the exact model name', async () => {
  const punctuatedManifest = structuredClone(manifest);
  punctuatedManifest.entries[0].bike_id = 'specialized-c62-one-2026-global';
  punctuatedManifest.entries[0].model = 'C:62 ONE / EQ';
  punctuatedManifest.entries[0].manufacturer_url = 'https://www.specialized.com/us/en/p/777';
  const html = evidenceHtml
    .replaceAll('2026 Example', '2026 C:62 ONE / EQ')
    .replaceAll('example.webp', 'c62-one-eq.webp');
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => html });

  const result = await runEvidenceManifest({
    manifest: punctuatedManifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
  });

  assert.equal(result.entries[0].status, 'ok');
});

test('runner rejects an explicitly different model year even when model name matches', async () => {
  const html = evidenceHtml.replaceAll('2026 Example', '2025 Example');
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => html });
  const wrongYearManifest = structuredClone(manifest);
  wrongYearManifest.entries[0].manufacturer_url = 'https://www.specialized.com/us/en/2025/example/p/123';

  const result = await runEvidenceManifest({
    manifest: wrongYearManifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
  });
  assert.equal(result.entries[0].status, 'identity_mismatch');
  assert.match(result.entries[0].error, /model year/i);
});

test('runner records fetch failure instead of trusting partial evidence', async () => {
  const fetchImpl = async () => ({ ok: false, status: 404, text: async () => '' });
  const result = await runEvidenceManifest({
    manifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
  });
  assert.equal(result.entries[0].status, 'fetch_error');
  assert.match(result.entries[0].error, /404/);
  assert.equal(result.entries[0].evidence, undefined);
});

test('runner aborts a hung manufacturer request and continues fail closed', async () => {
  let aborted = false;
  const fetchImpl = async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      aborted = true;
      reject(new DOMException('aborted', 'AbortError'));
    }, { once: true });
  });

  const result = await runEvidenceManifest({
    manifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
    requestTimeoutMs: 5,
  });

  assert.equal(aborted, true);
  assert.equal(result.entries[0].status, 'fetch_error');
  assert.match(result.entries[0].error, /timeout/i);
  assert.equal(result.entries[0].evidence, undefined);
});

test('runner parallelizes different official hosts but stays sequential within one host', async () => {
  const multiHostManifest = {
    entries: [
      { bike_id: 'a', brand: 'Specialized', model: 'Example', model_year: 2026, manufacturer_url: 'https://specialized.com/example-a' },
      { bike_id: 'b', brand: 'Specialized', model: 'Example', model_year: 2026, manufacturer_url: 'https://specialized.com/example-b' },
      { bike_id: 'c', brand: 'Specialized', model: 'Example', model_year: 2026, manufacturer_url: 'https://www.specialized.com/example-c' },
    ],
  };
  let active = 0;
  let maxActive = 0;
  const activeByHost = new Map();
  const maxByHost = new Map();
  const fetchImpl = async (rawUrl) => {
    const host = new URL(rawUrl).hostname;
    active += 1;
    maxActive = Math.max(maxActive, active);
    const hostActive = (activeByHost.get(host) ?? 0) + 1;
    activeByHost.set(host, hostActive);
    maxByHost.set(host, Math.max(maxByHost.get(host) ?? 0, hostActive));
    await new Promise((resolve) => setTimeout(resolve, 10));
    active -= 1;
    activeByHost.set(host, hostActive - 1);
    return { ok: true, status: 200, text: async () => evidenceHtml };
  };

  const result = await runEvidenceManifest({
    manifest: multiHostManifest,
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
  });

  assert.ok(maxActive >= 2, 'different hosts should be processed concurrently');
  assert.equal(maxByHost.get('specialized.com'), 1, 'same-host requests must remain sequential');
  assert.deepEqual(result.entries.map((entry) => entry.bike_id), ['a', 'b', 'c'], 'result order must remain deterministic');
});
