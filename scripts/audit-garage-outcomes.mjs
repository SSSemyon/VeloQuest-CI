import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseNoUpgradeOutcomeRows,
  validateNoUpgradeOutcomeOfficialEvidence,
  validateNoUpgradeOutcomeRows,
} from './garage-outcomes-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaRoot = path.join(root, 'supabase', 'schema');
const queue = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'enrichment-queue.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'config.json'), 'utf8'));
const rows = fs.readdirSync(schemaRoot)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .flatMap((file) => parseNoUpgradeOutcomeRows(fs.readFileSync(path.join(schemaRoot, file), 'utf8'), file));
const structural = validateNoUpgradeOutcomeRows(rows);
const official = validateNoUpgradeOutcomeOfficialEvidence(structural.valid, { queue, config });
const invalidNoUpgradeOutcomes = [...structural.invalid, ...official.invalid];
const noUpgradeOutcomeBikeIds = new Set(official.valid.map((row) => row.bike_id));
const result = {
  rows: rows.length,
  structurallyValidRows: structural.valid.length,
  validRows: official.valid.length,
  bikesWithNoUpgradeOutcome: noUpgradeOutcomeBikeIds.size,
  noUpgradeOutcomeBikeIds: [...noUpgradeOutcomeBikeIds].sort(),
  invalidNoUpgradeOutcomes,
};

console.log(JSON.stringify(result, null, 2));
if (invalidNoUpgradeOutcomes.length) {
  throw new Error(`Invalid Garage recommendation outcomes: ${invalidNoUpgradeOutcomes.length}`);
}
