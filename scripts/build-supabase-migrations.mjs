import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverLateGarageWaves, garageWaveMigrationName } from './garage-wave-migrations.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaRoot = path.join(root, 'supabase', 'schema');
const migrationRoot = path.join(root, 'supabase', 'migrations');
const checkOnly = process.argv.includes('--check');

const baselineOrder = [
  '000_core_schema.sql',
  'client_migration_gate.sql',
  'client_diagnostics.sql',
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
  '@batch:wave14.json',
  'catalog_enrichment_wave_14_haro_shimano_2026_08_08.sql',
  '@batch:wave15.json',
  'catalog_enrichment_wave_15_corratec_cues_2026_08_09.sql',
  '@batch:wave16.json',
  'catalog_enrichment_wave_16_lapierre_cues_2026_08_09.sql',
  'catalog_enrichment_wave_17_exact_product_pilot_2026_08_11.sql',
  'catalog_enrichment_wave_18_specialized_exact_2026_08_11.sql',
  'catalog_enrichment_wave_19_norco_exact_fitment_2026_08_12.sql',
  '@quality-rules',
  'catalog_release_quality.sql',
  'catalog_performance_indexes_wave_16_2026_08_09.sql',
  'functional_completion_0_8.sql',
  'strava_integration.sql',
  'ride_processor.sql',
];

const hardeningOrder = [
  'release_upgrade_parity.sql',
  '@quality-rules',
  'quest_selection.sql',
  'ride_processor.sql',
  'release_backend_indexes.sql',
];
const catalogCatchupOrder = [
  'catalog_enrichment_wave_17_exact_product_pilot_2026_08_11.sql',
  'catalog_enrichment_wave_18_specialized_exact_2026_08_11.sql',
  'catalog_enrichment_wave_19_norco_exact_fitment_2026_08_12.sql',
];
const hagenOrder = ['catalog_hagen_complete_2026_08_14.sql'];
const authAchievementsOrder = ['auth_identity_bridge.sql', 'achievements.sql'];
const garageRecommendationOutcomesOrder = ['garage_recommendation_outcomes.sql'];
const earlyGarageWaves = [
  { wave: 20, file: 'catalog_enrichment_wave_20_official_specs_fitment_2026_08_17.sql', migration: '20260817093000_garage_enrichment_wave20.sql' },
  { wave: 21, file: 'catalog_enrichment_wave_21_rocky_mountain_media_fitment_2026_08_17.sql', migration: '20260817094000_garage_enrichment_wave21.sql' },
  { wave: 22, file: 'catalog_enrichment_wave_22_rocky_mountain_archive_fitment_2026_08_17.sql', migration: '20260817095000_garage_enrichment_wave22.sql' },
  { wave: 23, file: 'catalog_enrichment_wave_23_rocky_mountain_instinct_reaper_fitment_2026_08_17.sql', migration: '20260817100000_garage_enrichment_wave23.sql' },
];
const routeQuotaParameterHardeningOrder = ['route_quota_parameter_hardening.sql'];
const platformRideIngestOrder = ['platform_ride_ingest.sql'];
const lateGarageWaves = discoverLateGarageWaves(schemaRoot);

// Compatibility names retained for static regression contracts while discovery
// is now the source of truth for wave 24 and later.
const garageEnrichmentWave24Order = lateGarageWaves.filter(({ wave }) => wave === 24).map(({ file }) => file);
const garageEnrichmentWave25Order = lateGarageWaves.filter(({ wave }) => wave === 25).map(({ file }) => file);
const garageEnrichmentWave26Order = lateGarageWaves.filter(({ wave }) => wave === 26).map(({ file }) => file);
const garageEnrichmentWave24Migration = '20260817150000_garage_enrichment_wave24.sql';
const garageEnrichmentWave25Migration = '20260817151000_garage_enrichment_wave25.sql';
const garageEnrichmentWave26Migration = '20260817152000_garage_enrichment_wave26.sql';

