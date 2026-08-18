import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildComponentCompatibilityManifest } from './component-compatibility-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [
  demandArg = 'catalog-harvester/compatibility-demand.json',
  outputArg = 'catalog-harvester/manifests/component-compatibility.json',
  limitArg = '100',
  registryArg = 'catalog-harvester/component-compatibility-sources.json',
  deferralsArg = 'catalog-harvester/evidence-deferrals.json',
] = process.argv.slice(2);

async function readJson(relativePath, fallback) {
  try { return JSON.parse(await fs.readFile(path.resolve(root, relativePath), 'utf8')); }
  catch (error) {
    if (error?.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw error;
  }
}

const [demand, registry, deferrals] = await Promise.all([
  readJson(demandArg),
  readJson(registryArg),
  readJson(deferralsArg, { schema_version: 1, max_auto_attempts: 3, entries: [] }),
]);
const manifest = buildComponentCompatibilityManifest({
  demand,
  registry,
  deferrals,
  limit: Number(limitArg),
});
const outputPath = path.resolve(root, outputArg);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(root, outputPath),
  entries: manifest.entries.length,
  unresolvedSources: manifest.unresolved_sources.length,
  uncoveredBikes: manifest.uncovered_bikes,
}, null, 2));
