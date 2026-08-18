import assert from 'node:assert/strict';
import test from 'node:test';

import { runComponentCompatibilityManifest } from '../catalog-harvester/component-compatibility-runner.mjs';

const manifest = {
  entries: [
    { component_id: 'shimano-rd-r7150', brand: 'Shimano', model: 'RD-R7150', category: 'rear_derailleur', impact_bikes: 3, bike_ids: ['a', 'b', 'c'] },
    { component_id: 'sram-rd-gx-1-b2', brand: 'SRAM', model: 'RD-GX-1-B2', category: 'rear_derailleur', impact_bikes: 2, bike_ids: ['d', 'e'] },
  ],
};
const componentRegistry = [
  { id: 'shimano-rd-r7150', brand: 'Shimano', model: 'RD-R7150', display_name: '105 Di2 RD-R7150', category: 'rear_derailleur', specs: { speeds: 12 } },
  { id: 'shimano-cs-r7101-12-11-34', brand: 'Shimano', model: 'CS-R7101-12 11-34T', display_name: '105 CS-R7101-12 11-34T', category: 'cassette', specs: { speeds: 12, range: '11-34T' } },
  { id: 'shimano-cs-hg710-12', brand: 'Shimano', model: 'CS-HG710-12 11-36T', display_name: 'CS-HG710-12 11-36T', category: 'cassette', specs: { speeds: 12, range: '11-36T' } },
];
const c254 = `
  <h3>12-speed C-648</h3>
  <table>
    <tr><th>Gear teeth</th><th>RD-R7150</th></tr>
    <tr><td>11-34T</td><td>✔</td></tr>
    <tr><td>11-36T</td><td>✔</td></tr>
  </table>`;

test('runner fetches strict Shimano chart once and resolves exact registered pairs only', async () => {
  let fetches = 0;
  const result = await runComponentCompatibilityManifest({
    manifest,
    componentRegistry,
    fetchImpl: async (url) => {
      fetches += 1;
      assert.equal(url, 'https://productinfo.shimano.com/en/compatibility/C-254');
      return { ok: true, status: 200, text: async () => c254 };
    },
    checkedAt: '2026-08-17',
  });
  assert.equal(fetches, 1);
  assert.equal(result.summary.resolved, 1);
  assert.equal(result.summary.unsupported_adapter, 1);
  const shimano = result.entries.find((entry) => entry.component_id === 'shimano-rd-r7150');
  assert.equal(shimano.status, 'resolved');
  assert.deepEqual(shimano.pairs.map((pair) => pair.target_component_id).sort(), [
    'shimano-cs-hg710-12',
    'shimano-cs-r7101-12-11-34',
  ]);
  assert.equal(result.entries.find((entry) => entry.component_id === 'sram-rd-gx-1-b2').status, 'unsupported_adapter');
});

test('runner records official fetch failure and emits no guessed pairs', async () => {
  const result = await runComponentCompatibilityManifest({
    manifest: { entries: [manifest.entries[0]] },
    componentRegistry,
    fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' }),
    checkedAt: '2026-08-17',
  });
  assert.equal(result.entries[0].status, 'fetch_error');
  assert.match(result.entries[0].error, /503/);
  assert.equal(result.entries[0].pairs, undefined);
});
