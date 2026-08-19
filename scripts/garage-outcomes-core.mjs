import { isOfficialEvidenceUrl } from '../catalog-harvester/product-evidence-rules.mjs';

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
  const value = raw.trim();
  if (/^null$/i.test(value)) return null;
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  const string = value.match(/^'((?:[^']|'')*)'(?:\s*::[\w\s\[\]]+)?$/s);
  if (string) return string[1].replaceAll("''", "'");
  return value;
}

export function parseNoUpgradeOutcomeRows(sql, sourceFile = 'unknown.sql') {
  const pattern = /insert\s+into\s+public\.garage_recommendation_outcomes\s*\(([^)]*)\)\s*values\s*([\s\S]*?)(?=\s+on\s+conflict|\s*;)/gi;
  const rows = [];
  for (const match of sql.matchAll(pattern)) {
    const columns = splitTopLevel(match[1]).map((column) => column.trim());
    const tuples = splitTopLevel(match[2].replace(/^\s*--.*$/gm, ''));
    for (const tuple of tuples) {
      const body = tuple.trim().replace(/^\(/, '').replace(/\)$/, '');
      const values = splitTopLevel(body).map(parseSqlValue);
      if (columns.length !== values.length) {
        rows.push({
          sourceFile,
          parseError: `${columns.length} columns but ${values.length} values`,
          rawTuple: tuple.slice(0, 2000),
        });
        continue;
      }
      rows.push({ sourceFile, ...Object.fromEntries(columns.map((column, index) => [column, values[index]])) });
    }
  }
  return rows;
}

export function validateNoUpgradeOutcomeRows(rows) {
  const valid = [];
  const invalid = [];
  const seen = new Set();
  for (const row of rows) {
    const reasons = [];
    if (row.parseError) reasons.push(row.parseError);
    if (typeof row.bike_id !== 'string' || !row.bike_id.trim()) reasons.push('missing bike_id');
    if (typeof row.scope_key !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/u.test(row.scope_key)) reasons.push('invalid scope_key');
    if (row.outcome_type !== 'no_upgrade') reasons.push('unsupported outcome_type');
    if (typeof row.title !== 'string' || row.title.trim().length < 3 || row.title.trim().length > 160) reasons.push('invalid title');
    if (typeof row.notes !== 'string' || row.notes.trim().length < 20 || row.notes.trim().length > 1200) reasons.push('invalid notes');
    if (typeof row.evidence_url !== 'string' || !/^https:\/\//i.test(row.evidence_url)) reasons.push('evidence_url must be HTTPS');
    if (typeof row.evidence_checked_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(row.evidence_checked_at)) reasons.push('invalid evidence_checked_at');
    if (row.enabled !== undefined && row.enabled !== true) reasons.push('outcome is not enabled');
    const key = `${row.bike_id}|${row.scope_key}|${row.outcome_type}`;
    if (seen.has(key)) reasons.push('duplicate outcome identity');
    seen.add(key);
    (reasons.length ? invalid : valid).push(reasons.length ? { row, reasons } : row);
  }
  return { valid, invalid };
}

export function validateNoUpgradeOutcomeOfficialEvidence(rows, { queue, config } = {}) {
  if (!Array.isArray(queue?.entries) || !Array.isArray(config?.sources)) {
    throw new Error('queue and product evidence config are required for no-upgrade official evidence validation');
  }
  const bikesById = new Map(queue.entries.map((entry) => [entry.id, entry]));
  const valid = [];
  const invalid = [];
  for (const row of rows) {
    const reasons = [];
    const bike = bikesById.get(row?.bike_id);
    if (!bike) reasons.push(`unknown bike_id ${row?.bike_id ?? 'missing'}`);
    else if (!isOfficialEvidenceUrl(bike.brand, row?.evidence_url, config)) {
      reasons.push(`no_upgrade requires official manufacturer evidence for ${bike.brand}`);
    }
    (reasons.length ? invalid : valid).push(reasons.length ? { row, reasons } : row);
  }
  return { valid, invalid };
}

export function applyNoUpgradeOutcomesToQueue(queue, validRows) {
  const next = structuredClone(queue);
  const coveredBikeIds = new Set(validRows.map((row) => row.bike_id));
  const previousCohort = Array.isArray(next.work_cohorts?.recommendation_outcome)
    ? [...next.work_cohorts.recommendation_outcome]
    : [];
  let newlyCovered = 0;
  for (const entry of next.entries ?? []) {
    if (!coveredBikeIds.has(entry.id) || !Array.isArray(entry.gaps)) continue;
    if (!entry.gaps.includes('recommendation_outcome')) continue;
    entry.gaps = entry.gaps.filter((gap) => gap !== 'recommendation_outcome');
    newlyCovered += 1;
  }

  next.schema_version = Math.max(Number(next.schema_version) || 0, 3);
  next.current ??= {};
  next.required ??= {};
  next.shortfall ??= {};
  next.work_cohorts ??= {};
  const current = Number(next.current.recommendation_outcome) || 0;
  const required = Number(next.required.recommendation_outcome) || 0;
  next.current.recommendation_outcome = current + newlyCovered;
  next.shortfall.recommendation_outcome = Math.max(0, required - next.current.recommendation_outcome);

  const entriesById = new Map((next.entries ?? []).map((entry) => [entry.id, entry]));
  const eligible = (id) => {
    const entry = entriesById.get(id);
    return Boolean(entry && Array.isArray(entry.gaps) && entry.gaps.includes('recommendation_outcome'));
  };
  const cohort = previousCohort.filter(eligible);
  const cohortIds = new Set(cohort);
  for (const entry of next.entries ?? []) {
    if (cohort.length >= next.shortfall.recommendation_outcome) break;
    if (!eligible(entry.id) || cohortIds.has(entry.id)) continue;
    cohort.push(entry.id);
    cohortIds.add(entry.id);
  }
  next.work_cohorts.recommendation_outcome = cohort.slice(0, next.shortfall.recommendation_outcome);
  next.evidence_backed_no_upgrade_outcomes = {
    rows: validRows.length,
    bikes: coveredBikeIds.size,
    newly_covered_recommendation_outcomes: newlyCovered,
  };
  return next;
}
