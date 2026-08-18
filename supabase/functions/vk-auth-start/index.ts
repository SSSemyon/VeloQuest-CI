import { createClient } from 'npm:@supabase/supabase-js@2.112.1';
import { buildVkAuthorization } from '../_shared/vkOAuth.ts';
import { authenticatedUserId, encryptBridgeValue, json } from '../_shared/vkBridge.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const clientId = Deno.env.get('VK_CLIENT_ID');
  const encryptionSecret = Deno.env.get('VK_BRIDGE_ENCRYPTION_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'server_not_configured' }, 500);
  if (!clientId || !encryptionSecret) return json({ error: 'vk_not_configured' }, 503);

  const payload = await request.json().catch(() => null) as { intent?: unknown; appCodeChallenge?: unknown } | null;
  const intent = payload?.intent;
  const appCodeChallenge = payload?.appCodeChallenge;
  if (
    (intent !== 'sign_in' && intent !== 'link')
    || typeof appCodeChallenge !== 'string'
    || !/^[A-Za-z0-9_-]{43,128}$/u.test(appCodeChallenge)
  ) return json({ error: 'invalid_request' }, 400);

  const userId = intent === 'link'
    ? await authenticatedUserId(request, supabaseUrl, anonKey)
    : null;
  if (intent === 'link' && !userId) return json({ error: 'unauthorized' }, 401);

  const redirectUri = `${supabaseUrl}/functions/v1/vk-auth-callback`;
  const authorization = await buildVkAuthorization({
    clientId,
    redirectUri,
    scope: '',
  });
  const verifierCiphertext = await encryptBridgeValue(authorization.codeVerifier, encryptionSecret);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.rpc('start_vk_oauth_transaction', {
    p_state_hash: authorization.stateHash,
    // Legacy column name; this is the app-held ticket PKCE challenge.
    p_nonce_hash: appCodeChallenge,
    p_pkce_verifier_ciphertext: verifierCiphertext,
    p_intent: intent,
    p_user_id: userId,
    p_expires_at: new Date(authorization.expiresAt).toISOString(),
  });
  if (error) return json({ error: 'state_save_failed' }, 500);

  return json({ authorizationUrl: authorization.authorizationUrl });
});
