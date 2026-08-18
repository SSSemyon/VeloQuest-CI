import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evidenceBatchDigest,
  nextEvidenceWaveFile,
} from '../catalog-harvester/product-evidence-wave.mjs';

test('automatic evidence waves continue after the highest committed Garage wave', () => {
  const result = nextEvidenceWaveFile({
    existingFiles: [
      'catalog_enrichment_wave_24_example.sql',
      'catalog_enrichment_wave_39_example.sql',
      'not-a-wave.sql',
    ],
    evidenceCheckedAt: '2026-08-17',
  });
  assert.deepEqual(result, {
    wave: 40,
    file: 'catalog_enrichment_wave_40_auto_official_evidence_2026_08_17.sql',
  });
});

test('evidence batch digest is order-independent and bound to extracted evidence content', () => {
  const entryA = {
    bike_id: 'bike-a',
    brand: 'Brand',
    manufacturer_url: 'https://manufacturer.test/a',
    evidence_checked_at: '2026-08-17',
    status: 'ok',
    evidence: { canonical: { wheel_size: { value: '29' } }, media: [], components: {}, ambiguities: [] },
  };
  const entryB = {
    bike_id: 'bike-b',
    brand: 'Brand',
    manufacturer_url: 'https://manufacturer.test/b',
    evidence_checked_at: '2026-08-17',
    status: 'ok',
    evidence: { canonical: { frame_material: { value: 'Carbon' } }, media: [], components: {}, ambiguities: [] },
  };
  const a = evidenceBatchDigest([entryA, entryB]);
  const b = evidenceBatchDigest([entryB, entryA]);
  const contentChanged = evidenceBatchDigest([
    { ...entryA, evidence: { ...entryA.evidence, canonical: { wheel_size: { value: '27.5' } } } },
    entryB,
  ]);
  assert.equal(a, b);
  assert.notEqual(a, contentChanged);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test('automatic evidence wave rejects invalid dates', () => {
  assert.throws(() => nextEvidenceWaveFile({
    existingFiles: [],
    evidenceCheckedAt: '17.08.2026',
  }), /YYYY-MM-DD/);
});
