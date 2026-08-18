import assert from 'node:assert/strict';
import test from 'node:test';

import { extractKnownComponentsFromStructuredProperties } from '../catalog-harvester/strong-list-known-components.mjs';

test('promotes exact known-brand strong-list OEM rows into reusable component evidence', () => {
  const properties = [
    { label: 'Rear Derailleur', value: 'Shimano Deore RD-M6100', source: 'strong-list' },
    { label: 'Cassette', value: 'microSHIFT ADVENT X 11-48T', source: 'strong-list' },
    { label: 'Fork', value: 'Custom Factory Air 140mm', source: 'strong-list' },
  ];
  const result = extractKnownComponentsFromStructuredProperties(properties);
  assert.equal(result.rear_derailleur.brand, 'Shimano');
  assert.equal(result.rear_derailleur.category, 'rear_derailleur');
  assert.equal(result.rear_derailleur.source_value, 'Shimano Deore RD-M6100');
  assert.equal(result.cassette.brand, 'microSHIFT');
  assert.equal(result.fork, undefined, 'unknown manufacturer must remain opaque/bike-scoped');
});

test('does not promote marketing labels even when they mention a known component brand', () => {
  const result = extractKnownComponentsFromStructuredProperties([
    { label: 'Race ready', value: 'Shimano inspired performance', source: 'strong-list' },
  ]);
  assert.deepEqual(result, {});
});

test('conflicting duplicate structured component rows are not promoted', () => {
  const result = extractKnownComponentsFromStructuredProperties([
    { label: 'Rear Derailleur', value: 'Shimano Deore RD-M6100', source: 'strong-list' },
    { label: 'Rear Derailleur', value: 'Shimano XT RD-M8100', source: 'strong-list' },
  ]);
  assert.equal(result.rear_derailleur, undefined);
});
