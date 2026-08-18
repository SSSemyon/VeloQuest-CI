import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

const path = 'scripts/run-garage-closure-loop.sh';

test('Garage closure loop is valid Bash', () => {
  const result = spawnSync('bash', ['-n', path], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('Garage closure loop is bounded and checks maximum before and after iterative work', () => {
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /GARAGE_CLOSURE_MAX_PASSES:-8/);
  assert.match(source, /MAX_PASSES.*-gt 12/);
  assert.match(source, /for \(\(pass = 1; pass <= MAX_PASSES; pass\+\+\)\)/);
  assert.ok((source.match(/npm run check:garage:maximum/g) ?? []).length >= 2);
});

test('Garage closure loop covers exact-product, archive resolution and component compatibility in every pass', () => {
  const source = fs.readFileSync(path, 'utf8');
  for (const command of [
    'garage:evidence:manifest',
    'garage:evidence:extract',
    'garage:evidence:materialize',
    'garage:urls:manifest',
    'garage:urls:resolve',
    'garage:urls:evidence-manifest',
    'garage:compatibility:demand',
    'garage:compatibility:manifest',
    'garage:compatibility:resolve',
    'garage:compatibility:materialize',
    'garage:evidence:deferrals',
    'garage:manual-resolution',
    'build:supabase-migrations',
  ]) assert.match(source, new RegExp(command.replaceAll(':', '\\:')));
  assert.match(source, /rm -f[\s\S]*garage-evidence-run\.json[\s\S]*component-compatibility-run\.json/);
  assert.ok((source.match(/npm run build:garage:enrichment-queue/g) ?? []).length >= 3, 'queue must be refreshed between evidence paths');
});

test('every persisted Garage pass is verified before push and protected from stale writes', () => {
  const source = fs.readFileSync(path, 'utf8');
  const verify = source.indexOf('npm test');
  const stale = source.indexOf('remote_head=');
  const commit = source.indexOf('git commit -m');
  const push = source.indexOf('git push origin');
  assert.ok(verify >= 0 && stale > verify && commit > stale && push > commit);
  for (const command of ['npm run check:catalog', 'npm run check:garage', 'npm run check:sql', 'npm run check:migrations']) {
    assert.match(source, new RegExp(command.replaceAll(':', '\\:')));
  }
  assert.match(source, /remote_head.*WORK_HEAD/s);
  assert.match(source, /WORK_HEAD="\$\(git rev-parse HEAD\)"/);
});

test('Garage closure loop stops on deterministic no-progress and never deploys production', () => {
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /closure_digest/);
  assert.match(source, /AFTER_DIGEST.*BEFORE_DIGEST/s);
  assert.match(source, /no deterministic Garage progress/i);
  assert.doesNotMatch(source, /supabase db push|supabase migration up|eas submit|expo submit|macos-latest|ubuntu-latest|windows-latest/i);
});
