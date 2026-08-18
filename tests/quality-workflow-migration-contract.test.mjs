import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = '.github/workflows/quality.yml';

test('quality workflow uses the same strict migration gate as release checks', () => {
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /Verify exact generated migration set/);
  assert.match(source, /run:\s*npm run check:migrations/);
  assert.doesNotMatch(source, /node scripts\/build-supabase-migrations\.mjs --check/);
});
