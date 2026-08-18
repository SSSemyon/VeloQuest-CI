import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const appGradlePath = 'android/app/build.gradle';
const gradlePropertiesPath = 'android/gradle.properties';
const nativeProjectExists = fs.existsSync(manifestPath) && fs.existsSync(appGradlePath);

const nativeTest = nativeProjectExists ? test : test.skip;

nativeTest('generated Android manifest contains read-only Health Connect route permissions', () => {
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  assert.match(manifest, /android\.permission\.health\.READ_EXERCISE/);
  assert.match(manifest, /android\.permission\.health\.READ_EXERCISE_ROUTES/);
  assert.doesNotMatch(manifest, /android\.permission\.health\.WRITE_EXERCISE/);
  assert.doesNotMatch(manifest, /android\.permission\.health\.READ_HEALTH_DATA_IN_BACKGROUND/);
});

nativeTest('generated Android project has the VeloQuest release identity and version', () => {
  const gradle = fs.readFileSync(appGradlePath, 'utf8');
  assert.match(gradle, /applicationId\s+["']com\.semyonsemenyuk\.veloquest["']/);
  assert.match(gradle, /versionCode\s+9\b/);
  assert.match(gradle, /versionName\s+["']0\.8\.9["']/);
  assert.match(gradle, /minSdkVersion/);
  assert.match(gradle, /targetSdkVersion/);
});

nativeTest('generated Android project keeps React Native new architecture enabled', () => {
  assert.equal(fs.existsSync(gradlePropertiesPath), true);
  const properties = fs.readFileSync(gradlePropertiesPath, 'utf8');
  assert.match(properties, /^newArchEnabled=true$/m);
});
