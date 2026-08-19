import assert from 'node:assert/strict';
import test from 'node:test';

import { validateNoUpgradeOutcomeOfficialEvidence } from '../scripts/garage-outcomes-core.mjs';

const config = {
  sources: [
    { brand: 'Specialized', officialHosts: ['specialized.com', 'www.specialized.com'] },
    { brand: 'Trek', officialHosts: ['trekbikes.com', 'www.trekbikes.com'] },
  ],
};

const queue = {
  entries: [
    { id: 'specialized-example-2026-global', brand: 'Specialized' },
    { id: 'trek-example-2026-global', brand: 'Trek' },
  ],
};

const row = {
  bike_id: 'specialized-example-2026-global',
  scope_key: 'drivetrain',
  outcome_type: 'no_upgrade',
  evidence_url: 'https://www.specialized.com/us/en/example/p/123',
};

test('no-upgrade official evidence validator accepts the exact bike manufacturer host', () => {
  const result = validateNoUpgradeOutcomeOfficialEvidence([row], { queue, config });
  assert.equal(result.valid.length, 1);
  assert.deepEqual(result.invalid, []);
});

test('no-upgrade official evidence validator accepts dual OEM + approved component-manufacturer evidence', () => {
  const dualEvidenceRow = {
    ...row,
    evidence_url: 'https://productinfo.shimano.com/en/product/RD-U4000',
    notes: 'Exact OEM fitment is confirmed on the bike page. OEM: https://www.specialized.com/us/en/example/p/123',
  };
  const result = validateNoUpgradeOutcomeOfficialEvidence([dualEvidenceRow], { queue, config });
  assert.equal(result.valid.length, 1);
  assert.deepEqual(result.invalid, []);
});

test('dual evidence stays fail-closed on missing OEM binding or unapproved component host', () => {
  const invalidRows = [
    {
      ...row,
      evidence_url: 'https://productinfo.shimano.com/en/product/RD-U4000',
      notes: 'No exact OEM marker is present here.',
    },
    {
      ...row,
      evidence_url: 'https://productinfo.shimano.com/en/product/RD-U4000',
      notes: 'OEM: https://www.trekbikes.com/us/en_US/example/',
    },
    {
      ...row,
      evidence_url: 'https://example-components.invalid/RD-U4000',
      notes: 'OEM: https://www.specialized.com/us/en/example/p/123',
    },
  ];
  for (const candidate of invalidRows) {
    const result = validateNoUpgradeOutcomeOfficialEvidence([candidate], { queue, config });
    assert.equal(result.valid.length, 0);
    assert.equal(result.invalid.length, 1);
  }
});

test('no-upgrade official evidence validator rejects retailer, forum and another bike brand host', () => {
  for (const evidence_url of [
    'https://www.bike-discount.de/en/example',
    'https://www.reddit.com/r/bikewrench/comments/example',
    'https://www.trekbikes.com/us/en_US/example/',
  ]) {
    const result = validateNoUpgradeOutcomeOfficialEvidence([{ ...row, evidence_url }], { queue, config });
    assert.equal(result.valid.length, 0);
    assert.equal(result.invalid.length, 1);
    assert.match(result.invalid[0].reasons.join(' '), /official manufacturer evidence/i);
  }
});

test('no-upgrade official evidence validator rejects unknown bike identity and missing context', () => {
  const unknown = validateNoUpgradeOutcomeOfficialEvidence([{ ...row, bike_id: 'missing-bike' }], { queue, config });
  assert.equal(unknown.valid.length, 0);
  assert.match(unknown.invalid[0].reasons.join(' '), /unknown bike_id/i);

  assert.throws(
    () => validateNoUpgradeOutcomeOfficialEvidence([row], {}),
    /queue and product evidence config are required/i,
  );
});
