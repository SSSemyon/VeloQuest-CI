import assert from 'node:assert/strict';
import test from 'node:test';

import { auditGarageSpecEvidence } from '../scripts/garage-spec-evidence.mjs';

const config = {
  sources: [{ brand: 'Example Bikes', officialHosts: ['example-bikes.com', 'www.example-bikes.com'] }],
};

const evidenceUrl = 'https://www.example-bikes.com/bikes/bike-a';
const model = (overrides = {}) => ({
  id: 'bike-a',
  brand: 'Example Bikes',
  model: 'Bike A',
  model_year: 2026,
  category: 'road',
  manufacturer_url: evidenceUrl,
  evidence_checked_at: '2026-08-18',
  specs: {
    frame_material: 'Carbon',
    wheel_size: '700c',
    drivetrain: 'Shimano 105',
    brakes: 'Shimano hydraulic disc',
    product_evidence_url: evidenceUrl,
    spec_evidence: evidenceUrl,
  },
  ...overrides,
});

test('complete core finder specs count only with identity-verified URL-backed provenance', () => {
  const result = auditGarageSpecEvidence({ models: [model()], bikeConfig: config });
  assert.equal(result.trustedFinderModelIds.has('bike-a'), true);
  assert.equal(result.unverified.length, 0);
  assert.equal(result.invalid.length, 0);
});

test('legacy complete-looking specs without durable marker become repairable unverified gaps', () => {
  const seeded = model({ specs: { ...model().specs, product_evidence_url: undefined, spec_evidence: 'official exact product specification' } });
  const result = auditGarageSpecEvidence({ models: [seeded], bikeConfig: config });
  assert.equal(result.trustedFinderModelIds.has('bike-a'), false);
  assert.equal(result.unverified.length, 1);
  assert.equal(result.invalid.length, 0);
  assert.match(result.unverified[0].reason, /identity-verified product evidence/i);
});

test('durable product marker without URL-backed spec_evidence still does not validate existing core fields', () => {
  const seeded = model({ specs: { ...model().specs, spec_evidence: 'legacy prose' } });
  const result = auditGarageSpecEvidence({ models: [seeded], bikeConfig: config });
  assert.equal(result.trustedFinderModelIds.has('bike-a'), false);
  assert.equal(result.unverified.length, 1);
  assert.match(result.unverified[0].reason, /URL-backed spec_evidence/i);
});

test('non-official manufacturer URL and invalid evidence date fail closed', () => {
  const result = auditGarageSpecEvidence({
    models: [
      model({ id: 'bike-retailer', manufacturer_url: 'https://retailer.example/bike-a' }),
      model({ id: 'bike-date', evidence_checked_at: 'today' }),
    ],
    bikeConfig: config,
  });
  assert.equal(result.trustedFinderModelIds.size, 0);
  assert.equal(result.invalid.length, 2);
});

test('models missing a core field remain ordinary core gaps rather than provenance failures', () => {
  const incomplete = model({ specs: { ...model().specs, brakes: undefined } });
  const result = auditGarageSpecEvidence({ models: [incomplete], bikeConfig: config });
  assert.equal(result.trustedFinderModelIds.size, 0);
  assert.equal(result.unverified.length, 0);
  assert.equal(result.invalid.length, 0);
});
