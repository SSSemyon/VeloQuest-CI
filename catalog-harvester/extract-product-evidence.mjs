import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runEvidenceManifest } from './product-evidence-runner.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'catalog-harvester', 'config.json');
const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const hostLastRequest = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retryDelay(response, attempt) {
  const header = response?.headers?.get?.('retry-after');
  if (header && /^\d+$/.test(header)) return Number(header) * 1000;
  return Math.min(30_000, 1000 * (2 ** attempt)) + Math.floor(Math.random() * 250);
}

async function throttledFetch(rawUrl, options = {}, attempt = 0) {
  const url = new URL(rawUrl);
  const last = hostLastRequest.get(url.hostname) || 0;
  const wait = Number(config.requestDelayMsPerHost ?? 1000) - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  hostLastRequest.set(url.hostname, Date.now());

  const response = await fetch(url, options);
  if ((response.status === 429 || response.status >= 500) && attempt < Number(config.maxRetries ?? 4)) {
    await sleep(retryDelay(response, attempt));
    return throttledFetch(rawUrl, options, attempt + 1);
  }
  return response;
}

const [manifestArg, outputArg] = process.argv.slice(2);
if (!manifestArg) {
  throw new Error('usage: node catalog-harvester/extract-product-evidence.mjs <manifest.json> [output.json]');
}

const manifestPath = path.resolve(root, manifestArg);
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const evidenceCheckedAt = new Date().toISOString().slice(0, 10);
const result = await runEvidenceManifest({
  manifest,
  config,
  fetchImpl: throttledFetch,
  evidenceCheckedAt,
});
const serialized = `${JSON.stringify(result, null, 2)}\n`;

if (outputArg) {
  const outputPath = path.resolve(root, outputArg);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, serialized);
  console.log(JSON.stringify({
    output: path.relative(root, outputPath),
    generated_at: result.generated_at,
    summary: result.summary,
  }, null, 2));
} else {
  process.stdout.write(serialized);
}
