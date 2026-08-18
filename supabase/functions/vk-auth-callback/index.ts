import { createClient } from 'npm:@supabase/supabase-js@2.112.1';
import {
  buildAppReturnUrl,
  parseVkCallback,
  sha256Base64Url,
  withTimeout,
} from '../_shared/vkOAuth.ts';
import {
  decryptBridgeValue,
  encryptBridgeValue,
  hmacBase64Url,
  randomOpaqueToken,
  safeAppError,
} from '../_shared/vkBridge.ts';

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      'cache-control': 'no-store',
    },
  });
}

function callbackState(url: URL) {
  const stateValues = url.searchParams.getAll('state');
  const payloadValues = url.searchParams.getAll('payload');
  if (stateValues.length === 1 && payloadValues.length === 0) return stateValues[0] || null;
  if (stateValues.length !== 0 || payloadValues.length !== 1) return null;
  try {
    const payload = JSON.parse(payloadValues[0]) as Record<string, unknown>;
    return typeof payload.state === 'string' ? payload.state : null;
  } catch {
    return null;
  }
}

function providerSubject(_token: Record<string, unknown>, userInfo: Record<string, unknown>) {
  const user = userInfo.user as Record<string, unknown> | undefined;
  // Never derive account identity from the token exchange response. The stable
  // subject must come from the separately authenticated VK user_info response.
  const value = userInfo.user_id ?? user?.user_id ?? user?.id;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
}

