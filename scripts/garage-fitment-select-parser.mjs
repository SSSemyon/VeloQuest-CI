function splitTopLevel(value, delimiter = ',') {
  const parts = [];
  let current = '';
  let depth = 0;
  let quoted = false;
  for (let index = 0; index < String(value ?? '').length; index += 1) {
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
  const string = value.match(/^'((?:[^']|'')*)'(?:\s*::[\w\s\[\]]+)?$/su);
  if (string) return string[1].replaceAll("''", "'");
  return value;
}

function whereValue(whereClause, column, numeric = false) {
  const pattern = numeric
    ? new RegExp(`\\bm\\.${column}\\s*=\\s*(\\d+)\\b`, 'iu')
    : new RegExp(`\\bm\\.${column}\\s*=\\s*'((?:[^']|'')*)'`, 'iu');
  const match = String(whereClause ?? '').match(pattern);
  if (!match) return undefined;
  return numeric ? Number(match[1]) : match[1].replaceAll("''", "'");
}

export function parseBikeFitmentSelectRows(sql) {
  const rows = [];
  const pattern = /insert\s+into\s+public\.bike_catalog_component_fitments\s*\(([^)]*)\)\s*select\s+([\s\S]*?)\s+from\s+public\.bike_catalog_models\s+m\s+where\s+([\s\S]*?)(?=\s+on\s+conflict|\s*;)/giu;
  for (const match of String(sql ?? '').matchAll(pattern)) {
    const columns = splitTopLevel(match[1]).map((column) => column.trim());
    const values = splitTopLevel(match[2]);
    if (columns.length !== values.length) throw new Error(`bike_catalog_component_fitments SELECT: ${columns.length} columns but ${values.length} expressions`);
    const bikeIndex = columns.indexOf('bike_id');
    if (bikeIndex < 0 || !/^m\.id$/iu.test(values[bikeIndex].trim())) {
      throw new Error('bike_catalog_component_fitments SELECT must bind bike_id from m.id');
    }
    const identity = {
      brand: whereValue(match[3], 'brand'),
      model: whereValue(match[3], 'model'),
      model_year: whereValue(match[3], 'model_year', true),
      trim: whereValue(match[3], 'trim') ?? '',
      market: whereValue(match[3], 'market') ?? 'global',
    };
    if (!identity.brand || !identity.model || !Number.isInteger(identity.model_year)) {
      throw new Error(`bike_catalog_component_fitments SELECT must constrain exact brand/model/model_year: ${match[3].trim()}`);
    }
    const row = {};
    for (let index = 0; index < columns.length; index += 1) {
      if (index === bikeIndex) continue;
      const parsed = parseSqlValue(values[index]);
      if (typeof parsed === 'string' && /^(?:m\.|select\b|case\b)/iu.test(parsed)) {
        throw new Error(`unsupported fitment SELECT expression for ${columns[index]}: ${values[index]}`);
      }
      row[columns[index]] = parsed;
    }
    rows.push({ identity, row });
  }
  return rows;
}
