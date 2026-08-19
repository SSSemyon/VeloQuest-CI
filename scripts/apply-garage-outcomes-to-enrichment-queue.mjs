import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyNoUpgradeOutcomesToQueue,
  parseNoUpgradeOutcomeRows,
  validateNoUpgradeOutcomeOfficialEvidence,
  validateNoUpgradeOutcomeRows,
} from './garage-outcomes-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const queuePath = path.resolve(root, process.argv[2] ?? 'catalog-harvester/enrichment-queue.json');
const schemaRoot = path.join(root, 'supabase', 'schema');
const diagnosticsPath = path.join(root, '.github', 'garage-invalid-outcomes.json');
if (!fs.existsSync(queuePath)) throw new Error(`Enrichment queue not found: ${queuePath}`);

const rows = fs.readdirSync(schemaRoot)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .flatMap((file) => parseNoUpgradeOutcomeRows(fs.readFileSync(path.join(schemaRoot, file), 'utf8'), file));
const structural = validateNoUpgradeOutcomeRows(rows);
if (structural.invalid.length) {
  const diagnostics = {
    kind: 'structural',
    count: structural.invalid.length,
    invalid: structural.invalid,
  };
  fs.mkdirSync(path.dirname(diagnosticsPath), { recursive: true });
  fs.writeFileSync(diagnosticsPath, `${JSON.stringify(diagnostics, null, 2)}\n`);
  console.error('Structurally invalid Garage recommendation outcomes:');
  console.error(JSON.stringify(structural.invalid, null, 2));
  throw new Error(`Refusing to apply ${structural.invalid.length} structurally invalid Garage recommendation outcomes`);
}

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(root, 'catalog-harvester', 'config.json'), 'utf8'));
const official = validateNoUpgradeOutcomeOfficialEvidence(structural.valid, { queue, config });
if (official.invalid.length) {
  const diagnostics = {
    kind: 'official_evidence',
    count: official.invalid.length,
    invalid: official.invalid,
  };
  fs.mkdirSync(path.dirname(diagnosticsPath), { recursive: true });
  fs.writeFileSync(diagnosticsPath, `${JSON.stringify(diagnostics, null, 2)}\n`);
  console.error('Garage recommendation outcomes without official bike-manufacturer evidence:');
  console.error(JSON.stringify(official.invalid, null, 2));
  throw new Error(`Refusing to apply ${official.invalid.length} Garage recommendation outcomes without official bike-manufacturer evidence`);
}

if (fs.existsSync(diagnosticsPath)) fs.rmSync(diagnosticsPath);
const next = applyNoUpgradeOutcomesToQueue(queue, official.valid);
fs.writeFileSync(queuePath, `${JSON.stringify(next, null, 2)}\n`);
console.log(JSON.stringify({
  queue: path.relative(root, queuePath),
  validOutcomeRows: official.valid.length,
  bikesWithNoUpgradeOutcome: new Set(official.valid.map((row) => row.bike_id)).size,
  recommendationOutcomeCurrent: next.current?.recommendation_outcome ?? 0,
  recommendationOutcomeShortfall: next.shortfall?.recommendation_outcome ?? 0,
}, null, 2));
