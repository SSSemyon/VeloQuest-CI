import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const audit = fs.readFileSync('scripts/audit-garage-compatibility-sources.mjs', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('Garage release gate audits all committed compatibility evidence sources', () => {
  assert.match(pkg.scripts['check:garage'], /audit-garage-compatibility-sources\.mjs/);
  assert.match(audit, /component-compatibility-sources\.json/);
  assert.match(audit, /garage_components/);
  assert.match(audit, /garage_compatibility/);
});

test('historical compatibility audit fails closed on unparsed mutation forms', () => {
  assert.match(audit, /update\\s\+public\\\.garage_compatibility/);
  assert.match(audit, /delete\\s\+from\\s\+public\\\.garage_compatibility/);
  assert.match(audit, /unsupported garage_compatibility UPDATE\/DELETE mutation/);
});
