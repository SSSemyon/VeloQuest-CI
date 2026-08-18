import assert from 'node:assert/strict';
import test from 'node:test';

import { runComponentCompatibilityManifest } from '../catalog-harvester/component-compatibility-runner.mjs';

const c433 = '<html><body><h3>8-speed rear drivetrain [MTB]</h3><p>The rear derailleur for 8-speed can also be used for 7-speed drivetrain.</p></body></html>';
const officialTarget = { id: 'shimano-cs-hg200-7-12-32', brand: 'Shimano', model: 'CS-HG200-7 12-32T', display_name: 'CS-HG200-7 12-32T', category: 'cassette', specs: { speeds: 7, range: '12-32T' }, evidence_url: 'https://productinfo.shimano.com/en/product/CS-HG200-7' };

async function runOne(entry, source, targets = [officialTarget]) {
  const requested = [];
  const result = await runComponentCompatibilityManifest({
    manifest: { entries: [entry] },
    componentRegistry: [source, ...targets],
    fetchImpl: async (url) => {
      requested.push(url);
      return { ok: true, status: 200, text: async () => c433 };
    },
    checkedAt: '2026-08-17',
  });
  return { result, requested };
}

test('Shimano C-433 resolves an exact registered MTB 8-speed RD against an official Shimano 7-speed cassette target', async () => {
  const entry = { component_id: 'shimano-rd-m310', brand: 'Shimano', model: 'RD-M310', category: 'rear_derailleur', impact_bikes: 1, bike_ids: ['bike-a'] };
  const source = { id: 'shimano-rd-m310', brand: 'Shimano', model: 'RD-M310', display_name: 'ALTUS RD-M310', category: 'rear_derailleur', specs: { speeds: 8 } };
  const { result, requested } = await runOne(entry, source);
  assert.equal(result.entries[0].status, 'resolved');
  assert.equal(result.entries[0].evidence_url, 'https://productinfo.shimano.com/en/compatibility/C-433');
  assert.deepEqual(result.entries[0].pairs.map((pair) => [pair.source_component_id, pair.target_component_id, pair.status]), [
    ['shimano-rd-m310', 'shimano-cs-hg200-7-12-32', 'compatible'],
  ]);
  assert.deepEqual(requested, ['https://productinfo.shimano.com/en/compatibility/C-433']);
});

test('WELT exact OEM Shimano ESSA RD-U2000-GS can use C-433 directly without a canonical alias', async () => {
  const entry = { component_id: 'oem-welt-voyager-1-0-2026-rd', brand: 'Shimano', model: 'Essa RD-U2000-GS', category: 'rear_derailleur', impact_bikes: 1, bike_ids: ['welt-voyager-1-0-2026-ru'] };
  const source = { id: 'oem-welt-voyager-1-0-2026-rd', brand: 'Shimano', model: 'Essa RD-U2000-GS', display_name: 'Shimano Essa RD-U2000-GS', category: 'rear_derailleur', specs: { speeds: 8, evidence_scope: 'WELT exact-product OEM specification' }, evidence_url: 'https://www.welt-bikes.com/ru/ru/vse-velosipedy/gravijnye/Voyager_1_2026?optionId=1185' };
  const { result } = await runOne(entry, source);
  assert.equal(result.entries[0].status, 'resolved');
  assert.deepEqual(result.entries[0].pairs.map((pair) => pair.source_component_id), ['oem-welt-voyager-1-0-2026-rd']);
  assert.equal(result.entries[0].pairs.some((pair) => pair.source_component_id === 'shimano-rd-u2000'), false);
});

test('C-433 MTB rule does not apply to Shimano ROAD 8-speed RD-R2000', async () => {
  const entry = { component_id: 'shimano-rd-r2000-gs', brand: 'Shimano', model: 'RD-R2000-GS', category: 'rear_derailleur', impact_bikes: 1, bike_ids: ['road-bike'] };
  const source = { id: 'shimano-rd-r2000-gs', brand: 'Shimano', model: 'RD-R2000-GS', display_name: 'CLARIS RD-R2000-GS', category: 'rear_derailleur', specs: { speeds: 8 }, evidence_url: 'https://productinfo.shimano.com/zh-CN/product/RD-R2000-GS' };
  const { result, requested } = await runOne(entry, source);
  assert.equal(result.entries[0].status, 'no_exact_pairs');
  assert.equal(result.entries[0].evidence_url, 'https://productinfo.shimano.com/en/compatibility/C-254');
  assert.deepEqual(requested, ['https://productinfo.shimano.com/en/compatibility/C-254']);
});

test('Shimano C-433 refuses a 7-speed target without official Shimano product evidence', async () => {
  const entry = { component_id: 'shimano-rd-m310', brand: 'Shimano', model: 'RD-M310', category: 'rear_derailleur', impact_bikes: 1, bike_ids: ['bike-a'] };
  const source = { id: 'shimano-rd-m310', brand: 'Shimano', model: 'RD-M310', display_name: 'ALTUS RD-M310', category: 'rear_derailleur', specs: { speeds: 8 } };
  const localTarget = { id: 'local-cassette', brand: 'Shimano', model: '7 speed', display_name: '7 speed', category: 'cassette', specs: { speeds: 7 }, evidence_url: 'https://example.com/not-shimano' };
  const { result } = await runOne(entry, source, [localTarget]);
  assert.equal(result.entries[0].status, 'no_exact_pairs');
  assert.match(result.entries[0].error, /official Shimano 7-speed cassette target/i);
});
