import assert from 'node:assert/strict';
import test from 'node:test';
import { contentFingerprint, parseGpx, trustworthyTimestamps } from '../src/integrations/gpxCore.ts';

const timedGpx = `<?xml version="1.0"?><gpx><trk><trkseg>
<trkpt lat="48.1" lon="7.8"><ele>210</ele><time>2026-08-10T08:00:00Z</time></trkpt>
<trkpt lat="48.2" lon="7.9"><ele>220</ele><time>2026-08-10T08:10:00Z</time></trkpt>
</trkseg></trk></gpx>`;

test('content fingerprint is stable and content-sensitive', () => {
  assert.equal(contentFingerprint(timedGpx), contentFingerprint(timedGpx));
  assert.notEqual(contentFingerprint(timedGpx), contentFingerprint(`${timedGpx} `));
});

test('GPX parser retains coordinates, altitude and timestamps', () => {
  const points = parseGpx(timedGpx);
  assert.equal(points.length, 2);
  assert.deepEqual(points[0], { latitude: 48.1, longitude: 7.8, altitude: 210, timestamp: '2026-08-10T08:00:00Z' });
});

test('trustworthy timestamps require a complete monotonic sequence', () => {
  const points = parseGpx(timedGpx);
  assert.deepEqual(trustworthyTimestamps(points), {
    startTime: '2026-08-10T08:00:00.000Z',
    endTime: '2026-08-10T08:10:00.000Z',
  });
  assert.equal(trustworthyTimestamps(points.map(({ timestamp: _timestamp, ...point }) => point)), null);
  assert.equal(trustworthyTimestamps([points[1], points[0]]), null);
});
