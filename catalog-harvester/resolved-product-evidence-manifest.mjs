export function buildResolvedProductEvidenceManifest(run) {
  if (!Array.isArray(run?.entries)) throw new Error('product URL resolution run must contain entries');
  const resolved = run.entries.filter((entry) => entry?.status === 'resolved');
  if (resolved.length > 100) throw new Error(`resolved product evidence manifest contains more than 100 entries: ${resolved.length}`);

  const seen = new Set();
  const entries = resolved.map((entry, index) => {
    const bike_id = String(entry?.bike_id ?? '').trim();
    const brand = String(entry?.brand ?? '').trim();
    const model = String(entry?.model ?? '').trim();
    const model_year = Number(entry?.model_year);
    const manufacturer_url = String(entry?.manufacturer_url ?? '').trim();
    if (!bike_id || !brand || !model || !manufacturer_url) {
      throw new Error(`resolved entry ${index}: bike_id/brand/model/manufacturer_url required`);
    }
    if (!Number.isInteger(model_year) || model_year < 2020 || model_year > 2026) {
      throw new Error(`resolved entry ${index}: model_year must be 2020-2026`);
    }
    if (seen.has(bike_id)) throw new Error(`resolved entry ${index}: duplicate bike_id ${bike_id}`);
    seen.add(bike_id);
    const modelYearEvidence = entry?.model_year_evidence && typeof entry.model_year_evidence === 'object'
      ? {
        source_url: String(entry.model_year_evidence.source_url ?? '').trim(),
        identity: String(entry.model_year_evidence.identity ?? '').trim(),
        evidence_scope: String(entry.model_year_evidence.evidence_scope ?? '').trim(),
      }
      : null;
    return {
      bike_id,
      brand,
      model,
      model_year,
      manufacturer_url,
      evidence_scope: 'resolved_product_candidate',
      ...(modelYearEvidence?.source_url && modelYearEvidence?.identity && modelYearEvidence?.evidence_scope
        ? { model_year_evidence: modelYearEvidence }
        : {}),
    };
  });

  return {
    schema_version: 1,
    generated_from_resolution_run: run.generated_at ?? null,
    batch_size: entries.length,
    entries,
  };
}
