import assert from 'node:assert/strict';
import test from 'node:test';

import { expandFitmentLiteralIdCoverageSource } from '../scripts/garage-fitment-select-id-expansion.mjs';

const legacy = [
  '  for (const selected of parseBikeFitmentSelectRows(sql)) {',
  '    const bikeId = modelIdentity.get(identity(selected.identity));',
  '    if (!bikeId) throw new Error(`${file}: fitment SELECT identity is not present in catalog: ${identity(selected.identity)}`);',
  '    const row = { bike_id: bikeId, ...selected.row };',
  '    fitmentsByKey.set(`${row.bike_id}|${row.component_id}|${row.fitment_type}`, row);',
  '  }',
].join('\n');

test('upgrades reconstructed fitment SELECTs to exact literal bike-id or exact identity lookup', () => {
  const expanded = expandFitmentLiteralIdCoverageSource(legacy);
  assert.match(expanded, /selected\.bike_id \?\? modelIdentity\.get\(identity\(selected\.identity\)\)/);
  assert.match(expanded, /modelsById\.has\(bikeId\)/);
  assert.match(expanded, /fitment SELECT bike selector is not present in catalog/);
});

test('resolves only declared evidence_url model binding from the exact selected model', () => {
  const expanded = expandFitmentLiteralIdCoverageSource(legacy);
  assert.match(expanded, /selected\.model_columns\?\.evidence_url === 'manufacturer_url'/);
  assert.match(expanded, /row\.evidence_url = modelsById\.get\(bikeId\)\.manufacturer_url/);
  assert.match(expanded, /unsupported fitment model-column binding/);
});

test('exact-id fitment SELECT expansion is idempotent', () => {
  const once = expandFitmentLiteralIdCoverageSource(legacy);
  const twice = expandFitmentLiteralIdCoverageSource(once);
  assert.equal(twice, once);
});
