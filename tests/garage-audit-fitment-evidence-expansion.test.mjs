import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  expandFitmentSelectCoverageSource,
  expandRecommendationCoverageSource,
  expandTrustedFitmentCoverageSource,
} from '../scripts/garage-audit-wave-discovery.mjs';

const base = fs.readFileSync('scripts/audit-garage-catalog-base.mjs', 'utf8');

test('Garage audit counts only evidence-backed factory fitments and feeds only trusted fitments to recommendation coverage', () => {
  const withSelect = expandFitmentSelectCoverageSource(base);
  const withTrust = expandTrustedFitmentCoverageSource(withSelect);
  const expanded = expandRecommendationCoverageSource(withTrust);

  assert.match(expanded, /auditGarageFitmentEvidence/);
  assert.match(expanded, /const trustedFitments = fitmentEvidenceAudit\.trustedFitments/);
  assert.match(expanded, /const fitmentBikeIds = new Set\(fitmentEvidenceAudit\.trustedFactoryFitments/);
  assert.match(expanded, /computeRecommendationCoverage\(\{ fitments: trustedFitments, compatibility, aliases: componentAliases, activeModelIds \}\)/);
  assert.match(expanded, /invalidFitmentEvidence/);
  assert.match(expanded, /untrusted fitment evidence/);
});

test('trusted fitment expansion is idempotent', () => {
  const once = expandTrustedFitmentCoverageSource(expandFitmentSelectCoverageSource(base));
  const twice = expandTrustedFitmentCoverageSource(once);
  assert.equal(twice, once);
});
