import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync('.github/workflows/garage-evidence-batch.yml', 'utf8');

test('Garage final acceptance refuses a stale local head before and after verification', () => {
  const initialGuard = workflow.indexOf('Verify final Garage head is still canonical remote head');
  const maximum = workflow.indexOf('Enforce full 100-percent Garage acceptance');
  const dbTest = workflow.indexOf('Verify database policies and contracts after Garage replay');
  const completionGuard = workflow.indexOf('Verify accepted Garage head remains canonical at completion');
  assert.ok(initialGuard >= 0, 'initial remote-head guard is missing');
  assert.ok(maximum > initialGuard, 'initial remote-head guard must run before 100-percent acceptance');
  assert.ok(dbTest > maximum, 'database replay verification must follow 100-percent acceptance');
  assert.ok(completionGuard > dbTest, 'completion remote-head guard must run after database verification');
  assert.equal((workflow.match(/git fetch origin agent\/release-closure-0\.8\.9/g) ?? []).length >= 3, true);
  assert.match(workflow, /FINAL_HEAD=\$\(git rev-parse HEAD\)/);
  assert.match(workflow, /REMOTE_HEAD=\$\(git rev-parse origin\/agent\/release-closure-0\.8\.9\)/);
  assert.match(workflow, /if \[ "\$FINAL_HEAD" != "\$REMOTE_HEAD" \]/);
  assert.match(workflow, /refusing stale final Garage verification/i);
  assert.match(workflow, /refusing stale accepted Garage head/i);
});
