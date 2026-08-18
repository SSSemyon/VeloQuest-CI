import { collectGalleryMedia } from './product-gallery-media.mjs';
import { extractOpaqueOemComponents } from './opaque-oem-components.mjs';
import { parseProductEvidence } from './product-evidence-core.mjs';
import { verifyProductIdentity, verifyProductYearEvidence } from './product-evidence-identity.mjs';
import { isOfficialEvidenceUrl } from './product-evidence-rules.mjs';
import { selectTrustedProductMedia } from './product-media-policy.mjs';
import { extractKnownComponentsFromStructuredProperties } from './strong-list-known-components.mjs';
import { mergeSupplementalCanonical, parseStrongListCanonical } from './strong-list-product-specs.mjs';

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export function validateEvidenceManifest(manifest, config) {
  const entries = Array.isArray(manifest) ? manifest : manifest?.entries;
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('evidence manifest must contain entries');
  const seen = new Set();
  return entries.map((entry, index) => {
    const bike_id = String(entry?.bike_id ?? '').trim();
    const brand = String(entry?.brand ?? '').trim();
    const model = String(entry?.model ?? '').trim();
    const model_year = Number(entry?.model_year);
    const manufacturer_url = String(entry?.manufacturer_url ?? '').trim();
    const evidence_scope = String(entry?.evidence_scope ?? 'product_candidate').trim();
    if (!bike_id || !brand || !manufacturer_url) throw new Error(`manifest entry ${index}: bike_id/brand/manufacturer_url required`);
    if (!model) throw new Error(`manifest entry ${index}: model required`);
    if (!Number.isInteger(model_year) || model_year < 2020 || model_year > 2026) {
      throw new Error(`manifest entry ${index}: model_year must be 2020-2026`);
    }
    if (seen.has(bike_id)) throw new Error(`manifest entry ${index}: duplicate bike_id ${bike_id}`);
    seen.add(bike_id);
    if (!isOfficialEvidenceUrl(brand, manufacturer_url, config)) {
      throw new Error(`manifest entry ${index}: non-official manufacturer_url for ${brand}`);
    }

    let model_year_evidence;
    if (entry?.model_year_evidence !== undefined) {
      model_year_evidence = {
        source_url: String(entry?.model_year_evidence?.source_url ?? '').trim(),
        identity: String(entry?.model_year_evidence?.identity ?? '').trim(),
        evidence_scope: String(entry?.model_year_evidence?.evidence_scope ?? '').trim(),
      };
      if (!model_year_evidence.source_url || !model_year_evidence.identity || !model_year_evidence.evidence_scope) {
        throw new Error(`manifest entry ${index}: incomplete model_year_evidence`);
      }
      if (!isOfficialEvidenceUrl(brand, model_year_evidence.source_url, config)) {
        throw new Error(`manifest entry ${index}: non-official model_year_evidence source for ${brand}`);
      }
      const yearIdentity = verifyProductYearEvidence({ brand, model, model_year, manufacturer_url }, model_year_evidence);
      if (!yearIdentity.valid) {
        throw new Error(`manifest entry ${index}: invalid model_year_evidence: ${yearIdentity.reason}`);
      }
    }

    return {
      bike_id,
      brand,
      model,
      model_year,
      manufacturer_url,
      evidence_scope,
      ...(model_year_evidence ? { model_year_evidence } : {}),
    };
  });
}

function normalizedTimeout(value) {
  const timeout = Number(value ?? DEFAULT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 60_000) {
    throw new Error('requestTimeoutMs must be between 1 and 60000');
  }
  return Math.round(timeout);
}

