const parserImport = "import { parseBikeCatalogModelUpdates } from './garage-model-update-parser.mjs';\n";

export function expandModelUpdateParsingSource(source) {
  let expanded = String(source ?? '');
  if (expanded.includes(parserImport.trim())) throw new Error('Garage model update parser already injected');

  const importBlock = expanded.match(/^(?:import .*;\n)+/);
  if (!importBlock) throw new Error('Garage model update import marker missing');
  expanded = expanded.slice(0, importBlock[0].length) + parserImport + expanded.slice(importBlock[0].length);

  const startMarker = "for (const match of sql.matchAll(/update\\s+public\\.bike_catalog_models\\s+set\\s+specs";
  const endMarker = "    if (update.checked) model.evidence_checked_at = update.checked;\n  }";
  const start = expanded.indexOf(startMarker);
  if (start < 0) throw new Error('Garage model update legacy marker missing');
  const endStart = expanded.indexOf(endMarker, start);
  if (endStart < 0) throw new Error('Garage model update legacy end marker missing');
  const end = endStart + endMarker.length;

  const replacement = `for (const parsedUpdate of parseBikeCatalogModelUpdates(sql)) {
    const model = modelsById.get(parsedUpdate.id);
    const update = {
      file,
      id: parsedUpdate.id,
      specs: parsedUpdate.patch,
      manufacturer: parsedUpdate.manufacturerUrl,
      checked: parsedUpdate.evidenceCheckedAt,
    };
    if (!model) { pendingSpecUpdates.push(update); continue; }
    model.specs = { ...(model.specs ?? {}), ...update.specs };
    if (update.manufacturer) model.manufacturer_url = update.manufacturer;
    if (update.checked) model.evidence_checked_at = update.checked;
  }`;

  return expanded.slice(0, start) + replacement + expanded.slice(end);
}
