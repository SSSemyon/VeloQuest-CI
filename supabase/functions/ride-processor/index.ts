import { createClient } from 'npm:@supabase/supabase-js@2.112.1';
import { verifyConnectorRequest } from '../_shared/connectorAttestation.ts';
import { latLngToCell } from 'npm:h3-js@4.5.0';
import {
  haversineMeters,
  movingTimeSeconds,
  privacyMaskedPoints,
  routeMetrics,
  safeCadenceMetrics,
  safeTempoMetrics,
  type RidePoint,
} from '../_shared/rideMetrics.ts';

const MAX_POINTS = 25_000;
const MAX_CELLS = 5_000;
const H3_RESOLUTION = 8;
const INTERPOLATION_STEP_METERS = 120;
const REWARD_WINDOW_MS = 36 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type SourceName = 'Apple Health' | 'Health Connect' | 'GPX' | 'FIT' | 'Strava';
type RawPoint = { latitude?: unknown; longitude?: unknown; altitude?: unknown; timestamp?: unknown };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function sourceKind(source: unknown) {
  if (source === 'Apple Health') return 'healthkit';
  if (source === 'Health Connect') return 'health_connect';
  if (source === 'GPX' || source === 'FIT') return 'gpx_fit';
  if (source === 'Strava') return 'strava';
  return null;
}

