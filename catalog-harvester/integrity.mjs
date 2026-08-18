import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const sourceHosts = new Map(config.sources.map((source) => [source.brand.toLocaleLowerCase(), new Set(source.officialHosts)]));
const batchFiles = fs.readdirSync(path.join(root, 'batches'))
  .filter((file) => /^wave\d+\.json$/.test(file))
  .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
const masterManifest = JSON.parse(fs.readFileSync(path.join(root, 'master-manifest.json'), 'utf8'));
const schemaRoot = path.resolve(root, '..', 'supabase', 'schema');
const schemaSql = fs.readdirSync(schemaRoot).filter((file) => file.endsWith('.sql'))
  .map((file) => fs.readFileSync(path.join(schemaRoot, file), 'utf8')).join('\n');

const seen = new Map();
const batchIds = new Set();
const failures = [];
let modelCount = 0;
let chunkCount = 0;

function normalized(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function slug(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function canonicalModel(model, batchGeneratedAt) {
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
    evidence_checked_at: model.evidence_checked_at || batchGeneratedAt,
  };
}

for (const file of batchFiles) {
  const batch = JSON.parse(fs.readFileSync(path.join(root, 'batches', file), 'utf8'));
  const models = Array.isArray(batch.models) ? batch.models : [];
  for (const model of models) batchIds.add(canonicalModel(model).id);
  const wave = Number(file.match(/\d+/)?.[0]);
  const runFile = fs.readdirSync(path.join(root, 'runs')).find((candidate) => candidate.startsWith(`wave${wave}-`));
  if (!runFile) failures.push(`${file}: run metadata missing`);
  else {
    const run = JSON.parse(fs.readFileSync(path.join(root, 'runs', runFile), 'utf8'));
    const canonicalHash = crypto.createHash('sha256').update(JSON.stringify(models.map((model) => canonicalModel(model, batch.generated_at)))).digest('hex');
    if (run.batch_sha256 !== canonicalHash) failures.push(`${file}: canonical hash ${canonicalHash} does not match ${runFile}`);
  }
  chunkCount += Math.ceil(models.length / config.batchSize);
  for (const [index, model] of models.entries()) {
    modelCount += 1;
    const location = `${file}#${index + 1}`;
    const market = model.market ?? 'global';
    const evidenceCheckedAt = model.evidence_checked_at ?? batch.generated_at;
    const identity = [model.brand, model.model, model.model_year, model.trim ?? '', market].map(normalized).join('|');
    if (seen.has(identity)) failures.push(`${location}: duplicate identity also present at ${seen.get(identity)}`);
    else seen.set(identity, location);
    if (!Number.isInteger(model.model_year) || model.model_year < config.minModelYear || model.model_year > config.maxModelYear) {
      failures.push(`${location}: model_year must be within ${config.minModelYear}..${config.maxModelYear}`);
    }
    if (!normalized(model.brand) || !normalized(model.model) || !normalized(market)) failures.push(`${location}: brand/model/market are required`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(evidenceCheckedAt ?? '')) failures.push(`${location}: evidence_checked_at must be YYYY-MM-DD`);
    try {
      const evidenceUrl = new URL(model.manufacturer_url);
      const allowedHosts = sourceHosts.get(normalized(model.brand));
      if (evidenceUrl.protocol !== 'https:') failures.push(`${location}: evidence URL must use HTTPS`);
      if (!allowedHosts?.has(evidenceUrl.hostname)) failures.push(`${location}: evidence host is not allow-listed for ${model.brand}`);
    } catch {
      failures.push(`${location}: manufacturer_url is invalid`);
    }
  }
}

const masterIds = Array.isArray(masterManifest.ids) ? masterManifest.ids : [];
const uniqueMasterIds = new Set(masterIds);
if (masterIds.length !== masterManifest.enabled_model_count) failures.push('master-manifest: enabled_model_count does not match ids length');
if (uniqueMasterIds.size !== masterIds.length) failures.push('master-manifest: duplicate ids');
if (masterManifest.enabled_model_count !== 718 || masterManifest.enabled_brand_count !== 44) failures.push('master-manifest: release baseline must remain 718 enabled models / 44 brands');
if (masterManifest.min_model_year < config.minModelYear || masterManifest.max_model_year > config.maxModelYear) failures.push('master-manifest: model year range outside configured gate');
for (const id of masterIds) {
  if (!batchIds.has(id) && !schemaSql.includes(`'${id.replaceAll("'", "''")}'`)) failures.push(`master-manifest: ${id} is missing from schema/batch sources`);
}

if (failures.length > 0) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    valid: true,
    files: batchFiles,
    batchModels: modelCount,
    masterModels: masterManifest.enabled_model_count,
    masterBrands: masterManifest.enabled_brand_count,
    uniqueIdentities: seen.size,
    chunks: chunkCount,
    maxRowsPerChunk: config.batchSize,
    modelYearRange: [config.minModelYear, config.maxModelYear],
  }, null, 2));
}
