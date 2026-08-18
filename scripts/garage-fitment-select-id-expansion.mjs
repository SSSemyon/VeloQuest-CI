const LEGACY_BLOCK = [
  '  for (const selected of parseBikeFitmentSelectRows(sql)) {',
  '    const bikeId = modelIdentity.get(identity(selected.identity));',
  '    if (!bikeId) throw new Error(`${file}: fitment SELECT identity is not present in catalog: ${identity(selected.identity)}`);',
  '    const row = { bike_id: bikeId, ...selected.row };',
  '    fitmentsByKey.set(`${row.bike_id}|${row.component_id}|${row.fitment_type}`, row);',
  '  }',
].join('\n');

const EXACT_ID_BLOCK = [
  '  for (const selected of parseBikeFitmentSelectRows(sql)) {',
  '    const bikeId = selected.bike_id ?? modelIdentity.get(identity(selected.identity));',
  '    const selector = selected.bike_id ?? identity(selected.identity);',
  '    if (!bikeId || !modelsById.has(bikeId)) throw new Error(`${file}: fitment SELECT bike selector is not present in catalog: ${selector}`);',
  '    const row = { bike_id: bikeId, ...selected.row };',
  '    fitmentsByKey.set(`${row.bike_id}|${row.component_id}|${row.fitment_type}`, row);',
  '  }',
].join('\n');

export function expandFitmentLiteralIdCoverageSource(source) {
  const value = String(source ?? '');
  if (value.includes(EXACT_ID_BLOCK)) return value;
  if (!value.includes(LEGACY_BLOCK)) throw new Error('Garage audit legacy fitment SELECT reconstruction block is missing');
  return value.replace(LEGACY_BLOCK, EXACT_ID_BLOCK);
}
