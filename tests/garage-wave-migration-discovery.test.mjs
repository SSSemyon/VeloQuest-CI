import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { discoverLateGarageWaves, garageWaveMigrationName } from '../scripts/garage-wave-migrations.mjs';

test('late Garage waves are discovered from wave 24 onward in numeric order', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veloquest-waves-'));
  for (const file of [
    'catalog_enrichment_wave_34_delta.sql',
    'catalog_enrichment_wave_27_beta.sql',
    'catalog_enrichment_wave_24_alpha.sql',
    'catalog_enrichment_wave_26_gamma.sql',
    'catalog_enrichment_wave_23_legacy.sql',
    'not_a_wave.sql',
  ]) fs.writeFileSync(path.join(dir, file), '-- test\n');

  assert.deepEqual(discoverLateGarageWaves(dir), [
    { wave: 24, file: 'catalog_enrichment_wave_24_alpha.sql' },
    { wave: 26, file: 'catalog_enrichment_wave_26_gamma.sql' },
    { wave: 27, file: 'catalog_enrichment_wave_27_beta.sql' },
    { wave: 34, file: 'catalog_enrichment_wave_34_delta.sql' },
  ]);
});

test('duplicate late Garage wave numbers fail closed before migration naming', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veloquest-waves-duplicate-'));
  fs.writeFileSync(path.join(dir, 'catalog_enrichment_wave_40_hagen_exact.sql'), '-- canonical\n');
  fs.writeFileSync(path.join(dir, 'catalog_enrichment_wave_40_hagen_duplicate.sql'), '-- duplicate\n');

  assert.throws(
    () => discoverLateGarageWaves(dir),
    /duplicate Garage wave 40/i,
  );
});

test('late Garage migration filenames are deterministic and preserve existing wave 24-33 names', () => {
  assert.equal(garageWaveMigrationName(24), '20260817150000_garage_enrichment_wave24.sql');
  assert.equal(garageWaveMigrationName(25), '20260817151000_garage_enrichment_wave25.sql');
  assert.equal(garageWaveMigrationName(26), '20260817152000_garage_enrichment_wave26.sql');
  assert.equal(garageWaveMigrationName(27), '20260817153000_garage_enrichment_wave27.sql');
  assert.equal(garageWaveMigrationName(33), '20260817163000_garage_enrichment_wave33.sql');
  assert.equal(garageWaveMigrationName(34), '20260817164000_garage_enrichment_wave34.sql');
  assert.equal(garageWaveMigrationName(78), '20260818000000_garage_enrichment_wave78.sql');
  assert.throws(() => garageWaveMigrationName(23), /wave 24 or later/i);
});
