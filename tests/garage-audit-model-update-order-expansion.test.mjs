import assert from 'node:assert/strict';
import test from 'node:test';

async function loadExpansion() {
  try {
    return await import('../scripts/garage-model-update-audit-expansion.mjs');
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return { expandModelUpdateParsingSource: (source) => source };
  }
}

const legacyBlock = `for (const match of sql.matchAll(/update\\s+public\\.bike_catalog_models\\s+set\\s+specs\\s*=\\s*specs\\s*\\|\\|\\s*'((?:[^']|'')*)'::jsonb([\\s\\S]*?)where\\s+id\\s*=\\s*'((?:[^']|'')*)'\\s*;/gi)) {
    const id = match[3].replaceAll("''", "'");
    const model = modelsById.get(id);
    const manufacturer = match[2].match(/manufacturer_url\\s*=\\s*'((?:[^']|'')*)'/i)?.[1];
    const checked = match[2].match(/evidence_checked_at\\s*=\\s*'((?:[^']|'')*)'/i)?.[1];
    const update = {
      file,
      id,
      specs: JSON.parse(match[1].replaceAll("''", "'")),
      manufacturer: manufacturer?.replaceAll("''", "'"),
      checked: checked?.replaceAll("''", "'"),
    };
    if (!model) { pendingSpecUpdates.push(update); continue; }
    model.specs = { ...(model.specs ?? {}), ...update.specs };
    if (update.manufacturer) model.manufacturer_url = update.manufacturer;
    if (update.checked) model.evidence_checked_at = update.checked;
  }`;

const base = `import fs from 'node:fs';\nfor (const file of schemaOrder) {\n  const sql = '';\n  ${legacyBlock}\n}\n`;

test('Garage audit replaces order-dependent model update reconstruction with shared parser', async () => {
  const { expandModelUpdateParsingSource } = await loadExpansion();
  const expanded = expandModelUpdateParsingSource(base);
  assert.match(expanded, /garage-model-update-parser\.mjs/);
  assert.match(expanded, /parseBikeCatalogModelUpdates\(sql\)/);
  assert.doesNotMatch(expanded, /sql\.matchAll\(\/update\\s\+public\\\.bike_catalog_models\\s\+set\\s\+specs/);
});

test('Garage model-update expansion fails closed if legacy audit marker drifts', async () => {
  const { expandModelUpdateParsingSource } = await loadExpansion();
  assert.throws(() => expandModelUpdateParsingSource("import fs from 'node:fs';\n"), /model update|marker/i);
});
