import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { expandSpecEvidenceCoverageSource } from '../scripts/garage-spec-audit-expansion.mjs';

const base = fs.readFileSync('scripts/audit-garage-catalog-base.mjs', 'utf8');

test('Garage finder coverage counts only provenance-backed core specs', () => {
  const expanded = expandSpecEvidenceCoverageSource(base);
  assert.match(expanded, /auditGarageSpecEvidence/);
  assert.match(expanded, /const trustedFinderModelIds = specEvidenceAudit\.trustedFinderModelIds/);
  assert.match(expanded, /finderFilterComplete: \{ present: count\(\(model\) => trustedFinderModelIds\.has\(model\.id\)\)/);
  assert.match(expanded, /unverifiedSpecEvidence: specEvidenceAudit\.unverified/);
  assert.match(expanded, /invalidSpecEvidence: specEvidenceAudit\.invalid/);
});

test('complete-looking weak specs become an actionable spec_evidence gap without hard-failing as invalid', () => {
  const expanded = expandSpecEvidenceCoverageSource(base);
  assert.match(expanded, /gaps\.push\('spec_evidence'\)/);
  assert.match(expanded, /entry\.gaps\.includes\('spec_evidence'\)/);
  assert.match(expanded, /invalid core spec evidence model\(s\)/);
  assert.doesNotMatch(expanded, /unverifiedSpecEvidence\.length > 0/);
});

test('missing category is an explicit core gap and participates in the core-spec cohort', () => {
  const expanded = expandSpecEvidenceCoverageSource(base);
  assert.match(expanded, /if \(!model\.category\) gaps\.push\('category'\)/);
  assert.match(expanded, /entry\.gaps\.includes\('category'\)/);
});

test('spec evidence expansion is idempotent', () => {
  const once = expandSpecEvidenceCoverageSource(base);
  const twice = expandSpecEvidenceCoverageSource(once);
  assert.equal(twice, once);
});
