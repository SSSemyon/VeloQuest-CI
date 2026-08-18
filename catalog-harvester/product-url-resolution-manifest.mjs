import { attemptInfo } from './evidence-deferrals-core.mjs';
import { isOfficialEvidenceUrl } from './product-evidence-rules.mjs';

const EXTRACTABLE_GAPS = new Set([
  'photo',
  'frame_material',
  'wheel_size',
  'drivetrain',
  'brakes',
  'spec_evidence',
  'exact_fitment',
]);

export function buildProductUrlResolutionManifest({ queue, config, deferrals, limit = 100 }) {
  if (!Array.isArray(queue?.entries)) throw new Error('enrichment queue must contain entries');
  const configuredBatchSize = Math.max(1, Math.min(100, Number(config?.batchSize) || 100));
  const boundedLimit = Math.max(1, Math.min(configuredBatchSize, Number(limit) || configuredBatchSize));

  const candidates = queue.entries
    .filter((entry) => entry?.evidence_scope === 'official_index_or_archive')
    .filter((entry) => Array.isArray(entry.gaps) && entry.gaps.some((gap) => EXTRACTABLE_GAPS.has(gap)))
    .filter((entry) => isOfficialEvidenceUrl(entry.brand, entry.manufacturer_url, config))
    .filter((entry) => String(entry.model ?? '').trim() && Number.isInteger(Number(entry.model_year)))
    .map((entry) => ({
      entry,
      urlRetry: attemptInfo(deferrals, 'url_resolution', entry.id),
      productRetry: attemptInfo(deferrals, 'resolved_product_evidence', entry.id),
    }))
    .filter(({ urlRetry, productRetry }) => !urlRetry.manual_resolution_required && !productRetry.manual_resolution_required)
    .sort((a, b) => Math.max(a.urlRetry.attempts, a.productRetry.attempts) - Math.max(b.urlRetry.attempts, b.productRetry.attempts)
      || (Number(b.entry.priority_score) || 0) - (Number(a.entry.priority_score) || 0)
      || (Number(b.entry.model_year) || 0) - (Number(a.entry.model_year) || 0)
      || String(a.entry.id).localeCompare(String(b.entry.id)))
    .slice(0, boundedLimit);

  return {
    schema_version: 1,
    generated_from_queue_evidence_through: queue.generated_from_evidence_through ?? null,
    batch_size: boundedLimit,
    entries: candidates.map(({ entry, urlRetry, productRetry }) => ({
      bike_id: entry.id,
      brand: entry.brand,
      model: entry.model,
      model_year: Number(entry.model_year),
      source_url: entry.manufacturer_url,
      requested_gaps: entry.gaps.filter((gap) => EXTRACTABLE_GAPS.has(gap)),
      priority_score: Number(entry.priority_score) || 0,
      url_retry_attempts: urlRetry.attempts,
      resolved_product_retry_attempts: productRetry.attempts,
    })),
  };
}
