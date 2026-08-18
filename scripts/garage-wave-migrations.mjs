import fs from 'node:fs';

const LATE_WAVE_PATTERN = /^catalog_enrichment_wave_(\d+)_.*\.sql$/;
const BASE_WAVE = 24;
const BASE_TIMESTAMP_MS = Date.UTC(2026, 7, 17, 15, 0, 0);
const WAVE_STEP_MS = 10 * 60 * 1000;

export function discoverLateGarageWaves(schemaRoot) {
  const waves = fs.readdirSync(schemaRoot)
    .flatMap((file) => {
      const match = file.match(LATE_WAVE_PATTERN);
      if (!match) return [];
      const wave = Number(match[1]);
      return wave >= BASE_WAVE ? [{ wave, file }] : [];
    })
    .sort((a, b) => a.wave - b.wave || a.file.localeCompare(b.file));

  for (let index = 1; index < waves.length; index += 1) {
    if (waves[index - 1].wave === waves[index].wave) {
      const wave = waves[index].wave;
      throw new Error(
        `Duplicate Garage wave ${wave}: ${waves[index - 1].file} and ${waves[index].file}. Each wave number must be unique.`,
      );
    }
  }

  return waves;
}

function compactUtcTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

export function garageWaveMigrationName(wave) {
  if (!Number.isInteger(wave) || wave < BASE_WAVE) throw new Error('Garage late migration naming starts at wave 24 or later.');
  const timestamp = new Date(BASE_TIMESTAMP_MS + (wave - BASE_WAVE) * WAVE_STEP_MS);
  return `${compactUtcTimestamp(timestamp)}_garage_enrichment_wave${wave}.sql`;
}
