import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { evaluateGarageMaximum } from './garage-maximum-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const queuePath = path.join(os.tmpdir(), `veloquest-garage-maximum-${process.pid}-${Date.now()}.json`);

const runNode = (args, label) => {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${label} failed${details ? `:\n${details}` : ''}`);
  }
  return result.stdout.trim();
};

try {
  const catalogStdout = runNode([
    path.join(root, 'scripts', 'audit-garage-catalog.mjs'),
    '--strict-core',
    `--write-enrichment-queue=${queuePath}`,
  ], 'Garage catalog audit');
  const catalogResult = JSON.parse(catalogStdout);

  runNode([
    path.join(root, 'scripts', 'apply-garage-outcomes-to-enrichment-queue.mjs'),
    queuePath,
  ], 'Garage no-upgrade outcome overlay');

  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const result = evaluateGarageMaximum(queue, catalogResult);
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
} finally {
  fs.rmSync(queuePath, { force: true });
}