function normalizedConcurrency(value) {
  const concurrency = Number(value ?? 1);
  if (!Number.isFinite(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error('maxConcurrentHosts must be between 1 and 16');
  }
  return Math.round(concurrency);
}

async function collectEntryEvidence({ entry, fetchImpl, evidenceCheckedAt, timeoutMs, config }) {
  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetchImpl(entry.manufacturer_url, {
      headers: {
        'user-agent': config?.userAgent ?? 'VeloQuestCatalogHarvester/1.0 (+catalog research; evidence-first)',
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (error) {
    return {
      ...entry,
      evidence_checked_at: evidenceCheckedAt,
      status: 'fetch_error',
      error: controller.signal.aborted
        ? `request timeout after ${timeoutMs}ms`
        : String(error?.message ?? error),
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!response?.ok) {
    return { ...entry, evidence_checked_at: evidenceCheckedAt, status: 'fetch_error', error: `HTTP ${response?.status ?? 'unknown'}` };
  }

  let html;
  try { html = await response.text(); }
  catch (error) {
    return { ...entry, evidence_checked_at: evidenceCheckedAt, status: 'fetch_error', error: `body read failed: ${String(error?.message ?? error)}` };
  }

  const evidence = parseProductEvidence({
    brand: entry.brand,
    sourcePageUrl: entry.manufacturer_url,
    html,
  });
  if (entry.model_year_evidence) evidence.model_year_evidence = entry.model_year_evidence;
  const supplemental = parseStrongListCanonical(html);
  mergeSupplementalCanonical(evidence, supplemental);
  evidence.properties ??= [];
  evidence.properties.push(...(supplemental.properties ?? []));
  evidence.components ??= {};
  const promoted = extractKnownComponentsFromStructuredProperties(supplemental.properties ?? []);
  for (const [key, component] of Object.entries(promoted)) {
    if (!evidence.components[key]) evidence.components[key] = component;
    else if (String(evidence.components[key].display_name) !== String(component.display_name)) {
      evidence.ambiguities ??= [];
      evidence.ambiguities.push({ field: `component:${key}`, values: [String(evidence.components[key].display_name), String(component.display_name)] });
    }
  }
  evidence.opaque_components = extractOpaqueOemComponents(evidence);
  const identity = verifyProductIdentity(entry, evidence);
  if (!identity.valid) {
    evidence.media = [];
    return {
      ...entry,
      evidence_checked_at: evidenceCheckedAt,
      status: 'identity_mismatch',
      error: identity.reason,
      evidence,
    };
  }

  evidence.media.push(...collectGalleryMedia({ html, baseUrl: entry.manufacturer_url }));
  evidence.media = selectTrustedProductMedia(evidence.media, { expectedModel: entry.model });

  const hasEvidence = evidence.media.length > 0
    || Object.keys(evidence.canonical).length > 0
    || Object.keys(evidence.components).length > 0
    || evidence.opaque_components.length > 0;
  const status = evidence.ambiguities.length > 0 ? 'ambiguous' : hasEvidence ? 'ok' : 'insufficient';
  return { ...entry, evidence_checked_at: evidenceCheckedAt, status, evidence };
}

export async function runEvidenceManifest({
  manifest,
  config,
  fetchImpl = globalThis.fetch,
  evidenceCheckedAt = new Date().toISOString().slice(0, 10),
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  maxConcurrentHosts = config?.maxConcurrentHosts ?? 1,
}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(evidenceCheckedAt)) throw new Error('evidenceCheckedAt must be YYYY-MM-DD');
  const timeoutMs = normalizedTimeout(requestTimeoutMs);
  const concurrency = normalizedConcurrency(maxConcurrentHosts);
  const entries = validateEvidenceManifest(manifest, config);
  const indexed = entries.map((entry, index) => ({ entry, index, host: new URL(entry.manufacturer_url).hostname }));
  const groupsByHost = new Map();
  for (const item of indexed) {
    if (!groupsByHost.has(item.host)) groupsByHost.set(item.host, []);
    groupsByHost.get(item.host).push(item);
  }
  const hostGroups = [...groupsByHost.entries()].map(([host, items]) => ({ host, items }));
  const results = new Array(entries.length);
  let nextGroup = 0;

  const worker = async () => {
    while (true) {
      const groupIndex = nextGroup;
      nextGroup += 1;
      if (groupIndex >= hostGroups.length) return;
      const group = hostGroups[groupIndex];
      for (const item of group.items) {
        results[item.index] = await collectEntryEvidence({
          entry: item.entry,
          fetchImpl,
          evidenceCheckedAt,
          timeoutMs,
          config,
        });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, hostGroups.length) }, () => worker()));

  const statuses = ['ok', 'ambiguous', 'insufficient', 'identity_mismatch', 'fetch_error'];
  return {
    schema_version: 1,
    generated_at: evidenceCheckedAt,
    entries: results,
    summary: Object.fromEntries(statuses.map((status) => [status, results.filter((entry) => entry.status === status).length])),
  };
}
