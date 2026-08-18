import assert from 'node:assert/strict';
import test from 'node:test';

import { materializeMicroshiftCassetteCompatibility } from '../catalog-harvester/microshift-compatibility-core.mjs';

const officialFaq = `
  ADVENT X is compatible with standard 10 speed cassette spacing.
  We suggest using a cassette with a max cog ranging between 46t and 48t.
  You can go smaller, but it will negatively affect shifting.
  42-46t for Acolyte and Advent. 46-48t for ADVENT X.
  If you exceed the max cog specification, you can stress the system, damage your derailleur, and negatively affect shifting.
`;

test('ADVENT X maps exact-speed cassettes to compatible conditional and incompatible verdicts by official max-cog guidance', () => {
  const components = [
    { id: 'rd-advent-x', brand: 'microSHIFT', category: 'rear_derailleur', display_name: 'microSHIFT ADVENT X', specs: { speeds: 10 } },
    { id: 'cs-10-48', brand: 'SunRace', category: 'cassette', display_name: '10-speed 11-48T', specs: { speeds: 10 } },
    { id: 'cs-10-42', brand: 'Shimano', category: 'cassette', display_name: '10-speed 11-42T', specs: { speeds: 10 } },
    { id: 'cs-10-51', brand: 'Shimano', category: 'cassette', display_name: '10-speed 11-51T', specs: { speeds: 10 } },
    { id: 'cs-9-46', brand: 'microSHIFT', category: 'cassette', display_name: '9-speed 11-46T', specs: { speeds: 9 } },
  ];
  const result = materializeMicroshiftCassetteCompatibility({ html: officialFaq, components });
  assert.deepEqual(result.pairs.map((pair) => [pair.target_component_id, pair.status]), [
    ['cs-10-42', 'conditional'],
    ['cs-10-48', 'compatible'],
    ['cs-10-51', 'incompatible'],
  ]);
});

test('Acolyte and ADVENT use their own exact-speed 42-46T official range', () => {
  const components = [
    { id: 'rd-acolyte', brand: 'MicroSHIFT', category: 'rear_derailleur', display_name: 'microSHIFT Acolyte', specs: { speeds: 8 } },
    { id: 'rd-advent', brand: 'microSHIFT', category: 'rear_derailleur', display_name: 'microSHIFT ADVENT', specs: { speeds: 9 } },
    { id: 'cs-8-46', brand: 'Example', category: 'cassette', display_name: '8-speed 12-46T', specs: { speeds: 8 } },
    { id: 'cs-9-40', brand: 'Example', category: 'cassette', display_name: '9-speed 11-40T', specs: { speeds: 9 } },
    { id: 'cs-9-50', brand: 'Example', category: 'cassette', display_name: '9-speed 11-50T', specs: { speeds: 9 } },
  ];
  const result = materializeMicroshiftCassetteCompatibility({ html: officialFaq, components });
  assert.deepEqual(result.pairs.map((pair) => [pair.source_component_id, pair.target_component_id, pair.status]), [
    ['rd-acolyte', 'cs-8-46', 'compatible'],
    ['rd-advent', 'cs-9-40', 'conditional'],
    ['rd-advent', 'cs-9-50', 'incompatible'],
  ]);
});

test('cassette without exact speed or maximum cog is not materialized', () => {
  const components = [
    { id: 'rd-advent-x', brand: 'microSHIFT', category: 'rear_derailleur', display_name: 'microSHIFT ADVENT X', specs: { speeds: 10 } },
    { id: 'cs-unknown', brand: 'Example', category: 'cassette', display_name: 'Wide range cassette', specs: { speeds: 10 } },
  ];
  const result = materializeMicroshiftCassetteCompatibility({ html: officialFaq, components });
  assert.deepEqual(result.pairs, []);
});

test('adapter fails closed when the official FAQ assertions are not present', () => {
  const components = [
    { id: 'rd-advent-x', brand: 'microSHIFT', category: 'rear_derailleur', display_name: 'microSHIFT ADVENT X', specs: { speeds: 10 } },
    { id: 'cs-10-48', brand: 'Example', category: 'cassette', display_name: '10-speed 11-48T', specs: { speeds: 10 } },
  ];
  const result = materializeMicroshiftCassetteCompatibility({ html: '<html>generic support page</html>', components });
  assert.deepEqual(result.pairs, []);
  assert.match(result.unresolved[0]?.reason ?? '', /official microSHIFT FAQ assertions not found/);
});
