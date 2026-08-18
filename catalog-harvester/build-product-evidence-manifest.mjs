import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildProductEvidenceManifest } from './product-evidence-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [
  outputArg = 'catalog-harvester/manifests/product-evidence.json',
  limitArg = '100',
  queueArg = 'catalog-harvester/enrichment-queue.json',
  deferralsArg = 'catalog-harvester/evidence-deferrals.json',
] = process.argv.slice(2);
const [queueText, configText, deferralsText] = await Promise.all([
  fs.readFile(path.resolve(root, queueArg), 'utf8'),
  fs.readFile(path.join(root, 'catalog-harvester', 'config.json'), 'utf8'),
  fs.readFile(path.resolve(root, deferralsArg), 'utf8').catch((error) => error?.code === 'ENOENT' ? '{"schema_version":1,"max_auto_attempts":3,"entries":[]}' : Promise.reject(error)),
]);
const manifest = buildProductEvidenceManifest({
  queue: JSON.parse(queueText),
  config: JSON.parse(configText),
  deferrals: JSON.parse(deferralsText),
  limit: Number(limitArg),
});
const outputPath = path.resolve(root, outputArg);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(root, outputPath), entries: manifest.entries.length, batchSize: manifest.batch_size }, null, 2));
