import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('legacy non-Mac checkpoint remains reproducible through Wave39', () => {
  for (const path of [
    'supabase/schema/catalog_enrichment_wave_34_existing_exact_fitments_2026_08_17.sql',
    'supabase/schema/catalog_enrichment_wave_35_shimano_canonical_aliases_2026_08_17.sql',
    'supabase/schema/catalog_enrichment_wave_36_shimano_grx_alias_2026_08_17.sql',
    'supabase/schema/catalog_enrichment_wave_37_sram_transmission_aliases_2026_08_17.sql',
    'supabase/schema/catalog_enrichment_wave_38_wheel_size_core_completion_2026_08_17.sql',
    'supabase/schema/catalog_enrichment_wave_39_specialized_wheel_size_2026_08_17.sql',
  ]) assert.equal(fs.existsSync(path), true, `${path} missing`);
});

test('release closure adds scalable evidence materialization and alias safety gates', () => {
  for (const path of [
    'catalog-harvester/product-evidence-runner.mjs',
    'catalog-harvester/product-evidence-compiler-core.mjs',
    'catalog-harvester/materialize-product-evidence-wave.mjs',
    'scripts/audit-garage-alias-contracts.mjs',
  ]) assert.equal(fs.existsSync(path), true, `${path} missing`);
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['check:garage'], /audit-garage-alias-contracts\.mjs/);
  assert.match(pkg.scripts['check:release'], /check:garage:maximum/);
});

test('release closure keeps free self-hosted Android and evidence workflows', () => {
  const android = read('.github/workflows/android-device-candidate.yml');
  const evidence = read('.github/workflows/garage-evidence-batch.yml');
  assert.match(android, /runs-on:\s*\[self-hosted, macOS\]/);
  assert.match(android, /:app:assembleDebug/);
  assert.match(evidence, /runs-on:\s*\[self-hosted, macOS\]/);
  assert.match(evidence, /garage:evidence:extract/);
  assert.match(evidence, /garage:evidence:materialize/);
});

test('release closure automation never mutates production Supabase or submits stores', () => {
  for (const path of [
    '.github/workflows/android-device-candidate.yml',
    '.github/workflows/garage-evidence-batch.yml',
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /supabase\s+(?:db\s+push|migration\s+up)|eas\s+submit|expo\s+submit/i);
  }
});
