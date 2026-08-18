import { createClient } from 'npm:@supabase/supabase-js@2.112.1';
import { sha256Base64Url } from '../_shared/vkOAuth.ts';
import { authenticatedUserId, decryptBridgeValue, json } from '../_shared/vkBridge.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const encryptionSecret = Deno.env.get('VK_BRIDGE_ENCRYPTION_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !encryptionSecret) {
    return json({ error: 'server_not_configured' }, 500);
  }

  const payload = await request.json().catch(() => null) as { ticket?: unknown; appCodeVerifier?: unknown } | null;
  if (
    typeof payload?.ticket !== 'string'
    || !/^[A-Za-z0-9_-]{8,512}$/u.test(payload.ticket)
    || typeof payload.appCodeVerifier !== 'string'
    || !/^[A-Za-z0-9_-]{43,128}$/u.test(payload.appCodeVerifier)
  ) {
    return json({ error: 'invalid_or_expired_ticket' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ticketHash = await sha256Base64Url(payload.ticket);
  const appChallenge = await sha256Base64Url(payload.appCodeVerifier);
  const consumed = await admin.rpc('consume_vk_ticket_service', {
    p_ticket_hash: ticketHash,
    p_app_challenge: appChallenge,
  });
  const transaction = Array.isArray(consumed.data) ? consumed.data[0] as Record<string, unknown> | undefined : undefined;
  if (
    consumed.error
    || !transaction
    || typeof transaction.verification_material_ciphertext !== 'string'
    || (transaction.intent !== 'sign_in' && transaction.intent !== 'link')
  ) {
    return json({ error: 'invalid_or_expired_ticket' }, 400);
  }

  try {
    const decoded = JSON.parse(
      await decryptBridgeValue(transaction.verification_material_ciphertext, encryptionSecret),
    ) as Record<string, unknown>;

    if (transaction.intent === 'link') {
      const userId = await authenticatedUserId(request, supabaseUrl, anonKey);
      if (!userId || userId !== transaction.user_id || decoded.linked !== true) {
        return json({ error: 'invalid_or_expired_ticket' }, 400);
      }
      return json({ linked: true });
    }

    if (
      decoded.type !== 'magiclink'
      || typeof decoded.email !== 'string'
      || typeof decoded.tokenHash !== 'string'
    ) {
      return json({ error: 'invalid_or_expired_ticket' }, 400);
    }
    return json({
      type: 'magiclink',
      email: decoded.email,
      tokenHash: decoded.tokenHash,
    });
  } catch {
    return json({ error: 'invalid_or_expired_ticket' }, 400);
  }
});
