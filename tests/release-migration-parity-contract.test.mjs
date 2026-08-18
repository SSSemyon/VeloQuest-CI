import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(process.cwd());

test('release gate checks deterministic Supabase migration parity before SQL validation', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['check:migrations'], 'node scripts/build-supabase-migrations-strict.mjs --check');
  assert.equal(pkg.scripts['build:supabase-migrations'], 'node scripts/build-supabase-migrations-strict.mjs');
  const release = pkg.scripts['check:release'];
  assert.match(release, /npm run check:migrations/);
  assert.ok(release.indexOf('npm run check:migrations') < release.indexOf('npm run check:sql'));
});
