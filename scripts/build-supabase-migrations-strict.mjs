import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.join(scriptsDir, 'build-supabase-migrations.mjs');
const tempPath = path.join(scriptsDir, '.build-supabase-migrations-strict.generated.mjs');
const marker = "...lateGarageWaves.map(({ wave, file }) => [garageWaveMigrationName(wave), emitGroup([file])]),";
const replacement = "...lateGarageWaves.map(({ wave, file }) => [garageWaveMigrationName(wave), wave >= 51 ? fs.readFileSync(path.join(schemaRoot, file), 'utf8') : emitGroup([file])]),";

const source = fs.readFileSync(basePath, 'utf8');
const occurrences = source.split(marker).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected exactly one late Garage migration generation marker, found ${occurrences}. Refuse to patch migration builder implicitly.`);
}

const transformed = source.replace(marker, replacement);
fs.writeFileSync(tempPath, transformed);
try {
  const child = spawnSync(process.execPath, [tempPath, ...process.argv.slice(2)], {
    cwd: path.resolve(scriptsDir, '..'),
    stdio: 'inherit',
  });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
} finally {
  fs.rmSync(tempPath, { force: true });
}
