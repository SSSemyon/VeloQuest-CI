import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCompatibilityDemand,
  parseSqlInsertRows,
} from './garage-compatibility-demand-core.mjs';
import { parseBikeFitmentSelectRows } from './garage-fitment-select-parser.mjs';
import {
  applyNoUpgradeOutcomesToQueue,
  parseNoUpgradeOutcomeRows,
  validateNoUpgradeOutcomeRows,
} from './garage-outcomes-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaRoot = path.join(root, 'supabase', 'schema');
const [outputArg = 'catalog-harvester/compatibility-demand.json', queueArg = 'catalog-harvester/enrichment-queue.json'] = process.argv.slice(2);

const schemaFiles = fs.readdirSync(schemaRoot).filter((file) => file.endsWith('.sql')).sort();
const sources = schemaFiles.map((file) => ({ file, sql: fs.readFileSync(path.join(schemaRoot, file), 'utf8') }));
const queue = JSON.parse(fs.readFileSync(path.resolve(root, queueArg), 'utf8'));

function collectRows(tableName) {
  return sources.flatMap(({ sql }) => parseSqlInsertRows(sql, tableName));
}

function lastBy(rows, keyOf) {
  const map = new Map();
  for (const row of rows) map.set(keyOf(row), row);
  return [...map.values()];
}

function parseSpecs(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

const modelIdentity = (row) => [
  row?.brand,
  row?.model,
  row?.model_year,
  row?.trim ?? '',
  row?.market ?? 'global',
].map((value) => String(value ?? '').trim().toLocaleLowerCase()).join('|');

const modelIdByIdentity = new Map();
for (const { file, sql } of sources) {
  for (const row of parseSqlInsertRows(sql, 'bike_catalog_models')) {
    if (!row.id || !row.brand || !row.model || !Number.isInteger(Number(row.model_year))) continue;
    const normalized = { ...row, model_year: Number(row.model_year), trim: row.trim ?? '', market: row.market ?? 'global' };
    const key = modelIdentity(normalized);
    const previousId = modelIdByIdentity.get(key);
    if (previousId && previousId !== row.id) {
      throw new Error(`${file}: duplicate bike catalog identity ${key}: ${previousId} vs ${row.id}`);
    }
    modelIdByIdentity.set(key, row.id);
  }
}

const components = lastBy(collectRows('garage_components'), (row) => String(row.id ?? ''))
  .filter((row) => row.id && row.enabled !== false)
  .map((row) => ({ ...row, specs: parseSpecs(row.specs) }));

const fitmentRows = collectRows('bike_catalog_component_fitments');
for (const { file, sql } of sources) {
  for (const selected of parseBikeFitmentSelectRows(sql)) {
    const bikeId = modelIdByIdentity.get(modelIdentity(selected.identity));
    if (!bikeId) {
      throw new Error(`${file}: fitment SELECT identity is not present in bike_catalog_models VALUES registry: ${modelIdentity(selected.identity)}`);
    }
    fitmentRows.push({ bike_id: bikeId, ...selected.row });
  }
}
const fitments = lastBy(
  fitmentRows,
  (row) => `${row.bike_id}|${row.component_id}|${row.fitment_type}`,
).filter((row) => row.bike_id && row.component_id && row.fitment_type);

const aliases = lastBy(
  collectRows('garage_component_aliases'),
  (row) => String(row.alias_component_id ?? ''),
).filter((row) => row.alias_component_id && row.canonical_component_id);
const compatibility = lastBy(
  collectRows('garage_compatibility'),
  (row) => `${row.source_component_id}|${row.target_component_id}`,
).filter((row) => row.source_component_id && row.target_component_id && ['compatible', 'conditional', 'incompatible'].includes(row.status));

const outcomeRows = sources.flatMap(({ file, sql }) => parseNoUpgradeOutcomeRows(sql, file));
const outcomeValidation = validateNoUpgradeOutcomeRows(outcomeRows);
if (outcomeValidation.invalid.length > 0) {
  throw new Error(`invalid Garage no-upgrade evidence rows: ${JSON.stringify(outcomeValidation.invalid, null, 2)}`);
}
const effectiveQueue = applyNoUpgradeOutcomesToQueue(queue, outcomeValidation.valid);
const recommendationGapIds = new Set(
  (effectiveQueue.entries ?? [])
    .filter((entry) => Array.isArray(entry.gaps) && entry.gaps.includes('recommendation_outcome'))
    .map((entry) => entry.id),
);

const result = buildCompatibilityDemand({
  activeModelIds: recommendationGapIds,
  fitments,
  aliases,
  compatibility,
  explicitOutcomeBikeIds: new Set(outcomeValidation.valid.map((row) => row.bike_id)),
  components,
});

const componentRegistry = components
  .map(({ id, brand, model, category, display_name, specs, evidence_url, evidence_checked_at }) => ({
    id,
    brand,
    model,
    category,
    display_name,
    specs,
    evidence_url,
    evidence_checked_at,
  }))
  .sort((a, b) => String(a.id).localeCompare(String(b.id)));

const output = {
  schema_version: 2,
  target_percent: 100,
  generated_from_evidence_through: effectiveQueue.generated_from_evidence_through ?? null,
  catalog_models: effectiveQueue.catalog_models ?? null,
  recommendation_gap_bikes_input: recommendationGapIds.size,
  active_bikes: result.active_bikes,
  covered_bikes: result.covered_bikes,
  uncovered_bikes: result.uncovered_bikes,
  uncovered_bike_ids: [...result.uncoveredBikeIds].sort(),
  component_demands: result.demand,
  component_registry: componentRegistry,
  inventory: {
    components: components.length,
    fitments: fitments.length,
    aliases: aliases.length,
    compatibility_rules: compatibility.length,
    explicit_no_upgrade_bikes: new Set(outcomeValidation.valid.map((row) => row.bike_id)).size,
  },
};

const outputPath = path.resolve(root, outputArg);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  output: path.relative(root, outputPath),
  targetPercent: output.target_percent,
  recommendationGapBikes: output.recommendation_gap_bikes_input,
  uncoveredBikes: output.uncovered_bikes,
  componentDemands: output.component_demands.length,
  componentRegistry: output.component_registry.length,
  topDemands: output.component_demands.slice(0, 10).map(({ component_id, impact_bikes }) => ({ component_id, impact_bikes })),
}, null, 2));
