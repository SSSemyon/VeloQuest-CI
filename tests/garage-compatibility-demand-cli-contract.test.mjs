import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('package exposes deterministic Garage compatibility demand command', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['garage:compatibility:demand'], 'node scripts/build-garage-compatibility-demand.mjs');
});

test('compatibility demand CLI is research-only and cannot persist verdict SQL', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'build-garage-compatibility-demand.mjs'), 'utf8');
  assert.match(source, /compatibility-demand\.json/);
  assert.match(source, /target_percent:\s*100/);
  assert.doesNotMatch(source, /insert\s+into\s+public\.garage_compatibility/i);
  assert.doesNotMatch(source, /manufacturer_approved/);
  assert.doesNotMatch(source, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
});