function text(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function platformTicket(value: unknown, kind: string | null) {
  if (kind !== 'healthkit' && kind !== 'health_connect') return null;
  const candidate = text(value, 64);
  return candidate && UUID_PATTERN.test(candidate) ? candidate : null;
}

function sanitizePoints(input: unknown): RidePoint[] | null {
  if (!Array.isArray(input) || input.length < 2 || input.length > MAX_POINTS) return null;
  const points: { latitude: number; longitude: number; altitude?: number; timestamp?: string }[] = [];
  for (const raw of input as RawPoint[]) {
    const latitude = Number(raw.latitude);
    const longitude = Number(raw.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
    const altitudeNumber = raw.altitude == null ? null : Number(raw.altitude);
    const altitude = altitudeNumber != null && Number.isFinite(altitudeNumber) && altitudeNumber >= -500 && altitudeNumber <= 10_000 ? altitudeNumber : undefined;
    const timestamp = typeof raw.timestamp === 'string' && Number.isFinite(Date.parse(raw.timestamp)) ? new Date(raw.timestamp).toISOString() : undefined;
    points.push({ latitude, longitude, altitude, timestamp });
  }
  return points;
}

function routeCells(points: ReturnType<typeof sanitizePoints> extends infer T ? Exclude<T, null> : never, privacyRadiusMeters = 0) {
  const cells = new Set<string>();
  const hiddenCells = new Set<string>();
  const start = points[0];
  const end = points.at(-1)!;
  const addPoint = (latitude: number, longitude: number) => {
    const cell = latLngToCell(latitude, longitude, H3_RESOLUTION);
    if (privacyRadiusMeters > 0 && (
      haversineMeters({ latitude, longitude }, start) <= privacyRadiusMeters
      || haversineMeters({ latitude, longitude }, end) <= privacyRadiusMeters
    )) {
      hiddenCells.add(cell);
      cells.delete(cell);
      return;
    }
    if (!hiddenCells.has(cell) && cells.size < MAX_CELLS) cells.add(cell);
  };

  addPoint(points[0].latitude, points[0].longitude);
  for (let i = 1; i < points.length && cells.size < MAX_CELLS; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const segmentMeters = haversineMeters(a, b);
    const steps = segmentMeters <= 2_000 ? Math.max(1, Math.ceil(segmentMeters / INTERPOLATION_STEP_METERS)) : 1;
    for (let step = 1; step <= steps && cells.size < MAX_CELLS; step += 1) {
      const ratio = step / steps;
      addPoint(a.latitude + (b.latitude - a.latitude) * ratio, a.longitude + (b.longitude - a.longitude) * ratio);
    }
  }
  return [...cells].filter((cell) => !hiddenCells.has(cell));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function routeGeoJson(points: ReturnType<typeof sanitizePoints> extends infer T ? Exclude<T, null> : never) {
  if (points.length < 2) return null;
  return {
    type: 'LineString',
    coordinates: points.map((point) => point.altitude == null ? [point.longitude, point.latitude] : [point.longitude, point.latitude, point.altitude]),
  };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const connectorAttestationKey = Deno.env.get('RIDE_CONNECTOR_ATTESTATION_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);

  const token = authorization.slice('Bearer '.length);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const source = payload.source as SourceName;
    const kind = sourceKind(source);
    const sourceId = text(payload.sourceId, 500);
    const questCode = text(payload.questCode, 80);
    const startedMs = typeof payload.startTime === 'string' ? Date.parse(payload.startTime) : Number.NaN;
    const endedMs = typeof payload.endTime === 'string' ? Date.parse(payload.endTime) : Number.NaN;
    const points = sanitizePoints(payload.points);
    if (!kind || !sourceId || !questCode || !Number.isFinite(startedMs) || !Number.isFinite(endedMs) || endedMs < startedMs || !points) {
      return json({ error: 'invalid_ride' }, 400);
    }

    const movingSeconds = movingTimeSeconds(points, startedMs, endedMs);
    if (movingSeconds <= 0 || movingSeconds > 24 * 60 * 60) return json({ error: 'invalid_duration' }, 400);

    const { distanceMeters, elevationGainMeters } = routeMetrics(points);
    if (distanceMeters < 100 || distanceMeters > 1_000_000) return json({ error: 'invalid_distance' }, 400);
    const averageSpeedMps = distanceMeters / movingSeconds;
    if (averageSpeedMps > 35) return json({ error: 'implausible_speed' }, 400);

    const startCell = latLngToCell(points[0].latitude, points[0].longitude, 7);
    const endCell = latLngToCell(points.at(-1)!.latitude, points.at(-1)!.longitude, 7);
    const startBucket = Math.round(startedMs / (5 * 60 * 1000));
    const durationBucket = Math.round(movingSeconds / 300);
    const distanceBucket = Math.round(distanceMeters / 1000);
    const sourceFingerprint = await sha256(`${kind}:${sourceId}`);
    const crossSourceFingerprint = await sha256(`${startBucket}:${durationBucket}:${distanceBucket}:${startCell}:${endCell}`);
    const loopValue = distanceMeters >= 5_000 && haversineMeters(points[0], points.at(-1)!) <= 250 ? 1 : 0;
    const now = Date.now();
    const tempoMetrics = safeTempoMetrics(points, startedMs, endedMs);
    const presentedPlatformTicket = platformTicket(payload.platformTicket, kind);

    // Authentication proves the account, not the declared ride source. Strava
    // remains cryptographically attested by the backend connector. HealthKit /
    // Health Connect use a separate short-lived capability, validated and
    // consumed atomically in Postgres; a declared source alone never qualifies.
    const trustedProvenance = kind === 'strava'
      && typeof connectorAttestationKey === 'string'
      && await verifyConnectorRequest({
        secret: connectorAttestationKey,
        timestamp: request.headers.get('x-vq-connector-timestamp'),
        signature: request.headers.get('x-vq-connector-signature'),
        body: rawBody,
      });
    const platformCapabilityCandidate = (kind === 'healthkit' || kind === 'health_connect')
      && presentedPlatformTicket !== null;
    const manualFile = source === 'GPX' || source === 'FIT';
    const forcedHistorical = payload.isHistorical === true || manualFile;
    const rewardEligible = trustedProvenance
      && tempoMetrics.gpsValid
      && !forcedHistorical
      && endedMs >= now - REWARD_WINDOW_MS
      && endedMs <= now + 5 * 60 * 1000;
    const platformRewardCandidate = platformCapabilityCandidate
      && tempoMetrics.gpsValid
      && !forcedHistorical
      && endedMs >= now - REWARD_WINDOW_MS
      && endedMs <= now + 5 * 60 * 1000;
    const rewardCandidate = rewardEligible || platformRewardCandidate;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const profileResult = await admin
      .from('profiles')
      .select('privacy_zone_enabled, privacy_zone_radius_m')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (profileResult.error) throw profileResult.error;
    const privacyEnabled = profileResult.data?.privacy_zone_enabled ?? true;
    const privacyRadiusMeters = privacyEnabled ? (profileResult.data?.privacy_zone_radius_m ?? 250) : 0;
    const publicPoints = privacyMaskedPoints(points, privacyRadiusMeters);
    const cells = routeCells(points, privacyRadiusMeters);
    const { data, error } = await admin.rpc('process_ride_alpha_with_platform_ticket', {
      p_user_id: userData.user.id,
      p_source_kind: kind,
      p_external_ride_id: sourceId,
      p_source_fingerprint: sourceFingerprint,
      p_cross_source_fingerprint: crossSourceFingerprint,
      p_started_at: new Date(startedMs).toISOString(),
      p_ended_at: new Date(endedMs).toISOString(),
      p_moving_time_seconds: movingSeconds,
      p_distance_meters: distanceMeters,
      p_elevation_gain_meters: elevationGainMeters,
      p_average_speed_mps: averageSpeedMps,
      p_route_geojson: routeGeoJson(publicPoints),
      p_h3_cells: cells,
      p_quest_code: questCode,
      p_loop_value: loopValue,
      p_reward_candidate: rewardCandidate,
      p_platform_ticket: presentedPlatformTicket,
    });
    if (error) {
      if (error.message?.includes('active_quest_conflict')) return json({ error: 'active_quest_conflict' }, 409);
      throw error;
    }

    const effectiveRewardEligible = data?.quest?.rewardEligible === true;

    // Cadence remains locked until a backend connector supplies verified raw
    // samples. Client aggregates are intentionally never accepted here.
    const cadenceMetrics = safeCadenceMetrics([], movingSeconds);
    let achievements: unknown = null;
    if (typeof data?.rideId === 'string') {
      const achievementResult = await admin.rpc('evaluate_ride_achievements', {
        p_user_id: userData.user.id,
        p_ride_id: data.rideId,
        p_event_key: `ride:${data.rideId}:achievements:v1`,
        p_metrics: {
          rewardEligible: effectiveRewardEligible,
          // The evaluator owns canonical ride idempotency. A duplicate response can
          // be a retry after the canonical transaction committed but evaluation failed.
          duplicate: false,
          historical: !effectiveRewardEligible,
          manualFile,
          gpsValid: tempoMetrics.gpsValid,
          distanceMeters,
          elevationGainMeters,
          newCellCount: Array.isArray(data.newCells) ? data.newCells.length : 0,
          questCompleted: data.quest?.completed === true,
          regionalAdventure: false,
          cadenceConsistentMinutes: cadenceMetrics.eligible ? cadenceMetrics.consistentMinutes : 0,
          tempoConsistentMinutes: tempoMetrics.consistentMinutes,
        },
      });
      if (achievementResult.error) throw achievementResult.error;
      achievements = achievementResult.data;
    }

    return json({
      ...data,
      achievements,
      ride: {
        id: data.rideId,
        source,
        startTime: new Date(startedMs).toISOString(),
        endTime: new Date(endedMs).toISOString(),
        distanceKm: distanceMeters / 1000,
        durationMinutes: movingSeconds / 60,
        elevationGainM: elevationGainMeters,
        points: publicPoints,
      },
    });
  } catch (error) {
    console.error('ride_processor_failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'ride_processing_failed' }, 500);
  }
});
