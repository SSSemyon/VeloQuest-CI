import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const path = '.github/workflows/garage-evidence-batch.yml';

test('automatic Garage closure stays on free self-hosted macOS', () => {
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /runs-on:\s*\[self-hosted, macOS\]/);
  assert.doesNotMatch(source, /ubuntu-latest|macos-latest|windows-latest/);
});

test('automatic Garage workflow delegates all repeated batch logic to the bounded closure orchestrator', () => {
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /bash scripts\/run-garage-closure-loop\.sh/);
  assert.match(source, /GARAGE_CLOSURE_MAX_PASSES:\s*'12'/);
  assert.match(source, /GARAGE_CLOSURE_BRANCH:\s*agent\/release-closure-0\.8\.9/);
  assert.doesNotMatch(source, /garage:evidence:manifest|garage:urls:resolve|garage:compatibility:materialize/);
});

test('automatic Garage workflow synchronizes canonical head and a fresh trigger supersedes stale Garage runs', () => {
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /group:\s*veloquest-garage-closure-\$\{\{ github\.ref \}\}/);
  assert.match(source, /cancel-in-progress:\s*true/);
  assert.match(source, /git checkout -B agent\/release-closure-0\.8\.9 origin\/agent\/release-closure-0\.8\.9/);
  assert.match(source, /WORK_HEAD=\$\(git rev-parse HEAD\)/);
});

test('automatic Garage workflow records provenance, enforces maximum, verifies committed reproducibility, then replays migrations locally', () => {
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /FINAL_HEAD=\$\(git rev-parse HEAD\)/);
  assert.match(source, /VeloQuest-builds\/\$FINAL_HEAD/);
  assert.match(source, /garage-closure\.sha256/);
  const maximum = source.indexOf('npm run check:garage:maximum');
  const release = source.indexOf('npm run check:release');
  const drift = source.indexOf('Final Garage verification left uncommitted persisted-state drift');
  const start = source.indexOf('supabase@2.113.0 start');
  const reset = source.indexOf('supabase@2.113.0 db reset --local');
  const dbTest = source.indexOf('supabase@2.113.0 test db');
  assert.ok(maximum >= 0 && release > maximum && drift > release && start > drift && reset > start && dbTest > reset);
  assert.match(source, /git status --porcelain/);
  assert.match(source, /supabase@2\.113\.0 stop --no-backup/);
});

test('automatic Garage workflow can write only reversible repository state', () => {
  const source = fs.readFileSync(path, 'utf8');
  assert.match(source, /contents:\s*write/);
  assert.doesNotMatch(source, /supabase db push|supabase migration up|eas submit|expo submit/i);
  assert.doesNotMatch(source, /personal access token|github app|PAT_SECRET/i);
});
