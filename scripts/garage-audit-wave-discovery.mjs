import fs from 'node:fs';

const LATE_WAVE_RE = /^catalog_enrichment_wave_(\d+)_.*\.sql$/;

export function discoverLateGarageWaves(schemaRoot) {
  return fs.readdirSync(schemaRoot)
    .map((file) => ({ file, match: file.match(LATE_WAVE_RE) }))
    .filter(({ match }) => match && Number(match[1]) >= 20)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]) || a.file.localeCompare(b.file))
    .map(({ file }) => file);
}

export function expandGarageAuditSource(baseSource, lateWaves) {
  const marker = "  'release_upgrade_parity.sql',\n";
  if (!baseSource.includes(marker)) throw new Error('Garage audit schemaOrder marker is missing');
  const uniqueWaves = [...new Set(lateWaves)];
  if (uniqueWaves.length === 0) return baseSource;
  for (const file of uniqueWaves) {
    if (baseSource.includes(`'${file}'`)) throw new Error(`Garage audit late wave is already present in base source: ${file}`);
  }
  const injected = uniqueWaves.map((file) => `  '${file}',`).join('\n');
  return baseSource.replace(marker, `${marker}${injected}\n`);
}

function injectOnce(source, marker, insertion, label) {
  if (!source.includes(marker)) throw new Error(`Garage audit ${label} marker is missing`);
  if (source.includes(insertion.trim())) return source;
  return source.replace(marker, `${marker}${insertion}`);
}

export function expandTrustedMediaCoverageSource(baseSource) {
  const importMarker = "import { fileURLToPath } from 'node:url';\n";
  if (!baseSource.includes(importMarker)) throw new Error('Garage audit fileURLToPath import marker is missing');
  const importLine = "import { isTrustedProductMediaUrl } from '../catalog-harvester/product-media-policy.mjs';\n";
  let source = baseSource.includes(importLine) ? baseSource : baseSource.replace(importMarker, `${importMarker}${importLine}`);

  source = injectOnce(
    source,
    'const images = [...imagesByKey.values()];\n',
    "const trustedImages = images.filter((row) => isTrustedProductMediaUrl(row.image_url));\nconst rejectedMediaEntries = images.filter((row) => !isTrustedProductMediaUrl(row.image_url));\n",
    'trusted media arrays',
  );

  const imageCoverageMarker = "const imageBikeIds = new Set(images.filter((row) => activeModelIds.has(row.bike_id)).map((row) => row.bike_id));";
  if (!source.includes(imageCoverageMarker)) throw new Error('Garage audit image coverage marker is missing');
  source = source.replace(
    imageCoverageMarker,
    "const imageBikeIds = new Set(trustedImages.filter((row) => activeModelIds.has(row.bike_id)).map((row) => row.bike_id));",
  );

  source = injectOnce(
    source,
    '  media: {\n',
    "    trustedImages: trustedImages.length,\n    rejectedUntrustedAssets: rejectedMediaEntries.length,\n    rejectedUntrustedEntries: rejectedMediaEntries.map((row) => ({ bikeId: row.bike_id, imageUrl: row.image_url, sourcePageUrl: row.source_page_url })),\n",
    'trusted media report',
  );

  const sourceTypesMarker = "    sourceTypes: Object.fromEntries([...new Set(images.map((row) => row.source_type))].map((type) => [type, images.filter((row) => row.source_type === type).length])),";
  if (!source.includes(sourceTypesMarker)) throw new Error('Garage audit media sourceTypes marker is missing');
  source = source.replace(
    sourceTypesMarker,
    "    sourceTypes: Object.fromEntries([...new Set(trustedImages.map((row) => row.source_type))].map((type) => [type, trustedImages.filter((row) => row.source_type === type).length])),",
  );

  const hostCountsMarker = "    imageHostCounts: Object.fromEntries([...new Set(images.map((row) => new URL(row.image_url).hostname))].sort().map((host) => [host, images.filter((row) => new URL(row.image_url).hostname === host).length])),";
  if (!source.includes(hostCountsMarker)) throw new Error('Garage audit media imageHostCounts marker is missing');
  source = source.replace(
    hostCountsMarker,
    "    imageHostCounts: Object.fromEntries([...new Set(trustedImages.map((row) => new URL(row.image_url).hostname))].sort().map((host) => [host, trustedImages.filter((row) => new URL(row.image_url).hostname === host).length])),",
  );

  const entriesMarker = "    entries: images.map((row) => ({ bikeId: row.bike_id, imageUrl: row.image_url, sourcePageUrl: row.source_page_url, sourceType: row.source_type })),";
  if (!source.includes(entriesMarker)) throw new Error('Garage audit media entries marker is missing');
  source = source.replace(
    entriesMarker,
    "    entries: trustedImages.map((row) => ({ bikeId: row.bike_id, imageUrl: row.image_url, sourcePageUrl: row.source_page_url, sourceType: row.source_type })),",
  );

  const failureMarker = "  result.media.unapprovedMediaSourcePages.length > 0 && 'media source page outside the brand allow-list',\n";
  if (!source.includes(failureMarker)) throw new Error('Garage audit media failure marker is missing');
  source = source.replace(
    failureMarker,
    `${failureMarker}  result.media.rejectedUntrustedAssets > 0 && \`${'${result.media.rejectedUntrustedAssets}'} untrusted/generic image assets must be removed or replaced\`,\n`,
  );
  return source;
}

