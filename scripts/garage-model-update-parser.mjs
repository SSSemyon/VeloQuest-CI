export function parseBikeCatalogModelUpdates(sql) {
  const rows = [];
  const pattern = /update\s+public\.bike_catalog_models\s+set\s+([\s\S]*?)\s+where\s+id\s*=\s*'((?:[^']|'')*)'\s*;/gi;

  for (const match of String(sql ?? '').matchAll(pattern)) {
    const setClause = match[1];
    const specsMatch = setClause.match(/specs\s*=\s*specs\s*\|\|\s*'((?:[^']|'')*)'::jsonb/i);
    if (!specsMatch) continue;

    const decodedSpecs = specsMatch[1].replaceAll("''", "'");
    let patch;
    try {
      patch = JSON.parse(decodedSpecs);
    } catch {
      throw new Error(`bike_catalog_models ${match[2]}: invalid specs JSON patch`);
    }

    const manufacturerMatch = setClause.match(/manufacturer_url\s*=\s*'((?:[^']|'')*)'/i);
    const checkedDirect = setClause.match(/evidence_checked_at\s*=\s*'((?:[^']|'')*)'/i);
    const checkedGreatest = setClause.match(/evidence_checked_at\s*=\s*greatest\(\s*evidence_checked_at\s*,\s*'((?:[^']|'')*)'\s*\)/i);

    rows.push({
      id: match[2].replaceAll("''", "'"),
      patch,
      manufacturerUrl: manufacturerMatch?.[1]?.replaceAll("''", "'") ?? null,
      evidenceCheckedAt: (checkedDirect?.[1] ?? checkedGreatest?.[1])?.replaceAll("''", "'") ?? null,
    });
  }

  return rows;
}
