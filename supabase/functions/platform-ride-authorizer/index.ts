import { createClient } from 'npm:@supabase/supabase-js@2.112.1';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function sourceKind(source: unknown) {
  if (source === 'Apple Health') return 'healthkit';
  if (source === 'Health Connect') return 'health_connect';
  return null;
}

function text(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);

  const token = authorization.slice('Bearer '.length);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  try {
    const payload = await request.json() as Record<string, unknown>;
    const source = payload.source;
    const kind = sourceKind(source);
    const sourceId = text(payload.sourceId, 500);
    if (!kind || !sourceId) return json({ error: 'invalid_platform_ride' }, 400);

    const sourceFingerprint = await sha256(`${kind}:${sourceId}`);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc('issue_platform_ride_ingest_ticket', {
      p_user_id: userData.user.id,
      p_source_kind: kind,
      p_source_fingerprint: sourceFingerprint,
    });
    if (error) {
      if (error.message?.includes('rate_limited')) return json({ error: 'rate_limited' }, 429);
      throw error;
    }
    if (typeof data !== 'string' || !data) throw new Error('ticket_not_issued');

    return json({ platformTicket: data, expiresInSeconds: 300 });
  } catch (error) {
    console.error('platform_ride_authorizer_failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'platform_ride_authorization_failed' }, 500);
  }
});
