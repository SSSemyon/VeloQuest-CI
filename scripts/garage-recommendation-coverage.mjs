const VERDICT_STATUSES = new Set(['compatible', 'conditional', 'incompatible']);

export function recommendationCoverage({ fitments, compatibility, aliases = [], activeModelIds }) {
  const activeFitments = fitments.filter((row) => activeModelIds.has(row.bike_id));
  const fitmentBikeIds = new Set(activeFitments.map((row) => row.bike_id));
  const approvedFitmentBikeIds = new Set(
    activeFitments.filter((row) => row.fitment_type === 'manufacturer_approved').map((row) => row.bike_id),
  );
  const canonicalByAlias = new Map(aliases.map((row) => [row.alias_component_id, row.canonical_component_id]));

  const outgoingVerdicts = new Map();
  for (const rule of compatibility.filter((row) => VERDICT_STATUSES.has(row.status))) {
    if (!outgoingVerdicts.has(rule.source_component_id)) outgoingVerdicts.set(rule.source_component_id, new Set());
    outgoingVerdicts.get(rule.source_component_id).add(rule.target_component_id);
  }

  const recommendationReadyBikeIds = new Set(approvedFitmentBikeIds);
  for (const bikeId of fitmentBikeIds) {
    const rawFactoryIds = activeFitments
      .filter((row) => row.bike_id === bikeId && row.fitment_type === 'factory_installed')
      .map((row) => row.component_id);
    const factoryIds = new Set(rawFactoryIds);
    for (const id of rawFactoryIds) {
      const canonicalId = canonicalByAlias.get(id);
      if (canonicalId) factoryIds.add(canonicalId);
    }
    const hasVerdict = [...factoryIds].some((sourceId) =>
      [...(outgoingVerdicts.get(sourceId) ?? [])].some((targetId) => !factoryIds.has(targetId)));
    if (hasVerdict) recommendationReadyBikeIds.add(bikeId);
  }

  return {
    fitmentBikeIds,
    approvedFitmentBikeIds,
    recommendationReadyBikeIds,
  };
}
