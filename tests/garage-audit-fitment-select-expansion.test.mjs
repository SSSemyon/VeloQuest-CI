import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  enforceGarageFullCoverageSource,
  expandFitmentSelectCoverageSource,
  expandRecommendationCoverageSource,
} from '../scripts/garage-audit-wave-discovery.mjs';

const base = fs.readFileSync('scripts/audit-garage-catalog-base.mjs', 'utf8');

test('expanded Garage release audit parses exact INSERT SELECT fitments before recommendation coverage', () => {
  const withSelect = expandFitmentSelectCoverageSource(base);
  const withRecommendation = expandRecommendationCoverageSource(withSelect);
  const expanded = enforceGarageFullCoverageSource(withRecommendation);

  assert.match(expanded, /parseBikeFitmentSelectRows/);
  assert.match(expanded, /const bikeId = modelIdentity\.get\(identity\(selected\.identity\)\)/);
  assert.match(expanded, /fitment SELECT identity is not present in catalog/);
  assert.match(expanded, /computeRecommendationCoverage\(\{ fitments, compatibility, aliases: componentAliases, activeModelIds \}\)/);
  assert.match(expanded, /photo_percent: 100/);
  assert.match(expanded, /exact_fitment_percent: 100/);
  assert.match(expanded, /recommendation_outcome_percent: 100/);
});

test('fitment SELECT expansion is idempotent', () => {
  const once = expandFitmentSelectCoverageSource(base);
  const twice = expandFitmentSelectCoverageSource(once);
  assert.equal(twice, once);
});
