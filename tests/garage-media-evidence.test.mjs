import assert from 'node:assert/strict';
import test from 'node:test';

import { auditGarageMediaEvidence } from '../scripts/garage-media-evidence.mjs';

const modelsById = new Map([
  ['bike-a', {
    id: 'bike-a',
    brand: 'Example Bikes',
    manufacturer_url: 'https://www.example-bikes.com/bikes/bike-a',
    specs: { product_evidence_url: 'https://www.example-bikes.com/bikes/bike-a' },
  }],
]);
const bikeConfig = {
  sources: [{ brand: 'Example Bikes', officialHosts: ['example-bikes.com', 'www.example-bikes.com'] }],
};

const row = (overrides = {}) => ({
  bike_id: 'bike-a',
  image_url: 'https://cdn.vendor.net/media/bike-a-side.jpg',
  source_type: 'manufacturer',
  source_name: 'Example Bikes',
  source_page_url: 'https://www.example-bikes.com/bikes/bike-a',
  checked_at: '2026-08-18',
  enabled: true,
  ...overrides,
});

test('trusted media may use a manufacturer CDN after exact product identity was durably verified', () => {
  const result = auditGarageMediaEvidence({ images: [row()], modelsById, bikeConfig });
  assert.equal(result.trustedImages.length, 1);
  assert.equal(result.unverified.length, 0);
  assert.equal(result.invalid.length, 0);
});

test('legacy exact-looking media without product_evidence_url is unverified, not a hard parser failure', () => {
  const legacyModels = new Map([['bike-a', { ...modelsById.get('bike-a'), specs: {} }]]);
  const result = auditGarageMediaEvidence({ images: [row()], modelsById: legacyModels, bikeConfig });
  assert.equal(result.trustedImages.length, 0);
  assert.equal(result.unverified.length, 1);
  assert.equal(result.invalid.length, 0);
  assert.match(result.unverified[0].reason, /identity-verified product evidence/i);
});

test('same official host but sibling product page cannot close photo coverage', () => {
  const result = auditGarageMediaEvidence({
    images: [row({ source_page_url: 'https://www.example-bikes.com/bikes/bike-a-pro' })],
    modelsById,
    bikeConfig,
  });
  assert.equal(result.trustedImages.length, 0);
  assert.match(result.invalid[0].reason, /exact product provenance/i);
});

test('source-page normalization ignores only query fragment and trailing slash', () => {
  const result = auditGarageMediaEvidence({
    images: [row({ source_page_url: 'https://www.example-bikes.com/bikes/bike-a/?utm_source=test#gallery' })],
    modelsById,
    bikeConfig,
  });
  assert.equal(result.trustedImages.length, 1);
});

test('retailer source is invalid while disabled rows are ignored and never trusted', () => {
  const result = auditGarageMediaEvidence({
    images: [
      row({ source_type: 'authorized_retailer', source_page_url: 'https://retailer.example/bike-a' }),
      row({ image_url: 'https://cdn.vendor.net/media/bike-a-front.jpg', enabled: false }),
    ],
    modelsById,
    bikeConfig,
  });
  assert.equal(result.trustedImages.length, 0);
  assert.equal(result.invalid.length, 1);
  assert.equal(result.ignoredDisabled, 1);
});

test('generic image assets and invalid evidence dates fail closed', () => {
  const result = auditGarageMediaEvidence({
    images: [
      row({ image_url: 'https://cdn.vendor.net/assets/logo.png' }),
      row({ image_url: 'https://cdn.vendor.net/media/bike-a-front.jpg', checked_at: 'today' }),
    ],
    modelsById,
    bikeConfig,
  });
  assert.equal(result.trustedImages.length, 0);
  assert.equal(result.invalid.length, 2);
});
