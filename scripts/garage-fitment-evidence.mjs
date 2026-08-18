const normalizeBrand = (value) => String(value ?? '').trim().toLocaleLowerCase();

function parsedHttpsUrl(url) {
  try {
    const parsed = new URL(String(url ?? ''));
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function hostFromHttps(url) {
  return parsedHttpsUrl(url)?.hostname.toLocaleLowerCase() ?? null;
}

function canonicalEvidenceUrl(url) {
  const parsed = parsedHttpsUrl(url);
  if (!parsed) return null;
  parsed.search = '';
  parsed.hash = '';
  const pathname = parsed.pathname.replace(/\/+$/u, '') || '/';
  return `${parsed.origin}${pathname}`;
}

function hostMatches(host, candidates) {
  return Boolean(host && candidates.some((candidate) => {
    const allowed = String(candidate ?? '').toLocaleLowerCase();
    return allowed && (host === allowed || host.endsWith(`.${allowed}`));
  }));
}

function bikeHosts(config, brand) {
  const normalized = normalizeBrand(brand);
  const source = (config?.sources ?? []).find((candidate) => normalizeBrand(candidate?.brand) === normalized);
  return Array.isArray(source?.officialHosts) ? source.officialHosts : [];
}

function componentHosts(registry, brand) {
  const normalized = normalizeBrand(brand);
  const source = (registry?.sources ?? []).find((candidate) =>
    (candidate?.brands ?? []).some((item) => normalizeBrand(item) === normalized));
  return Array.isArray(source?.official_hosts) ? source.official_hosts : [];
}

function evidenceRow(row, reason) {
  return {
    bikeId: row?.bike_id ?? null,
    componentId: row?.component_id ?? null,
    fitmentType: row?.fitment_type ?? null,
    evidenceUrl: row?.evidence_url ?? null,
    evidenceCheckedAt: row?.evidence_checked_at ?? null,
    reason,
  };
}

export function auditGarageFitmentEvidence({ fitments, modelsById, componentsById, bikeConfig, componentSources }) {
  if (!Array.isArray(fitments)) throw new Error('fitments[] is required');
  if (!(modelsById instanceof Map)) throw new Error('modelsById Map is required');
  if (!(componentsById instanceof Map)) throw new Error('componentsById Map is required');
  if (!Array.isArray(bikeConfig?.sources)) throw new Error('bike official source config is required');
  if (!Array.isArray(componentSources?.sources)) throw new Error('component official source registry is required');

  const trustedFitments = [];
  const trustedFactoryFitments = [];
  const unverified = [];
  const invalid = [];

  for (const row of fitments) {
    const model = modelsById.get(row?.bike_id);
    const component = componentsById.get(row?.component_id);
    if (!model || !component) continue; // Reference integrity is reported by the parent Garage audit.
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(row?.evidence_checked_at ?? ''))) {
      invalid.push(evidenceRow(row, 'invalid or missing evidence date'));
      continue;
    }
    const host = hostFromHttps(row?.evidence_url);
    if (!host) {
      invalid.push(evidenceRow(row, 'fitment evidence must be HTTPS'));
      continue;
    }

    const bikeOfficial = hostMatches(host, bikeHosts(bikeConfig, model.brand));
    const componentOfficial = hostMatches(host, componentHosts(componentSources, component.brand));
    if (row.fitment_type === 'factory_installed') {
      if (!bikeOfficial) {
        invalid.push(evidenceRow(row, 'factory installation requires official bike manufacturer evidence'));
        continue;
      }
      const evidenceUrl = canonicalEvidenceUrl(row.evidence_url);
      const exactProductPage = canonicalEvidenceUrl(model.manufacturer_url);
      if (!evidenceUrl || !exactProductPage || evidenceUrl !== exactProductPage) {
        invalid.push(evidenceRow(row, 'factory installation evidence must match exact product provenance'));
        continue;
      }
      if (canonicalEvidenceUrl(model?.specs?.product_evidence_url) !== exactProductPage) {
        unverified.push(evidenceRow(row, 'factory fitment requires identity-verified product evidence marker before it can close coverage'));
        continue;
      }
      trustedFitments.push(row);
      trustedFactoryFitments.push(row);
      continue;
    }
    if (row.fitment_type === 'manufacturer_approved') {
      if (!bikeOfficial && !componentOfficial) {
        invalid.push(evidenceRow(row, 'manufacturer-approved fitment requires official bike or component manufacturer evidence'));
        continue;
      }
      trustedFitments.push(row);
      continue;
    }
    invalid.push(evidenceRow(row, `unsupported fitment type: ${row.fitment_type ?? 'missing'}`));
  }

  return { trustedFitments, trustedFactoryFitments, unverified, invalid };
}
