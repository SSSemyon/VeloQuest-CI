import assert from 'node:assert/strict';
import test from 'node:test';

import {
  materializeShimanoMatrixAgainstComponents,
  parseShimanoRearDerailleurCassetteMatrix,
} from '../catalog-harvester/shimano-compatibility-core.mjs';

const html = `
  <h3>12-speed C-648</h3>
  <table>
    <tr><th>Gear teeth</th><th>RD-R9250</th><th>RD-R7150</th></tr>
    <tr><td>11-30T</td><td>✔</td><td>-</td></tr>
    <tr><td>11-34T</td><td>✔</td><td>✔</td></tr>
    <tr><td>11-36T</td><td>-</td><td>✔</td></tr>
  </table>
  <h3>11-speed C-255</h3>
  <table>
    <tr><th>Gear teeth</th><th>RD-R7000</th></tr>
    <tr><td>11-28T</td><td>✔</td></tr>
  </table>`;

test('parser emits only binary exact RD × cassette-range cells with section speed', () => {
  const result = parseShimanoRearDerailleurCassetteMatrix(html);
  assert.deepEqual(result.rules.slice(0, 3), [
    { source_part_number: 'RD-R9250', target_category: 'cassette', target_range: '11-30T', speeds: 12, status: 'compatible', section: '12-speed C-648' },
    { source_part_number: 'RD-R7150', target_category: 'cassette', target_range: '11-30T', speeds: 12, status: 'incompatible', section: '12-speed C-648' },
    { source_part_number: 'RD-R9250', target_category: 'cassette', target_range: '11-34T', speeds: 12, status: 'compatible', section: '12-speed C-648' },
  ]);
  assert.equal(result.rules.length, 7);
  assert.deepEqual(result.unresolved, []);
});

test('matrix materialization requires one exact source and exact Shimano target speed/range', () => {
  const matrix = parseShimanoRearDerailleurCassetteMatrix(html);
  const components = [
    { id: 'shimano-rd-r9250', brand: 'Shimano', model: 'RD-R9250', display_name: 'DURA-ACE RD-R9250', category: 'rear_derailleur', specs: { speeds: 12 } },
    { id: 'shimano-rd-r7150', brand: 'Shimano', model: 'RD-R7150', display_name: '105 Di2 RD-R7150', category: 'rear_derailleur', specs: { speeds: 12 } },
    { id: 'shimano-cs-r7101-12-11-34', brand: 'Shimano', model: 'CS-R7101-12 11-34T', display_name: '105 CS-R7101-12 11-34T', category: 'cassette', specs: { speeds: 12, range: '11-34T' } },
    { id: 'shimano-cs-hg710-12', brand: 'Shimano', model: 'CS-HG710-12 11-36T', display_name: 'CS-HG710-12 11-36T', category: 'cassette', specs: { speeds: 12, range: '11-36T' } },
    { id: 'shimano-cs-r7000-11-28', brand: 'Shimano', model: 'CS-R7000 11-28T', display_name: 'CS-R7000 11-28T', category: 'cassette', specs: { speeds: 11, range: '11-28T' } },
  ];
  const result = materializeShimanoMatrixAgainstComponents({ matrix, components });
  const r7150_1134 = result.pairs.find((pair) => pair.source_component_id === 'shimano-rd-r7150' && pair.target_component_id === 'shimano-cs-r7101-12-11-34');
  assert.equal(r7150_1134?.status, 'compatible');
  const r7150_1136 = result.pairs.find((pair) => pair.source_component_id === 'shimano-rd-r7150' && pair.target_component_id === 'shimano-cs-hg710-12');
  assert.equal(r7150_1136?.status, 'compatible');
  assert.equal(result.pairs.some((pair) => pair.target_component_id === 'shimano-cs-r7000-11-28'), false, 'missing RD-R7000 source must remain unresolved');
});

test('non-binary footnote cells fail closed instead of becoming conditional guesses', () => {
  const result = parseShimanoRearDerailleurCassetteMatrix(`
    <h3>12-speed C-648</h3>
    <table>
      <tr><th>Gear teeth</th><th>RD-R7150</th></tr>
      <tr><td>11-34T</td><td>✔ *1</td></tr>
    </table>`);
  assert.deepEqual(result.rules, []);
  assert.equal(result.unresolved.length, 1);
  assert.match(result.unresolved[0].reason, /non-binary/i);
});
