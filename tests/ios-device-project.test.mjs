import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('0.8.9 native iOS project is configured for Personal Team device QA', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const app = JSON.parse(read('app.json')).expo;
  assert.equal(pkg.version, '0.8.9');
  assert.equal(lock.version, '0.8.9');
  assert.equal(lock.packages[''].version, '0.8.9');
  assert.equal(app.version, '0.8.9');
  assert.equal(app.ios.buildNumber, '9');
  assert.equal(app.android.versionCode, 9);
  assert.equal(app.ios.bundleIdentifier, 'com.semyonsemenyuk.veloquest');
  assert.equal(app.ios.supportsTablet, true);
  assert.equal(app.scheme, 'veloquest');

  const info = read('ios/VeloQuest/Info.plist');
  const entitlements = read('ios/VeloQuest/VeloQuest.entitlements');
  const project = read('ios/VeloQuest.xcodeproj/project.pbxproj');
  assert.match(info, /<key>CFBundleShortVersionString<\/key>\s*<string>0\.8\.9<\/string>/);
  assert.match(info, /<key>CFBundleVersion<\/key>\s*<string>9<\/string>/);
  assert.match(info, /<string>veloquest<\/string>/);
  assert.match(info, /<key>NSHealthShareUsageDescription<\/key>/);
  assert.match(info, /<key>NSHealthUpdateUsageDescription<\/key>/);
  assert.match(entitlements, /<key>com\.apple\.developer\.healthkit<\/key>\s*<true\/>/);
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = "com\.semyonsemenyuk\.veloquest"/);
  assert.match(project, /TARGETED_DEVICE_FAMILY = "1,2"/);
  assert.match(project, /CODE_SIGN_ENTITLEMENTS = VeloQuest\/VeloQuest\.entitlements/);
});
