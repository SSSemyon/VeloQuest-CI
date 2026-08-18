import assert from 'node:assert/strict';
import test from 'node:test';

import { runComponentCompatibilityManifest } from '../catalog-harvester/component-compatibility-runner.mjs';

const cases = [
  {
    source: { id: 'campy-rd-ekar', brand: 'Campagnolo', model: 'Ekar', display_name: 'Campagnolo Ekar Rear Derailleur', category: 'rear_derailleur', specs: { speeds: 13 } },
    target: { id: 'campy-cs-ekar-1044', brand: 'Campagnolo', model: 'Ekar 10-44T', display_name: 'Ekar 13-speed 10-44T', category: 'cassette', specs: { speeds: 13 } },
    url: 'https://www.campagnolo.com/us-en/ekar-rear-derailleur/CRDEKAR1X13S.html',
    html: 'A single rear derailleur design with mid-length cage is compatible with the varying sprocket sizes on all three cassette gearing options, from 9-36 to 10-44. One derailleur fits all three cassette options.',
  },
  {
    source: { id: 'campy-rd-ekar-gt', brand: 'Campagnolo', model: 'Ekar GT', display_name: 'Campagnolo Ekar GT Rear Derailleur', category: 'rear_derailleur', specs: { speeds: 13 } },
    target: { id: 'campy-cs-ekar-gt-1048', brand: 'Campagnolo', model: 'Ekar GT 10-48T', display_name: 'Ekar GT 13-speed 10-48T', category: 'cassette', specs: { speeds: 13 } },
    url: 'https://www.campagnolo.com/gb-en/ekar-gt-rear-derailleur/CRDEKAR1X13SGT.html',
    html: 'The design of the rear derailleur with medium-length housing is compatible with the different sizes of the sprockets on all four of the cassette combination options, from 9-36 to 10-48, perfect for any gravel needs.',
  },
  {
    source: { id: 'campy-rd-sr-wireless', brand: 'Campagnolo', model: 'Super Record Wireless', display_name: 'Campagnolo Super Record Wireless rear derailleur', category: 'rear_derailleur', specs: { speeds: 12 } },
    target: { id: 'campy-cs-sr-1029', brand: 'Campagnolo', model: 'Super Record 10-29T', display_name: 'Super Record 12-speed 10-29T', category: 'cassette', specs: { speeds: 12 } },
    url: 'https://www.campagnolo.com/gb-en/super-record-wireless-rear-derailleur/CRDSUPERRECORDWRLDB12S.html',
    html: 'A single rear derailleur that adapts to all three cassettes available: 10-25, 10-27 and 10-29.',
  },
];

for (const scenario of cases) {
  test(`runner resolves ${scenario.source.model} only from its official Campagnolo product rule`, async () => {
    const manifest = { entries: [{ component_id: scenario.source.id, brand: 'Campagnolo', model: scenario.source.model, category: 'rear_derailleur', impact_bikes: 1, bike_ids: ['bike'] }] };
    const requested = [];
    const result = await runComponentCompatibilityManifest({
      manifest,
      componentRegistry: [scenario.source, scenario.target],
      fetchImpl: async (url) => {
        requested.push(url);
        return { ok: true, status: 200, text: async () => scenario.html };
      },
      checkedAt: '2026-08-18',
    });
    assert.equal(result.entries[0].status, 'resolved');
    assert.equal(result.entries[0].evidence_url, scenario.url);
    assert.deepEqual(result.entries[0].pairs.map((pair) => pair.target_component_id), [scenario.target.id]);
    assert.deepEqual(requested, [scenario.url]);
  });
}

test('runner leaves other Campagnolo rear derailleurs unsupported instead of applying a family rule by speed alone', async () => {
  const source = { id: 'campy-rd-record13', brand: 'Campagnolo', model: 'Record 13', display_name: 'Campagnolo Record 13 Rear Derailleur', category: 'rear_derailleur', specs: { speeds: 13 } };
  const manifest = { entries: [{ component_id: source.id, brand: 'Campagnolo', model: source.model, category: source.category, impact_bikes: 1, bike_ids: ['bike'] }] };
  const result = await runComponentCompatibilityManifest({ manifest, componentRegistry: [source], fetchImpl: async () => { throw new Error('must not fetch'); }, checkedAt: '2026-08-18' });
  assert.equal(result.entries[0].status, 'unsupported_adapter');
});