const qualityRulesPath = path.join(root, 'catalog-harvester', 'quality-rules.json');
const requiredEntries = [
  ...baselineOrder,
  ...hardeningOrder,
  ...catalogCatchupOrder,
  ...hagenOrder,
  ...authAchievementsOrder,
  ...garageRecommendationOutcomesOrder,
  ...earlyGarageWaves.map(({ file }) => file),
  ...routeQuotaParameterHardeningOrder,
  ...platformRideIngestOrder,
  ...lateGarageWaves.map(({ file }) => file),
];
const missing = [...new Set(requiredEntries)].filter((file) => file === '@quality-rules'
  ? !fs.existsSync(qualityRulesPath)
  : file.startsWith('@batch:')
    ? !fs.existsSync(path.join(root, 'catalog-harvester', 'batches', file.slice('@batch:'.length)))
    : !fs.existsSync(path.join(schemaRoot, file)));
if (missing.length) throw new Error(`Missing schema files: ${missing.join(', ')}`);

const slug = (value) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sqlString = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;
const canonicalModel = (model, batchGeneratedAt) => {
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
};
const emitBatchSql = (file) => {
  const batch = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'batches', file), 'utf8'));
  const rows = batch.models.map((model) => canonicalModel(model, batch.generated_at)).map((model) => `(${[
    sqlString(model.id), sqlString(model.brand), sqlString(model.model), model.model_year,
    sqlString(model.trim), model.category ? sqlString(model.category) : 'null', sqlString(model.market),
    `${sqlString(JSON.stringify(model.specs))}::jsonb`, sqlString(model.manufacturer_url), sqlString(model.evidence_checked_at),
  ].join(', ')})`).join(',\n');
  return `insert into public.bike_catalog_models\n  (id, brand, model, model_year, trim, category, market, specs, manufacturer_url, evidence_checked_at)\nvalues\n${rows}\non conflict (brand, model, model_year, trim, market) do update set\n  category = coalesce(public.bike_catalog_models.category, excluded.category),\n  specs = excluded.specs || public.bike_catalog_models.specs,\n  manufacturer_url = excluded.manufacturer_url,\n  evidence_checked_at = greatest(public.bike_catalog_models.evidence_checked_at, excluded.evidence_checked_at),\n  enabled = true;`;
};
const emitQualitySql = () => {
  const rules = JSON.parse(fs.readFileSync(qualityRulesPath, 'utf8'));
  const categoryCases = rules.category_rules.map((rule) =>
    `    when lower(brand) = lower(${sqlString(rule.brand)}) and model ~* ${sqlString(rule.model_regex)} then ${sqlString(rule.category)}`
  ).join('\n');
  return `update public.bike_catalog_models\nset category = case\n${categoryCases}\n    else category\n  end\nwhere category is null;\n\nupdate public.bike_catalog_models\nset specs = jsonb_set(specs, '{model_year_evidence}', to_jsonb(manufacturer_url), true)\nwhere not (specs ? 'model_year_evidence');`;
};
const emitEntry = (file) => file === '@quality-rules'
  ? `\n-- SOURCE: catalog-harvester/quality-rules.json\n${emitQualitySql()}\n`
  : file.startsWith('@batch:')
    ? `\n-- SOURCE: catalog-harvester/batches/${file.slice('@batch:'.length)}\n${emitBatchSql(file.slice('@batch:'.length))}\n`
    : `\n-- SOURCE: supabase/schema/${file}\n${fs.readFileSync(path.join(schemaRoot, file), 'utf8').trim()}\n`;
const emitGroup = (files) => files.map(emitEntry).join('').trim() + '\n';

const referencedSchemaFiles = new Set(requiredEntries.filter((file) => file.endsWith('.sql')));
const unreferencedSchemaFiles = fs.readdirSync(schemaRoot)
  .filter((file) => file.endsWith('.sql') && !referencedSchemaFiles.has(file))
  .sort();
if (unreferencedSchemaFiles.length) throw new Error(`Schema sources are not assigned to a generated migration: ${unreferencedSchemaFiles.join(', ')}`);

