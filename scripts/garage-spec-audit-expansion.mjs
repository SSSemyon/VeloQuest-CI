export function expandSpecEvidenceCoverageSource(baseSource) {
  const importMarker = "import { fileURLToPath } from 'node:url';\n";
  if (!baseSource.includes(importMarker)) throw new Error('Garage audit fileURLToPath import marker is missing');
  const importLine = "import { auditGarageSpecEvidence } from './garage-spec-evidence.mjs';\n";
  let source = baseSource.includes(importLine) ? baseSource : baseSource.replace(importMarker, `${importMarker}${importLine}`);

  const activeMarker = 'const activeModelIds = new Set(models.map((model) => model.id));\n';
  const auditBlock = [
    'const specEvidenceAudit = auditGarageSpecEvidence({ models, bikeConfig: harvesterConfig });',
    'const trustedFinderModelIds = specEvidenceAudit.trustedFinderModelIds;',
    '',
  ].join('\n');
  if (!source.includes(auditBlock.trim())) {
    if (!source.includes(activeMarker)) throw new Error('Garage audit active model marker is missing');
    source = source.replace(activeMarker, `${activeMarker}${auditBlock}`);
  }

  const legacyFinder = "    finderFilterComplete: { present: count((model) => Boolean(model.category) && hasAnySpec(model, ['frame_material']) && hasAnySpec(model, ['wheel_size']) && hasAnySpec(model, displayFields.drivetrain) && hasAnySpec(model, displayFields.brakes)), percent: percent(count((model) => Boolean(model.category) && hasAnySpec(model, ['frame_material']) && hasAnySpec(model, ['wheel_size']) && hasAnySpec(model, displayFields.drivetrain) && hasAnySpec(model, displayFields.brakes))) },";
  const trustedFinder = "    finderFilterComplete: { present: count((model) => trustedFinderModelIds.has(model.id)), percent: percent(count((model) => trustedFinderModelIds.has(model.id))) },";
  if (source.includes(legacyFinder)) source = source.replace(legacyFinder, trustedFinder);
  else if (!source.includes(trustedFinder)) throw new Error('Garage audit finder coverage marker is missing');

  const semanticMarker = '  semanticCoverage: {\n';
  const reportBlock = [
    '  specEvidence: {',
    '    trustedFinderModels: trustedFinderModelIds.size,',
    '    unverifiedSpecEvidence: specEvidenceAudit.unverified,',
    '    invalidSpecEvidence: specEvidenceAudit.invalid,',
    '  },',
    '',
  ].join('\n');
  const legacyReportBlock = [
    '  specEvidence: {',
    '    trustedFinderModels: trustedFinderModelIds.size,',
    '    invalidSpecEvidence: specEvidenceAudit.invalid,',
    '  },',
    '',
  ].join('\n');
  if (source.includes(legacyReportBlock)) source = source.replace(legacyReportBlock, reportBlock);
  else if (!source.includes(reportBlock.trim())) {
    if (!source.includes(semanticMarker)) throw new Error('Garage audit semantic coverage marker is missing');
    source = source.replace(semanticMarker, `${reportBlock}${semanticMarker}`);
  }

  const gapMarker = "    for (const [label, keys] of Object.entries(coreFields)) if (!hasAnySpec(model, keys)) gaps.push(label);\n";
  const categoryGap = "    if (!model.category) gaps.push('category');\n";
  const provenanceGap = "    if (Boolean(model.category) && !Object.values(coreFields).some((keys) => !hasAnySpec(model, keys)) && !trustedFinderModelIds.has(model.id)) gaps.push('spec_evidence');\n";
  if (!source.includes(categoryGap.trim()) || !source.includes(provenanceGap.trim())) {
    if (!source.includes(gapMarker)) throw new Error('Garage audit core gap marker is missing');
    source = source.replace(gapMarker, `${gapMarker}${categoryGap}${provenanceGap}`);
  }

  const legacyCandidates = "    const candidates = queue.filter((entry) => gap ? entry.gaps.includes(gap) : ['frame_material', 'wheel_size', 'drivetrain', 'brakes'].some((field) => entry.gaps.includes(field)));";
  const previousCandidates = "    const candidates = queue.filter((entry) => gap ? entry.gaps.includes(gap) : entry.gaps.includes('spec_evidence') || ['frame_material', 'wheel_size', 'drivetrain', 'brakes'].some((field) => entry.gaps.includes(field)));";
  const trustedCandidates = "    const candidates = queue.filter((entry) => gap ? entry.gaps.includes(gap) : entry.gaps.includes('category') || entry.gaps.includes('spec_evidence') || ['frame_material', 'wheel_size', 'drivetrain', 'brakes'].some((field) => entry.gaps.includes(field)));";
  if (source.includes(legacyCandidates)) source = source.replace(legacyCandidates, trustedCandidates);
  else if (source.includes(previousCandidates)) source = source.replace(previousCandidates, trustedCandidates);
  else if (!source.includes(trustedCandidates)) throw new Error('Garage audit core work cohort marker is missing');

  const failureMarker = "  result.masterCatalog.nonOfficialManufacturerUrls.length > 0 && `${result.masterCatalog.nonOfficialManufacturerUrls.length} manufacturer URLs outside the brand allow-list`,\n";
  const oldFailureLine = "  result.specEvidence.invalidSpecEvidence.length > 0 && `${result.specEvidence.invalidSpecEvidence.length} untrusted core spec evidence model(s)`,\n";
  const failureLine = "  result.specEvidence.invalidSpecEvidence.length > 0 && `${result.specEvidence.invalidSpecEvidence.length} invalid core spec evidence model(s)`,\n";
  if (source.includes(oldFailureLine)) source = source.replace(oldFailureLine, failureLine);
  else if (!source.includes(failureLine.trim())) {
    if (!source.includes(failureMarker)) throw new Error('Garage audit spec evidence failure marker is missing');
    source = source.replace(failureMarker, `${failureMarker}${failureLine}`);
  }

  return source;
}
