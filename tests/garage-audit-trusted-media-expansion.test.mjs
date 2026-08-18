import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { expandExactMediaProvenanceSource } from '../scripts/garage-media-audit-expansion.mjs';
import { expandTrustedMediaCoverageSource } from '../scripts/garage-audit-wave-discovery.mjs';

const base = fs.readFileSync('scripts/audit-garage-catalog-base.mjs', 'utf8');

test('expanded Garage audit computes photo coverage only from exact evidence-backed product media', () => {
  const trusted = expandTrustedMediaCoverageSource(base);
  const expanded = expandExactMediaProvenanceSource(trusted);
  assert.match(expanded, /auditGarageMediaEvidence/);
  assert.match(expanded, /const mediaEvidenceAudit = auditGarageMediaEvidence/);
  assert.match(expanded, /const trustedImages = mediaEvidenceAudit\.trustedImages/);
  assert.match(expanded, /const rejectedMediaEntries = mediaEvidenceAudit\.invalid/);
  assert.match(expanded, /const imageBikeIds = new Set\(trustedImages\.filter/);
  assert.match(expanded, /unverifiedMediaEvidence: mediaEvidenceAudit\.unverified/);
  assert.match(expanded, /invalidMediaEvidence: rejectedMediaEntries/);
  assert.match(expanded, /invalid product media evidence row\(s\)/);
});

test('exact media provenance expansion is idempotent', () => {
  const trusted = expandTrustedMediaCoverageSource(base);
  const once = expandExactMediaProvenanceSource(trusted);
  const twice = expandExactMediaProvenanceSource(once);
  assert.equal(twice, once);
});
