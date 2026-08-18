import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const health = fs.readFileSync('src/integrations/healthConnect.ts', 'utf8');

const permissions = new Set(app.expo?.android?.permissions ?? []);

test('Android declares exercise session and exercise route read permissions', () => {
  assert.equal(permissions.has('android.permission.health.READ_EXERCISE'), true);
  assert.equal(permissions.has('android.permission.health.READ_EXERCISE_ROUTES'), true);
});

test('Health Connect remains read-only and requests route access only after consent is required', () => {
  assert.match(health, /requestPermission\(\[\{ accessType: 'read', recordType: 'ExerciseSession' \}\]\)/);
  assert.match(health, /exerciseRoute\?\.type === 2/);
  assert.match(health, /requestExerciseRoute\(session\.metadata\.id\)/);
  assert.equal(permissions.has('android.permission.health.WRITE_EXERCISE'), false);
  assert.equal(permissions.has('android.permission.health.WRITE_EXERCISE_ROUTE'), false);
  assert.equal(permissions.has('android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND'), false);
});