Deno.serve(async (request) => {
  if (request.method !== 'GET') return redirect(safeAppError('vk_auth_failed'));

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const clientId = Deno.env.get('VK_CLIENT_ID');
  const encryptionSecret = Deno.env.get('VK_BRIDGE_ENCRYPTION_KEY');
  if (!supabaseUrl || !serviceRoleKey || !clientId || !encryptionSecret) {
    return redirect(safeAppError('vk_not_configured'));
  }

  const url = new URL(request.url);
  const state = callbackState(url);
  if (!state || state.length > 2048) return redirect(safeAppError('vk_invalid_state'));
  const stateHash = await sha256Base64Url(state);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const claim = await admin.rpc('claim_vk_oauth_state', { p_state_hash: stateHash });
  const transaction = Array.isArray(claim.data) ? claim.data[0] as Record<string, unknown> | undefined : undefined;
  if (claim.error || !transaction) return redirect(safeAppError('vk_invalid_state'));

  const parsed = await parseVkCallback(url, {
    stateHash,
    expiresAt: Date.now() + 1,
    consumed: false,
  });
  if (!parsed.ok) return redirect(safeAppError(parsed.code === 'provider_denied' ? 'access_denied' : 'vk_auth_failed'));

  try {
    if (
      typeof transaction.transaction_id !== 'string'
      || typeof transaction.pkce_verifier_ciphertext !== 'string'
      || (transaction.intent !== 'sign_in' && transaction.intent !== 'link')
    ) {
      return redirect(safeAppError('vk_auth_failed'));
    }
    const verifier = await decryptBridgeValue(transaction.pkce_verifier_ciphertext, encryptionSecret);
    const redirectUri = `${supabaseUrl}/functions/v1/vk-auth-callback`;
    const tokenUrl = new URL('https://id.vk.ru/oauth2/auth');
    tokenUrl.searchParams.set('grant_type', 'authorization_code');
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('code_verifier', verifier);
    tokenUrl.searchParams.set('state', state);
    tokenUrl.searchParams.set('device_id', parsed.deviceId);

    const tokenResult = await withTimeout(
      (signal) => fetch(tokenUrl, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code: parsed.code }),
      }),
      10_000,
    );
    if (!tokenResult.ok || !tokenResult.value.ok) return redirect(safeAppError('vk_exchange_failed'));
    const token = await tokenResult.value.json() as Record<string, unknown>;
    if (
      typeof token.access_token !== 'string'
      || typeof token.state !== 'string'
      || token.state !== state
    ) {
      return redirect(safeAppError('vk_exchange_failed'));
    }

    const userInfoUrl = new URL('https://id.vk.ru/oauth2/user_info');
    userInfoUrl.searchParams.set('client_id', clientId);
    const userInfoResult = await withTimeout(
      (signal) => fetch(userInfoUrl, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ access_token: token.access_token as string }),
      }),
      10_000,
    );
    if (!userInfoResult.ok || !userInfoResult.value.ok) return redirect(safeAppError('vk_profile_failed'));
    const userInfo = await userInfoResult.value.json() as Record<string, unknown>;
    const subject = providerSubject(token, userInfo);
    if (!subject || subject.length > 255) return redirect(safeAppError('vk_profile_failed'));

    const syntheticHash = await hmacBase64Url(subject, encryptionSecret);
    let authEmail: string;
    let authUserId: string;
    if (transaction.intent === 'link') {
      if (typeof transaction.linking_user_id !== 'string') return redirect(safeAppError('vk_link_failed'));
      const linkedUser = await admin.auth.admin.getUserById(transaction.linking_user_id);
      if (linkedUser.error || !linkedUser.data.user?.email) return redirect(safeAppError('vk_link_failed'));
      authEmail = linkedUser.data.user.email;
      authUserId = linkedUser.data.user.id;
      const binding = await admin.rpc('bind_vk_identity', {
        p_provider_subject: subject,
        p_user_id: authUserId,
        p_auth_email: authEmail,
      });
      if (binding.error || binding.data !== true) return redirect(safeAppError('vk_link_conflict'));
    } else {
      const resolved = await admin.rpc('resolve_vk_identity', { p_provider_subject: subject });
      const identity = Array.isArray(resolved.data) ? resolved.data[0] as Record<string, unknown> | undefined : undefined;
      authEmail = typeof identity?.auth_email === 'string'
        ? identity.auth_email
        : `vk-${syntheticHash.slice(0, 48).toLowerCase()}@auth.veloquest.invalid`;

      const generated = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: authEmail,
        options: {
          data: {
            external_provider: 'vk',
            external_subject_hash: syntheticHash,
          },
        },
      });
      const generatedUser = generated.data.user;
      const hashedToken = generated.data.properties?.hashed_token;
      if (generated.error || !generatedUser || !hashedToken) return redirect(safeAppError('vk_session_failed'));
      authUserId = generatedUser.id;

      if (!identity) {
        const binding = await admin.rpc('bind_vk_identity', {
          p_provider_subject: subject,
          p_user_id: authUserId,
          p_auth_email: authEmail,
        });
        if (binding.error || binding.data !== true) {
          await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
          return redirect(safeAppError('vk_link_conflict'));
        }
      } else if (identity.user_id !== authUserId) {
        return redirect(safeAppError('vk_session_failed'));
      }

      const ticket = randomOpaqueToken();
      const ticketHash = await sha256Base64Url(ticket);
      const material = await encryptBridgeValue(JSON.stringify({
        type: 'magiclink',
        email: authEmail,
        tokenHash: hashedToken,
      }), encryptionSecret);
      const completed = await admin.rpc('complete_vk_oauth_transaction', {
        p_transaction_id: transaction.transaction_id,
        p_ticket_hash: ticketHash,
        p_provider_subject: subject,
        p_verification_material_ciphertext: material,
      });
      if (completed.error || completed.data !== true) return redirect(safeAppError('vk_auth_failed'));
      return redirect(buildAppReturnUrl(ticket));
    }

    const ticket = randomOpaqueToken();
    const ticketHash = await sha256Base64Url(ticket);
    const material = await encryptBridgeValue(JSON.stringify({ linked: true }), encryptionSecret);
    const completed = await admin.rpc('complete_vk_oauth_transaction', {
      p_transaction_id: transaction.transaction_id,
      p_ticket_hash: ticketHash,
      p_provider_subject: subject,
      p_verification_material_ciphertext: material,
    });
    if (completed.error || completed.data !== true) return redirect(safeAppError('vk_auth_failed'));
    return redirect(buildAppReturnUrl(ticket));
  } catch {
    return redirect(safeAppError('vk_auth_failed'));
  }
});
