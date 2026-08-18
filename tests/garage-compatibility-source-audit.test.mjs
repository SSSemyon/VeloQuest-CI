import assert from 'node:assert/strict';
import test from 'node:test';

import { auditGarageCompatibilityEvidence } from '../scripts/garage-compatibility-source-audit-core.mjs';

const officialSources = {
  sources: [
    { brands: ['Shimano'], official_hosts: ['productinfo.shimano.com'] },
    { brands: ['SRAM'], official_hosts: ['www.sram.com', 'support.sram.com'] },
    { brands: ['microSHIFT', 'MicroSHIFT'], official_hosts: ['www.microshift.com'] },
  ],
};

const components = [
  { id: 'shimano-rd', brand: 'Shimano' },
  { id: 'shimano-cs', brand: 'Shimano' },
  { id: 'sram-cs', brand: 'SRAM' },
];

const base = {
  source_component_id: 'shimano-rd',
  target_component_id: 'shimano-cs',
  status: 'compatible',
  evidence_url: 'https://productinfo.shimano.com/en/compatibility/C-254',
};

test('historical compatibility audit accepts official source manufacturer evidence', () => {
  const result = auditGarageCompatibilityEvidence({ components, compatibility: [base], officialSources });
  assert.equal(result.validRows, 1);
  assert.deepEqual(result.invalid, []);
});

test('historical compatibility audit accepts official target manufacturer evidence for cross-brand pair', () => {
  const row = { ...base, target_component_id: 'sram-cs', evidence_url: 'https://www.sram.com/en/service/articles/example' };
  const result = auditGarageCompatibilityEvidence({ components, compatibility: [row], officialSources });
  assert.equal(result.validRows, 1);
  assert.deepEqual(result.invalid, []);
});

test('historical compatibility audit rejects retailer, forum and unrelated manufacturer hosts', () => {
  for (const evidence_url of [
    'https://www.bike-discount.de/en/example',
    'https://www.reddit.com/r/bikewrench/comments/example',
    'https://www.microshift.com/models/example/',
  ]) {
    const result = auditGarageCompatibilityEvidence({ components, compatibility: [{ ...base, evidence_url }], officialSources });
    assert.equal(result.validRows, 0);
    assert.equal(result.invalid.length, 1);
    assert.match(result.invalid[0].reasons.join(' '), /official source or target manufacturer evidence/i);
  }
});

test('historical compatibility audit rejects unknown components, self-pairs and unsupported statuses', () => {
  const compatibility = [
    { ...base, source_component_id: 'missing' },
    { ...base, target_component_id: 'missing' },
    { ...base, target_component_id: 'shimano-rd' },
    { ...base, status: 'unknown' },
  ];
  const result = auditGarageCompatibilityEvidence({ components, compatibility, officialSources });
  assert.equal(result.validRows, 0);
  assert.equal(result.invalid.length, 4);
});

test('historical compatibility audit fails closed without official registry', () => {
  assert.throws(
    () => auditGarageCompatibilityEvidence({ components, compatibility: [base] }),
    /official compatibility source registry/i,
  );
});
