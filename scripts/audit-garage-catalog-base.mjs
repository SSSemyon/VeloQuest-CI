import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaRoot = path.join(root, 'supabase', 'schema');
const batchRoot = path.join(root, 'catalog-harvester', 'batches');
const qualityRules = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'quality-rules.json'), 'utf8'));
const harvesterConfig = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'config.json'), 'utf8'));
const officialHostsByBrand = new Map(harvesterConfig.sources.map((source) => [source.brand.toLocaleLowerCase(), new Set(source.officialHosts)]));

const schemaOrder = [
  'garage_catalog.sql',
  'bike_catalog.sql',
  'catalog_ingestion_wave_2026_08_06.sql',
  'catalog_ingestion_wave_02_bmc_archive_2026_08_06.sql',
  'catalog_ingestion_wave_03_brand_expansion_2026_08_06.sql',
  'catalog_ingestion_wave_04_major_brands_2026_08_06.sql',
  'catalog_ingestion_wave_05_archives_media_2026_08_06.sql',
  'catalog_enrichment_wave_06_specs_components_media_2026_08_07.sql',
  'catalog_enrichment_wave_07_norco_fitment_2026_08_07.sql',
  'catalog_enrichment_wave_08_bmc_factory_fitment_2026_08_07.sql',
  'catalog_enrichment_wave_09_bmc_2025_cues_2026_08_07.sql',
  'catalog_enrichment_wave_10_bmc_2024_road_lt_2026_08_07.sql',
  'catalog_expansion_wave_11_kona_ibis_transition_2026_08_07.sql',
  'catalog_expansion_wave_12_cervelo_archive_2026_08_07.sql',
  'catalog_expansion_wave_13_commencal_propain_specialized_2026_08_08.sql',
  'catalog_enrichment_wave_14_haro_shimano_2026_08_08.sql',
  'catalog_enrichment_wave_15_corratec_cues_2026_08_09.sql',
  'catalog_enrichment_wave_16_lapierre_cues_2026_08_09.sql',
  'catalog_enrichment_wave_17_exact_product_pilot_2026_08_11.sql',
  'catalog_enrichment_wave_18_specialized_exact_2026_08_11.sql',
  'catalog_enrichment_wave_19_norco_exact_fitment_2026_08_12.sql',
  'catalog_hagen_complete_2026_08_14.sql',
  'release_upgrade_parity.sql',
];

function splitTopLevel(value, delimiter = ',') {
  const parts = [];
  let current = '';
  let depth = 0;
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quoted) {
      current += char;
      if (char === "'" && value[index + 1] === "'") current += value[++index];
      else if (char === "'") quoted = false;
      continue;
    }
    if (char === "'") quoted = true;
    else if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    if (char === delimiter && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseSqlValue(raw) {
  const value = raw.trim();
  if (/^null$/i.test(value)) return null;
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  const string = value.match(/^'((?:[^']|'')*)'(?:\s*::[\w\s\[\]]+)?$/s);
  if (string) {
    const decoded = string[1].replaceAll("''", "'");
    if (/::jsonb?$/i.test(value)) {
      try { return JSON.parse(decoded); } catch { return decoded; }
    }
    return decoded;
  }
  return value;
}

function inserts(sql, table, allowedColumns) {
  const pattern = new RegExp(`insert\\s+into\\s+public\\.${table}\\s*\\(([^)]*)\\)\\s*values\\s*([\\s\\S]*?)(?=\\s+on\\s+conflict)`, 'gi');
  const rows = [];
  for (const match of sql.matchAll(pattern)) {
    const columns = splitTopLevel(match[1]).map((column) => column.trim());
    const unknownColumns = allowedColumns ? columns.filter((column) => !allowedColumns.has(column)) : [];
    if (unknownColumns.length) throw new Error(`${table}: unknown insert columns: ${unknownColumns.join(', ')}`);
    const tuples = splitTopLevel(match[2].replace(/^\s*--.*$/gm, ''));
    for (const tuple of tuples) {
      const body = tuple.trim().replace(/^\(/, '').replace(/\)$/, '');
      const values = splitTopLevel(body).map(parseSqlValue);
      if (columns.length !== values.length) throw new Error(`${table}: ${columns.length} columns but ${values.length} values`);
      rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
    }
  }
  return rows;
}

