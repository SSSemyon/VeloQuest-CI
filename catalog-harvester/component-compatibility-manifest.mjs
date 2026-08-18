import { attemptInfo } from './evidence-deferrals-core.mjs';

const MAX_BATCH = 100;

function sourceForBrand(registry, brand) {
  const normalized = String(brand ?? '').trim().toLocaleLowerCase();
  return (registry?.sources ?? []).find((source) =>
    (source.brands ?? []).some((candidate) => String(candidate).toLocaleLowerCase() === normalized)
  ) ?? null;
}

export function buildComponentCompatibilityManifest({ demand, registry, deferrals, limit = MAX_BATCH }) {
  const componentDemands = Array.isArray(demand?.component_demands)
    ? demand.component_demands
    : Array.isArray(demand?.demand)
      ? demand.demand
      : null;
  if (!componentDemands) throw new Error('compatibility demand must contain component_demands[]');
  if (!Array.isArray(registry?.sources)) throw new Error('component compatibility registry must contain sources[]');
  const boundedLimit = Math.max(1, Math.min(MAX_BATCH, Number(limit) || MAX_BATCH));

  const supported = [];
  const unresolvedSources = [];

  for (const item of componentDemands) {
    const componentId = String(item?.component_id ?? '').trim();
    const brand = String(item?.brand ?? '').trim();
    const model = String(item?.model ?? '').trim();
    if (!componentId) continue;
    const retry = attemptInfo(deferrals, 'component_compatibility_discovery', componentId);
    const source = sourceForBrand(registry, brand);
    const row = {
      component_id: componentId,
      brand: brand || null,
      model: model || null,
      category: item?.category ?? null,
      impact_bikes: Number(item?.impact_bikes) || 0,
      bike_ids: Array.isArray(item?.bike_ids) ? [...item.bike_ids].sort() : [],
      exact_component_ids: Array.isArray(item?.exact_component_ids) ? [...item.exact_component_ids].sort() : [],
      retry_attempts: retry.attempts,
      manual_resolution_required: retry.manual_resolution_required,
    };
    if (!source) {
      unresolvedSources.push({ ...row, reason: 'official compatibility source not registered' });
      continue;
    }
    if (retry.manual_resolution_required) {
      unresolvedSources.push({ ...row, reason: 'automatic compatibility source discovery exhausted' });
      continue;
    }
    supported.push({
      ...row,
      source_strategy: source.strategy,
      index_url: source.index_url,
      service_search_url: source.service_search_url ?? null,
      official_hosts: [...(source.official_hosts ?? [])],
    });
  }

  supported.sort((a, b) => a.retry_attempts - b.retry_attempts
    || b.impact_bikes - a.impact_bikes
    || String(a.brand ?? '').localeCompare(String(b.brand ?? ''))
    || a.component_id.localeCompare(b.component_id));
  unresolvedSources.sort((a, b) => b.impact_bikes - a.impact_bikes || a.component_id.localeCompare(b.component_id));

  return {
    schema_version: 1,
    target_percent: 100,
    active_bikes: Number(demand.active_bikes ?? demand.recommendation_gap_bikes_input) || 0,
    covered_bikes: Number(demand.covered_bikes) || 0,
    uncovered_bikes: Number(demand.uncovered_bikes) || 0,
    batch_size: Math.min(boundedLimit, supported.length),
    entries: supported.slice(0, boundedLimit),
    unresolved_sources: unresolvedSources,
  };
}
