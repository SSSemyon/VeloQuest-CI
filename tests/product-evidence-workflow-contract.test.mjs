import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const readme = fs.readFileSync('catalog-harvester/README.md', 'utf8');

test('package exposes deterministic product evidence manifest, extraction and compilation commands', () => {
  assert.equal(pkg.scripts['garage:evidence:manifest'], 'node catalog-harvester/build-product-evidence-manifest.mjs');
  assert.equal(pkg.scripts['garage:evidence:extract'], 'node catalog-harvester/extract-product-evidence.mjs');
  assert.equal(pkg.scripts['garage:evidence:compile'], 'node catalog-harvester/compile-product-evidence.mjs');
});

test('harvester runbook documents evidence-only boundaries', () => {
  assert.match(readme, /garage:evidence:manifest/);
  assert.match(readme, /garage:evidence:extract/);
  assert.match(readme, /garage:evidence:compile/);
  assert.match(readme, /factory_installed/);
  assert.match(readme, /does not create `garage_compatibility`/i);
  assert.match(readme, /does not create `no_upgrade`/i);
});
