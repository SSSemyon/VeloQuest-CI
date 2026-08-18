const DEFAULT_MAX_AUTO_ATTEMPTS = 3;

const keyOf = (path, entityId) => `${path}|${entityId}`;

function normalizedState(previous) {
  const maxAutoAttempts = Math.max(1, Number(previous?.max_auto_attempts) || DEFAULT_MAX_AUTO_ATTEMPTS);
  const entries = Array.isArray(previous?.entries) ? previous.entries : [];
  return {
    schema_version: 1,
    max_auto_attempts: maxAutoAttempts,
    byKey: new Map(entries.map((entry) => [keyOf(entry.path, entry.bike_id), { ...entry }])),
  };
}

function applyRun(state, path, run, successStatuses, checkedAt) {
  if (!Array.isArray(run?.entries)) return;
  for (const result of run.entries) {
    const entityId = String(result?.bike_id ?? result?.component_id ?? '').trim();
    const status = String(result?.status ?? '').trim();
    if (!entityId || !status) continue;
    const key = keyOf(path, entityId);
    if (successStatuses.has(status)) {
      state.byKey.delete(key);
      continue;
    }
    const previous = state.byKey.get(key);
    const attempts = (Number(previous?.attempts) || 0) + 1;
    state.byKey.set(key, {
      path,
      bike_id: entityId,
      entity_type: result?.component_id ? 'component' : 'bike',
      attempts,
      manual_resolution_required: attempts >= state.max_auto_attempts,
      last_status: status,
      last_error: result?.error ? String(result.error) : null,
      last_checked_at: checkedAt,
    });
  }
}

export function updateEvidenceDeferrals({
  previous,
  checkedAt,
  productRun,
  urlResolutionRun,
  resolvedProductRun,
  compatibilityRun,
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(checkedAt ?? ''))) {
    throw new Error('checkedAt must be YYYY-MM-DD');
  }
  const state = normalizedState(previous);
  applyRun(state, 'product_evidence', productRun, new Set(['ok']), checkedAt);
  applyRun(state, 'url_resolution', urlResolutionRun, new Set(['resolved']), checkedAt);
  applyRun(state, 'resolved_product_evidence', resolvedProductRun, new Set(['ok']), checkedAt);
  applyRun(state, 'component_compatibility_discovery', compatibilityRun, new Set(['resolved']), checkedAt);
  return {
    schema_version: 1,
    max_auto_attempts: state.max_auto_attempts,
    entries: [...state.byKey.values()].sort((a, b) => a.path.localeCompare(b.path) || a.bike_id.localeCompare(b.bike_id)),
  };
}

export function attemptInfo(deferrals, path, entityId) {
  const maxAutoAttempts = Math.max(1, Number(deferrals?.max_auto_attempts) || DEFAULT_MAX_AUTO_ATTEMPTS);
  const entry = (deferrals?.entries ?? []).find((item) => item.path === path && item.bike_id === entityId);
  const attempts = Number(entry?.attempts) || 0;
  return {
    attempts,
    manual_resolution_required: Boolean(entry?.manual_resolution_required || attempts >= maxAutoAttempts),
    last_status: entry?.last_status ?? null,
    last_error: entry?.last_error ?? null,
    last_checked_at: entry?.last_checked_at ?? null,
  };
}
