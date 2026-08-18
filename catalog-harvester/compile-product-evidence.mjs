import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectGarageComponentIdsFromSql,
  compileProductEvidence,
  selectCompilableEvidenceRun,
} from './product-evidence-compiler-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [runArg, outputArg, queueArg = 'catalog-harvester/enrichment-queue.json'] = process.argv.slice(2);
if (!runArg || !outputArg) {
  throw new Error('usage: node catalog-harvester/compile-product-evidence.mjs <evidence-run.json> <output.sql> [enrichment-queue.json]');
}

const schemaRoot = path.join(root, 'supabase', 'schema');
const [runText, configText, queueText, schemaFiles] = await Promise.all([
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

const knownComponentIds = new Set();
for (const file of schemaFiles.filter((name) => name.endsWith('.sql')).sort()) {
  const source = await fs.readFile(path.join(schemaRoot, file), 'utf8');
  for (const id of collectGarageComponentIdsFromSql(source)) knownComponentIds.add(id);
}
if (knownComponentIds.size === 0) throw new Error('Garage component registry contains no known component ids');

const selected = selectCompilableEvidenceRun(extractedRun);
const sql = compileProductEvidence({ run: selected.run, config, knownBikeIds, knownComponentIds });
const outputPath = path.resolve(root, outputArg);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, sql);

console.log(JSON.stringify({
  input: path.relative(root, path.resolve(root, runArg)),
  output: path.relative(root, outputPath),
  knownComponentIds: knownComponentIds.size,
  ...selected.summary,
  bytes: Buffer.byteLength(sql),
}, null, 2));
