import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditGarageCompatibilityEvidence } from './garage-compatibility-source-audit-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaRoot = path.join(root, 'supabase', 'schema');
const officialSources = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'component-compatibility-sources.json'), 'utf8'));

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
  if (/^null$/iu.test(value)) return null;
  if (/^(true|false)$/iu.test(value)) return value.toLocaleLowerCase() === 'true';
  if (/^-?\d+(?:\.\d+)?$/u.test(value)) return Number(value);
  const string = value.match(/^'((?:[^']|'')*)'(?:\s*::[\w\s\[\]]+)?$/su);
  return string ? string[1].replaceAll("''", "'") : value;
}

function parseValueInserts(sql, table, sourceFile) {
  const pattern = new RegExp(`insert\\s+into\\s+public\\.${table}\\s*\\(([^)]*)\\)\\s*values\\s*([\\s\\S]*?)(?=\\s+on\\s+conflict|\\s*;)`, 'giu');
  const rows = [];
  let statements = 0;
  for (const match of sql.matchAll(pattern)) {
    statements += 1;
    const columns = splitTopLevel(match[1]).map((column) => column.trim());
    const tuples = splitTopLevel(match[2].replace(/^\s*--.*$/gmu, ''));
    for (const tuple of tuples) {
      const body = tuple.trim().replace(/^\(/u, '').replace(/\)$/u, '');
      const values = splitTopLevel(body).map(parseSqlValue);
      if (columns.length !== values.length) throw new Error(`${sourceFile}: ${table}: ${columns.length} columns but ${values.length} values`);
      rows.push({ sourceFile, ...Object.fromEntries(columns.map((column, index) => [column, values[index]])) });
    }
  }
  const declaredStatements = (sql.match(new RegExp(`insert\\s+into\\s+public\\.${table}\\b`, 'giu')) ?? []).length;
  if (declaredStatements !== statements) {
    throw new Error(`${sourceFile}: ${table}: ${declaredStatements - statements} insert statement(s) are not VALUES inserts and cannot be source-audited`);
  }
  return rows;
}

const componentsById = new Map();
const compatibilityByKey = new Map();
for (const file of fs.readdirSync(schemaRoot).filter((name) => name.endsWith('.sql')).sort()) {
  const sql = fs.readFileSync(path.join(schemaRoot, file), 'utf8');
  if (/update\s+public\.garage_compatibility\b/iu.test(sql) || /delete\s+from\s+public\.garage_compatibility\b/iu.test(sql)) {
    throw new Error(`${file}: unsupported garage_compatibility UPDATE/DELETE mutation; source audit must model it explicitly before release`);
  }
  for (const row of parseValueInserts(sql, 'garage_components', file)) {
    if (!row.id || !row.brand) throw new Error(`${file}: garage_components row missing id/brand`);
    componentsById.set(row.id, { ...(componentsById.get(row.id) ?? {}), ...row });
  }
  for (const row of parseValueInserts(sql, 'garage_compatibility', file)) {
    const key = `${row.source_component_id}|${row.target_component_id}`;
    compatibilityByKey.set(key, row);
  }
}

const result = auditGarageCompatibilityEvidence({
  components: [...componentsById.values()],
  compatibility: [...compatibilityByKey.values()],
  officialSources,
});
console.log(JSON.stringify({
  components: componentsById.size,
  compatibilityRows: result.rows,
  validCompatibilityRows: result.validRows,
  invalidCompatibilityRows: result.invalid,
}, null, 2));
if (result.invalid.length > 0) throw new Error(`Invalid Garage compatibility evidence sources: ${result.invalid.length}`);
