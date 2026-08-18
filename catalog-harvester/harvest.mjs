import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { URL } from 'node:url';

const base = new URL('./', import.meta.url);
const config = JSON.parse(await fs.readFile(new URL('config.json', base), 'utf8'));
const hostLastRequest = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const slug = (value) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sqlString = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;

function sourceFor(brand) {
  const source = config.sources.find((item) => item.brand.toLowerCase() === brand.toLowerCase());
  if (!source) throw new Error(`brand is not in source registry: ${brand}`);
  return source;
}

function isOfficialUrl(brand, rawUrl) {
  const source = sourceFor(brand);
  const url = new URL(rawUrl);
  return url.protocol === 'https:' && source.officialHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

function validateModel(model) {
  const errors = [];
  if (!model.brand || !model.model) errors.push('brand/model missing');
  if (!Number.isInteger(model.model_year) || model.model_year < config.minModelYear || model.model_year > config.maxModelYear) errors.push('model_year outside gate');
  try { if (!isOfficialUrl(model.brand, model.manufacturer_url)) errors.push('non-official manufacturer_url'); }
  catch { errors.push('invalid manufacturer_url/source'); }
  if (!model.specs?.model_year_evidence) errors.push('explicit model_year_evidence missing');
  return errors;
}

function normalize(model, batchGeneratedAt) {
  const trimPart = model.trim ? `-${slug(model.trim)}` : '';
  return {
    id: model.id || `${slug(model.brand)}-${slug(model.model)}-${model.model_year}${trimPart}-${slug(model.market || 'global')}`,
    brand: model.brand,
    model: model.model,
    model_year: model.model_year,
    trim: model.trim || '',
    category: model.category || null,
    market: model.market || 'global',
    specs: model.specs || {},
    manufacturer_url: model.manufacturer_url,
    evidence_checked_at: model.evidence_checked_at || batchGeneratedAt
  };
}

async function validateBatch(path) {
  const raw = JSON.parse(await fs.readFile(path, 'utf8'));
  const seen = new Set();
  const seenIds = new Set();
  const models = raw.models.map((model) => normalize(model, raw.generated_at));
  const failures = [];
  for (const model of models) {
    const key = [model.brand.toLowerCase(), model.model.toLowerCase(), model.model_year, model.trim.toLowerCase(), model.market.toLowerCase()].join('|');
    const errors = validateModel(model);
    if (seen.has(key)) errors.push('duplicate identity inside batch');
    if (seenIds.has(model.id)) errors.push('duplicate id inside batch');
    seen.add(key);
    seenIds.add(model.id);
    if (errors.length) failures.push({ id: model.id, errors });
  }
  if (failures.length) throw new Error(JSON.stringify({ valid: false, failures }, null, 2));
  return { ...raw, models };
}

function emitSql(models) {
  const rows = models.map((m) => `(${[
    sqlString(m.id), sqlString(m.brand), sqlString(m.model), m.model_year, sqlString(m.trim),
    m.category ? sqlString(m.category) : 'null', sqlString(m.market), `${sqlString(JSON.stringify(m.specs))}::jsonb`,
    sqlString(m.manufacturer_url), sqlString(m.evidence_checked_at)
  ].join(', ')})`).join(',\n');
  return `begin;\ninsert into public.bike_catalog_models\n  (id, brand, model, model_year, trim, category, market, specs, manufacturer_url, evidence_checked_at)\nvalues\n${rows}\non conflict (brand, model, model_year, trim, market) do update set\n  category = coalesce(public.bike_catalog_models.category, excluded.category),\n  specs = excluded.specs || public.bike_catalog_models.specs,\n  manufacturer_url = excluded.manufacturer_url,\n  evidence_checked_at = greatest(public.bike_catalog_models.evidence_checked_at, excluded.evidence_checked_at),\n  enabled = true;\ncommit;`;
}

function retryDelay(response, attempt) {
  const header = response?.headers?.get?.('retry-after');
  if (header && /^\d+$/.test(header)) return Number(header) * 1000;
  return Math.min(30_000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 250);
}

async function throttledFetch(rawUrl, attempt = 0) {
  const url = new URL(rawUrl);
  const last = hostLastRequest.get(url.hostname) || 0;
  const wait = config.requestDelayMsPerHost - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  hostLastRequest.set(url.hostname, Date.now());
  const response = await fetch(url, { headers: { 'user-agent': config.userAgent, accept: 'text/html,application/xhtml+xml' }, redirect: 'follow' });
  if ((response.status === 429 || response.status >= 500) && attempt < config.maxRetries) {
    await sleep(retryDelay(response, attempt));
    return throttledFetch(rawUrl, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function discoverFromHtml(brand, url, html) {
  if (!isOfficialUrl(brand, url)) throw new Error('crawl URL is outside official host allow-list');
  const candidates = [];
  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkRe)) {
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    const href = new URL(match[1], url).href;
    const joined = `${text} ${href}`;
    const year = joined.match(/\b(202[0-6])\b/)?.[1];
    if (!year || text.length < 2 || text.length > 140) continue;
    if (!isOfficialUrl(brand, href)) continue;
    candidates.push({ brand, text, model_year: Number(year), url: href });
  }
  return [...new Map(candidates.map((c) => [`${c.text}|${c.model_year}|${c.url}`, c])).values()];
}

function mediaFromHtml(brand, sourcePageUrl, html) {
  if (!isOfficialUrl(brand, sourcePageUrl)) throw new Error('media source URL is outside official host allow-list');
  const candidates = [];
  const add = (rawUrl, source) => {
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) return;
    try {
      const imageUrl = new URL(rawUrl.replaceAll('&amp;', '&'), sourcePageUrl);
      if (imageUrl.protocol !== 'https:') return;
      candidates.push({
        image_url: imageUrl.href,
        source_page_url: sourcePageUrl,
        source_type: 'manufacturer',
        discovered_from: source,
      });
    } catch {
      // Invalid candidate URLs are ignored and never reach the import queue.
    }
  };

  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) add(match[1], 'meta');
  for (const match of html.matchAll(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*>/gi)) add(match[1], 'meta');

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const visit = (value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
          value.forEach(visit);
          return;
        }
        if (value['@type'] === 'Product' || (Array.isArray(value['@type']) && value['@type'].includes('Product'))) {
          const images = Array.isArray(value.image) ? value.image : [value.image];
          images.forEach((image) => add(typeof image === 'object' ? image?.url : image, 'json-ld'));
        }
        Object.values(value).forEach(visit);
      };
      visit(parsed);
    } catch {
      // Malformed vendor JSON-LD is not trusted; meta tags may still provide a candidate.
    }
  }

  return [...new Map(candidates.map((candidate) => [candidate.image_url, candidate])).values()];
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'validate') {
    const batch = await validateBatch(args[0]);
    console.log(JSON.stringify({ valid: true, models: batch.models.length, chunks: Math.ceil(batch.models.length / config.batchSize), batchSize: config.batchSize, sha256: crypto.createHash('sha256').update(JSON.stringify(batch.models)).digest('hex') }, null, 2));
    return;
  }
  if (command === 'sql') {
    const batch = await validateBatch(args[0]);
    const chunkIndex = Number(args[1] ?? 0);
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) throw new Error('chunk index must be a non-negative integer');
    const start = chunkIndex * config.batchSize;
    const models = batch.models.slice(start, start + config.batchSize);
    if (!models.length) throw new Error(`chunk ${chunkIndex} is empty`);
    process.stdout.write(emitSql(models));
    return;
  }
  if (command === 'crawl') {
    const [brand, url] = args;
    const html = await throttledFetch(url);
    console.log(JSON.stringify({ brand, url, candidates: discoverFromHtml(brand, url, html) }, null, 2));
    return;
  }
  if (command === 'media') {
    const [brand, url] = args;
    const html = await throttledFetch(url);
    console.log(JSON.stringify({ brand, sourcePageUrl: url, candidates: mediaFromHtml(brand, url, html) }, null, 2));
    return;
  }
  throw new Error('usage: harvest.mjs validate|sql|crawl|media ...');
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
