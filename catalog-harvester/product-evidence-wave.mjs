import crypto from 'node:crypto';

const WAVE_PATTERN = /^catalog_enrichment_wave_(\d+)_.*\.sql$/u;

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function evidenceBatchDigest(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('accepted evidence entries are required');
  const canonical = entries
    .map((entry) => stableValue(entry))
    .sort((a, b) => String(a?.bike_id ?? '').localeCompare(String(b?.bike_id ?? ''))
      || String(a?.manufacturer_url ?? '').localeCompare(String(b?.manufacturer_url ?? ''))
      || String(a?.evidence_checked_at ?? '').localeCompare(String(b?.evidence_checked_at ?? '')));
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function nextEvidenceWaveFile({ existingFiles, evidenceCheckedAt }) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(evidenceCheckedAt ?? '')) {
    throw new Error('evidenceCheckedAt must be YYYY-MM-DD');
  }
  const highest = (existingFiles ?? []).reduce((max, file) => {
    const match = String(file).match(WAVE_PATTERN);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 23);
  const wave = highest + 1;
  return {
    wave,
    file: `catalog_enrichment_wave_${wave}_auto_official_evidence_${evidenceCheckedAt.replaceAll('-', '_')}.sql`,
  };
}