function identity(model) {
  return [model.brand, model.model, model.model_year, model.trim ?? '', model.market ?? 'global']
    .map((value) => String(value ?? '').trim().toLocaleLowerCase()).join('|');
}

function slug(value) {
  return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const modelsById = new Map();
const modelIdentity = new Map();
const imagesByKey = new Map();
const componentsById = new Map();
const compatibilityByKey = new Map();
const fitmentsByKey = new Map();
const baselineModelIds = new Set();
const pendingSpecUpdates = [];
const unappliedSpecUpdates = [];
const bikeCatalogImageColumns = new Set([
  'bike_id', 'image_url', 'source_type', 'source_name', 'source_page_url', 'priority', 'checked_at', 'enabled',
]);

for (const file of schemaOrder) {
  const sql = fs.readFileSync(path.join(schemaRoot, file), 'utf8');
  let modelRows;
  try { modelRows = inserts(sql, 'bike_catalog_models'); }
  catch (error) { throw new Error(`${file}: ${error.message}`); }
  for (const row of modelRows) {
    row.trim ??= '';
    row.market ??= 'global';
    row.specs = row.specs && typeof row.specs === 'object' ? row.specs : {};
    const previousId = modelIdentity.get(identity(row));
    if (previousId && previousId !== row.id) throw new Error(`duplicate model identity: ${identity(row)}`);
    modelsById.set(row.id, { ...(modelsById.get(row.id) ?? {}), ...row });
    modelIdentity.set(identity(row), row.id);
    baselineModelIds.add(row.id);
  }
  for (const match of sql.matchAll(/update\s+public\.bike_catalog_models\s+set\s+specs\s*=\s*specs\s*\|\|\s*'((?:[^']|'')*)'::jsonb([\s\S]*?)where\s+id\s*=\s*'((?:[^']|'')*)'\s*;/gi)) {
    const id = match[3].replaceAll("''", "'");
    const model = modelsById.get(id);
    const manufacturer = match[2].match(/manufacturer_url\s*=\s*'((?:[^']|'')*)'/i)?.[1];
    const checked = match[2].match(/evidence_checked_at\s*=\s*'((?:[^']|'')*)'/i)?.[1];
    const update = {
      file,
      id,
      specs: JSON.parse(match[1].replaceAll("''", "'")),
      manufacturer: manufacturer?.replaceAll("''", "'"),
      checked: checked?.replaceAll("''", "'"),
    };
    if (!model) { pendingSpecUpdates.push(update); continue; }
    model.specs = { ...(model.specs ?? {}), ...update.specs };
    if (update.manufacturer) model.manufacturer_url = update.manufacturer;
    if (update.checked) model.evidence_checked_at = update.checked;
  }
  for (const match of sql.matchAll(/update\s+public\.bike_catalog_models\s+set\s+enabled\s*=\s*false\s+where\s+id\s+in\s*\(([^)]*)\)\s*;/gi)) {
    for (const id of splitTopLevel(match[1]).map(parseSqlValue)) {
      const model = modelsById.get(id);
      if (model) model.enabled = false;
    }
  }
  for (const row of inserts(sql, 'bike_catalog_images', bikeCatalogImageColumns)) imagesByKey.set(`${row.bike_id}|${row.image_url}`, row);
  for (const row of inserts(sql, 'garage_components')) componentsById.set(row.id, { ...(componentsById.get(row.id) ?? {}), ...row });
  for (const row of inserts(sql, 'garage_compatibility')) compatibilityByKey.set(`${row.source_component_id}|${row.target_component_id}`, row);
  for (const row of inserts(sql, 'bike_catalog_component_fitments')) fitmentsByKey.set(`${row.bike_id}|${row.component_id}|${row.fitment_type}`, row);
}

