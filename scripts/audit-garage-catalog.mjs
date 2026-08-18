import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { expandFitmentEvidenceDiagnosticsSource } from './garage-fitment-audit-diagnostics-expansion.mjs';
import { expandExactMediaProvenanceSource } from './garage-media-audit-expansion.mjs';
import { expandSpecEvidenceCoverageSource } from './garage-spec-audit-expansion.mjs';
import {
  discoverLateGarageWaves,
  enforceGarageFullCoverageSource,
  expandFitmentSelectCoverageSource,
  expandGarageAuditSource,
  expandRecommendationCoverageSource,
  expandTrustedFitmentCoverageSource,
  expandTrustedMediaCoverageSource,
} from './garage-audit-wave-discovery.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const schemaRoot = path.join(root, 'supabase', 'schema');
const basePath = path.join(scriptDir, 'audit-garage-catalog-base.mjs');
const tempPath = path.join(scriptDir, `.audit-garage-catalog-expanded-${process.pid}-${Date.now()}.mjs`);

const baseSource = fs.readFileSync(basePath, 'utf8');
const lateWaves = discoverLateGarageWaves(schemaRoot);
if (lateWaves.length === 0) throw new Error('Garage audit did not discover any enrichment wave >= 20');

const withLateWaves = expandGarageAuditSource(baseSource, lateWaves);
const withTrustedMediaCoverage = expandTrustedMediaCoverageSource(withLateWaves);
const withExactMediaProvenance = expandExactMediaProvenanceSource(withTrustedMediaCoverage);
const withTrustedSpecEvidence = expandSpecEvidenceCoverageSource(withExactMediaProvenance);
const withFitmentSelectCoverage = expandFitmentSelectCoverageSource(withTrustedSpecEvidence);
const withTrustedFitmentCoverage = expandTrustedFitmentCoverageSource(withFitmentSelectCoverage);
const withFitmentDiagnostics = expandFitmentEvidenceDiagnosticsSource(withTrustedFitmentCoverage);
const withRecommendationCoverage = expandRecommendationCoverageSource(withFitmentDiagnostics);
const expandedSource = enforceGarageFullCoverageSource(withRecommendationCoverage);
fs.writeFileSync(tempPath, expandedSource);

try {
  const result = spawnSync(process.execPath, [tempPath, ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.signal) {
    console.error(`Garage audit terminated by signal ${result.signal}`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
} finally {
  fs.rmSync(tempPath, { force: true });
}
