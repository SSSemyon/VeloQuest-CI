import assert from 'node:assert/strict';
import test from 'node:test';

import { runComponentCompatibilityManifest } from '../catalog-harvester/component-compatibility-runner.mjs';

const faqHtml = `
  ADVENT X is compatible with standard 10 speed cassette spacing.
  We suggest using a cassette with a max cog ranging between 46t and 48t.
  You can go smaller, but it will negatively affect shifting.
  42-46t for Acolyte and Advent. 46-48t for ADVENT X.
  If you exceed the max cog specification, you can stress the system, damage your derailleur, and negatively affect shifting.
`;

const source = { id: 'microshift-rd-advent-x', brand: 'microSHIFT', model: 'ADVENT X', display_name: 'microSHIFT ADVENT X', category: 'rear_derailleur', specs: { speeds: 10 }, evidence_url: 'https://www.microshift.com/models/rd-m6205am/' };
const target = { id: 'example-cs-10-48', brand: 'Example', model: '10-speed 11-48T', display_name: '10-speed 11-48T', category: 'cassette', specs: { speeds: 10 }, evidence_url: 'https://example.com/cs-10-48' };

test('runner resolves microSHIFT ADVENT X from one official FAQ fetch', async () => {
  const manifest = { entries: [{ component_id: source.id, brand: 'microSHIFT', model: source.model, category: source.category, impact_bikes: 3, bike_ids: ['a', 'b', 'c'] }] };
  const requested = [];
  const result = await runComponentCompatibilityManifest({
    manifest,
    componentRegistry: [source, target],
    fetchImpl: async (url) => {
      requested.push(url);
      return { ok: true, status: 200, text: async () => faqHtml };
    },
    checkedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'resolved');
  assert.equal(result.entries[0].evidence_url, 'https://www.microshift.com/faqs/');
  assert.deepEqual(result.entries[0].pairs.map((pair) => [pair.target_component_id, pair.status]), [
    ['example-cs-10-48', 'compatible'],
  ]);
  assert.deepEqual(requested, ['https://www.microshift.com/faqs/']);
});

test('runner leaves unsupported microSHIFT family fail-closed', async () => {
  const unknown = { ...source, id: 'microshift-rd-unknown', model: 'R8', display_name: 'microSHIFT R8', specs: { speeds: 8 } };
  const manifest = { entries: [{ component_id: unknown.id, brand: 'microSHIFT', model: unknown.model, category: unknown.category, impact_bikes: 1, bike_ids: ['x'] }] };
  const result = await runComponentCompatibilityManifest({
    manifest,
    componentRegistry: [unknown, target],
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => faqHtml }),
    checkedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'unsupported_adapter');
  assert.equal(result.entries[0].pairs, undefined);
});

test('runner fails closed when the microSHIFT FAQ cannot be fetched', async () => {
  const manifest = { entries: [{ component_id: source.id, brand: 'microSHIFT', model: source.model, category: source.category, impact_bikes: 1, bike_ids: ['a'] }] };
  const result = await runComponentCompatibilityManifest({
    manifest,
    componentRegistry: [source, target],
    fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' }),
    checkedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'fetch_error');
  assert.equal(result.entries[0].evidence_url, 'https://www.microshift.com/faqs/');
});
