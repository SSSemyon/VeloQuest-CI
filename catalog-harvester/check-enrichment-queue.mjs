import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyNoUpgradeOutcomesToQueue, parseNoUpgradeOutcomeRows, validateNoUpgradeOutcomeRows } from '../scripts/garage-outcomes-core.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, '..');
const rawQueue = JSON.parse(fs.readFileSync(path.join(root, 'enrichment-queue.json'), 'utf8'));
const schemaRoot = path.join(repoRoot, 'supabase', 'schema');
const outcomeRows = fs.readdirSync(schemaRoot)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .flatMap((file) => parseNoUpgradeOutcomeRows(fs.readFileSync(path.join(schemaRoot, file), 'utf8'), file));
const outcomeValidation = validateNoUpgradeOutcomeRows(outcomeRows);
assert.equal(outcomeValidation.invalid.length, 0, 'Garage no-upgrade outcomes must contain complete HTTPS/date/notes evidence');
const queue = applyNoUpgradeOutcomesToQueue(rawQueue, outcomeValidation.valid);

assert.equal(queue.schema_version, 3, 'unsupported effective enrichment queue schema');
assert.equal(queue.catalog_models, 718, 'queue must be generated from the release master catalog');
assert.match(queue.generated_from_evidence_through ?? '', /^\d{4}-\d{2}-\d{2}$/, 'queue provenance must be an evidence date, not a wall-clock timestamp');
assert.deepEqual(queue.targets, {
  photo_percent: 100,
  core_specs_percent: 100,
  exact_fitment_percent: 100,
  recommendation_outcome_percent: 100,
}, 'Maximum Garage targets must remain 100/100/100/100');

const targetByMetric = {
  photo: queue.targets.photo_percent,
  core_specs: queue.targets.core_specs_percent,
  exact_fitment: queue.targets.exact_fitment_percent,
  recommendation_outcome: queue.targets.recommendation_outcome_percent,
};
const gapByMetric = {
  photo: 'photo',
  core_specs: null,
  exact_fitment: 'exact_fitment',
  recommendation_outcome: 'recommendation_outcome',
};
const entriesById = new Map(queue.entries.map((entry) => [entry.id, entry]));
assert.equal(entriesById.size, queue.entries.length, 'duplicate queue entry IDs');

for (const [metric, targetPercent] of Object.entries(targetByMetric)) {
  const required = Math.ceil(queue.catalog_models * targetPercent / 100);
  const shortfall = Math.max(0, required - queue.current[metric]);
  assert.equal(queue.required[metric], required, `${metric}: wrong target count`);
  assert.equal(queue.shortfall[metric], shortfall, `${metric}: wrong shortfall`);
  const cohort = queue.work_cohorts[metric];
  assert.equal(cohort.length, shortfall, `${metric}: cohort must contain exactly the remaining target count`);
  assert.equal(new Set(cohort).size, cohort.length, `${metric}: duplicate IDs in work cohort`);
  for (const id of cohort) {
    const entry = entriesById.get(id);
    assert.ok(entry, `${metric}: ${id} is absent from queue entries`);
    if (gapByMetric[metric]) assert.ok(entry.gaps.includes(gapByMetric[metric]), `${metric}: ${id} does not have the required gap`);
    else assert.ok(['frame_material', 'wheel_size', 'drivetrain', 'brakes'].some((gap) => entry.gaps.includes(gap)), `core_specs: ${id} is already complete`);
  }
}

for (const entry of queue.entries) {
  assert.ok(['official_document', 'product_candidate', 'official_index_or_archive', 'official_page_unclassified'].includes(entry.evidence_scope), `${entry.id}: invalid evidence scope`);
  assert.ok(Number.isInteger(entry.existing_core_fields) && entry.existing_core_fields >= 0 && entry.existing_core_fields <= 4, `${entry.id}: invalid existing core field count`);
  assert.ok(Array.isArray(entry.gaps) && entry.gaps.length > 0, `${entry.id}: empty gaps`);
}

console.log(JSON.stringify({
  valid: true,
  schemaVersion: queue.schema_version,
  catalogModels: queue.catalog_models,
  queueEntries: queue.entries.length,
  noUpgradeOutcomeRows: outcomeValidation.valid.length,
  bikesWithNoUpgradeOutcome: queue.evidence_backed_no_upgrade_outcomes.bikes,
  targets: queue.targets,
  shortfall: queue.shortfall,
  cohortSizes: Object.fromEntries(Object.entries(queue.work_cohorts).map(([metric, ids]) => [metric, ids.length])),
}, null, 2));
