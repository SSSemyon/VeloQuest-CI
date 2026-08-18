import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasTrustworthyPointTimes,
  movingTimeSeconds,
  privacyMaskedPoints,
  routeMetrics,
  safeCadenceMetrics,
  safeTempoMetrics,
} from '../supabase/functions/_shared/rideMetrics.ts';

const at = (seconds) => new Date(Date.UTC(2026, 7, 11, 8, 0, seconds)).toISOString();

test('moving time excludes a pause represented by a long point gap', () => {
  const points = [
    { latitude: 47, longitude: 8, timestamp: at(0) },
    { latitude: 47.001, longitude: 8, timestamp: at(60) },
    { latitude: 47.002, longitude: 8, timestamp: at(60 * 11) },
    { latitude: 47.003, longitude: 8, timestamp: at(60 * 12) },
  ];
  const startedMs = Date.parse(points[0].timestamp);
  const endedMs = Date.parse(points.at(-1).timestamp);
  assert.equal(hasTrustworthyPointTimes(points, startedMs, endedMs), true);
  assert.equal(movingTimeSeconds(points, startedMs, endedMs), 120);
});

test('moving time rejects teleport-speed segments', () => {
  const points = [
    { latitude: 47, longitude: 8, timestamp: at(0) },
    { latitude: 48, longitude: 8, timestamp: at(60) },
  ];
  assert.equal(movingTimeSeconds(points, Date.parse(points[0].timestamp), Date.parse(points[1].timestamp)), 0);
});

test('privacy mask removes both route endpoints from the public polyline', () => {
  const points = [0, 0.002, 0.004, 0.006, 0.008].map((longitude) => ({ latitude: 47, longitude }));
  const visible = privacyMaskedPoints(points, 100);
  assert.deepEqual(visible, points.slice(1, -1));
});

test('median elevation smoothing suppresses a one-point altitude spike', () => {
  const points = [0, 0.001, 0.002, 0.003, 0.004].map((longitude, index) => ({
    latitude: 47,
    longitude: 8 + longitude,
    altitude: index === 2 ? 500 : 100,
  }));
  assert.equal(routeMetrics(points).elevationGainMeters, 0);
});

test('tempo consistency rejects a GPS spike instead of rewarding it', () => {
  const points = [
    { latitude: 47, longitude: 8, timestamp: at(0) },
    { latitude: 47.001, longitude: 8, timestamp: at(60) },
    { latitude: 49, longitude: 8, timestamp: at(120) },
    { latitude: 47.002, longitude: 8, timestamp: at(180) },
  ];
  const result = safeTempoMetrics(points, Date.parse(points[0].timestamp), Date.parse(points.at(-1).timestamp));
  assert.equal(result.gpsValid, false);
  assert.equal(result.consistentMinutes, 0);
});

test('tempo consistency uses stable server-derived GPS segments', () => {
  const points = Array.from({ length: 31 }, (_, index) => ({
    latitude: 47,
    longitude: 8 + index * 0.001,
    timestamp: at(index * 60),
  }));
  const result = safeTempoMetrics(points, Date.parse(points[0].timestamp), Date.parse(points.at(-1).timestamp));
  assert.equal(result.gpsValid, true);
  assert.equal(result.consistentMinutes, 30);
});

test('cadence rejects untrusted, out-of-range and under-covered samples', () => {
  assert.equal(safeCadenceMetrics([{ rpm: 90, timestamp: at(0) }], 1200).eligible, false);
  assert.equal(safeCadenceMetrics([{ rpm: 220, timestamp: at(0), serverVerified: true }], 1200).eligible, false);
  assert.equal(safeCadenceMetrics([
    { rpm: 88, timestamp: at(0), serverVerified: true },
    { rpm: 90, timestamp: at(60), serverVerified: true },
  ], 1200).eligible, false);
});

test('cadence requires bounded server samples with moving-time coverage', () => {
  const samples = Array.from({ length: 21 }, (_, index) => ({
    rpm: 88 + index % 3,
    timestamp: at(index * 60),
    serverVerified: true,
  }));
  assert.deepEqual(safeCadenceMetrics(samples, 1200), {
    eligible: true,
    consistentMinutes: 20,
  });
});
