import crypto from 'node:crypto';

import { verifyProductIdentity, verifyProductYearEvidence } from './product-evidence-identity.mjs';
import { isOfficialEvidenceUrl } from './product-evidence-rules.mjs';

const sqlString = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;
const slug = (value) => String(value ?? '').toLocaleLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function canonicalEvidenceUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    if (url.protocol !== 'https:') return null;
    url.search = '';
    url.hash = '';
    const pathname = url.pathname.replace(/\/+$/u, '') || '/';
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

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
    else if (char === '(' || char === '[' || char === '{') depth += 1;
    else if (char === ')' || char === ']' || char === '}') depth -= 1;
    if (char === delimiter && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseSqlString(raw) {
  const match = String(raw ?? '').trim().match(/^'((?:[^']|'')*)'(?:\s*::[\w\s\[\]]+)?$/s);
  return match ? match[1].replaceAll("''", "'") : null;
}

export function collectGarageComponentIdsFromSql(sql) {
  const ids = new Set();
  const pattern = /insert\s+into\s+public\.garage_components\s*\(([^)]*)\)\s*values\s*([\s\S]*?)(?=\s+on\s+conflict|\s*;)/gi;
  for (const match of String(sql ?? '').matchAll(pattern)) {
    const columns = splitTopLevel(match[1]).map((column) => column.trim());
    const idIndex = columns.indexOf('id');
    if (idIndex < 0) continue;
    for (const tuple of splitTopLevel(match[2].replace(/^\s*--.*$/gm, ''))) {
      const body = tuple.trim().replace(/^\(/, '').replace(/\)$/, '');
      const values = splitTopLevel(body);
      if (values.length !== columns.length) continue;
      const id = parseSqlString(values[idIndex]);
      if (id) ids.add(id);
    }
  }
  return ids;
}

function componentId(component) {
  const digest = crypto.createHash('sha256')
    .update(`${component.category}|${component.brand}|${component.display_name}`)
    .digest('hex')
    .slice(0, 10);
  return `oem-${slug(component.brand)}-${slug(component.display_name).slice(0, 42)}-${digest}`;
}

function opaqueComponentId(entry, component) {
  const digest = crypto.createHash('sha256')
    .update(`${entry.bike_id}|${component.category}|${component.display_name}`)
    .digest('hex')
    .slice(0, 10);
  return `oem-bike-${slug(entry.bike_id).slice(0, 36)}-${slug(component.category)}-${digest}`;
}

const PART_PREFIX_BY_CATEGORY = {
  rear_derailleur: ['RD'],
  front_derailleur: ['FD'],
  cassette: ['CS'],
  chain: ['CN'],
  crankset: ['FC'],
  shifter: ['SL', 'ST'],
  brake_caliper: ['BR'],
  brake_lever: ['BL'],
  rotor: ['SM-RT', 'RT'],
};

function exactCanonicalComponentIdentity(component, knownComponentIds) {
  if (!component?.category || !component?.brand || !knownComponentIds?.size) return null;
  const brandKey = slug(component.brand);
  if (brandKey !== 'shimano' && brandKey !== 'sram') return null;
  const prefixes = PART_PREFIX_BY_CATEGORY[component.category];
  if (!prefixes?.length) return null;
  const evidenceText = `${component.source_value ?? ''} ${component.display_name ?? ''}`.toUpperCase();
  const partNumberPattern = new RegExp(`\\b(${prefixes.map((prefix) => prefix.replace('-', '\\-')).join('|')})-[A-Z0-9]+(?:-[A-Z0-9]+)*\\b`, 'u');
  const match = evidenceText.match(partNumberPattern);
  if (!match) return null;
  const partNumber = match[0].toUpperCase();
  const canonicalId = `${brandKey}-${partNumber.toLocaleLowerCase()}`;
  return knownComponentIds.has(canonicalId) ? { canonicalId, partNumber } : null;
}