export function expandTrustedFitmentCoverageSource(baseSource) {
  const importMarker = "import { fileURLToPath } from 'node:url';\n";
  if (!baseSource.includes(importMarker)) throw new Error('Garage audit fileURLToPath import marker is missing');
  const importLine = "import { auditGarageFitmentEvidence } from './garage-fitment-evidence.mjs';\n";
  let source = baseSource.includes(importLine) ? baseSource : baseSource.replace(importMarker, `${importMarker}${importLine}`);

  const configMarker = "const harvesterConfig = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'config.json'), 'utf8'));\n";
  source = injectOnce(
    source,
    configMarker,
    "const componentCompatibilitySources = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'component-compatibility-sources.json'), 'utf8'));\n",
    'component compatibility source registry',
  );

  const activeMarker = 'const activeModelIds = new Set(models.map((model) => model.id));\n';
  source = injectOnce(
    source,
    activeMarker,
    [
      'const fitmentEvidenceAudit = auditGarageFitmentEvidence({',
      '  fitments, modelsById, componentsById, bikeConfig: harvesterConfig, componentSources: componentCompatibilitySources,',
      '});',
      'const trustedFitments = fitmentEvidenceAudit.trustedFitments;',
      '',
    ].join('\n'),
    'trusted fitment evidence audit',
  );

  const fitmentCoverageMarker = "const fitmentBikeIds = new Set(fitments.filter((row) => activeModelIds.has(row.bike_id)).map((row) => row.bike_id));";
  if (source.includes(fitmentCoverageMarker)) {
    source = source.replace(
      fitmentCoverageMarker,
      "const fitmentBikeIds = new Set(fitmentEvidenceAudit.trustedFactoryFitments.filter((row) => activeModelIds.has(row.bike_id)).map((row) => row.bike_id));",
    );
  } else if (!source.includes('const fitmentBikeIds = new Set(fitmentEvidenceAudit.trustedFactoryFitments')) {
    throw new Error('Garage audit fitment coverage marker is missing');
  }

  source = injectOnce(
    source,
    '    fitments: fitments.length,\n',
    "    trustedFitments: trustedFitments.length,\n    trustedFactoryFitments: fitmentEvidenceAudit.trustedFactoryFitments.length,\n    invalidFitmentEvidence: fitmentEvidenceAudit.invalid,\n",
    'trusted fitment report',
  );

  const failureMarker = "  result.compatibility.missingComponentReferences.length > 0 && 'broken fitment component references',\n";
  source = injectOnce(
    source,
    failureMarker,
    "  result.compatibility.invalidFitmentEvidence.length > 0 && `${result.compatibility.invalidFitmentEvidence.length} untrusted fitment evidence row(s)`,\n",
    'trusted fitment failure',
  );
  return source;
}

