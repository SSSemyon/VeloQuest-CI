import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'hagen-official-evidence.json'), 'utf8'));
const families = new Set(['mtb', 'women', 'gravel', 'hybrid', 'teen_pro', 'teen']);
const categories = new Set(['mountain', 'xc_hardtail', 'gravel', 'gravel_suspension', 'urban_fitness', 'hybrid', 'kids']);
const ids = new Set();
const identities = new Set();
const failures = [];

for (const [index, entry] of manifest.models.entries()) {
  const location = `models[${index}]`;
  const identity = `${entry.model?.trim().toLocaleLowerCase()}|${entry.modelYear}|ru`;
  if (entry.brand !== 'Hagen') failures.push(`${location}: brand must be Hagen`);
  if (!entry.model?.trim()) failures.push(`${location}: model is required`);
  if (!Number.isInteger(entry.modelYear) || entry.modelYear < 2020 || entry.modelYear > 2026) failures.push(`${location}: modelYear must be 2020..2026`);
  if (!families.has(entry.family)) failures.push(`${location}: unsupported family`);
  if (!categories.has(entry.category)) failures.push(`${location}: unsupported category`);
  if (!/^hagen-[a-z0-9-]+-20(?:2[0-6])-ru$/.test(entry.id ?? '')) failures.push(`${location}: unstable id`);
  if (!/^https:\/\/hagen\.bike\//.test(entry.officialUrl ?? '')) failures.push(`${location}: officialUrl must be hagen.bike HTTPS`);
  if (!/^https:\/\/hagen\.bike\//.test(entry.officialFamilyUrl ?? '')) failures.push(`${location}: officialFamilyUrl must be hagen.bike HTTPS`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.capturedAt ?? '')) failures.push(`${location}: capturedAt must be YYYY-MM-DD`);
  if (ids.has(entry.id)) failures.push(`${location}: duplicate id ${entry.id}`);
  if (identities.has(identity)) failures.push(`${location}: duplicate identity ${identity}`);
  ids.add(entry.id);
  identities.add(identity);
}

const coveredFamilies = new Set(manifest.models.map((entry) => entry.family));
for (const family of families) if (!coveredFamilies.has(family)) failures.push(`missing family: ${family}`);

if (failures.length) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    valid: true,
    brand: manifest.brand,
    models: manifest.models.length,
    modelYears: [...new Set(manifest.models.map((entry) => entry.modelYear))].sort(),
    families: [...coveredFamilies].sort(),
    officialHost: 'hagen.bike',
  }, null, 2));
}
