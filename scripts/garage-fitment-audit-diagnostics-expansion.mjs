export function expandFitmentEvidenceDiagnosticsSource(baseSource) {
  const legacyReport = [
    '    trustedFitments: trustedFitments.length,',
    '    trustedFactoryFitments: fitmentEvidenceAudit.trustedFactoryFitments.length,',
    '    invalidFitmentEvidence: fitmentEvidenceAudit.invalid,',
    '',
  ].join('\n');
  const report = [
    '    trustedFitments: trustedFitments.length,',
    '    trustedFactoryFitments: fitmentEvidenceAudit.trustedFactoryFitments.length,',
    '    unverifiedFitmentEvidence: fitmentEvidenceAudit.unverified,',
    '    invalidFitmentEvidence: fitmentEvidenceAudit.invalid,',
    '',
  ].join('\n');
  let source = baseSource;
  if (source.includes(legacyReport)) source = source.replace(legacyReport, report);
  else if (!source.includes(report.trim())) throw new Error('Garage audit fitment evidence report marker is missing');

  const oldFailure = "  result.compatibility.invalidFitmentEvidence.length > 0 && `${result.compatibility.invalidFitmentEvidence.length} untrusted fitment evidence row(s)`,\n";
  const failure = "  result.compatibility.invalidFitmentEvidence.length > 0 && `${result.compatibility.invalidFitmentEvidence.length} invalid fitment evidence row(s)`,\n";
  if (source.includes(oldFailure)) source = source.replace(oldFailure, failure);
  else if (!source.includes(failure.trim())) throw new Error('Garage audit fitment evidence failure marker is missing');

  return source;
}
