import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { createRide, type CanonicalRide } from '../domain/ride';
import { contentFingerprint, parseGpx, trustworthyTimestamps } from './gpxCore';

export { parseGpx } from './gpxCore';

export async function importGpx(): Promise<CanonicalRide | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/gpx+xml', 'text/xml', 'application/xml', 'text/plain'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const xml = await new File(asset.uri).text();
  const points = parseGpx(xml);
  if (points.length < 2) throw new Error('В GPX не найден полноценный GPS-трек.');

  const sourceTimes = trustworthyTimestamps(points);
  const fallbackEnd = new Date();
  const fallbackStart = new Date(fallbackEnd.getTime() - Math.max(points.length, 30) * 60000);
  const startTime = sourceTimes?.startTime ?? fallbackStart.toISOString();
  const endTime = sourceTimes?.endTime ?? fallbackEnd.toISOString();

  return createRide({
    source: 'GPX',
    sourceId: `content:${contentFingerprint(xml)}`,
    startTime,
    endTime,
    points,
    isHistorical: true,
  });
}
