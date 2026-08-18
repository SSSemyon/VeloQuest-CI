import { isTrustedProductMediaUrl } from '../catalog-harvester/product-media-policy.mjs';

const normalizeBrand = (value) => String(value ?? '').trim().toLocaleLowerCase();

function parsedHttpsUrl(url) {
  try {
    const parsed = new URL(String(url ?? ''));
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function canonicalEvidenceUrl(url) {
  const parsed = parsedHttpsUrl(url);
  if (!parsed) return null;
  parsed.search = '';
  parsed.hash = '';
  const pathname = parsed.pathname.replace(/\/+$/u, '') || '/';
  return `${parsed.origin}${pathname}`;
}

function officialHosts(config, brand) {
  const source = (config?.sources ?? []).find((candidate) => normalizeBrand(candidate?.brand) === normalizeBrand(brand));
  return Array.isArray(source?.officialHosts) ? source.officialHosts.map((host) => String(host).toLocaleLowerCase()) : [];
}

function hostMatches(host, candidates) {
  return Boolean(host && candidates.some((candidate) => host === candidate || host.endsWith(`.${candidate}`)));
}

function evidenceRow(row, reason) {
  return {
    bikeId: row?.bike_id ?? null,
    imageUrl: row?.image_url ?? null,
    sourceType: row?.source_type ?? null,
    sourcePageUrl: row?.source_page_url ?? null,
    checkedAt: row?.checked_at ?? null,
    reason,
  };
}

export function auditGarageMediaEvidence({ images, modelsById, bikeConfig }) {
  if (!Array.isArray(images)) throw new Error('images[] is required');
  if (!(modelsById instanceof Map)) throw new Error('modelsById Map is required');
  if (!Array.isArray(bikeConfig?.sources)) throw new Error('bike official source config is required');

  const trustedImages = [];
  const unverified = [];
  const invalid = [];
  let ignoredDisabled = 0;
  for (const row of images) {
    const model = modelsById.get(row?.bike_id);
    if (!model) continue; // Missing bike references are reported by the parent Garage audit.
    if (row?.enabled === false) {
      ignoredDisabled += 1;
      continue;
    }
    if (row?.source_type !== 'manufacturer') {
      invalid.push(evidenceRow(row, 'trusted product photos require manufacturer source_type'));
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(row?.checked_at ?? ''))) {
      invalid.push(evidenceRow(row, 'invalid or missing media evidence date'));
      continue;
    }
    if (!isTrustedProductMediaUrl(row?.image_url)) {
      invalid.push(evidenceRow(row, 'generic or invalid product media asset'));
      continue;
    }
    const sourcePage = parsedHttpsUrl(row?.source_page_url);
    if (!sourcePage || !hostMatches(sourcePage.hostname.toLocaleLowerCase(), officialHosts(bikeConfig, model.brand))) {
      invalid.push(evidenceRow(row, 'media source page must be on the official bike manufacturer host'));
      continue;
    }
    const exactProductPage = canonicalEvidenceUrl(model.manufacturer_url);
    if (!exactProductPage || canonicalEvidenceUrl(row.source_page_url) !== exactProductPage) {
      invalid.push(evidenceRow(row, 'media source page must match exact product provenance'));
      continue;
    }
    if (canonicalEvidenceUrl(model?.specs?.product_evidence_url) !== exactProductPage) {
      unverified.push(evidenceRow(row, 'media requires identity-verified product evidence marker before it can close coverage'));
      continue;
    }
    trustedImages.push(row);
  }
  return { trustedImages, unverified, invalid, ignoredDisabled };
}
