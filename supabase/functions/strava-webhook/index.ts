import { createClient } from 'npm:@supabase/supabase-js@2.112.1';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

Deno.serve(async (request) => {
  const verifyToken = Deno.env.get('STRAVA_WEBHOOK_VERIFY_TOKEN');
  const callbackSecret = Deno.env.get('STRAVA_WEBHOOK_CALLBACK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const challenge = url.searchParams.get('hub.challenge');
    const token = url.searchParams.get('hub.verify_token');
    const mode = url.searchParams.get('hub.mode');
    if (!verifyToken || token !== verifyToken || mode !== 'subscribe' || !challenge) return json({ error: 'verification_failed' }, 403);
    return json({ 'hub.challenge': challenge });
  }
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const callbackToken = new URL(request.url).searchParams.get('hook_token');
  if (!callbackSecret || callbackToken !== callbackSecret) return json({ error: 'unauthorized_webhook' }, 401);

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const ownerId = Number(payload?.owner_id);
  const objectId = Number(payload?.object_id);
  const eventTime = Number(payload?.event_time);
  const objectType = typeof payload?.object_type === 'string' ? payload.object_type : '';
  const aspectType = typeof payload?.aspect_type === 'string' ? payload.aspect_type : '';
  if (!Number.isFinite(ownerId) || !Number.isFinite(objectId) || !Number.isFinite(eventTime) || !['activity', 'athlete'].includes(objectType) || !['create', 'update', 'delete'].includes(aspectType)) return json({ ok: true });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: credential } = await admin.from('strava_credentials').select('user_id').eq('athlete_id', ownerId).maybeSingle();
  if (!credential) return json({ ok: true });

  const updates = payload?.updates && typeof payload.updates === 'object' ? payload.updates as Record<string, unknown> : {};
  if (objectType === 'athlete' && updates.authorized === 'false') {
    await admin.from('strava_credentials').delete().eq('user_id', credential.user_id);
    await admin.from('source_connections').update({ status: 'disconnected', sync_enabled: false, updated_at: new Date().toISOString() }).eq('user_id', credential.user_id).eq('kind', 'strava');
    return json({ ok: true });
  }

  await admin.from('strava_webhook_events').upsert({
    user_id: credential.user_id,
    object_type: objectType,
    object_id: objectId,
    aspect_type: aspectType,
    event_time: eventTime,
  }, { onConflict: 'user_id,object_type,object_id,aspect_type,event_time' });
  return json({ ok: true });
});
