import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'catalog-harvester', 'hagen-official-evidence.json');

test('Hagen evidence manifest covers every official family with stable trusted identities', () => {
  assert.ok(fs.existsSync(manifestPath), 'Hagen official evidence manifest must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.brand, 'Hagen');
  assert.equal(manifest.evidencePolicy, 'manufacturer-primary');
  assert.ok(Array.isArray(manifest.models) && manifest.models.length >= 50);

  const families = new Set();
  const identities = new Set();
  for (const entry of manifest.models) {
    assert.equal(entry.brand, 'Hagen');
    assert.ok(Number.isInteger(entry.modelYear) && entry.modelYear >= 2020 && entry.modelYear <= 2026);
    assert.match(entry.officialUrl, /^https:\/\/hagen\.bike\//);
    assert.match(entry.officialFamilyUrl, /^https:\/\/hagen\.bike\//);
    assert.match(entry.capturedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(['mtb', 'women', 'gravel', 'hybrid', 'teen_pro', 'teen'].includes(entry.family));
    assert.match(entry.id, /^hagen-[a-z0-9-]+-20(?:2[0-6])-ru$/);
    assert.ok(!identities.has(entry.id), `duplicate Hagen identity: ${entry.id}`);
    identities.add(entry.id);
    families.add(entry.family);
  }

  assert.deepEqual([...families].sort(), ['gravel', 'hybrid', 'mtb', 'teen', 'teen_pro', 'women']);
  assert.ok(identities.has('hagen-3-12-2025-ru'), 'the rider-owned Hagen 3.12 2025 must be catalogued');
  assert.ok(identities.has('hagen-3-12-2026-ru'));
});

test('release master inventory includes every validated Hagen identity', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const master = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'master-manifest.json'), 'utf8'));
  assert.equal(manifest.models.length, 55);
  assert.equal(master.enabled_model_count, 718);
  assert.equal(master.enabled_brand_count, 44);
  for (const entry of manifest.models) assert.ok(master.ids.includes(entry.id), `master manifest missing ${entry.id}`);
});

test('Garage audit reconstructs the Hagen forward catalog source', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'audit-garage-catalog.mjs'), '--strict-core'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.masterCatalog.models, 718);
  assert.equal(report.masterCatalog.brands, 44);
  assert.equal(report.masterCatalog.brandCounts.Hagen, 55);
  assert.equal(report.masterCatalog.manufacturerHostCounts['hagen.bike'], 55);
});
