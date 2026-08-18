import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync('.github/workflows/garage-evidence-batch.yml', 'utf8');

test('Garage provenance preserves distinct artifacts and starts from a clean Garage-only directory', () => {
  assert.match(workflow, /manifests\/product-url-resolution\.json/);
  assert.match(workflow, /runs\/product-url-resolution\.json/);
  assert.match(workflow, /DEST="\$HOME\/VeloQuest-builds\/\$FINAL_HEAD\/garage-closure"/);
  assert.match(workflow, /rm -rf "\$DEST"/);
  assert.match(workflow, /rel="\$\{file#catalog-harvester\/\}"/);
  assert.match(workflow, /target="\$DEST\/\$rel"/);
  assert.match(workflow, /mkdir -p "\$\(dirname "\$target"\)"/);
  assert.match(workflow, /find "\$DEST" -type f ! -name '\*\.sha256'/);
  assert.doesNotMatch(workflow, /cp "\$file" "\$DEST\/\$\(basename "\$file"\)"/);
});
