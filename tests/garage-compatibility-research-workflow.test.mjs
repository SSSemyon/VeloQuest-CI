import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflowPath = '.github/workflows/garage-compatibility-research.yml';

test('compatibility diagnostic stays on free self-hosted macOS', () => {
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /runs-on:\s*\[self-hosted, macOS\]/);
  assert.doesNotMatch(source, /ubuntu-latest|macos-latest|windows-latest/);
});

test('compatibility diagnostic is manual-only and cannot compete with the automatic Garage closure loop', () => {
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(source, /\n\s*push:/);
  assert.match(source, /contents:\s*read/);
  assert.doesNotMatch(source, /contents:\s*write/);
});

test('compatibility diagnostic resolves evidence but never materializes or pushes it', () => {
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /garage:compatibility:demand/);
  assert.match(source, /garage:compatibility:manifest/);
  assert.match(source, /garage:compatibility:resolve/);
  assert.match(source, /garage:manual-resolution/);
  assert.doesNotMatch(source, /garage:compatibility:materialize/);
  assert.doesNotMatch(source, /git commit|git push/);
});

test('compatibility diagnostic remains fail-closed and strict-migration aware', () => {
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /component-compatibility\.json 100/);
  assert.match(source, /manifest\.target_percent !== 100/);
  assert.match(source, /manual\.target_percent !== 100/);
  assert.match(source, /npm run check:catalog/);
  assert.match(source, /npm run check:garage/);
  assert.match(source, /npm run check:sql/);
  assert.match(source, /npm run check:migrations/);
  assert.doesNotMatch(source, /supabase db push|supabase migration up|eas submit|expo submit/i);
});

test('compatibility diagnostic cannot replace a pending automatic Garage run and follows canonical branch', () => {
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /group:\s*veloquest-garage-diagnostic-\$\{\{ github\.ref \}\}/);
  assert.doesNotMatch(source, /group:\s*veloquest-garage-closure-\$\{\{ github\.ref \}\}/);
  assert.match(source, /cancel-in-progress:\s*true/);
  assert.match(source, /git checkout -B agent\/release-closure-0\.8\.9 origin\/agent\/release-closure-0\.8\.9/);
});
