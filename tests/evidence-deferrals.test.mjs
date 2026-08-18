import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attemptInfo,
  updateEvidenceDeferrals,
} from '../catalog-harvester/evidence-deferrals-core.mjs';

const empty = { schema_version: 1, max_auto_attempts: 3, entries: [] };

test('failed product evidence increments attempts and successful retry clears the deferral', () => {
  const failed = updateEvidenceDeferrals({
    previous: empty,
    checkedAt: '2026-08-17',
    productRun: {
      entries: [{ bike_id: 'bike-a', status: 'identity_mismatch', error: 'wrong model' }],
    },
  });
  assert.equal(attemptInfo(failed, 'product_evidence', 'bike-a').attempts, 1);
  assert.equal(attemptInfo(failed, 'product_evidence', 'bike-a').manual_resolution_required, false);

  const succeeded = updateEvidenceDeferrals({
    previous: failed,
    checkedAt: '2026-08-17',
    productRun: { entries: [{ bike_id: 'bike-a', status: 'ok' }] },
  });
  assert.equal(attemptInfo(succeeded, 'product_evidence', 'bike-a').attempts, 0);
});

test('three automatic failures mark a gap for manual resolution without pretending it is covered', () => {
  let state = empty;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    state = updateEvidenceDeferrals({
      previous: state,
      checkedAt: '2026-08-17',
      productRun: { entries: [{ bike_id: 'bike-a', status: 'fetch_error', error: 'HTTP 403' }] },
    });
  }
  const info = attemptInfo(state, 'product_evidence', 'bike-a');
  assert.equal(info.attempts, 3);
  assert.equal(info.manual_resolution_required, true);
  assert.equal(info.last_status, 'fetch_error');
  assert.match(info.last_error, /403/);
});

test('archive resolution and resolved product evidence use independent retry paths', () => {
  const state = updateEvidenceDeferrals({
    previous: empty,
    checkedAt: '2026-08-17',
    urlResolutionRun: { entries: [{ bike_id: 'bike-a', status: 'no_match' }] },
    resolvedProductRun: { entries: [{ bike_id: 'bike-b', status: 'ambiguous', error: 'conflicting specs' }] },
  });
  assert.equal(attemptInfo(state, 'url_resolution', 'bike-a').attempts, 1);
  assert.equal(attemptInfo(state, 'resolved_product_evidence', 'bike-b').attempts, 1);
  assert.equal(attemptInfo(state, 'product_evidence', 'bike-a').attempts, 0);
});

test('resolved archive URL clears URL-resolution failures', () => {
  const failed = updateEvidenceDeferrals({
    previous: empty,
    checkedAt: '2026-08-17',
    urlResolutionRun: { entries: [{ bike_id: 'bike-a', status: 'fetch_error', error: 'HTTP 429' }] },
  });
  const resolved = updateEvidenceDeferrals({
    previous: failed,
    checkedAt: '2026-08-17',
    urlResolutionRun: { entries: [{ bike_id: 'bike-a', status: 'resolved' }] },
  });
  assert.equal(attemptInfo(resolved, 'url_resolution', 'bike-a').attempts, 0);
});

test('component compatibility failures use component ids and clear only on resolved evidence', () => {
  const failed = updateEvidenceDeferrals({
    previous: empty,
    checkedAt: '2026-08-17',
    compatibilityRun: {
      generated_at: '2026-08-17',
      entries: [{ component_id: 'shimano-rd-r7150', status: 'no_exact_pairs', error: 'target missing' }],
    },
  });
  assert.equal(attemptInfo(failed, 'component_compatibility_discovery', 'shimano-rd-r7150').attempts, 1);
  const raw = failed.entries.find((entry) => entry.path === 'component_compatibility_discovery');
  assert.equal(raw.entity_type, 'component');

  const succeeded = updateEvidenceDeferrals({
    previous: failed,
    checkedAt: '2026-08-17',
    compatibilityRun: {
      generated_at: '2026-08-17',
      entries: [{ component_id: 'shimano-rd-r7150', status: 'resolved', pairs: [{}] }],
    },
  });
  assert.equal(attemptInfo(succeeded, 'component_compatibility_discovery', 'shimano-rd-r7150').attempts, 0);
});
