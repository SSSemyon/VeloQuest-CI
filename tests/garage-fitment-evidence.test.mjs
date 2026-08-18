import assert from 'node:assert/strict';
import test from 'node:test';

import { auditGarageFitmentEvidence } from '../scripts/garage-fitment-evidence.mjs';

const modelsById = new Map([
  ['bike-a', {
    id: 'bike-a',
    brand: 'Example Bikes',
    manufacturer_url: 'https://www.example-bikes.com/bikes/bike-a',
    specs: {
      product_evidence_url: 'https://www.example-bikes.com/bikes/bike-a',
      spec_evidence: 'https://www.example-bikes.com/bikes/bike-a',
    },
  }],
]);
const componentsById = new Map([
  ['part-a', { id: 'part-a', brand: 'Shimano' }],
  ['part-b', { id: 'part-b', brand: 'SRAM' }],
]);
const bikeConfig = {
  sources: [{ brand: 'Example Bikes', officialHosts: ['example-bikes.com', 'www.example-bikes.com'] }],
};
const componentSources = {
  sources: [
    { brands: ['Shimano'], official_hosts: ['productinfo.shimano.com'] },
    { brands: ['SRAM'], official_hosts: ['www.sram.com', 'sram.com'] },
  ],
};

const row = (overrides = {}) => ({
  bike_id: 'bike-a',
  component_id: 'part-a',
  fitment_type: 'factory_installed',
  evidence_url: 'https://www.example-bikes.com/bikes/bike-a',
  evidence_checked_at: '2026-08-18',
  ...overrides,
});

test('factory-installed coverage requires identity-verified exact bike-product evidence', () => {
  const result = auditGarageFitmentEvidence({
    fitments: [row()], modelsById, componentsById, bikeConfig, componentSources,
  });
  assert.equal(result.trustedFitments.length, 1);
  assert.equal(result.trustedFactoryFitments.length, 1);
  assert.equal(result.unverified.length, 0);
  assert.equal(result.invalid.length, 0);
});

test('legacy exact-looking factory fitment without product_evidence_url is unverified rather than trusted', () => {
  const legacyModels = new Map([['bike-a', { ...modelsById.get('bike-a'), specs: { spec_evidence: 'legacy prose' } }]]);
  const result = auditGarageFitmentEvidence({
    fitments: [row()], modelsById: legacyModels, componentsById, bikeConfig, componentSources,
  });
  assert.equal(result.trustedFactoryFitments.length, 0);
  assert.equal(result.unverified.length, 1);
  assert.equal(result.invalid.length, 0);
});

test('another page on the same official bike host cannot prove factory installation', () => {
  const result = auditGarageFitmentEvidence({
    fitments: [row({ evidence_url: 'https://www.example-bikes.com/bikes/another-model' })],
    modelsById, componentsById, bikeConfig, componentSources,
  });
  assert.equal(result.trustedFactoryFitments.length, 0);
  assert.match(result.invalid[0].reason, /exact product provenance/i);
});

test('factory evidence URL normalization ignores only query fragment and trailing slash', () => {
  const result = auditGarageFitmentEvidence({
    fitments: [row({ evidence_url: 'https://www.example-bikes.com/bikes/bike-a/?utm_source=test#specs' })],
    modelsById, componentsById, bikeConfig, componentSources,
  });
  assert.equal(result.trustedFactoryFitments.length, 1);
});

test('component-manufacturer page alone cannot prove factory installation on a bike', () => {
  const result = auditGarageFitmentEvidence({
    fitments: [row({ evidence_url: 'https://productinfo.shimano.com/en/product/RD-TEST' })],
    modelsById, componentsById, bikeConfig, componentSources,
  });
  assert.equal(result.trustedFactoryFitments.length, 0);
  assert.match(result.invalid[0].reason, /bike manufacturer/i);
});

test('manufacturer-approved fitment may use exact component-manufacturer evidence without becoming factory coverage', () => {
  const result = auditGarageFitmentEvidence({
    fitments: [row({ fitment_type: 'manufacturer_approved', evidence_url: 'https://productinfo.shimano.com/en/compatibility/example' })],
    modelsById, componentsById, bikeConfig, componentSources,
  });
  assert.equal(result.trustedFitments.length, 1);
  assert.equal(result.trustedFactoryFitments.length, 0);
});

test('retailer and invalid evidence dates fail closed', () => {
  const result = auditGarageFitmentEvidence({
    fitments: [
      row({ evidence_url: 'https://retailer.example/bike-a' }),
      row({ component_id: 'part-b', evidence_checked_at: 'yesterday' }),
    ],
    modelsById, componentsById, bikeConfig, componentSources,
  });
  assert.equal(result.trustedFitments.length, 0);
  assert.equal(result.invalid.length, 2);
});
