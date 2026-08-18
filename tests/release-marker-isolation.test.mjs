import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const finalMarker = '.github/run-release-candidates';
const garageMarker = '.github/run-self-hosted';

test('final exact-head release marker is isolated from automatic Garage closure', () => {
  assert.equal(fs.existsSync(finalMarker), true, `${finalMarker} must exist`);

  for (const path of [
    '.github/workflows/quality.yml',
    '.github/workflows/ios-device-candidate.yml',
    '.github/workflows/android-device-candidate.yml',
  ]) {
    const source = fs.readFileSync(path, 'utf8');
    assert.match(source, /\.github\/run-release-candidates/, `${path} must watch the final release marker`);
    assert.doesNotMatch(source, /\.github\/run-self-hosted/, `${path} must not share the Garage trigger marker`);
  }

  const garage = fs.readFileSync('.github/workflows/garage-evidence-batch.yml', 'utf8');
  assert.match(garage, /\.github\/run-self-hosted/);
  assert.doesNotMatch(garage, /\.github\/run-release-candidates/);
});
