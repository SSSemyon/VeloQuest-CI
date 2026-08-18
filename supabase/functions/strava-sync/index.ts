import { createClient } from 'npm:@supabase/supabase-js@2.112.1';
import { signConnectorRequest } from '../_shared/connectorAttestation.ts';

const RIDE_TYPES = new Set(['Ride', 'MountainBikeRide', 'GravelRide', 'EBikeRide']);
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

async function refreshToken(clientId: string, clientSecret: string, refreshTokenValue: string) {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshTokenValue }),
  });
  if (!response.ok) throw new Error('strava_refresh_failed');
  return await response.json() as { access_token: string; refresh_token: string; expires_at: number };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const connectorAttestationKey = Deno.env.get('RIDE_CONNECTOR_ATTESTATION_KEY');
  const clientId = Deno.env.get('STRAVA_CLIENT_ID');
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !connectorAttestationKey) return json({ error: 'server_not_configured' }, 500);
  if (!clientId || !clientSecret) return json({ error: 'strava_not_configured' }, 503);

  const token = authorization.slice('Bearer '.length);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const questCode = typeof body.questCode === 'string' && ['new_land', 'long_ride', 'high_route', 'close_the_loop'].includes(body.questCode) ? body.questCode : null;
  if (!questCode) return json({ error: 'invalid_quest' }, 400);
  const backfill = body.backfill === true;

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: credential, error: credentialError } = await admin.from('strava_credentials').select('access_token, refresh_token, expires_at').eq('user_id', userData.user.id).maybeSingle();
  if (credentialError) return json({ error: 'credential_lookup_failed' }, 500);
  if (!credential) return json({ error: 'strava_not_connected' }, 409);

  let accessToken = credential.access_token;
  if (credential.expires_at <= Math.floor(Date.now() / 1000) + 3600) {
    try {
      const refreshed = await refreshToken(clientId, clientSecret, credential.refresh_token);
      accessToken = refreshed.access_token;
      const save = await admin.from('strava_credentials').update({ access_token: refreshed.access_token, refresh_token: refreshed.refresh_token, expires_at: refreshed.expires_at, updated_at: new Date().toISOString() }).eq('user_id', userData.user.id);
      if (save.error) throw save.error;
    } catch {
      await admin.from('source_connections').update({ status: 'error', sync_enabled: false, updated_at: new Date().toISOString() }).eq('user_id', userData.user.id).eq('kind', 'strava');
      return json({ error: 'strava_refresh_failed' }, 401);
    }
  }

  const activityUrl = new URL('https://www.strava.com/api/v3/athlete/activities');
  activityUrl.searchParams.set('per_page', backfill ? '20' : '10');
  if (backfill) activityUrl.searchParams.set('after', String(Math.floor(Date.now() / 1000) - THIRTY_DAYS_SECONDS));
  const activityResponse = await fetch(activityUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!activityResponse.ok) return json({ error: 'strava_activity_fetch_failed' }, activityResponse.status === 429 ? 429 : 502);
  const activities = await activityResponse.json() as Array<Record<string, unknown>>;
  const candidates = activities.filter((activity) => RIDE_TYPES.has(String(activity.sport_type)) && activity.trainer !== true && activity.manual !== true);
  if (candidates.length === 0) return json({ error: 'strava_no_rides' }, 404);

  const processed: Array<Record<string, unknown>> = [];
  const items = backfill ? candidates : candidates.slice(0, 1);
  for (const activity of items) {
    const activityId = String(activity.id ?? '');
    if (!activityId || typeof activity.start_date !== 'string') continue;
    const streamsUrl = new URL(`https://www.strava.com/api/v3/activities/${encodeURIComponent(activityId)}/streams`);
    streamsUrl.searchParams.set('keys', 'latlng,altitude,time');
    streamsUrl.searchParams.set('key_by_type', 'true');
    const streamResponse = await fetch(streamsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!streamResponse.ok) continue;
    const streams = await streamResponse.json() as Record<string, { data?: unknown[] }>;
    const latlng = streams.latlng?.data;
    const time = streams.time?.data;
    const altitude = streams.altitude?.data;
    if (!Array.isArray(latlng) || !Array.isArray(time) || latlng.length < 2 || time.length !== latlng.length) continue;
    const startMs = Date.parse(activity.start_date);
    if (!Number.isFinite(startMs)) continue;
    const points = latlng.flatMap((pair, index) => {
      if (!Array.isArray(pair) || pair.length < 2) return [];
      const latitude = Number(pair[0]);
      const longitude = Number(pair[1]);
      const seconds = Number(time[index]);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(seconds)) return [];
      const altitudeValue = Array.isArray(altitude) ? Number(altitude[index]) : Number.NaN;
      return [{ latitude, longitude, altitude: Number.isFinite(altitudeValue) ? altitudeValue : undefined, timestamp: new Date(startMs + seconds * 1000).toISOString() }];
    });
    if (points.length < 2) continue;
    const endTime = points.at(-1)!.timestamp;

    const processorBody = JSON.stringify({
      source: 'Strava',
      sourceId: activityId,
      startTime: new Date(startMs).toISOString(),
      endTime,
      points,
      questCode,
    });
    const connectorTimestamp = String(Date.now());
    const connectorSignature = await signConnectorRequest(
      connectorAttestationKey,
      connectorTimestamp,
      processorBody,
    );
    const processorResponse = await fetch(`${supabaseUrl}/functions/v1/ride-processor`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        apikey: anonKey,
        'content-type': 'application/json',
        'x-vq-connector-timestamp': connectorTimestamp,
        'x-vq-connector-signature': connectorSignature,
      },
      body: processorBody,
    });
    if (!processorResponse.ok) continue;
    const result = await processorResponse.json() as Record<string, unknown>;
    const resultRide = result.ride && typeof result.ride === 'object' ? result.ride as Record<string, unknown> : null;
    const publicPoints = Array.isArray(resultRide?.points) ? resultRide.points : [];
    processed.push({ ...result, sourceId: activityId, points: publicPoints });
  }

  await admin.from('source_connections').update({ status: 'connected', sync_enabled: true, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', userData.user.id).eq('kind', 'strava');
  if (processed.length === 0) return json({ error: 'strava_no_rides_with_route' }, 404);
  return json(backfill ? { processed: processed.length, rides: processed.map(({ points: _points, ...result }) => result) } : processed[0]);
});
