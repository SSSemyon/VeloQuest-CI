import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildResolvedProductEvidenceManifest } from './resolved-product-evidence-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [runArg, outputArg = 'catalog-harvester/manifests/resolved-product-evidence.json'] = process.argv.slice(2);
if (!runArg) {
  throw new Error('usage: node catalog-harvester/build-resolved-product-evidence-manifest.mjs <resolution-run.json> [output.json]');
}

const run = JSON.parse(await fs.readFile(path.resolve(root, runArg), 'utf8'));
const manifest = buildResolvedProductEvidenceManifest(run);
const outputPath = path.resolve(root, outputArg);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(root, outputPath),
  entries: manifest.entries.length,
  batchSize: manifest.batch_size,
}, null, 2));
