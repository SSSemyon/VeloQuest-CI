const ALLOWED_STATUSES = new Set(['compatible', 'conditional', 'incompatible']);

function blocksFor(sources, table) {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`insert\\s+into\\s+public\\.${escaped}\\b[\\s\\S]*?(?=\\non\\s+conflict\\b|;|$)`, 'gi');
  return sources.flatMap((source) => [...String(source).matchAll(pattern)].map((match) => match[0]));
}

function firstColumnIds(blocks) {
  const ids = new Set();
  for (const block of blocks) {
    for (const match of block.matchAll(/(?:^|\n)\s*\(\s*'([^']+)'\s*(?:,|\))/g)) ids.add(match[1]);
  }
  return ids;
}

function aliasRows(blocks) {
  const rows = [];
  for (const block of blocks) {
    for (const match of block.matchAll(/(?:^|\n)\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,/g)) {
      rows.push({ alias: match[1], canonical: match[2] });
    }
  }
  return rows;
}

function compatibilityRows(blocks) {
  const rows = [];
  for (const block of blocks) {
    for (const match of block.matchAll(/(?:^|\n)\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,/g)) {
      rows.push({ source: match[1], target: match[2], status: match[3] });
    }
  }
  return rows;
}

export function validateGarageAliasContracts(sources) {
  const failures = [];
  const components = firstColumnIds(blocksFor(sources, 'garage_components'));
  const aliases = aliasRows(blocksFor(sources, 'garage_component_aliases'));
  const compatibility = compatibilityRows(blocksFor(sources, 'garage_compatibility'));

  for (const row of aliases) {
    if (!components.has(row.alias)) failures.push(`missing alias component ${row.alias}`);
    if (!components.has(row.canonical)) failures.push(`missing canonical component ${row.canonical}`);
    if (row.alias === row.canonical) failures.push(`self alias is forbidden ${row.alias}`);
  }
  for (const row of compatibility) {
    if (!components.has(row.source)) failures.push(`missing compatibility source ${row.source}`);
    if (!components.has(row.target)) failures.push(`missing compatibility target ${row.target}`);
    if (!ALLOWED_STATUSES.has(row.status)) failures.push(`unsupported compatibility status ${row.status}`);
    if (row.source === row.target) failures.push(`self compatibility rule is forbidden ${row.source}`);
  }

  return [...new Set(failures)];
}