const compatibilityStub = '-- Migration history compatibility stub. The effective schema is captured by\n-- 20260811000000_veloquest_full_baseline.sql.\n';
const generated = new Map([
  ['20260806190230_bike_catalog_search_and_filters.sql', compatibilityStub],
  ['20260809105149_catalog_performance_indexes_wave_16_2026_08_09.sql', compatibilityStub],
  ['20260811000000_veloquest_full_baseline.sql', emitGroup(baselineOrder)],
  ['20260811190000_release_hardening.sql', emitGroup(hardeningOrder)],
  ['20260812170000_catalog_enrichment_catchup_waves_17_19.sql', emitGroup(catalogCatchupOrder)],
  ['20260814190000_catalog_hagen_complete.sql', emitGroup(hagenOrder)],
  ['20260814230000_auth_achievements_0_8_9.sql', emitGroup(authAchievementsOrder)],
  ['20260817092000_garage_no_upgrade_outcomes.sql', emitGroup(garageRecommendationOutcomesOrder)],
  ...earlyGarageWaves.map(({ file, migration }) => [migration, emitGroup([file])]),
  ['20260817143000_route_quota_parameter_hardening.sql', emitGroup(routeQuotaParameterHardeningOrder)],
  ['20260817144000_platform_ride_ingest.sql', emitGroup(platformRideIngestOrder)],
  ...lateGarageWaves.map(({ wave, file }) => [garageWaveMigrationName(wave), emitGroup([file])]),
]);

// Assert compatibility constants have not drifted from dynamic naming.
for (const [wave, expected] of [[24, garageEnrichmentWave24Migration], [25, garageEnrichmentWave25Migration], [26, garageEnrichmentWave26Migration]]) {
  if (garageWaveMigrationName(wave) !== expected) throw new Error(`Garage wave ${wave} migration name drift`);
}

fs.mkdirSync(migrationRoot, { recursive: true });
if (checkOnly) {
  const actualFiles = fs.readdirSync(migrationRoot).filter((file) => file.endsWith('.sql')).sort();
  const expectedFiles = [...generated.keys()].sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(`Unexpected migration file set:\nexpected: ${expectedFiles.join(', ')}\nactual: ${actualFiles.join(', ')}`);
  }
  const drift = [...generated].flatMap(([file, expected]) => {
    const target = path.join(migrationRoot, file);
    if (!fs.existsSync(target)) return [`${file}: missing`];
    return fs.readFileSync(target, 'utf8') === expected ? [] : [`${file}: generated content drift`];
  });
  if (drift.length) throw new Error(`Supabase migration generation is not reproducible:\n${drift.join('\n')}`);
} else {
  for (const [file, content] of generated) fs.writeFileSync(path.join(migrationRoot, file), content);
}

console.log(JSON.stringify({
  mode: checkOnly ? 'check' : 'write',
  baselineFiles: baselineOrder.length,
  hardeningFiles: hardeningOrder.length,
  catalogCatchupFiles: catalogCatchupOrder.length,
  hagenFiles: hagenOrder.length,
  garageOutcomeFiles: garageRecommendationOutcomesOrder.length,
  garageEnrichmentWave20Files: earlyGarageWaves.filter(({ wave }) => wave === 20).length,
  garageEnrichmentWave21Files: earlyGarageWaves.filter(({ wave }) => wave === 21).length,
  garageEnrichmentWave22Files: earlyGarageWaves.filter(({ wave }) => wave === 22).length,
  garageEnrichmentWave23Files: earlyGarageWaves.filter(({ wave }) => wave === 23).length,
  garageEnrichmentWave24Files: garageEnrichmentWave24Order.length,
  garageEnrichmentWave25Files: garageEnrichmentWave25Order.length,
  garageEnrichmentWave26Files: garageEnrichmentWave26Order.length,
  discoveredLateGarageWaves: lateGarageWaves.map(({ wave }) => wave),
  routeQuotaHardeningFiles: routeQuotaParameterHardeningOrder.length,
  platformRideIngestFiles: platformRideIngestOrder.length,
  generatedMigrations: generated.size,
  totalMigrations: fs.readdirSync(migrationRoot).filter((file) => file.endsWith('.sql')).length,
}, null, 2));