function validateRunEntry(entry, config, knownBikeIds) {
  if (!knownBikeIds?.has(entry.bike_id)) throw new Error(`unknown bike_id: ${entry.bike_id}`);
  if (entry.status !== 'ok') throw new Error(`evidence entry ${entry.bike_id} has status ${entry.status}`);
  if (!isOfficialEvidenceUrl(entry.brand, entry.manufacturer_url, config)) throw new Error(`non-official manufacturer_url: ${entry.bike_id}`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(entry.evidence_checked_at ?? '')) throw new Error(`invalid evidence date: ${entry.bike_id}`);
  if (!entry.evidence || (entry.evidence.ambiguities?.length ?? 0) > 0) throw new Error(`ambiguous evidence: ${entry.bike_id}`);

  const modelYearEvidence = entry.evidence.model_year_evidence;
  if (modelYearEvidence) {
    if (!isOfficialEvidenceUrl(entry.brand, modelYearEvidence.source_url, config)) {
      throw new Error(`non-official model-year evidence source: ${entry.bike_id}`);
    }
    const yearIdentity = verifyProductYearEvidence(entry, modelYearEvidence);
    if (!yearIdentity.valid) {
      throw new Error(`model-year evidence verification failed for ${entry.bike_id}: ${yearIdentity.reason}`);
    }
  }

  const identity = verifyProductIdentity(entry, entry.evidence);
  if (!identity.valid) throw new Error(`identity verification failed for ${entry.bike_id}: ${identity.reason}`);

  const exactEvidencePage = canonicalEvidenceUrl(entry.manufacturer_url);
  if (!exactEvidencePage) throw new Error(`invalid exact evidence page: ${entry.bike_id}`);
  for (const item of entry.evidence.media ?? []) {
    const sourcePageUrl = item.source_page_url ?? entry.manufacturer_url;
    if (!isOfficialEvidenceUrl(entry.brand, sourcePageUrl, config)) {
      throw new Error(`non-official media source page: ${entry.bike_id}`);
    }
    if (canonicalEvidenceUrl(sourcePageUrl) !== exactEvidencePage) {
      throw new Error(`media source page does not match exact evidence page: ${entry.bike_id}`);
    }
    if (!/^https:\/\//i.test(item.image_url ?? '')) throw new Error(`non-HTTPS media URL: ${entry.bike_id}`);
  }
}

export function selectCompilableEvidenceRun(run) {
  if (!Array.isArray(run?.entries) || run.entries.length === 0) {
    throw new Error('evidence run has no entries');
  }

  const accepted = run.entries.filter((entry) => entry?.status === 'ok');
  if (accepted.length === 0) throw new Error('no compilable evidence entries');

  const rejectedByStatus = {};
  for (const entry of run.entries) {
    if (entry?.status === 'ok') continue;
    const status = typeof entry?.status === 'string' && entry.status ? entry.status : 'unknown';
    rejectedByStatus[status] = (rejectedByStatus[status] ?? 0) + 1;
  }

  return {
    run: { ...run, entries: accepted },
    summary: {
      input: run.entries.length,
      accepted: accepted.length,
      rejected: run.entries.length - accepted.length,
      rejectedByStatus,
    },
  };
}

function modelUpdateSql(entry) {
  const canonical = entry.evidence.canonical ?? {};
  const specs = {
    product_evidence_url: entry.manufacturer_url,
    ...(entry.evidence.model_year_evidence
      ? { product_model_year_evidence: entry.evidence.model_year_evidence }
      : {}),
  };
  let hasCanonicalSpecs = false;
  for (const field of ['frame_material', 'wheel_size', 'drivetrain', 'brakes']) {
    const value = canonical[field]?.value;
    if (value !== undefined && value !== null && String(value).trim()) {
      specs[field] = value;
      hasCanonicalSpecs = true;
    }
  }
  const drivetrainBrand = entry.evidence.components?.rear_derailleur?.brand;
  if (drivetrainBrand) {
    specs.drivetrain_brand = drivetrainBrand;
    hasCanonicalSpecs = true;
  }
  if (hasCanonicalSpecs) specs.spec_evidence = entry.manufacturer_url;
  return `update public.bike_catalog_models\nset specs = specs || ${sqlString(JSON.stringify(specs))}::jsonb,\n    manufacturer_url = ${sqlString(entry.manufacturer_url)},\n    evidence_checked_at = ${sqlString(entry.evidence_checked_at)}\nwhere id = ${sqlString(entry.bike_id)};`;
}

function mediaSql(entry) {
  const media = entry.evidence.media ?? [];
  if (media.length === 0) return '';
  const rows = media.map((item, index) => `(${[
    sqlString(entry.bike_id), sqlString(item.image_url), sqlString('manufacturer'), sqlString(entry.brand),
    sqlString(item.source_page_url ?? entry.manufacturer_url), 10 + index, sqlString(entry.evidence_checked_at), 'true',
  ].join(', ')})`).join(',\n');
  return `insert into public.bike_catalog_images\n  (bike_id, image_url, source_type, source_name, source_page_url, priority, checked_at, enabled)\nvalues\n${rows}\non conflict (bike_id, image_url) do update set\n  source_type = excluded.source_type, source_name = excluded.source_name, source_page_url = excluded.source_page_url,\n  priority = excluded.priority, checked_at = excluded.checked_at, enabled = true;`;
}

function componentSql(entry, knownComponentIds) {
  const components = Object.values(entry.evidence.components ?? {})
    .filter((component) => component?.category && component?.brand && component?.display_name);
  const opaqueComponents = (entry.evidence.opaque_components ?? [])
    .filter((component) => component?.category && component?.display_name && component?.identity_scope === 'bike_specific_exact_listing');
  if (components.length === 0 && opaqueComponents.length === 0) return '';

  const componentRows = [];
  const fitmentRows = [];
  const aliasRows = [];
  for (const component of components) {
    const id = componentId(component);
    const escapedBrand = String(component.brand).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const model = String(component.display_name).replace(new RegExp(`^${escapedBrand}\\s*`, 'i'), '') || component.display_name;
    const specs = {
      evidence_scope: 'exact-product OEM listing',
      source_label: component.source_label,
      source_value: component.source_value,
    };
    componentRows.push(`(${[
      sqlString(id), sqlString(component.brand), sqlString(model), sqlString(component.category), sqlString(component.display_name),
      `${sqlString(JSON.stringify(specs))}::jsonb`, 1, sqlString(entry.manufacturer_url), sqlString(entry.evidence_checked_at), 'true',
    ].join(', ')})`);
    fitmentRows.push(`(${[
      sqlString(entry.bike_id), sqlString(id), sqlString('factory_installed'), sqlString(entry.manufacturer_url),
      sqlString(entry.evidence_checked_at), sqlString(`Official exact product page lists ${component.source_label}: ${component.source_value}.`),
    ].join(', ')})`);

    const identity = exactCanonicalComponentIdentity(component, knownComponentIds);
    if (identity && identity.canonicalId !== id) {
      aliasRows.push(`(${[
        sqlString(id), sqlString(identity.canonicalId), sqlString(entry.manufacturer_url), sqlString(entry.evidence_checked_at),
        sqlString(`Exact OEM evidence contains canonical part number ${identity.partNumber}; no compatibility verdict is inferred by this alias.`),
      ].join(', ')})`);
    }
  }

  for (const component of opaqueComponents) {
    const id = opaqueComponentId(entry, component);
    const specs = {
      evidence_scope: 'exact-product OEM listing',
      identity_scope: 'bike_specific_exact_listing',
      manufacturer_unstated: true,
      source_label: component.source_label,
      source_value: component.source_value,
    };
    componentRows.push(`(${[
      sqlString(id), sqlString('Unspecified OEM'), sqlString(component.display_name), sqlString(component.category), sqlString(component.display_name),
      `${sqlString(JSON.stringify(specs))}::jsonb`, 1, sqlString(entry.manufacturer_url), sqlString(entry.evidence_checked_at), 'true',
    ].join(', ')})`);
    fitmentRows.push(`(${[
      sqlString(entry.bike_id), sqlString(id), sqlString('factory_installed'), sqlString(entry.manufacturer_url),
      sqlString(entry.evidence_checked_at), sqlString(`Official exact product page lists ${component.source_label}: ${component.source_value}; component manufacturer is not stated, so identity is bike-specific and cannot be reused for compatibility.`),
    ].join(', ')})`);
  }

  const blocks = [
    `insert into public.garage_components\n  (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at, enabled)\nvalues\n${componentRows.join(',\n')}\non conflict (id) do update set\n  brand = excluded.brand, model = excluded.model, category = excluded.category, display_name = excluded.display_name,\n  specs = excluded.specs, evidence_url = excluded.evidence_url, evidence_checked_at = excluded.evidence_checked_at, enabled = true;`,
    `insert into public.bike_catalog_component_fitments\n  (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)\nvalues\n${fitmentRows.join(',\n')}\non conflict (bike_id, component_id, fitment_type) do update set\n  evidence_url = excluded.evidence_url, evidence_checked_at = excluded.evidence_checked_at, notes = excluded.notes;`,
  ];
  if (aliasRows.length > 0) {
    blocks.push(`insert into public.garage_component_aliases\n  (alias_component_id, canonical_component_id, evidence_url, evidence_checked_at, notes)\nvalues\n${aliasRows.join(',\n')}\non conflict (alias_component_id) do update set\n  canonical_component_id = excluded.canonical_component_id, evidence_url = excluded.evidence_url,\n  evidence_checked_at = excluded.evidence_checked_at, notes = excluded.notes;`);
  }
  return blocks.join('\n\n');
}

export function compileProductEvidence({ run, config, knownBikeIds, knownComponentIds = new Set() }) {
  const entries = run?.entries;
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('evidence run has no entries');
  const blocks = ['begin;'];
  for (const entry of entries) {
    validateRunEntry(entry, config, knownBikeIds);
    blocks.push(modelUpdateSql(entry));
    const media = mediaSql(entry);
    if (media) blocks.push(media);
    const components = componentSql(entry, knownComponentIds);
    if (components) blocks.push(components);
  }
  blocks.push('commit;');
  return `${blocks.join('\n\n')}\n`;
}
