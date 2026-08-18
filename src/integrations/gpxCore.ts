import type { RidePoint } from '../domain/ride';

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
  return match?.[1];
}

function element(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([^<]+)</${name}>`, 'i'));
  return match?.[1]?.trim();
}

export function contentFingerprint(value: string) {
  const hash = (seed: number, step: number) => {
    let result = seed >>> 0;
    for (let index = 0; index < value.length; index += step) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 0x01000193) >>> 0;
    }
    return result.toString(16).padStart(8, '0');
  };
  return `${hash(0x811c9dc5, 1)}${hash(0x9e3779b9, 3)}:${value.length}`;
}

export function trustworthyTimestamps(points: RidePoint[]) {
  if (points.length < 2 || points.some((point) => !point.timestamp)) return null;
  const values = points.map((point) => Date.parse(point.timestamp!));
  if (values.some((value) => !Number.isFinite(value))) return null;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < values[index - 1]) return null;
  }
  if (values.at(-1)! <= values[0]) return null;
  return { startTime: new Date(values[0]).toISOString(), endTime: new Date(values.at(-1)!).toISOString() };
}

export function parseGpx(xml: string): RidePoint[] {
  const points: RidePoint[] = [];
  const matcher = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(xml)) !== null) {
    const latitude = Number(attr(match[1], 'lat'));
    const longitude = Number(attr(match[1], 'lon'));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const altitudeRaw = element(match[2], 'ele');
    const timeRaw = element(match[2], 'time');
    points.push({
      latitude,
      longitude,
      altitude: altitudeRaw ? Number(altitudeRaw) : undefined,
      timestamp: timeRaw,
    });
  }
  return points;
}
