import { Decoder, Stream, type FitMessages, type RecordMesg } from '@garmin/fitsdk';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { createRide, type CanonicalRide, type RidePoint } from '../domain/ride';

const SEMICIRCLE_TO_DEGREES = 180 / 0x80000000;

/**
 * Stable content identity for manually imported FIT files.
 *
 * File names and byte lengths are not unique (bike computers commonly export
 * every activity as activity.fit), so they must not be used as the dedupe key.
 * Two independent FNV passes plus the exact length give us a small, portable
 * fingerprint without loading a native crypto dependency into the mobile app.
 */
export function fitContentFingerprint(bytes: ArrayBuffer) {
  const view = new Uint8Array(bytes);
  const hash = (seed: number, step: number) => {
    let result = seed >>> 0;
    for (let index = 0; index < view.length; index += step) {
      result ^= view[index];
      result = Math.imul(result, 0x01000193) >>> 0;
    }
    return result.toString(16).padStart(8, '0');
  };
  return `${hash(0x811c9dc5, 1)}${hash(0x9e3779b9, 3)}:${view.length}`;
}

function dateIso(value: unknown): string | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }
  return undefined;
}

function recordPoint(record: RecordMesg): RidePoint | null {
  if (typeof record.positionLat !== 'number' || typeof record.positionLong !== 'number') return null;
  const latitude = record.positionLat * SEMICIRCLE_TO_DEGREES;
  const longitude = record.positionLong * SEMICIRCLE_TO_DEGREES;
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  return {
    latitude,
    longitude,
    altitude: typeof record.altitude === 'number' && Number.isFinite(record.altitude) ? record.altitude : undefined,
    timestamp: dateIso(record.timestamp),
  };
}

export function parseFitMessages(messages: FitMessages, sourceId: string): CanonicalRide {
  const records = messages.recordMesgs ?? [];
  const points = records.map(recordPoint).filter((point): point is RidePoint => point !== null);
  if (points.length < 2) throw new Error('В FIT не найден полноценный GPS-трек. Для VeloQuest нужен FIT с координатами маршрута.');

  const session = messages.sessionMesgs?.[0];
  if (session?.sport && session.sport !== 'cycling') {
    throw new Error('Этот FIT не является велопоездкой.');
  }

  const pointTimes = points.map((point) => point.timestamp).filter((value): value is string => Boolean(value));
  const startTime = dateIso(session?.startTime) ?? pointTimes[0];
  const endTime = dateIso(session?.timestamp) ?? pointTimes.at(-1);
  if (!startTime || !endTime) throw new Error('В FIT отсутствуют корректные время начала или окончания поездки.');

  return createRide({ source: 'FIT', sourceId, startTime, endTime, points, isHistorical: true });
}

export async function importFit(): Promise<CanonicalRide | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/octet-stream', 'application/fit', 'application/vnd.ant.fit'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const bytes = await new File(asset.uri).arrayBuffer();
  const decoder = new Decoder(Stream.fromArrayBuffer(bytes));
  if (!decoder.isFIT()) throw new Error('Файл не похож на корректный Garmin FIT.');
  if (!decoder.checkIntegrity()) throw new Error('FIT повреждён: проверка целостности не пройдена.');
  const decoded = decoder.read();
  if (decoded.errors.length > 0) throw new Error(`FIT не удалось прочитать: ${decoded.errors[0].message}`);

  return parseFitMessages(decoded.messages, `content:${fitContentFingerprint(bytes)}`);
}
