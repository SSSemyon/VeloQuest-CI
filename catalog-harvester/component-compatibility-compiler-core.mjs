const sqlString = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;

const normalizeBrand = (value) => String(value ?? '')
  .toLocaleLowerCase()
  .replace(/\s+/gu, '')
  .trim();

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

function exactSqlString(raw, context) {
  const value = String(raw ?? '').trim();
  const string = value.match(/^'((?:[^']|'')*)'(?:\s*::[\w\s\[\]]+)?$/su);
  if (!string) throw new Error(`${context} must be an exact SQL string literal`);
  return string[1].replaceAll("''", "'");
}

export function buildGarageComponentBrandIndex(schemaSources) {
  if (!Array.isArray(schemaSources) || schemaSources.length === 0) {
    throw new Error('cannot build exact component brand index without schema sources');
  }
  const componentBrands = {};
  for (const source of schemaSources) {
    const file = String(source?.file ?? 'unknown schema');
    const sql = String(source?.sql ?? '');
    const hasStandaloneBrandUpdate = splitTopLevel(sql, ';').some((statement) =>
      /update\s+public\.garage_components\s+set\b/iu.test(statement)
      && /\bbrand\s*=/iu.test(statement));
    if (hasStandaloneBrandUpdate) {
      throw new Error(`${file}: standalone garage_components brand update cannot build exact component brand index`);
    }
    const pattern = /insert\s+into\s+public\.garage_components\s*\(([^)]*)\)\s*values\s*([\s\S]*?)(?=\s+on\s+conflict|\s*;)/giu;
    let parsedStatements = 0;
    for (const match of sql.matchAll(pattern)) {
      parsedStatements += 1;
      const columns = splitTopLevel(match[1]).map((column) => column.trim());
      const idIndex = columns.indexOf('id');
      const brandIndex = columns.indexOf('brand');
      if (idIndex < 0 || brandIndex < 0) throw new Error(`${file}: garage_components insert must contain exact id and brand columns`);
      const tuples = splitTopLevel(match[2].replace(/^\s*--.*$/gmu, ''));
      for (const tuple of tuples) {
        const body = tuple.trim().replace(/^\(/u, '').replace(/\)$/u, '');
        const values = splitTopLevel(body);
        if (values.length !== columns.length) throw new Error(`${file}: garage_components insert column/value mismatch`);
        const id = exactSqlString(values[idIndex], `${file}: garage_components.id`).trim();
        const brand = exactSqlString(values[brandIndex], `${file}: garage_components.brand`).trim();
        if (!id || !brand) throw new Error(`${file}: garage_components row missing exact id/brand`);
        const previousBrand = componentBrands[id];
        if (previousBrand && normalizeBrand(previousBrand) !== normalizeBrand(brand)) {
          throw new Error(`${file}: conflicting Garage component brand for ${id}: ${previousBrand} != ${brand}`);
        }
        componentBrands[id] = brand;
      }
    }
    const declaredStatements = (sql.match(/insert\s+into\s+public\.garage_components\b/giu) ?? []).length;
    if (declaredStatements !== parsedStatements) {
      throw new Error(`${file}: cannot build exact component brand index from ${declaredStatements - parsedStatements} non-VALUES garage_components insert(s)`);
    }
  }
  if (Object.keys(componentBrands).length === 0) throw new Error('cannot build exact component brand index: no Garage components found');
  return componentBrands;
}

function validateOfficialSources(officialSources) {
  if (!Array.isArray(officialSources?.sources) || officialSources.sources.length === 0) {
    throw new Error('official compatibility source registry is required');
  }
  return officialSources.sources;
}

function brandForComponent(componentBrands, componentId) {
  if (componentBrands instanceof Map) return componentBrands.get(componentId) ?? null;
  return componentBrands?.[componentId] ?? null;
}

