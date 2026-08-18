import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  discoverLateGarageWaves,
  enforceGarageFullCoverageSource,
  expandGarageAuditSource,
  expandRecommendationCoverageSource,
} from '../scripts/garage-audit-wave-discovery.mjs';

test('Garage audit discovers every enrichment wave from 20 onward in numeric order', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vq-garage-audit-'));
  try {
    for (const file of [
      'catalog_enrichment_wave_33_final.sql', 'catalog_enrichment_wave_19_old.sql',
      'catalog_enrichment_wave_20_first.sql', 'catalog_enrichment_wave_100_future.sql',
    ]) fs.writeFileSync(path.join(root, file), '-- fixture\n');
    assert.deepEqual(discoverLateGarageWaves(root), [
      'catalog_enrichment_wave_20_first.sql', 'catalog_enrichment_wave_33_final.sql', 'catalog_enrichment_wave_100_future.sql',
    ]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('Garage audit expansion injects discovered waves into schemaOrder exactly once', () => {
  const base = `const schemaOrder = [\n  'release_upgrade_parity.sql',\n];\n`;
  const expanded = expandGarageAuditSource(base, ['catalog_enrichment_wave_20_first.sql','catalog_enrichment_wave_33_final.sql']);
  assert.match(expanded, /'release_upgrade_parity\.sql',\n  'catalog_enrichment_wave_20_first\.sql',\n  'catalog_enrichment_wave_33_final\.sql',/);
});

test('Garage recommendation expansion injects aliases and replaces legacy compatible-only block', () => {
  const base = `import { fileURLToPath } from 'node:url';\n\nconst fitmentsByKey = new Map();\nfor (const file of schemaOrder) {\n  const sql = '';\n  for (const row of inserts(sql, 'bike_catalog_component_fitments')) fitmentsByKey.set(\`\${row.bike_id}|\${row.component_id}|\${row.fitment_type}\`, row);\n}\nconst fitments = [...fitmentsByKey.values()];\nconst outgoingCompatible = new Map();\nfor (const rule of compatibility.filter((row) => row.status === 'compatible')) { legacy(); }\nconst recommendationReadyBikeIds = new Set();\nconst approvedFitmentBikeIds = new Set();\nfor (const bikeId of fitmentBikeIds) { legacyAgain(); }\nconst brandCounts = {};\n`;
  const expanded = expandRecommendationCoverageSource(base);
  assert.match(expanded, /componentAliasesByKey = new Map/);
  assert.match(expanded, /inserts\(sql, 'garage_component_aliases'\)/);
  assert.match(expanded, /const componentAliases = \[\.\.\.componentAliasesByKey\.values\(\)\]/);
  assert.match(expanded, /computeRecommendationCoverage\(\{ fitments, compatibility, aliases: componentAliases, activeModelIds \}\)/);
  assert.doesNotMatch(expanded, /outgoingCompatible/);
});

test('Garage audit recommendation expansion fails closed if required markers drift', () => {
  assert.throws(() => expandRecommendationCoverageSource("import { fileURLToPath } from 'node:url';\nconst brandCounts = {};\n"), /marker|legacy recommendation/i);
});

test('Garage full-coverage transform raises all four release targets to 100 percent', () => {
  const base = [
    'const targets = { photo_percent: 80, core_specs_percent: 80, exact_fitment_percent: 60, recommendation_outcome_percent: 60 };',
    'result.media.coveragePercent < 80 && `photo coverage ${result.media.coveragePercent}% < 80%`',
    'result.semanticCoverage.finderFilterComplete.percent < 80 && `core finder spec coverage ${result.semanticCoverage.finderFilterComplete.percent}% < 80%`',
    'result.compatibility.fitmentCoveragePercent < 60 && `exact fitment coverage ${result.compatibility.fitmentCoveragePercent}% < 60%`',
    'result.compatibility.recommendationCoveragePercent < 60 && `recommendation/outcome coverage ${result.compatibility.recommendationCoveragePercent}% < 60%`',
  ].join('\n');
  const expanded = enforceGarageFullCoverageSource(base);
  assert.match(expanded, /photo_percent: 100/);
  assert.match(expanded, /core_specs_percent: 100/);
  assert.match(expanded, /exact_fitment_percent: 100/);
  assert.match(expanded, /recommendation_outcome_percent: 100/);
  assert.match(expanded, /coveragePercent < 100/);
  assert.match(expanded, /finderFilterComplete\.percent < 100/);
  assert.match(expanded, /fitmentCoveragePercent < 100/);
  assert.match(expanded, /recommendationCoveragePercent < 100/);
});

test('Garage full-coverage transform fails closed when legacy target markers drift', () => {
  assert.throws(() => enforceGarageFullCoverageSource('const targets = {};'), /coverage target marker/i);
});
