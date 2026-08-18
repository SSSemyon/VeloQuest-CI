import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflowPath = '.github/workflows/android-device-candidate.yml';

test('Android candidate workflow exists and stays on free self-hosted macOS', () => {
  assert.equal(fs.existsSync(workflowPath), true);
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /runs-on:\s*\[self-hosted, macOS\]/);
  assert.doesNotMatch(source, /ubuntu-latest|macos-latest|windows-latest/);
});

test('Android candidate workflow provisions Java and Android SDK and performs clean CNG prebuild', () => {
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /actions\/setup-java@v4/);
  assert.match(source, /android-actions\/setup-android@v3/);
  assert.match(source, /sdkmanager[\s\S]*platforms;android-36/);
  assert.match(source, /sdkmanager[\s\S]*build-tools;36\.0\.0/);
  assert.match(source, /npx expo prebuild --clean --platform android --no-install/);
});

test('Android candidate workflow verifies permissions and builds an installable debug APK', () => {
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /node tests\/android-health-connect-contract\.test\.mjs/);
  assert.match(source, /node tests\/android-device-project\.test\.mjs/);
  assert.match(source, /\.\/gradlew :app:assembleDebug/);
  assert.match(source, /android\/app\/build\/outputs\/apk\/debug\/app-debug\.apk/);
});

test('Android candidate stays local to the self-hosted Mac and records SHA256', () => {
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /\$HOME\/VeloQuest-builds\/\$GITHUB_SHA/);
  assert.match(source, /VeloQuest-0\.8\.9-android-debug\.apk/);
  assert.match(source, /shasum -a 256/);
  assert.doesNotMatch(source, /actions\/upload-artifact/);
});

test('Android workflow follows the canonical release branches and source paths', () => {
  const source = fs.readFileSync(workflowPath, 'utf8');
  assert.match(source, /agent\/auth-achievements-0\.8\.9/);
  assert.match(source, /agent\/garage-completion-0\.8\.9/);
  for (const watched of ['App.tsx', 'app.json', 'package.json', 'src/**', 'supabase/**', 'scripts/**', 'tests/**']) {
    assert.match(source, new RegExp(watched.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