function isOfficialCompatibilityEvidence(entry, pair, officialSources, componentBrands) {
  const sources = validateOfficialSources(officialSources);
  const sourceBrand = brandForComponent(componentBrands, pair.source_component_id);
  const targetBrand = brandForComponent(componentBrands, pair.target_component_id);
  if (!sourceBrand || !targetBrand) return false;
  if (normalizeBrand(sourceBrand) !== normalizeBrand(entry?.brand)) return false;
  const allowedBrands = new Set([normalizeBrand(sourceBrand), normalizeBrand(targetBrand)]);
  try {
    const url = new URL(String(entry?.evidence_url ?? ''));
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLocaleLowerCase();
    return sources.some((candidate) => (candidate?.brands ?? []).some((brand) => allowedBrands.has(normalizeBrand(brand)))
      && (candidate.official_hosts ?? []).some((officialHost) => String(officialHost).toLocaleLowerCase() === host));
  } catch {
    return false;
  }
}

export function selectResolvedCompatibilityRun(run) {
  if (!Array.isArray(run?.entries) || run.entries.length === 0) throw new Error('compatibility run has no entries');
  const accepted = run.entries.filter((entry) => entry?.status === 'resolved' && Array.isArray(entry.pairs) && entry.pairs.length > 0);
  const rejectedByStatus = {};
  for (const entry of run.entries) {
    if (accepted.includes(entry)) continue;
    const status = String(entry?.status ?? 'unknown');
    rejectedByStatus[status] = (rejectedByStatus[status] ?? 0) + 1;
  }
  return {
    run: { ...run, entries: accepted },
    summary: {
      input: run.entries.length,
      accepted: accepted.length,
      rejected: run.entries.length - accepted.length,
      rejectedByStatus,
      pairs: accepted.reduce((sum, entry) => sum + entry.pairs.length, 0),
    },
  };
}

export function compileResolvedCompatibilityRun(run, { officialSources, componentBrands } = {}) {
  validateOfficialSources(officialSources);
  if (!componentBrands || (componentBrands instanceof Map ? componentBrands.size === 0 : Object.keys(componentBrands).length === 0)) {
    throw new Error('exact component brand mapping is required');
  }
  const selected = selectResolvedCompatibilityRun(run);
  if (selected.run.entries.length === 0) throw new Error('no resolved compatibility evidence entries');
  const rows = [];
  const seen = new Set();
  for (const entry of selected.run.entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(entry.checked_at ?? run.generated_at ?? '')) throw new Error(`resolved compatibility entry ${entry.component_id} has invalid evidence date`);
    for (const pair of entry.pairs) {
      const source = String(pair?.source_component_id ?? '').trim();
      const target = String(pair?.target_component_id ?? '').trim();
      const status = String(pair?.status ?? '').trim();
      if (!source || !target || source === target) throw new Error(`invalid compatibility pair for ${entry.component_id}`);
      if (!['compatible', 'conditional', 'incompatible'].includes(status)) throw new Error(`invalid compatibility status ${status}`);
      if (source !== entry.component_id) throw new Error(`compatibility source mismatch: ${source} != ${entry.component_id}`);
      if (!isOfficialCompatibilityEvidence(entry, { source_component_id: source, target_component_id: target }, officialSources, componentBrands)) {
        throw new Error(`non-official compatibility evidence for ${source} -> ${target}: ${entry.evidence_url ?? 'missing'}`);
      }
      const key = `${source}|${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(`(${[
        sqlString(source),
        sqlString(target),
        sqlString(status),
        sqlString(pair.rule_summary),
        sqlString(entry.evidence_url),
        sqlString(entry.checked_at ?? run.generated_at),
      ].join(', ')})`);
    }
  }
  if (rows.length === 0) throw new Error('resolved compatibility run produced no unique pairs');
  const sql = `begin;\n\ninsert into public.garage_compatibility\n  (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at)\nvalues\n${rows.join(',\n')}\non conflict (source_component_id, target_component_id) do update set\n  status = excluded.status,\n  rule_summary = excluded.rule_summary,\n  evidence_url = excluded.evidence_url,\n  evidence_checked_at = excluded.evidence_checked_at;\n\ncommit;\n`;
  return { sql, summary: { ...selected.summary, uniquePairs: rows.length } };
}
