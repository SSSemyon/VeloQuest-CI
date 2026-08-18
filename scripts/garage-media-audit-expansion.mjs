export function expandExactMediaProvenanceSource(baseSource) {
  const importMarker = "import { fileURLToPath } from 'node:url';\n";
  if (!baseSource.includes(importMarker)) throw new Error('Garage audit fileURLToPath import marker is missing');
  const importLine = "import { auditGarageMediaEvidence } from './garage-media-evidence.mjs';\n";
  let source = baseSource.includes(importLine) ? baseSource : baseSource.replace(importMarker, `${importMarker}${importLine}`);

  const legacyDefinitions = "const trustedImages = images.filter((row) => isTrustedProductMediaUrl(row.image_url));\nconst rejectedMediaEntries = images.filter((row) => !isTrustedProductMediaUrl(row.image_url));\n";
  const exactDefinitions = "const mediaEvidenceAudit = auditGarageMediaEvidence({ images, modelsById, bikeConfig: harvesterConfig });\nconst trustedImages = mediaEvidenceAudit.trustedImages;\nconst rejectedMediaEntries = mediaEvidenceAudit.invalid;\n";
  if (source.includes(legacyDefinitions)) source = source.replace(legacyDefinitions, exactDefinitions);
  else if (!source.includes(exactDefinitions)) throw new Error('Garage audit trusted media definitions marker is missing');

  const legacyReport = "    rejectedUntrustedAssets: rejectedMediaEntries.length,\n    rejectedUntrustedEntries: rejectedMediaEntries.map((row) => ({ bikeId: row.bike_id, imageUrl: row.image_url, sourcePageUrl: row.source_page_url })),\n";
  const exactReport = "    rejectedUntrustedAssets: rejectedMediaEntries.length,\n    unverifiedMediaEvidence: mediaEvidenceAudit.unverified,\n    invalidMediaEvidence: rejectedMediaEntries,\n";
  if (source.includes(legacyReport)) source = source.replace(legacyReport, exactReport);
  else if (!source.includes(exactReport)) throw new Error('Garage audit trusted media report marker is missing');

  const legacyFailure = "  result.media.rejectedUntrustedAssets > 0 && `${result.media.rejectedUntrustedAssets} untrusted/generic image assets must be removed or replaced`,\n";
  const exactFailure = "  result.media.invalidMediaEvidence.length > 0 && `${result.media.invalidMediaEvidence.length} invalid product media evidence row(s)`,\n";
  if (source.includes(legacyFailure)) source = source.replace(legacyFailure, exactFailure);
  else if (!source.includes(exactFailure)) throw new Error('Garage audit trusted media failure marker is missing');

  return source;
}
