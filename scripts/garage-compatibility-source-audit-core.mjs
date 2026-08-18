const normalizeBrand = (value) => String(value ?? '').toLocaleLowerCase().replace(/\s+/gu, '').trim();

function officialHostsForBrand(brand, officialSources) {
  const normalized = normalizeBrand(brand);
  const source = officialSources.sources.find((candidate) => (candidate?.brands ?? [])
    .some((candidateBrand) => normalizeBrand(candidateBrand) === normalized));
  return new Set((source?.official_hosts ?? []).map((host) => String(host).toLocaleLowerCase()));
}

function evidenceHost(url) {
  try {
    const parsed = new URL(String(url ?? ''));
    return parsed.protocol === 'https:' ? parsed.hostname.toLocaleLowerCase() : null;
  } catch {
    return null;
  }
}

export function auditGarageCompatibilityEvidence({ components = [], compatibility = [], officialSources } = {}) {
  if (!Array.isArray(officialSources?.sources) || officialSources.sources.length === 0) {
    throw new Error('official compatibility source registry is required');
  }
  const componentsById = new Map(components.map((component) => [component.id, component]));
  const invalid = [];
  let validRows = 0;

  for (const row of compatibility) {
    const reasons = [];
    const source = componentsById.get(row?.source_component_id);
    const target = componentsById.get(row?.target_component_id);
    if (!source) reasons.push(`unknown source component ${row?.source_component_id ?? 'missing'}`);
    if (!target) reasons.push(`unknown target component ${row?.target_component_id ?? 'missing'}`);
    if (row?.source_component_id && row?.source_component_id === row?.target_component_id) reasons.push('source and target components must differ');
    if (!['compatible', 'conditional', 'incompatible'].includes(String(row?.status ?? ''))) reasons.push(`unsupported compatibility status ${row?.status ?? 'missing'}`);

    const host = evidenceHost(row?.evidence_url);
    if (!host) reasons.push('compatibility evidence_url must be HTTPS');
    if (source && target && host) {
      const allowed = new Set([
        ...officialHostsForBrand(source.brand, officialSources),
        ...officialHostsForBrand(target.brand, officialSources),
      ]);
      if (!allowed.has(host)) reasons.push('compatibility requires official source or target manufacturer evidence');
    }

    if (reasons.length) invalid.push({ row, reasons });
    else validRows += 1;
  }

  return { rows: compatibility.length, validRows, invalid };
}