for (const file of ['wave14.json', 'wave15.json', 'wave16.json']) {
  const batch = JSON.parse(fs.readFileSync(path.join(batchRoot, file), 'utf8'));
  for (const raw of batch.models) {
    const row = { trim: '', market: 'global', specs: {}, evidence_checked_at: batch.generated_at, ...raw };
    row.id ??= `${slug(row.brand)}-${slug(row.model)}-${row.model_year}${row.trim ? `-${slug(row.trim)}` : ''}-${slug(row.market)}`;
    const priorId = modelIdentity.get(identity(row));
    if (priorId && priorId !== row.id) throw new Error(`duplicate model identity: ${identity(row)}`);
    modelsById.set(row.id, { ...(modelsById.get(row.id) ?? {}), ...row });
    modelIdentity.set(identity(row), row.id);
  }
}

// The Hagen forward migration intentionally derives repeated trusted fields
// from a compact VALUES source. Reconstruct those rows from the validated
// evidence manifest, while proving that every identity is present in SQL.
const hagenManifest = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'hagen-official-evidence.json'), 'utf8'));
const hagenSql = fs.readFileSync(path.join(schemaRoot, 'catalog_hagen_complete_2026_08_14.sql'), 'utf8');
for (const entry of hagenManifest.models) {
  if (!hagenSql.includes(`'${entry.id}'`)) throw new Error(`Hagen SQL source missing ${entry.id}`);
  const row = {
    id: entry.id,
    brand: entry.brand,
    model: entry.model,
    model_year: entry.modelYear,
    trim: '',
    category: entry.category,
    market: 'ru',
    specs: { model_year_evidence: entry.officialUrl, ...(entry.specs ?? {}) },
    manufacturer_url: entry.officialUrl,
    evidence_checked_at: entry.capturedAt,
    enabled: true,
  };
  const priorId = modelIdentity.get(identity(row));
  if (priorId && priorId !== row.id) throw new Error(`duplicate model identity: ${identity(row)}`);
  modelsById.set(row.id, { ...(modelsById.get(row.id) ?? {}), ...row });
  modelIdentity.set(identity(row), row.id);
}

for (const update of pendingSpecUpdates) {
  const model = modelsById.get(update.id);
  if (!model) {
    unappliedSpecUpdates.push({ file: update.file, id: update.id });
    continue;
  }
  model.specs = { ...(model.specs ?? {}), ...update.specs };
  if (update.manufacturer) model.manufacturer_url = update.manufacturer;
  if (update.checked) model.evidence_checked_at = update.checked;
}

for (const model of modelsById.values()) {
  if (!model.category) {
    const rule = qualityRules.category_rules.find((candidate) =>
      candidate.brand.toLocaleLowerCase() === String(model.brand).toLocaleLowerCase()
      && new RegExp(candidate.model_regex, 'i').test(model.model)
    );
    if (rule) model.category = rule.category;
  }
  if (!model.specs?.model_year_evidence && qualityRules.model_year_evidence_fallback === 'manufacturer_url') {
    model.specs = { ...(model.specs ?? {}), model_year_evidence: model.manufacturer_url };
  }
}

