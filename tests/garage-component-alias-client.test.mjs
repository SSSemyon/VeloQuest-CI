import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/backend/garageCatalog.ts', 'utf8');

test('Garage client resolves component aliases from the read-only relation', () => {
  assert.match(source, /from\('garage_component_aliases'\)/);
  assert.match(source, /alias_component_id, canonical_component_id/);
  assert.match(source, /canonicalByAlias/);
});

test('Garage client keeps backward-compatible fallback before alias migration is deployed', () => {
  assert.match(source, /aliasRelationMissing/);
  assert.match(source, /42P01/);
  assert.match(source, /PGRST205/);
  assert.match(source, /return new Map(?:<string, string>)?\(\)/);
});

test('canonical aliases participate in compatibility lookup without becoming duplicate installed UI rows', () => {
  assert.match(source, /sourceIds\.add\(canonicalId\)/);
  assert.match(source, /installedIdentityIds\.add\(canonicalId\)/);
  assert.match(source, /installedIdentityIds\.has\(rule\.target_component_id\)/);
  assert.doesNotMatch(source, /fitments\.push\([^)]*canonical/i);
});
