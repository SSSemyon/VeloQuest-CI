import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runComponentCompatibilityManifest } from './component-compatibility-runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [
  manifestArg = 'catalog-harvester/manifests/component-compatibility.json',
  demandArg = 'catalog-harvester/compatibility-demand.json',
  outputArg = 'catalog-harvester/runs/component-compatibility-run.json',
] = process.argv.slice(2);

const [manifest, demand] = await Promise.all([
  fs.readFile(path.resolve(root, manifestArg), 'utf8').then(JSON.parse),
  fs.readFile(path.resolve(root, demandArg), 'utf8').then(JSON.parse),
]);
const result = await runComponentCompatibilityManifest({
  manifest,
  componentRegistry: demand.component_registry ?? [],
});
const outputPath = path.resolve(root, outputArg);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(root, outputPath),
  ...result.summary,
}, null, 2));
