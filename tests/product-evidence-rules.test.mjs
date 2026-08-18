import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isOfficialEvidenceUrl,
  normalizeExplicitFrameMaterial,
} from '../catalog-harvester/product-evidence-rules.mjs';

const config = {
  sources: [
    { brand: 'Specialized', officialHosts: ['specialized.com', 'www.specialized.com'] },
    { brand: 'Trek', officialHosts: ['trekbikes.com', 'www.trekbikes.com'] },
  ],
};

test('accepts HTTPS official host and subdomain only', () => {
  assert.equal(isOfficialEvidenceUrl('Specialized', 'https://www.specialized.com/us/en/bike', config), true);
  assert.equal(isOfficialEvidenceUrl('Specialized', 'https://assets.specialized.com/image.webp', config), true);
  assert.equal(isOfficialEvidenceUrl('Specialized', 'http://www.specialized.com/us/en/bike', config), false);
  assert.equal(isOfficialEvidenceUrl('Specialized', 'https://specialized.example.com/bike', config), false);
  assert.equal(isOfficialEvidenceUrl('Unknown', 'https://www.specialized.com/us/en/bike', config), false);
});

test('normalizes material only when the explicit frame value states it', () => {
  assert.equal(normalizeExplicitFrameMaterial('S-Works FACT 12r Carbon'), 'Carbon');
  assert.equal(normalizeExplicitFrameMaterial('AL 6061-T6 Alloy'), 'Aluminum');
  assert.equal(normalizeExplicitFrameMaterial('4130 Chromoly Steel'), 'Steel');
  assert.equal(normalizeExplicitFrameMaterial('3Al/2.5V Titanium'), 'Titanium');
  assert.equal(normalizeExplicitFrameMaterial('Race chassis'), undefined);
});
