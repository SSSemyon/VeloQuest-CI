import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const branch = 'agent/release-closure-0.8.9';

test('release check includes the maximum Garage acceptance gate', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(
    pkg.scripts['check:release'],
    /npm run check:garage:maximum/,
    'check:release must fail while Garage is below 100/100/100/100',
  );
});

test('all exact-head release workflows track the canonical closure branch', () => {
  for (const path of [
    '.github/workflows/quality.yml',
    '.github/workflows/ios-device-candidate.yml',
    '.github/workflows/android-device-candidate.yml',
  ]) {
    const source = read(path);
    assert.match(source, new RegExp(branch.replaceAll('/', '\\/')),
      `${path} does not track ${branch}`);
  }
});

test('quality gate proves deterministic backend replay and RLS', () => {
  const quality = read('.github/workflows/quality.yml');
  assert.match(quality, /Verify exact generated migration set/);
  assert.match(quality, /run:\s*npm run check:migrations/);
  assert.doesNotMatch(quality, /node scripts\/build-supabase-migrations\.mjs --check/);
  assert.equal((quality.match(/db reset --local/g) ?? []).length, 2);
  assert.match(quality, /supabase@2\.113\.0 test db/);
});

test('native candidate workflows remain exact-head local artifacts only', () => {
  const ios = read('.github/workflows/ios-device-candidate.yml');
  const android = read('.github/workflows/android-device-candidate.yml');
  assert.match(ios, /actions\/checkout@v4/);
  assert.match(ios, /CODE_SIGNING_ALLOWED=NO/);
  assert.match(android, /actions\/checkout@v4/);
  assert.match(android, /:app:assembleDebug/);
  assert.doesNotMatch(`${ios}\n${android}`, /eas\s+submit|git\s+push|supabase\s+db\s+push/i);
});