export function expandRecommendationCoverageSource(baseSource) {
  const importMarker = "import { fileURLToPath } from 'node:url';\n";
  if (!baseSource.includes(importMarker)) throw new Error('Garage audit fileURLToPath import marker is missing');
  const importLine = "import { recommendationCoverage as computeRecommendationCoverage } from './garage-recommendation-coverage.mjs';\n";
  let source = baseSource.includes(importLine) ? baseSource : baseSource.replace(importMarker, `${importMarker}${importLine}`);

  source = injectOnce(
    source,
    'const fitmentsByKey = new Map();\n',
    'const componentAliasesByKey = new Map();\n',
    'fitment map',
  );
  source = injectOnce(
    source,
    "  for (const row of inserts(sql, 'bike_catalog_component_fitments')) fitmentsByKey.set(`${row.bike_id}|${row.component_id}|${row.fitment_type}`, row);\n",
    "  for (const row of inserts(sql, 'garage_component_aliases')) componentAliasesByKey.set(`${row.alias_component_id}|${row.canonical_component_id}`, row);\n",
    'fitment parser',
  );
  source = injectOnce(
    source,
    'const fitments = [...fitmentsByKey.values()];\n',
    'const componentAliases = [...componentAliasesByKey.values()];\n',
    'fitment array',
  );

  const startMarker = 'const outgoingCompatible = new Map();';
  const endMarker = 'const brandCounts = ';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0 || end <= start) throw new Error('Garage audit legacy recommendation coverage block is missing');
  const fitmentsExpression = source.includes('const trustedFitments = fitmentEvidenceAudit.trustedFitments;') ? 'trustedFitments' : 'fitments';
  const replacement = `const { approvedFitmentBikeIds, recommendationReadyBikeIds } = computeRecommendationCoverage({ fitments: ${fitmentsExpression}, compatibility, aliases: componentAliases, activeModelIds });\n`;
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

export function expandFitmentSelectCoverageSource(baseSource) {
  const importMarker = "import { fileURLToPath } from 'node:url';\n";
  if (!baseSource.includes(importMarker)) throw new Error('Garage audit fileURLToPath import marker is missing');
  const importLine = "import { parseBikeFitmentSelectRows } from './garage-fitment-select-parser.mjs';\n";
  let source = baseSource.includes(importLine) ? baseSource : baseSource.replace(importMarker, `${importMarker}${importLine}`);
  const fitmentMarker = "  for (const row of inserts(sql, 'bike_catalog_component_fitments')) fitmentsByKey.set(`${row.bike_id}|${row.component_id}|${row.fitment_type}`, row);\n";
  const insertion = [
    '  for (const selected of parseBikeFitmentSelectRows(sql)) {',
    '    const bikeId = modelIdentity.get(identity(selected.identity));',
    '    if (!bikeId) throw new Error(`${file}: fitment SELECT identity is not present in catalog: ${identity(selected.identity)}`);',
    '    const row = { bike_id: bikeId, ...selected.row };',
    '    fitmentsByKey.set(`${row.bike_id}|${row.component_id}|${row.fitment_type}`, row);',
    '  }',
    '',
  ].join('\n');
  return injectOnce(source, fitmentMarker, insertion, 'fitment SELECT parser');
}

export function enforceGarageFullCoverageSource(baseSource) {
  const targetMarker = 'const targets = { photo_percent: 80, core_specs_percent: 80, exact_fitment_percent: 60, recommendation_outcome_percent: 60 };';
  if (!baseSource.includes(targetMarker)) throw new Error('Garage audit legacy coverage target marker is missing');

  let source = baseSource.replace(
    targetMarker,
    'const targets = { photo_percent: 100, core_specs_percent: 100, exact_fitment_percent: 100, recommendation_outcome_percent: 100 };',
  );

  const replacements = [
    [
      'result.media.coveragePercent < 80 && `photo coverage ${result.media.coveragePercent}% < 80%`',
      'result.media.coveragePercent < 100 && `photo coverage ${result.media.coveragePercent}% < 100%`',
    ],
    [
      'result.semanticCoverage.finderFilterComplete.percent < 80 && `core finder spec coverage ${result.semanticCoverage.finderFilterComplete.percent}% < 80%`',
      'result.semanticCoverage.finderFilterComplete.percent < 100 && `core finder spec coverage ${result.semanticCoverage.finderFilterComplete.percent}% < 100%`',
    ],
    [
      'result.compatibility.fitmentCoveragePercent < 60 && `exact fitment coverage ${result.compatibility.fitmentCoveragePercent}% < 60%`',
      'result.compatibility.fitmentCoveragePercent < 100 && `exact fitment coverage ${result.compatibility.fitmentCoveragePercent}% < 100%`',
    ],
    [
      'result.compatibility.recommendationCoveragePercent < 60 && `recommendation/outcome coverage ${result.compatibility.recommendationCoveragePercent}% < 60%`',
      'result.compatibility.recommendationCoveragePercent < 100 && `recommendation/outcome coverage ${result.compatibility.recommendationCoveragePercent}% < 100%`',
    ],
  ];

  for (const [legacy, full] of replacements) {
    if (!source.includes(legacy)) throw new Error(`Garage audit legacy maximum marker is missing: ${legacy}`);
    source = source.replace(legacy, full);
  }
  return source;
}