const models = [...modelsById.values()].filter((model) => model.enabled !== false);
const images = [...imagesByKey.values()];
const components = [...componentsById.values()];
const compatibility = [...compatibilityByKey.values()];
const fitments = [...fitmentsByKey.values()];
const count = (predicate) => models.filter(predicate).length;
const withSpec = (key) => count((model) => model.specs?.[key] !== undefined && model.specs?.[key] !== null && model.specs?.[key] !== '');
const percent = (value, total = models.length) => Number((value * 100 / Math.max(1, total)).toFixed(2));
const specKeys = [
  'model_year_evidence', 'frame_material', 'wheel_size', 'drivetrain_brand', 'drivetrain', 'groupset',
  'brake_type', 'brakes', 'suspension_brand', 'fork', 'rear_shock', 'cassette', 'crankset',
  'bottom_bracket', 'hubs', 'wheelset', 'tires', 'weight_kg', 'motor', 'battery_wh',
];
const activeModelIds = new Set(models.map((model) => model.id));
// Coverage is release coverage, so orphaned or disabled-bike evidence must never
// make a percentage look healthier. Reference errors are still reported below.
const fitmentBikeIds = new Set(fitments.filter((row) => activeModelIds.has(row.bike_id)).map((row) => row.bike_id));
const imageBikeIds = new Set(images.filter((row) => activeModelIds.has(row.bike_id)).map((row) => row.bike_id));
const hasAnySpec = (model, keys) => keys.some((key) => model.specs?.[key] !== undefined && model.specs?.[key] !== null && model.specs?.[key] !== '');
const displayFields = {
  drivetrain: ['drivetrain', 'groupset', 'drivetrain_brand'],
  brakes: ['brakes', 'brake_type'],
  fork: ['fork'],
  rearShock: ['rear_shock'],
  cassette: ['cassette'],
  crankset: ['crankset'],
  bottomBracket: ['bottom_bracket'],
  hubs: ['hubs', 'hub'],
  wheelset: ['wheelset', 'wheels'],
  tires: ['tires', 'tyres'],
};
const displayFieldCount = (model) => Object.values(displayFields).filter((keys) => hasAnySpec(model, keys)).length;
const outgoingCompatible = new Map();
for (const rule of compatibility.filter((row) => row.status === 'compatible')) {
  if (!outgoingCompatible.has(rule.source_component_id)) outgoingCompatible.set(rule.source_component_id, new Set());
  outgoingCompatible.get(rule.source_component_id).add(rule.target_component_id);
}
const recommendationReadyBikeIds = new Set();
const approvedFitmentBikeIds = new Set();
for (const bikeId of fitmentBikeIds) {
  const bikeFitments = fitments.filter((row) => row.bike_id === bikeId);
  const factoryIds = new Set(bikeFitments.filter((row) => row.fitment_type === 'factory_installed').map((row) => row.component_id));
  const hasApproved = bikeFitments.some((row) => row.fitment_type === 'manufacturer_approved');
  if (hasApproved) approvedFitmentBikeIds.add(bikeId);
  const hasGraphRecommendation = [...factoryIds].some((id) => [...(outgoingCompatible.get(id) ?? [])].some((target) => !factoryIds.has(target)));
  if (hasApproved || hasGraphRecommendation) recommendationReadyBikeIds.add(bikeId);
}
const brandCounts = Object.fromEntries([...new Set(models.map((model) => model.brand))].sort((a, b) => a.localeCompare(b)).map((brand) => [brand, count((model) => model.brand === brand)]));
const hostCounts = {};
const nonOfficialManufacturerUrls = [];
for (const model of models) {
  let host = 'INVALID';
  try { host = new URL(model.manufacturer_url).hostname; } catch { /* report below */ }
  hostCounts[host] = (hostCounts[host] ?? 0) + 1;
  const allowed = officialHostsByBrand.get(String(model.brand).toLocaleLowerCase());
  if (!allowed || ![...allowed].some((candidate) => host === candidate || host.endsWith(`.${candidate}`))) {
    nonOfficialManufacturerUrls.push({ id: model.id, brand: model.brand, host });
  }
}
const unapprovedMediaSourcePages = images.flatMap((row) => {
  const model = modelsById.get(row.bike_id);
  if (!model) return [];
  let host = 'INVALID';
  try { host = new URL(row.source_page_url).hostname; } catch { return [{ bikeId: row.bike_id, host }]; }
  const allowed = officialHostsByBrand.get(String(model.brand).toLocaleLowerCase());
  return allowed && [...allowed].some((candidate) => host === candidate || host.endsWith(`.${candidate}`)) ? [] : [{ bikeId: row.bike_id, host }];
});

