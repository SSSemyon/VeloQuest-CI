import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('catalog-harvester/materialize-component-compatibility-wave.mjs', 'utf8');

test('compatibility materializer enforces committed official sources and exact component brands', () => {
  assert.match(source, /component-compatibility-sources\.json/);
  assert.match(source, /const officialSources = JSON\.parse\(officialSourcesText\)/);
  assert.match(source, /buildGarageComponentBrandIndex/);
  assert.match(source, /const componentBrands = buildGarageComponentBrandIndex/);
  assert.match(source, /compileResolvedCompatibilityRun\(run, \{ officialSources, componentBrands \}\)/);
  assert.match(source, /third-party/);
});
