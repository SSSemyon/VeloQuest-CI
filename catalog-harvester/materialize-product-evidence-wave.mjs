import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectGarageComponentIdsFromSql,
  compileProductEvidence,
  selectCompilableEvidenceRun,
} from './product-evidence-compiler-core.mjs';
import {
  evidenceBatchDigest,
  nextEvidenceWaveFile,
} from './product-evidence-wave.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [runArg, queueArg = 'catalog-harvester/enrichment-queue.json'] = process.argv.slice(2);
if (!runArg) {
  throw new Error('usage: node catalog-harvester/materialize-product-evidence-wave.mjs <evidence-run.json> [enrichment-queue.json]');
}

const schemaRoot = path.join(root, 'supabase', 'schema');
const [runText, configText, queueText, existingFiles] = await Promise.all([
  fs.readFile(path.resolve(root, runArg), 'utf8'),
  fs.readFile(path.join(root, 'catalog-harvester', 'config.json'), 'utf8'),
  fs.readFile(path.resolve(root, queueArg), 'utf8'),
  fs.readdir(schemaRoot),
]);
const extractedRun = JSON.parse(runText);
const config = JSON.parse(configText);
const queue = JSON.parse(queueText);
const knownBikeIds = new Set((queue.entries ?? []).map((entry) => entry.id));
if (knownBikeIds.size === 0) throw new Error('enrichment queue contains no bike ids');

const schemaFiles = existingFiles.filter((name) => name.endsWith('.sql')).sort();
const schemaSources = await Promise.all(schemaFiles.map(async (file) => ({
  file,
  source: await fs.readFile(path.join(schemaRoot, file), 'utf8'),
})));
const knownComponentIds = new Set();
for (const { source } of schemaSources) {
  for (const id of collectGarageComponentIdsFromSql(source)) knownComponentIds.add(id);
}
if (knownComponentIds.size === 0) throw new Error('Garage component registry contains no known component ids');

const selected = selectCompilableEvidenceRun(extractedRun);
const evidenceCheckedAt = String(selected.run.generated_at ?? selected.run.entries[0]?.evidence_checked_at ?? '');
if (!/^\d{4}-\d{2}-\d{2}$/u.test(evidenceCheckedAt)) throw new Error('evidence run has no valid YYYY-MM-DD evidence date');
const digest = evidenceBatchDigest(selected.run.entries);
const marker = `-- EVIDENCE-BATCH-SHA256: ${digest}`;

for (const { file, source } of schemaSources.filter(({ file }) => /^catalog_enrichment_wave_\d+_.*\.sql$/u.test(file))) {
  if (source.includes(marker)) {
    console.log(JSON.stringify({
      status: 'already_materialized',
      file: `supabase/schema/${file}`,
      digest,
      ...selected.summary,
    }, null, 2));
    process.exit(0);
  }
}

const target = nextEvidenceWaveFile({ existingFiles, evidenceCheckedAt });
const sql = compileProductEvidence({ run: selected.run, config, knownBikeIds, knownComponentIds });
const header = [
  '-- AUTO-GENERATED FROM FAIL-CLOSED OFFICIAL PRODUCT EVIDENCE.',
  '-- This source contains only extractor entries with status=ok.',
  '-- It never creates garage_compatibility, manufacturer_approved fitment, or recommendation outcomes.',
  '-- Exact OEM part-number aliases are emitted only when the canonical component already exists in the reviewed registry.',
  marker,
  `-- Accepted: ${selected.summary.accepted}; rejected: ${selected.summary.rejected}.`,
  '',
].join('\n');
const outputPath = path.join(schemaRoot, target.file);
await fs.writeFile(outputPath, `${header}${sql}`);

console.log(JSON.stringify({
  status: 'materialized',
  wave: target.wave,
  file: `supabase/schema/${target.file}`,
  digest,
  knownComponentIds: knownComponentIds.size,
  ...selected.summary,
  bytes: Buffer.byteLength(`${header}${sql}`),
}, null, 2));
