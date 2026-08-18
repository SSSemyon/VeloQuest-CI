import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildManualResolutionQueue } from './manual-resolution-queue-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [
  outputArg = 'catalog-harvester/manual-resolution-queue.json',
  enrichmentArg = 'catalog-harvester/enrichment-queue.json',
  deferralsArg = 'catalog-harvester/evidence-deferrals.json',
  compatibilityArg = 'catalog-harvester/manifests/component-compatibility.json',
] = process.argv.slice(2);

async function readJson(relativePath, fallback) {
  try { return JSON.parse(await fs.readFile(path.resolve(root, relativePath), 'utf8')); }
  catch (error) {
    if (error?.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw error;
  }
}

const [enrichmentQueue, deferrals, compatibilityManifest] = await Promise.all([
  readJson(enrichmentArg),
  readJson(deferralsArg, { entries: [] }),
  readJson(compatibilityArg, { unresolved_sources: [] }),
]);
const result = buildManualResolutionQueue({ enrichmentQueue, deferrals, compatibilityManifest });
const outputPath = path.resolve(root, outputArg);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(root, outputPath),
  targetPercent: result.target_percent,
  unresolvedBikes: result.unresolved_bikes,
  bikeEvidence: result.bike_evidence.length,
  compatibilitySources: result.compatibility_sources.length,
}, null, 2));
