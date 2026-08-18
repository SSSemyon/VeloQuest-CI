import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateGarageMaximum } from '../scripts/garage-maximum-core.mjs';

const catalogResult = {
  masterCatalog: {
    models: 718,
  },
  compatibility: {
    conditionalRules: 1,
    incompatibleRules: 1,
  },
};

const completeQueue = {
  catalog_models: 718,
  current: {
    photo: 718,
    core_specs: 718,
    exact_fitment: 718,
    recommendation_outcome: 718,
  },
  // Legacy queue targets must not weaken the release gate.
  required: {
    photo: 575,
    core_specs: 575,
    exact_fitment: 431,
    recommendation_outcome: 431,
  },
};

test('maximum gate requires 100 percent across all four Garage coverage fronts', () => {
  const result = evaluateGarageMaximum(completeQueue, catalogResult);
  assert.equal(result.valid, true);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.required, {
    photo: 718,
    core_specs: 718,
    exact_fitment: 718,
    recommendation_outcome: 718,
  });
});

test('legacy 80/80/60/60 queue thresholds can no longer satisfy maximum gate', () => {
  const queue = structuredClone(completeQueue);
  queue.current = {
    photo: 575,
    core_specs: 575,
    exact_fitment: 431,
    recommendation_outcome: 431,
  };
  const result = evaluateGarageMaximum(queue, catalogResult);
  assert.equal(result.valid, false);
  assert.match(result.failures.join('\n'), /photo coverage 575\/718/);
  assert.match(result.failures.join('\n'), /core finder spec coverage 575\/718/);
  assert.match(result.failures.join('\n'), /exact fitment coverage 431\/718/);
  assert.match(result.failures.join('\n'), /recommendation\/outcome coverage 431\/718/);
});

test('maximum gate still rejects a single uncovered recommendation outcome', () => {
  const queue = structuredClone(completeQueue);
  queue.current.recommendation_outcome = 717;
  const result = evaluateGarageMaximum(queue, catalogResult);
  assert.equal(result.valid, false);
  assert.match(result.failures.join('\n'), /recommendation\/outcome coverage 717\/718/);
});

test('maximum gate preserves conditional and incompatible rule requirements', () => {
  const result = evaluateGarageMaximum(completeQueue, {
    masterCatalog: { models: 718 },
    compatibility: { conditionalRules: 0, incompatibleRules: 0 },
  });
  assert.equal(result.valid, false);
  assert.match(result.failures.join('\n'), /conditional rule/);
  assert.match(result.failures.join('\n'), /incompatible rule/);
});
