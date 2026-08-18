import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { updateEvidenceDeferrals } from './evidence-deferrals-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [
  deferralsArg = 'catalog-harvester/evidence-deferrals.json',
  productRunArg = 'catalog-harvester/runs/garage-evidence-run.json',
  urlResolutionRunArg = 'catalog-harvester/runs/product-url-resolution.json',
  resolvedProductRunArg = 'catalog-harvester/runs/resolved-product-evidence-run.json',
  compatibilityRunArg = 'catalog-harvester/runs/component-compatibility-run.json',
] = process.argv.slice(2);

async function readJsonIfExists(relativePath) {
  const absolute = path.resolve(root, relativePath);
  try {
    return JSON.parse(await fs.readFile(absolute, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
}

const deferralsPath = path.resolve(root, deferralsArg);
const previous = await readJsonIfExists(deferralsArg) ?? { schema_version: 1, max_auto_attempts: 3, entries: [] };
const [productRun, urlResolutionRun, resolvedProductRun, compatibilityRun] = await Promise.all([
  readJsonIfExists(productRunArg),
  readJsonIfExists(urlResolutionRunArg),
  readJsonIfExists(resolvedProductRunArg),
  readJsonIfExists(compatibilityRunArg),
]);
const checkedAt = [productRun, urlResolutionRun, resolvedProductRun, compatibilityRun]
  .map((run) => run?.generated_at)
  .filter((value) => /^\d{4}-\d{2}-\d{2}$/u.test(String(value ?? '')))
  .sort()
  .at(-1) ?? new Date().toISOString().slice(0, 10);

const next = updateEvidenceDeferrals({
  previous,
  checkedAt,
  productRun,
  urlResolutionRun,
  resolvedProductRun,
  compatibilityRun,
});
await fs.mkdir(path.dirname(deferralsPath), { recursive: true });
await fs.writeFile(deferralsPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(root, deferralsPath),
  entries: next.entries.length,
  manualResolutionRequired: next.entries.filter((entry) => entry.manual_resolution_required).length,
  byPath: Object.fromEntries([...new Set(next.entries.map((entry) => entry.path))].sort().map((pathName) => [pathName, next.entries.filter((entry) => entry.path === pathName).length])),
}, null, 2));
