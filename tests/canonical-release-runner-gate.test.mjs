import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflows = [
  '.github/workflows/quality.yml',
  '.github/workflows/ios-device-candidate.yml',
  '.github/workflows/android-device-candidate.yml',
];

const canonicalGate = /if:\s*>-\s*\n\s*github\.ref != 'refs\/heads\/agent\/release-closure-0\.8\.9' \|\|\s*\n\s*github\.event_name == 'workflow_dispatch' \|\|\s*\n\s*startsWith\(github\.event\.head_commit\.message, 'ci: trigger final release candidates'\)/;

test('canonical release candidate jobs do not compete with Garage before the final marker', () => {
  for (const path of workflows) {
    const source = fs.readFileSync(path, 'utf8');
    assert.match(source, canonicalGate, `${path} must reserve the canonical self-hosted runner until the final release marker`);
  }
});
