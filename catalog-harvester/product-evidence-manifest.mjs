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

const EXTRACTABLE_SCOPES = new Set([
  'product_candidate',
  'official_page_unclassified',
]);

export function buildProductEvidenceManifest({ queue, config, deferrals, limit = 100 }) {
  if (!Array.isArray(queue?.entries)) throw new Error('enrichment queue must contain entries');
  const configuredBatchSize = Math.max(1, Math.min(100, Number(config?.batchSize) || 100));
  const boundedLimit = Math.max(1, Math.min(configuredBatchSize, Number(limit) || configuredBatchSize));

  const candidates = queue.entries
    .filter((entry) => EXTRACTABLE_SCOPES.has(entry?.evidence_scope))
    .filter((entry) => Array.isArray(entry.gaps) && entry.gaps.some((gap) => EXTRACTABLE_GAPS.has(gap)))
    .filter((entry) => isOfficialEvidenceUrl(entry.brand, entry.manufacturer_url, config))
    .filter((entry) => String(entry.model ?? '').trim() && Number.isInteger(Number(entry.model_year)))
    .map((entry) => ({ entry, retry: attemptInfo(deferrals, 'product_evidence', entry.id) }))
    .filter(({ retry }) => !retry.manual_resolution_required)
    .sort((a, b) => a.retry.attempts - b.retry.attempts
      || (Number(b.entry.priority_score) || 0) - (Number(a.entry.priority_score) || 0)
      || (Number(b.entry.model_year) || 0) - (Number(a.entry.model_year) || 0)
      || String(a.entry.id).localeCompare(String(b.entry.id)))
    .slice(0, boundedLimit);

  return {
    schema_version: 1,
    generated_from_queue_evidence_through: queue.generated_from_evidence_through ?? null,
    batch_size: boundedLimit,
    entries: candidates.map(({ entry, retry }) => ({
      bike_id: entry.id,
      brand: entry.brand,
      model: entry.model,
      model_year: Number(entry.model_year),
      manufacturer_url: entry.manufacturer_url,
      evidence_scope: entry.evidence_scope,
      requested_gaps: entry.gaps.filter((gap) => EXTRACTABLE_GAPS.has(gap)),
      priority_score: Number(entry.priority_score) || 0,
      retry_attempts: retry.attempts,
    })),
  };
}
