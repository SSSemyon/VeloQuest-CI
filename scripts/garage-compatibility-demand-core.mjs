import { recommendationCoverage } from './garage-recommendation-coverage.mjs';

const asSet = (value) => value instanceof Set ? value : new Set(value ?? []);

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

function parseSqlValue(raw) {
  const value = String(raw ?? '').trim();
  if (/^null$/iu.test(value)) return null;
  if (/^(true|false)$/iu.test(value)) return value.toLocaleLowerCase() === 'true';
  if (/^-?\d+(?:\.\d+)?$/u.test(value)) return Number(value);
  const match = value.match(/^'((?:[^']|'')*)'(?:\s*::[\w\s\[\]]+)?$/su);
  if (match) return match[1].replaceAll("''", "'");
  return value;
}

export function parseSqlInsertRows(sql, tableName) {
  if (!/^[a-z_][a-z0-9_]*$/u.test(tableName)) throw new Error(`invalid SQL table name: ${tableName}`);
  const rows = [];
  const escapedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`insert\\s+into\\s+public\\.${escapedTable}\\s*\\(([^)]*)\\)\\s*values\\s*([\\s\\S]*?)(?=\\s+on\\s+conflict|\\s*;)`, 'giu');
  for (const match of String(sql ?? '').matchAll(pattern)) {
    const columns = splitTopLevel(match[1]).map((column) => column.trim());
    for (const tuple of splitTopLevel(match[2].replace(/^\s*--.*$/gmu, ''))) {
      const body = tuple.trim().replace(/^\(/u, '').replace(/\)$/u, '');
      const values = splitTopLevel(body).map(parseSqlValue);
      if (columns.length !== values.length) continue;
      rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
    }
  }
  return rows;
}

export function buildCompatibilityDemand({
  activeModelIds,
  fitments = [],
  aliases = [],
  compatibility = [],
  explicitOutcomeBikeIds = new Set(),
  components = [],
}) {
  const active = asSet(activeModelIds);
  const outcomes = asSet(explicitOutcomeBikeIds);
  const componentById = new Map(components.map((component) => [component.id, component]));
  const canonicalByAlias = new Map(aliases.map((alias) => [alias.alias_component_id, alias.canonical_component_id]));

  const graphCoverage = recommendationCoverage({
    fitments,
    aliases,
    compatibility,
    activeModelIds: active,
  });
  const covered = new Set([...graphCoverage.recommendationReadyBikeIds, ...outcomes]);
  const uncoveredBikeIds = new Set([...active].filter((bikeId) => !covered.has(bikeId)));

  const demandByCanonical = new Map();
  for (const fitment of fitments) {
    if (fitment.fitment_type !== 'factory_installed' || !uncoveredBikeIds.has(fitment.bike_id)) continue;
    const exactId = fitment.component_id;
    const canonicalId = canonicalByAlias.get(exactId) ?? exactId;
    const canonical = componentById.get(canonicalId) ?? componentById.get(exactId) ?? {};
    if (!demandByCanonical.has(canonicalId)) {
      demandByCanonical.set(canonicalId, {
        component_id: canonicalId,
        brand: canonical.brand ?? null,
        model: canonical.model ?? null,
        category: canonical.category ?? null,
        bikeIds: new Set(),
        exactComponentIds: new Set(),
      });
    }
    const item = demandByCanonical.get(canonicalId);
    item.bikeIds.add(fitment.bike_id);
    item.exactComponentIds.add(exactId);
  }

  const demand = [...demandByCanonical.values()]
    .map((item) => ({
      component_id: item.component_id,
      brand: item.brand,
      model: item.model,
      category: item.category,
      impact_bikes: item.bikeIds.size,
      bike_ids: [...item.bikeIds].sort(),
      exact_component_ids: [...item.exactComponentIds].sort(),
    }))
    .sort((a, b) => b.impact_bikes - a.impact_bikes
      || String(a.category ?? '').localeCompare(String(b.category ?? ''))
      || a.component_id.localeCompare(b.component_id));

  return {
    active_bikes: active.size,
    covered_bikes: covered.size,
    uncovered_bikes: uncoveredBikeIds.size,
    uncoveredBikeIds,
    demand,
  };
}
