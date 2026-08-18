export type RidePoint = {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: string;
};

const EARTH_RADIUS_METERS = 6_371_008.8;

function radians(value: number) {
  return value * Math.PI / 180;
}

export function haversineMeters(a: RidePoint, b: RidePoint) {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function hasTrustworthyPointTimes(points: RidePoint[], startedMs: number, endedMs: number) {
  if (points.some((point) => !point.timestamp)) return false;
  const timestamps = points.map((point) => Date.parse(point.timestamp!));
  for (let index = 1; index < timestamps.length; index += 1) {
    if (timestamps[index] < timestamps[index - 1]) return false;
  }
  const toleranceMs = 5 * 60 * 1000;
  return timestamps.at(-1)! > timestamps[0]
    && Math.abs(timestamps[0] - startedMs) <= toleranceMs
    && Math.abs(timestamps.at(-1)! - endedMs) <= toleranceMs;
}

function medianAltitude(points: RidePoint[], index: number) {
  const values = points
    .slice(Math.max(0, index - 2), Math.min(points.length, index + 3))
    .map((point) => point.altitude)
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  return values.length >= 3 ? values[Math.floor(values.length / 2)] : points[index].altitude;
}

export function routeMetrics(points: RidePoint[]) {
  let distanceMeters = 0;
  let elevationGainMeters = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceMeters += haversineMeters(points[index - 1], points[index]);
    const previous = medianAltitude(points, index - 1);
    const current = medianAltitude(points, index);
    const climb = previous != null && current != null ? current - previous : 0;
    if (climb > 2.5 && climb <= 30) elevationGainMeters += climb;
  }
  return { distanceMeters, elevationGainMeters };
}

export function movingTimeSeconds(points: RidePoint[], startedMs: number, endedMs: number) {
  const wallClockSeconds = Math.round((endedMs - startedMs) / 1000);
  if (!hasTrustworthyPointTimes(points, startedMs, endedMs)) return wallClockSeconds;

  let movingSeconds = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previousMs = Date.parse(points[index - 1].timestamp!);
    const currentMs = Date.parse(points[index].timestamp!);
    const segmentSeconds = (currentMs - previousMs) / 1000;
    if (segmentSeconds <= 0 || segmentSeconds > 5 * 60) continue;
    const segmentMeters = haversineMeters(points[index - 1], points[index]);
    const segmentSpeedMps = segmentMeters / segmentSeconds;
    if (segmentSpeedMps >= 0.5 && segmentSpeedMps <= 35) movingSeconds += segmentSeconds;
  }
  return Math.round(movingSeconds);
}

export function privacyMaskedPoints(points: RidePoint[], privacyRadiusMeters: number) {
  if (privacyRadiusMeters <= 0) return points;
  const start = points[0];
  const end = points.at(-1)!;
  const visible = points.filter((point) => (
    haversineMeters(point, start) > privacyRadiusMeters
    && haversineMeters(point, end) > privacyRadiusMeters
  ));
  return visible.length >= 2 ? visible : [];
}

export type CadenceSample = {
  rpm: number;
  timestamp: string;
  serverVerified?: boolean;
};

export function safeTempoMetrics(points: RidePoint[], startedMs: number, endedMs: number) {
  if (!hasTrustworthyPointTimes(points, startedMs, endedMs)) {
    return { gpsValid: false, consistentMinutes: 0 };
  }

  const segments: { seconds: number; speedMps: number }[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const seconds = (Date.parse(points[index].timestamp!) - Date.parse(points[index - 1].timestamp!)) / 1000;
    if (seconds <= 0 || seconds > 5 * 60) continue;
    const speedMps = haversineMeters(points[index - 1], points[index]) / seconds;
    if (!Number.isFinite(speedMps) || speedMps > 35) {
      return { gpsValid: false, consistentMinutes: 0 };
    }
    if (speedMps >= 0.5) segments.push({ seconds, speedMps });
  }
  if (segments.length < 2) return { gpsValid: true, consistentMinutes: 0 };

  const sortedSpeeds = segments.map((segment) => segment.speedMps).sort((left, right) => left - right);
  const medianSpeed = sortedSpeeds[Math.floor(sortedSpeeds.length / 2)];
  const lowerBound = medianSpeed * 0.8;
  const upperBound = medianSpeed * 1.2;
  const consistentSeconds = segments.reduce(
    (total, segment) => total + (
      segment.speedMps >= lowerBound && segment.speedMps <= upperBound
        ? segment.seconds
        : 0
    ),
    0,
  );

  return {
    gpsValid: true,
    consistentMinutes: Math.floor(consistentSeconds / 60),
  };
}

export function safeCadenceMetrics(samples: CadenceSample[], movingSeconds: number) {
  if (!Number.isFinite(movingSeconds) || movingSeconds < 20 * 60 || samples.length < 3) {
    return { eligible: false, consistentMinutes: 0 };
  }
  if (samples.some((sample) => (
    sample.serverVerified !== true
    || !Number.isFinite(sample.rpm)
    || sample.rpm < 30
    || sample.rpm > 180
    || !Number.isFinite(Date.parse(sample.timestamp))
  ))) {
    return { eligible: false, consistentMinutes: 0 };
  }

  const timestamps = samples.map((sample) => Date.parse(sample.timestamp));
  for (let index = 1; index < timestamps.length; index += 1) {
    if (timestamps[index] <= timestamps[index - 1] || timestamps[index] - timestamps[index - 1] > 5 * 60 * 1000) {
      return { eligible: false, consistentMinutes: 0 };
    }
  }

  const coverageSeconds = (timestamps.at(-1)! - timestamps[0]) / 1000;
  if (coverageSeconds < Math.min(20 * 60, movingSeconds * 0.8)) {
    return { eligible: false, consistentMinutes: 0 };
  }

  const average = samples.reduce((total, sample) => total + sample.rpm, 0) / samples.length;
  const variance = samples.reduce((total, sample) => total + (sample.rpm - average) ** 2, 0) / samples.length;
  if (Math.sqrt(variance) > 10) return { eligible: false, consistentMinutes: 0 };

  return {
    eligible: true,
    consistentMinutes: Math.floor(Math.min(coverageSeconds, movingSeconds) / 60),
  };
}
