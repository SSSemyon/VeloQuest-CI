const normalizeBrand = (value) => String(value ?? '').trim().toLocaleLowerCase();

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';
const hasAnySpec = (model, keys) => keys.some((key) => hasValue(model?.specs?.[key]));

export function hasFinderCoreSpecs(model) {
  return Boolean(model?.category)
    && hasAnySpec(model, ['frame_material'])
    && hasAnySpec(model, ['wheel_size'])
    && hasAnySpec(model, ['drivetrain', 'groupset', 'drivetrain_brand'])
    && hasAnySpec(model, ['brakes', 'brake_type']);
}

function officialHosts(config, brand) {
  const source = (config?.sources ?? []).find((candidate) => normalizeBrand(candidate?.brand) === normalizeBrand(brand));
  return Array.isArray(source?.officialHosts) ? source.officialHosts.map((host) => String(host).toLocaleLowerCase()) : [];
}

function parsedHttpsUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function canonicalEvidenceUrl(value) {
  const url = parsedHttpsUrl(value);
  if (!url) return null;
  url.search = '';
  url.hash = '';
  const pathname = url.pathname.replace(/\/+$/u, '') || '/';
  return `${url.origin}${pathname}`;
}

function officialManufacturerUrl(model, config) {
  const url = parsedHttpsUrl(model?.manufacturer_url);
  if (!url) return false;
  const host = url.hostname.toLocaleLowerCase();
  return officialHosts(config, model?.brand).some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function auditGarageSpecEvidence({ models, bikeConfig }) {
  if (!Array.isArray(models)) throw new Error('models[] is required');
  if (!Array.isArray(bikeConfig?.sources)) throw new Error('bike official source config is required');

  const trustedFinderModelIds = new Set();
  const unverified = [];
  const invalid = [];
  for (const model of models) {
    if (!hasFinderCoreSpecs(model)) continue;
    if (!officialManufacturerUrl(model, bikeConfig)) {
      invalid.push({ id: model.id, reason: 'core specs require official manufacturer_url' });
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(model?.evidence_checked_at ?? ''))) {
      invalid.push({ id: model.id, reason: 'core specs require a valid evidence_checked_at date' });
      continue;
    }
    const exactProductPage = canonicalEvidenceUrl(model.manufacturer_url);
    if (!exactProductPage || canonicalEvidenceUrl(model?.specs?.product_evidence_url) !== exactProductPage) {
      unverified.push({ id: model.id, reason: 'core specs require identity-verified product evidence marker' });
      continue;
    }
    if (canonicalEvidenceUrl(model?.specs?.spec_evidence) !== exactProductPage) {
      unverified.push({ id: model.id, reason: 'core specs require URL-backed spec_evidence matching the exact product page' });
      continue;
    }
    trustedFinderModelIds.add(model.id);
  }
  return { trustedFinderModelIds, unverified, invalid };
}
