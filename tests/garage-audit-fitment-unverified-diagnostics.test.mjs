import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { expandFitmentEvidenceDiagnosticsSource } from '../scripts/garage-fitment-audit-diagnostics-expansion.mjs';
import {
  expandFitmentSelectCoverageSource,
  expandTrustedFitmentCoverageSource,
} from '../scripts/garage-audit-wave-discovery.mjs';

const base = fs.readFileSync('scripts/audit-garage-catalog-base.mjs', 'utf8');

test('fitment diagnostics expose repairable unverified rows but hard-fail only invalid evidence', () => {
  const fitmentSource = expandTrustedFitmentCoverageSource(expandFitmentSelectCoverageSource(base));
  const expanded = expandFitmentEvidenceDiagnosticsSource(fitmentSource);
  assert.match(expanded, /unverifiedFitmentEvidence: fitmentEvidenceAudit\.unverified/);
  assert.match(expanded, /invalidFitmentEvidence: fitmentEvidenceAudit\.invalid/);
  assert.doesNotMatch(expanded, /unverifiedFitmentEvidence\.length > 0/);
  assert.match(expanded, /invalid fitment evidence row\(s\)/);
});

test('fitment diagnostics expansion is idempotent', () => {
  const fitmentSource = expandTrustedFitmentCoverageSource(expandFitmentSelectCoverageSource(base));
  const once = expandFitmentEvidenceDiagnosticsSource(fitmentSource);
  const twice = expandFitmentEvidenceDiagnosticsSource(once);
  assert.equal(twice, once);
});
