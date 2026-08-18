import { createClient } from 'npm:@supabase/supabase-js@2.112.1';

const APP_REDIRECT = 'veloquest://strava-connected';
const STATE_TTL_MS = 10 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

function redirect(status: string) {
  return new Response(null, { status: 302, headers: { location: `${APP_REDIRECT}?status=${encodeURIComponent(status)}` } });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const clientId = Deno.env.get('STRAVA_CLIENT_ID');
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);
  if (!clientId || !clientSecret) return json({ error: 'strava_not_configured' }, 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const callbackUrl = `${supabaseUrl}/functions/v1/strava-oauth`;

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const state = url.searchParams.get('state');
    if (!state) return redirect('invalid_state');
    const stateHash = await sha256(state);
    const { data: savedState } = await admin.from('strava_oauth_states').select('user_id, expires_at').eq('state_hash', stateHash).maybeSingle();
    if (!savedState || Date.parse(savedState.expires_at) < Date.now()) {
      await admin.from('strava_oauth_states').delete().eq('state_hash', stateHash);
      return redirect('expired');
    }
    if (url.searchParams.get('error')) {
      await admin.from('strava_oauth_states').delete().eq('state_hash', stateHash);
      return redirect('denied');
    }
    const code = url.searchParams.get('code');
    const grantedScope = url.searchParams.get('scope') ?? '';
    const grantedScopes = grantedScope.split(/[,\s]+/).filter(Boolean);
    if (!code || !grantedScopes.includes('activity:read')) return redirect('scope_missing');

    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' }),
    });
    if (!tokenResponse.ok) return redirect('exchange_failed');
    const token = await tokenResponse.json() as Record<string, unknown>;
    const athlete = token.athlete as Record<string, unknown> | undefined;
    if (typeof token.access_token !== 'string' || typeof token.refresh_token !== 'string' || typeof token.expires_at !== 'number' || typeof athlete?.id !== 'number') return redirect('exchange_failed');

    const saved = await admin.from('strava_credentials').upsert({
      user_id: savedState.user_id,
      athlete_id: athlete.id,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      scope: grantedScope,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (saved.error) return redirect('save_failed');
    await admin.from('source_connections').upsert({
      user_id: savedState.user_id,
      kind: 'strava',
      status: 'connected',
      external_account_id: String(athlete.id),
      sync_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,kind' });
    await admin.from('strava_oauth_states').delete().eq('state_hash', stateHash);
    return redirect('connected');
  }

  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(authorization.slice('Bearer '.length));
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);
  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;

  if (payload.action === 'disconnect') {
    const { data: credential } = await admin.from('strava_credentials').select('refresh_token').eq('user_id', userData.user.id).maybeSingle();
    if (credential?.refresh_token) {
      await fetch('https://www.strava.com/oauth/revoke', {
        method: 'POST',
        headers: {
          authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ token: credential.refresh_token, token_type_hint: 'refresh_token' }),
      }).catch(() => undefined);
    }
    await admin.from('strava_credentials').delete().eq('user_id', userData.user.id);
    await admin.from('source_connections').update({ status: 'disconnected', sync_enabled: false, sync_cursor: null, updated_at: new Date().toISOString() }).eq('user_id', userData.user.id).eq('kind', 'strava');
    return json({ disconnected: true });
  }

  const state = randomState();
  const stateHash = await sha256(state);
  const stateSave = await admin.from('strava_oauth_states').insert({
    state_hash: stateHash,
    user_id: userData.user.id,
    app_redirect: APP_REDIRECT,
    expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
  });
  if (stateSave.error) return json({ error: 'state_save_failed' }, 500);

  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('approval_prompt', 'auto');
  authUrl.searchParams.set('scope', 'read,activity:read');
  authUrl.searchParams.set('state', state);
  return json({ authorizationUrl: authUrl.toString(), callbackDomain: new URL(supabaseUrl).host });
});
