import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflows = [
  '.github/workflows/quality.yml',
  '.github/workflows/ios-device-candidate.yml',
  '.github/workflows/android-device-candidate.yml',
  '.github/workflows/garage-evidence-batch.yml',
  '.github/workflows/garage-compatibility-research.yml',
];

test('all release and Garage workflows use the same Node 24 toolchain', () => {
  for (const path of workflows) {
    const source = fs.readFileSync(path, 'utf8');
    assert.match(source, /node-version:\s*['"]?24['"]?/, `${path} must use Node 24`);
    assert.doesNotMatch(source, /node-version:\s*['"]?22['"]?/, `${path} still uses Node 22`);
  }
});
