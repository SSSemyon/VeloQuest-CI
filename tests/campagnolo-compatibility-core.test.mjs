import assert from 'node:assert/strict';
import test from 'node:test';

import { materializeCampagnoloCassetteCompatibility } from '../catalog-harvester/campagnolo-compatibility-core.mjs';

const cassette = (id, range, speeds) => ({ id, brand: 'Campagnolo', category: 'cassette', display_name: `${range}T`, specs: { speeds } });

test('Ekar 13s accepts only the three manufacturer-listed cassette ranges', () => {
  const html = 'A single rear derailleur design with mid-length cage is compatible with the varying sprocket sizes on all three cassette gearing options, from 9-36 to 10-44. One derailleur fits all three cassette options.';
  const components = [
    { id: 'rd-ekar', brand: 'Campagnolo', category: 'rear_derailleur', display_name: 'Campagnolo Ekar Rear Derailleur', specs: { speeds: 13 } },
    { id: 'rd-other', brand: 'Campagnolo', category: 'rear_derailleur', display_name: 'Campagnolo Record 13 Rear Derailleur', specs: { speeds: 13 } },
    cassette('cs-936', '9-36', 13), cassette('cs-942', '9-42', 13), cassette('cs-1044', '10-44', 13), cassette('cs-1048', '10-48', 13),
  ];
  const result = materializeCampagnoloCassetteCompatibility({ html, components, family: 'ekar' });
  assert.deepEqual(result.pairs.map((pair) => [pair.source_component_id, pair.target_component_id]), [
    ['rd-ekar', 'cs-1044'], ['rd-ekar', 'cs-936'], ['rd-ekar', 'cs-942'],
  ]);
});

test('Ekar GT 13s accepts the four manufacturer-listed cassette combinations through 10-48', () => {
  const html = 'The design of the rear derailleur with medium-length housing is compatible with the different sizes of the sprockets on all four of the cassette combination options, from 9-36 to 10-48, perfect for any gravel needs.';
  const components = [
    { id: 'rd-ekar-gt', brand: 'Campagnolo', category: 'rear_derailleur', display_name: 'Campagnolo Ekar GT Rear Derailleur', specs: { speeds: 13 } },
    cassette('cs-936', '9-36', 13), cassette('cs-942', '9-42', 13), cassette('cs-1044', '10-44', 13), cassette('cs-1048', '10-48', 13),
  ];
  const result = materializeCampagnoloCassetteCompatibility({ html, components, family: 'ekar-gt' });
  assert.equal(result.pairs.length, 4);
  assert.ok(result.pairs.every((pair) => pair.source_component_id === 'rd-ekar-gt' && pair.status === 'compatible'));
});

test('Super Record Wireless 12s accepts only the three explicitly listed cassettes', () => {
  const html = 'A single rear derailleur that adapts to all three cassettes available: 10-25, 10-27 and 10-29.';
  const components = [
    { id: 'rd-sr-wireless', brand: 'Campagnolo', category: 'rear_derailleur', display_name: 'Campagnolo Super Record Wireless rear derailleur', specs: { speeds: 12 } },
    cassette('cs-1025', '10-25', 12), cassette('cs-1027', '10-27', 12), cassette('cs-1029', '10-29', 12), cassette('cs-1033', '10-33', 12),
  ];
  const result = materializeCampagnoloCassetteCompatibility({ html, components, family: 'super-record-wireless-12' });
  assert.deepEqual(result.pairs.map((pair) => pair.target_component_id), ['cs-1025', 'cs-1027', 'cs-1029']);
});

test('Campagnolo adapter fails closed when family assertions are absent', () => {
  const components = [{ id: 'rd-ekar', brand: 'Campagnolo', category: 'rear_derailleur', display_name: 'Campagnolo Ekar Rear Derailleur', specs: { speeds: 13 } }, cassette('cs-936', '9-36', 13)];
  const result = materializeCampagnoloCassetteCompatibility({ html: '<html>generic product</html>', components, family: 'ekar' });
  assert.deepEqual(result.pairs, []);
  assert.match(result.unresolved[0]?.reason ?? '', /official Campagnolo ekar assertions not found/);
});