const result = {
  masterCatalog: {
    models: models.length,
    brands: Object.keys(brandCounts).length,
    uniqueIdentities: new Set(models.map(identity)).size,
    modelYearRange: [Math.min(...models.map((model) => model.model_year)), Math.max(...models.map((model) => model.model_year))],
    pre2020: count((model) => model.model_year < 2020),
    missingCategory: count((model) => !model.category),
    missingManufacturerUrl: count((model) => !/^https:\/\//i.test(model.manufacturer_url ?? '')),
    missingEvidenceCheckedAt: count((model) => !/^\d{4}-\d{2}-\d{2}$/.test(model.evidence_checked_at ?? '')),
    sqlBaselineModels: models.filter((model) => baselineModelIds.has(model.id)).length,
    jsonBatchModels: models.filter((model) => !baselineModelIds.has(model.id)).length,
    unappliedSpecUpdates,
    missingCategoryByBrand: Object.fromEntries([...new Set(models.filter((model) => !model.category).map((model) => model.brand))].sort().map((brand) => [brand, models.filter((model) => model.brand === brand && !model.category).length])),
    missingCategoryEntries: models.filter((model) => !model.category).map((model) => ({ id: model.id, brand: model.brand, model: model.model, year: model.model_year, url: model.manufacturer_url })),
    missingModelYearEvidenceByBrand: Object.fromEntries([...new Set(models.filter((model) => !hasAnySpec(model, ['model_year_evidence'])).map((model) => model.brand))].sort().map((brand) => [brand, models.filter((model) => model.brand === brand && !hasAnySpec(model, ['model_year_evidence'])).length])),
    missingModelYearEvidenceEntries: models.filter((model) => !hasAnySpec(model, ['model_year_evidence'])).map((model) => ({ id: model.id, brand: model.brand, model: model.model, year: model.model_year, url: model.manufacturer_url })),
    categoryCounts: Object.fromEntries([...new Set(models.filter((model) => model.category).map((model) => model.category))].sort().map((category) => [category, models.filter((model) => model.category === category).length])),
    brandCounts,
    manufacturerHostCounts: Object.fromEntries(Object.entries(hostCounts).sort((a, b) => b[1] - a[1])),
    nonOfficialManufacturerUrls,
  },
  specCoverage: Object.fromEntries(specKeys.map((key) => {
    const present = withSpec(key);
    return [key, { present, percent: percent(present) }];
  })),
  semanticCoverage: {
    searchableDrivetrain: { present: count((model) => hasAnySpec(model, displayFields.drivetrain)), percent: percent(count((model) => hasAnySpec(model, displayFields.drivetrain))) },
    searchableBrakes: { present: count((model) => hasAnySpec(model, displayFields.brakes)), percent: percent(count((model) => hasAnySpec(model, displayFields.brakes))) },
    suspension: { present: count((model) => hasAnySpec(model, ['suspension_brand', 'fork', 'rear_shock'])), percent: percent(count((model) => hasAnySpec(model, ['suspension_brand', 'fork', 'rear_shock']))) },
    finderFilterComplete: { present: count((model) => Boolean(model.category) && hasAnySpec(model, ['frame_material']) && hasAnySpec(model, ['wheel_size']) && hasAnySpec(model, displayFields.drivetrain) && hasAnySpec(model, displayFields.brakes)), percent: percent(count((model) => Boolean(model.category) && hasAnySpec(model, ['frame_material']) && hasAnySpec(model, ['wheel_size']) && hasAnySpec(model, displayFields.drivetrain) && hasAnySpec(model, displayFields.brakes))) },
    garageDisplayComplete: { present: count((model) => displayFieldCount(model) === Object.keys(displayFields).length), percent: percent(count((model) => displayFieldCount(model) === Object.keys(displayFields).length)) },
    garageDisplayFieldDistribution: Object.fromEntries([...Array(11).keys()].map((number) => [number, count((model) => displayFieldCount(model) === number)])),
  },
  media: {
    images: images.length,
    bikesWithImage: imageBikeIds.size,
    coveragePercent: percent(imageBikeIds.size),
    sourceTypes: Object.fromEntries([...new Set(images.map((row) => row.source_type))].map((type) => [type, images.filter((row) => row.source_type === type).length])),
    missingBikeReferences: images.filter((row) => !modelsById.has(row.bike_id)).map((row) => row.bike_id),
    nonHttpsImageUrls: images.filter((row) => !/^https:\/\//i.test(row.image_url ?? '')).length,
    nonHttpsSourcePageUrls: images.filter((row) => !/^https:\/\//i.test(row.source_page_url ?? '')).length,
    unapprovedMediaSourcePages,
    imageHostCounts: Object.fromEntries([...new Set(images.map((row) => new URL(row.image_url).hostname))].sort().map((host) => [host, images.filter((row) => new URL(row.image_url).hostname === host).length])),
    entries: images.map((row) => ({ bikeId: row.bike_id, imageUrl: row.image_url, sourcePageUrl: row.source_page_url, sourceType: row.source_type })),
  },
  compatibility: {
    components: components.length,
    componentBrands: [...new Set(components.map((row) => row.brand))].sort(),
    componentCategories: Object.fromEntries([...new Set(components.map((row) => row.category))].sort().map((category) => [category, components.filter((row) => row.category === category).length])),
    rules: compatibility.length,
    compatibleRules: compatibility.filter((row) => row.status === 'compatible').length,
    conditionalRules: compatibility.filter((row) => row.status === 'conditional').length,
    incompatibleRules: compatibility.filter((row) => row.status === 'incompatible').length,
    fitments: fitments.length,
    fitmentTypes: Object.fromEntries([...new Set(fitments.map((row) => row.fitment_type))].map((type) => [type, fitments.filter((row) => row.fitment_type === type).length])),
    bikesWithFitment: fitmentBikeIds.size,
    fitmentCoveragePercent: percent(fitmentBikeIds.size),
    bikesWithApprovedFitment: approvedFitmentBikeIds.size,
    bikesWithAnyRecommendationPath: recommendationReadyBikeIds.size,
    recommendationCoveragePercent: percent(recommendationReadyBikeIds.size),
    missingBikeReferences: [...new Set(fitments.filter((row) => !modelsById.has(row.bike_id)).map((row) => row.bike_id))],
    missingComponentReferences: [...new Set(fitments.filter((row) => !componentsById.has(row.component_id)).map((row) => row.component_id))],
    brokenRuleReferences: compatibility.filter((row) => !componentsById.has(row.source_component_id) || !componentsById.has(row.target_component_id)).map((row) => `${row.source_component_id}|${row.target_component_id}`),
  },
};

const writeQueueArgument = process.argv.find((argument) => argument.startsWith('--write-enrichment-queue='));
if (writeQueueArgument) {
  const outputPath = path.resolve(root, writeQueueArgument.slice('--write-enrichment-queue='.length));
  const coreFields = {
    frame_material: ['frame_material'],
    wheel_size: ['wheel_size'],
    drivetrain: displayFields.drivetrain,
    brakes: displayFields.brakes,
  };
  const sourceByBrand = new Map(harvesterConfig.sources.map((source) => [source.brand.toLocaleLowerCase(), source]));
  const sourceScope = (model) => {
    let pathname = '';
    try { pathname = new URL(model.manufacturer_url).pathname.toLocaleLowerCase(); } catch { return 'invalid'; }
    if (/\.pdf$/.test(pathname)) return 'official_document';
    const strategy = sourceByBrand.get(String(model.brand).toLocaleLowerCase())?.strategy ?? 'unknown';
    if (strategy === 'exact-product' || strategy === 'exact-product-archive') return 'product_candidate';
    if (/archive|catalog|support|download|manual|season|previous/.test(pathname)) return 'official_index_or_archive';
    return 'official_page_unclassified';
  };
  const queue = models.map((model) => {
    const gaps = [];
    if (!imageBikeIds.has(model.id)) gaps.push('photo');
    for (const [label, keys] of Object.entries(coreFields)) if (!hasAnySpec(model, keys)) gaps.push(label);
    if (!fitmentBikeIds.has(model.id)) gaps.push('exact_fitment');
    if (!recommendationReadyBikeIds.has(model.id)) gaps.push('recommendation_outcome');
    const existingCoreFields = Object.values(coreFields).filter((keys) => hasAnySpec(model, keys)).length;
    const scope = sourceScope(model);
    const evidenceReadiness = scope === 'product_candidate' ? 3 : scope === 'official_document' ? 2 : scope === 'official_page_unclassified' ? 1 : 0;
    return {
      id: model.id,
      brand: model.brand,
      model: model.model,
      model_year: model.model_year,
      category: model.category,
      manufacturer_url: model.manufacturer_url,
      evidence_scope: scope,
      existing_core_fields: existingCoreFields,
      gaps,
      // Prefer rows where official evidence is more likely to be model-specific,
      // then near-complete rows which can close a coverage unit with less work.
      priority_score: evidenceReadiness * 100 + existingCoreFields * 10 + gaps.filter((gap) => ['photo', 'exact_fitment', 'recommendation_outcome'].includes(gap)).length,
    };
  }).filter((entry) => entry.gaps.length > 0)
    .sort((a, b) => b.priority_score - a.priority_score || b.model_year - a.model_year || (a.brand < b.brand ? -1 : a.brand > b.brand ? 1 : 0) || (a.model < b.model ? -1 : a.model > b.model ? 1 : 0));
  const targets = { photo_percent: 80, core_specs_percent: 80, exact_fitment_percent: 60, recommendation_outcome_percent: 60 };
  const current = {
    photo: imageBikeIds.size,
    core_specs: result.semanticCoverage.finderFilterComplete.present,
    exact_fitment: fitmentBikeIds.size,
    recommendation_outcome: recommendationReadyBikeIds.size,
  };
  const required = {
    photo: Math.ceil(models.length * targets.photo_percent / 100),
    core_specs: Math.ceil(models.length * targets.core_specs_percent / 100),
    exact_fitment: Math.ceil(models.length * targets.exact_fitment_percent / 100),
    recommendation_outcome: Math.ceil(models.length * targets.recommendation_outcome_percent / 100),
  };
  const shortfall = Object.fromEntries(Object.keys(required).map((key) => [key, Math.max(0, required[key] - current[key])]));
  const readinessRank = { product_candidate: 3, official_document: 2, official_page_unclassified: 1, official_index_or_archive: 0 };
  const workCohorts = Object.fromEntries(Object.keys(shortfall).map((metric) => {
    const gap = metric === 'core_specs' ? null : metric;
    const candidates = queue.filter((entry) => gap ? entry.gaps.includes(gap) : ['frame_material', 'wheel_size', 'drivetrain', 'brakes'].some((field) => entry.gaps.includes(field)));
    candidates.sort((a, b) => {
      // For recommendations, finish exact-fitment bikes first. For core specs,
      // finish cards with the fewest missing core fields first. All cohorts then
      // prefer the most specific official evidence candidate and newer models.
      if (metric === 'recommendation_outcome') {
        const aHasFitment = a.gaps.includes('exact_fitment') ? 0 : 1;
        const bHasFitment = b.gaps.includes('exact_fitment') ? 0 : 1;
        if (aHasFitment !== bHasFitment) return bHasFitment - aHasFitment;
      }
      if (metric === 'core_specs') {
        const aMissing = ['frame_material', 'wheel_size', 'drivetrain', 'brakes'].filter((field) => a.gaps.includes(field)).length;
        const bMissing = ['frame_material', 'wheel_size', 'drivetrain', 'brakes'].filter((field) => b.gaps.includes(field)).length;
        if (aMissing !== bMissing) return aMissing - bMissing;
      }
      const readiness = (readinessRank[b.evidence_scope] ?? -1) - (readinessRank[a.evidence_scope] ?? -1);
      return readiness || b.existing_core_fields - a.existing_core_fields || b.model_year - a.model_year || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
    return [metric, candidates.slice(0, shortfall[metric]).map((entry) => entry.id)];
  }));
  const latestEvidenceDate = models.map((model) => model.evidence_checked_at).filter(Boolean).sort().at(-1) ?? null;
  fs.writeFileSync(outputPath, `${JSON.stringify({
    schema_version: 2,
    generated_from_evidence_through: latestEvidenceDate,
    catalog_models: models.length,
    targets,
    current,
    required,
    shortfall,
    work_cohorts: workCohorts,
    entries: queue,
  }, null, 2)}\n`);
}

console.log(JSON.stringify(result, null, 2));

const coreFailures = [
  result.masterCatalog.models !== result.masterCatalog.uniqueIdentities && 'duplicate master identities',
  result.masterCatalog.pre2020 > 0 && 'enabled pre-2020 models',
  result.masterCatalog.missingCategory > 0 && `${result.masterCatalog.missingCategory} models without category`,
  result.masterCatalog.missingManufacturerUrl > 0 && `${result.masterCatalog.missingManufacturerUrl} models without HTTPS manufacturer URL`,
  result.masterCatalog.missingEvidenceCheckedAt > 0 && `${result.masterCatalog.missingEvidenceCheckedAt} models without evidence date`,
  result.masterCatalog.missingModelYearEvidenceEntries.length > 0 && `${result.masterCatalog.missingModelYearEvidenceEntries.length} models without explicit model-year evidence`,
  result.masterCatalog.unappliedSpecUpdates.length > 0 && 'unapplied spec updates',
  result.masterCatalog.nonOfficialManufacturerUrls.length > 0 && `${result.masterCatalog.nonOfficialManufacturerUrls.length} manufacturer URLs outside the brand allow-list`,
  result.media.missingBikeReferences.length > 0 && 'broken image references',
  result.media.unapprovedMediaSourcePages.length > 0 && 'media source page outside the brand allow-list',
  result.compatibility.missingBikeReferences.length > 0 && 'broken fitment bike references',
  result.compatibility.missingComponentReferences.length > 0 && 'broken fitment component references',
  result.compatibility.brokenRuleReferences.length > 0 && 'broken compatibility references',
].filter(Boolean);

const maximumFailures = [
  ...coreFailures,
  result.media.coveragePercent < 80 && `photo coverage ${result.media.coveragePercent}% < 80%`,
  result.semanticCoverage.finderFilterComplete.percent < 80 && `core finder spec coverage ${result.semanticCoverage.finderFilterComplete.percent}% < 80%`,
  result.compatibility.fitmentCoveragePercent < 60 && `exact fitment coverage ${result.compatibility.fitmentCoveragePercent}% < 60%`,
  result.compatibility.recommendationCoveragePercent < 60 && `recommendation/outcome coverage ${result.compatibility.recommendationCoveragePercent}% < 60%`,
  result.compatibility.incompatibleRules < 1 && 'no evidence-backed incompatible rule',
  result.compatibility.conditionalRules < 1 && 'no evidence-backed conditional rule',
].filter(Boolean);

const failures = process.argv.includes('--maximum') ? maximumFailures : process.argv.includes('--strict-core') ? coreFailures : [];
if (failures.length > 0) {
  console.error(JSON.stringify({ gate: process.argv.includes('--maximum') ? 'maximum' : 'strict-core', valid: false, failures }, null, 2));
  process.exitCode = 1;
}
