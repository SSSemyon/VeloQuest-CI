import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildGarageComponentBrandIndex,
  compileResolvedCompatibilityRun,
  selectResolvedCompatibilityRun,
} from './component-compatibility-compiler-core.mjs';
import { nextEvidenceWaveFile } from './product-evidence-wave.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [runArg = 'catalog-harvester/runs/component-compatibility-run.json'] = process.argv.slice(2);
const schemaRoot = path.join(root, 'supabase', 'schema');
const [runText, officialSourcesText, existingFiles] = await Promise.all([
  fs.readFile(path.resolve(root, runArg), 'utf8'),
  fs.readFile(path.join(root, 'catalog-harvester', 'component-compatibility-sources.json'), 'utf8'),
  fs.readdir(schemaRoot),
]);
const run = JSON.parse(runText);
const officialSources = JSON.parse(officialSourcesText);
const selected = selectResolvedCompatibilityRun(run);
if (selected.run.entries.length === 0) {
  console.log(JSON.stringify({ status: 'no_resolved_compatibility_evidence', ...selected.summary }, null, 2));
  process.exit(0);
}
const checkedAt = String(run.generated_at ?? selected.run.entries[0]?.checked_at ?? '');
if (!/^\d{4}-\d{2}-\d{2}$/u.test(checkedAt)) throw new Error('compatibility run has no valid evidence date');

const stable = selected.run.entries
  .map((entry) => ({
    component_id: entry.component_id,
    brand: entry.brand,
    evidence_url: entry.evidence_url,
    checked_at: entry.checked_at,
    pairs: [...entry.pairs].sort((a, b) => `${a.source_component_id}|${a.target_component_id}`.localeCompare(`${b.source_component_id}|${b.target_component_id}`)),
  }))
  .sort((a, b) => a.component_id.localeCompare(b.component_id));
const digest = crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
const marker = `-- COMPATIBILITY-EVIDENCE-BATCH-SHA256: ${digest}`;
const schemaFiles = existingFiles.filter((name) => name.endsWith('.sql')).sort();
const schemaSources = [];
for (const file of schemaFiles) {
  const source = await fs.readFile(path.join(schemaRoot, file), 'utf8');
  schemaSources.push({ file, sql: source });
  if (!/^catalog_enrichment_wave_\d+_.*\.sql$/u.test(file)) continue;
  if (source.includes(marker)) {
    console.log(JSON.stringify({ status: 'already_materialized', file: `supabase/schema/${file}`, digest, ...selected.summary }, null, 2));
    process.exit(0);
  }
}

const componentBrands = buildGarageComponentBrandIndex(schemaSources);
const compiled = compileResolvedCompatibilityRun(run, { officialSources, componentBrands });
const target = nextEvidenceWaveFile({ existingFiles, evidenceCheckedAt: checkedAt });
const header = [
  '-- AUTO-GENERATED FROM STRICT OFFICIAL MANUFACTURER COMPATIBILITY EVIDENCE.',
  '-- Only exact registered component identities and manufacturer verdicts are materialized.',
  '-- Ambiguous, footnoted, unsupported, third-party, or otherwise non-exact evidence remains unresolved; no manufacturer_approved or no_upgrade outcome is inferred.',
  marker,
  `-- Accepted source components: ${compiled.summary.accepted}; unique pairs: ${compiled.summary.uniquePairs}; rejected source components: ${compiled.summary.rejected}.`,
  '',
].join('\n');
const outputPath = path.join(schemaRoot, target.file);
await fs.writeFile(outputPath, `${header}${compiled.sql}`);
console.log(JSON.stringify({
  status: 'materialized',
  wave: target.wave,
  file: `supabase/schema/${target.file}`,
  digest,
  ...compiled.summary,
}, null, 2));
