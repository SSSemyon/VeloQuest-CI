import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeSupplementalCanonical,
  parseStrongListCanonical,
} from '../catalog-harvester/strong-list-product-specs.mjs';

test('extracts only exact known core labels from strong-list specification rows', () => {
  const html = `
    <ul>
      <li><strong>Frame:</strong> FACT 11m Carbon</li>
      <li><b>Wheel Size</b> 29</li>
      <li><strong>Rear Derailleur</strong> SRAM GX Eagle Transmission</li>
      <li><strong>Brakes</strong> SRAM Maven Silver</li>
      <li><strong>Optimized geometry</strong> Fast and stable</li>
    </ul>`;
  const result = parseStrongListCanonical(html);
  assert.equal(result.canonical.frame_material?.value, 'Carbon');
  assert.equal(result.canonical.wheel_size?.value, '29');
  assert.equal(result.canonical.drivetrain?.value, 'SRAM GX Eagle Transmission');
  assert.equal(result.canonical.brakes?.value, 'SRAM Maven Silver');
  assert.equal(Object.keys(result.canonical).length, 4);
  assert.deepEqual(result.ambiguities, []);
});

test('preserves structured strong-list label/value pairs for the separate exact-fitment whitelist', () => {
  const html = '<ul><li><strong>Fork</strong> Custom Factory Air 140mm</li><li><strong>Optimized geometry</strong> Fast and stable</li></ul>';
  const result = parseStrongListCanonical(html);
  assert.deepEqual(result.properties.map((row) => [row.label, row.value]), [
    ['Fork', 'Custom Factory Air 140mm'],
    ['Optimized geometry', 'Fast and stable'],
  ]);
  assert.deepEqual(result.canonical, {});
});

test('conflicting values inside strong-list rows are ambiguous rather than guessed', () => {
  const html = '<ul><li><strong>Wheel Size</strong>29</li><li><strong>Wheel Size</strong>27.5</li></ul>';
  const result = parseStrongListCanonical(html);
  assert.equal(result.canonical.wheel_size, undefined);
  assert.deepEqual(result.ambiguities, [{ field: 'wheel_size', values: ['29', '27.5'] }]);
});

test('supplemental strong-list evidence never overwrites conflicting primary evidence', () => {
  const evidence = { canonical: { wheel_size: { value: '27.5', source: 'json-ld' } }, ambiguities: [] };
  mergeSupplementalCanonical(evidence, { canonical: { wheel_size: { value: '29', source: 'strong-list' } }, ambiguities: [] });
  assert.equal(evidence.canonical.wheel_size.value, '27.5');
  assert.deepEqual(evidence.ambiguities, [{ field: 'wheel_size', values: ['27.5', '29'] }]);
});

test('supplemental evidence fills a missing field without changing existing fields', () => {
  const evidence = { canonical: { wheel_size: { value: '29', source: 'table' } }, ambiguities: [] };
  mergeSupplementalCanonical(evidence, { canonical: { brakes: { value: 'Shimano MT200', source: 'strong-list' } }, ambiguities: [] });
  assert.equal(evidence.canonical.wheel_size.value, '29');
  assert.equal(evidence.canonical.brakes.value, 'Shimano MT200');
});
