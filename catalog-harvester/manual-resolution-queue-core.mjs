export function buildManualResolutionQueue({ enrichmentQueue, deferrals, compatibilityManifest }) {
  const entriesByBike = new Map((enrichmentQueue?.entries ?? []).map((entry) => [entry.id, entry]));
  const productByBike = new Map();

  const productEntry = (bikeId, queueEntry) => ({
    kind: 'bike_evidence',
    bike_id: bikeId,
    brand: queueEntry?.brand ?? null,
    model: queueEntry?.model ?? null,
    model_year: queueEntry?.model_year ?? null,
    manufacturer_url: queueEntry?.manufacturer_url ?? null,
    gaps: Array.isArray(queueEntry?.gaps) ? [...queueEntry.gaps].sort() : [],
    exhausted_paths: [],
  });

  for (const item of deferrals?.entries ?? []) {
    if (!item?.manual_resolution_required) continue;
    if (!['product_evidence', 'url_resolution', 'resolved_product_evidence'].includes(item.path)) continue;
    const bikeId = String(item.bike_id ?? '').trim();
    if (!bikeId) continue;
    const queueEntry = entriesByBike.get(bikeId);
    const current = productByBike.get(bikeId) ?? productEntry(bikeId, queueEntry);
    current.exhausted_paths.push({
      path: item.path,
      attempts: Number(item.attempts) || 0,
      last_status: item.last_status ?? null,
      last_error: item.last_error ?? null,
      last_checked_at: item.last_checked_at ?? null,
    });
    productByBike.set(bikeId, current);
  }

  for (const queueEntry of enrichmentQueue?.entries ?? []) {
    if (!Array.isArray(queueEntry?.gaps) || !queueEntry.gaps.includes('category')) continue;
    const bikeId = String(queueEntry.id ?? '').trim();
    if (!bikeId) continue;
    const current = productByBike.get(bikeId) ?? productEntry(bikeId, queueEntry);
    if (!current.exhausted_paths.some((item) => item.path === 'manual_category_classification')) {
      current.exhausted_paths.push({
        path: 'manual_category_classification',
        attempts: 0,
        last_status: 'manual_resolution_required',
        last_error: null,
        last_checked_at: null,
      });
    }
    productByBike.set(bikeId, current);
  }

  const compatibility = (compatibilityManifest?.unresolved_sources ?? []).map((item) => ({
    kind: 'compatibility_source',
    component_id: item.component_id,
    brand: item.brand ?? null,
    model: item.model ?? null,
    category: item.category ?? null,
    impact_bikes: Number(item.impact_bikes) || 0,
    bike_ids: Array.isArray(item.bike_ids) ? [...item.bike_ids].sort() : [],
    reason: item.reason ?? 'compatibility source unresolved',
    retry_attempts: Number(item.retry_attempts) || 0,
  }));

  const bikeEvidence = [...productByBike.values()]
    .map((item) => ({ ...item, exhausted_paths: item.exhausted_paths.sort((a, b) => a.path.localeCompare(b.path)) }))
    .sort((a, b) => b.gaps.length - a.gaps.length || a.bike_id.localeCompare(b.bike_id));
  compatibility.sort((a, b) => b.impact_bikes - a.impact_bikes || String(a.component_id).localeCompare(String(b.component_id)));

  const blockedBikeIds = new Set(bikeEvidence.map((item) => item.bike_id));
  for (const item of compatibility) for (const bikeId of item.bike_ids) blockedBikeIds.add(bikeId);

  return {
    schema_version: 1,
    target_percent: 100,
    catalog_models: Number(enrichmentQueue?.catalog_models) || 0,
    unresolved_bikes: blockedBikeIds.size,
    bike_evidence: bikeEvidence,
    compatibility_sources: compatibility,
  };
}
