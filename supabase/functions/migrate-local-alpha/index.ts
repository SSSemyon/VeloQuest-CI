import { createClient } from 'npm:@supabase/supabase-js@2.112.1';

const MIGRATION_KEY = 'local-alpha-0.3.0';
const MAX_HISTORY = 50;
const MAX_CELLS = 5000;

type LegacyRide = {
  id?: unknown;
  source?: unknown;
  startTime?: unknown;
  distanceKm?: unknown;
  durationMinutes?: unknown;
  elevationGainM?: unknown;
};

type LegacyBike = {
  brand?: unknown;
  model?: unknown;
  drivetrain?: unknown;
  wheelset?: unknown;
  tires?: unknown;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function finiteNumber(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function normalizedText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

function sourceKind(value: unknown) {
  if (value === 'Apple Health') return 'healthkit';
  if (value === 'Health Connect') return 'health_connect';
  if (value === 'GPX') return 'gpx_fit';
  return null;
}

function validRide(input: LegacyRide) {
  const id = normalizedText(input.id, 500);
  const source = sourceKind(input.source);
  const startedAt = normalizedText(input.startTime, 50);
  const distanceKm = finiteNumber(input.distanceKm, 0, 1000);
  const durationMinutes = finiteNumber(input.durationMinutes, 0, 24 * 60);
  const elevationGainM = finiteNumber(input.elevationGainM, 0, 20000);
  const startedMs = startedAt ? Date.parse(startedAt) : Number.NaN;
  if (!id || !source || !startedAt || !Number.isFinite(startedMs) || distanceKm === null || durationMinutes === null || elevationGainM === null) return null;

  const movingTimeSeconds = Math.round(durationMinutes * 60);
  const distanceMeters = distanceKm * 1000;
  return {
    legacyId: id,
    source,
    startedAt: new Date(startedMs).toISOString(),
    endedAt: new Date(startedMs + movingTimeSeconds * 1000).toISOString(),
    movingTimeSeconds,
    distanceMeters,
    elevationGainMeters: elevationGainM,
    averageSpeedMps: movingTimeSeconds > 0 ? distanceMeters / movingTimeSeconds : null,
  };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const userId = userData.user.id;

  try {
    const payload = await request.json() as Record<string, unknown>;
    if (payload.localVersion !== '0.3.0') return json({ error: 'unsupported_local_version' }, 400);

    const { data: existing, error: existingError } = await admin
      .from('client_migrations')
      .select('status, summary')
      .eq('user_id', userId)
      .eq('migration_key', MIGRATION_KEY)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.status === 'completed') return json({ migrated: false, alreadyCompleted: true, summary: existing.summary });

    const marker = await admin.from('client_migrations').upsert({
      user_id: userId,
      migration_key: MIGRATION_KEY,
      status: 'processing',
      error_code: null,
      completed_at: null,
    }, { onConflict: 'user_id,migration_key' });
    if (marker.error) throw marker.error;

    const rawBike = payload.bike && typeof payload.bike === 'object' ? payload.bike as LegacyBike : null;
    let migratedBike = false;
    if (rawBike) {
      const brand = normalizedText(rawBike.brand, 60);
      const model = normalizedText(rawBike.model, 80);
      if (brand && model) {
        const existingBike = await admin.from('bikes').select('id').eq('user_id', userId).eq('is_active', true).maybeSingle();
        if (existingBike.error) throw existingBike.error;
        if (!existingBike.data) {
          const insertedBike = await admin.from('bikes').insert({
            user_id: userId,
            mode: 'real',
            name: `${brand} ${model}`.slice(0, 100),
            brand,
            model,
            is_active: true,
            configuration: {
              drivetrain: normalizedText(rawBike.drivetrain, 120),
              wheelset: normalizedText(rawBike.wheelset, 120),
              tires: normalizedText(rawBike.tires, 120),
              migrated_from: '0.3.0',
            },
          });
          if (insertedBike.error && insertedBike.error.code !== '23505') throw insertedBike.error;
          migratedBike = !insertedBike.error;
        }
      }
    }

    const rawHistory = Array.isArray(payload.history) ? payload.history.slice(0, MAX_HISTORY) : [];
    const rides = rawHistory.map((item) => validRide((item ?? {}) as LegacyRide)).filter((item): item is NonNullable<typeof item> => Boolean(item));
    let migratedRides = 0;
    for (const ride of rides) {
      const fingerprint = `legacy-v0.3.0:${ride.legacyId}`;
      const canonical = await admin.from('rides').upsert({
        user_id: userId,
        cross_source_fingerprint: fingerprint,
        started_at: ride.startedAt,
        ended_at: ride.endedAt,
        moving_time_seconds: ride.movingTimeSeconds,
        distance_meters: ride.distanceMeters,
        elevation_gain_meters: ride.elevationGainMeters,
        average_speed_mps: ride.averageSpeedMps,
        route_geojson: null,
        is_historical: true,
        processing_status: 'ready',
      }, { onConflict: 'user_id,cross_source_fingerprint' }).select('id').single();
      if (canonical.error) throw canonical.error;

      const rideImport = await admin.from('ride_imports').upsert({
        user_id: userId,
        canonical_ride_id: canonical.data.id,
        source_kind: ride.source,
        external_ride_id: ride.legacyId,
        source_fingerprint: fingerprint,
        cross_source_fingerprint: fingerprint,
        started_at: ride.startedAt,
        ended_at: ride.endedAt,
        moving_time_seconds: ride.movingTimeSeconds,
        distance_meters: ride.distanceMeters,
        elevation_gain_meters: ride.elevationGainMeters,
        average_speed_mps: ride.averageSpeedMps,
        processing_status: 'processed',
        source_metadata: { migrated_from: '0.3.0' },
      }, { onConflict: 'user_id,source_kind,source_fingerprint' });
      if (rideImport.error) throw rideImport.error;
      migratedRides += 1;
    }

    const rawCells = Array.isArray(payload.exploredCells) ? payload.exploredCells : [];
    const cells = [...new Set(rawCells.filter((value): value is string => typeof value === 'string' && /^[0-9a-f]{15}$/i.test(value)))].slice(0, MAX_CELLS);
    if (cells.length > 0) {
      const cellResult = await admin.from('explored_cells').upsert(cells.map((h3Index) => ({
        user_id: userId,
        h3_index: h3Index.toLowerCase(),
        h3_resolution: 8,
        origin: 'historical',
      })), { onConflict: 'user_id,h3_index' });
      if (cellResult.error) throw cellResult.error;
    }

    // Legacy device state is user-controlled and cannot prove earned rewards.
    // Preserve useful history and territory, but keep progression server-authoritative.
    const summary = { bike: migratedBike, rides: migratedRides, cells: cells.length, earnedXp: 0 };
    const completed = await admin.from('client_migrations').update({
      status: 'completed',
      summary,
      error_code: null,
      completed_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('migration_key', MIGRATION_KEY);
    if (completed.error) throw completed.error;

    return json({ migrated: true, summary });
  } catch (error) {
    await admin.from('client_migrations').upsert({
      user_id: userId,
      migration_key: MIGRATION_KEY,
      status: 'failed',
      error_code: error instanceof Error ? error.name : 'migration_failed',
      completed_at: null,
    }, { onConflict: 'user_id,migration_key' });
    return json({ error: 'migration_failed' }, 500);
  }
});
