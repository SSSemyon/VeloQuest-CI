import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('catalog-harvester/materialize-component-compatibility-wave.mjs', 'utf8');

test('compatibility auto-wave provenance supports matrix and system-rule evidence without overstating either', () => {
  assert.match(source, /strict official manufacturer compatibility evidence/i);
  assert.match(source, /exact registered component identities and manufacturer verdicts/i);
  assert.doesNotMatch(source, /binary manufacturer matrix verdicts/i);
});
