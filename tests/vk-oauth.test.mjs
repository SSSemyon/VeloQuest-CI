import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAppReturnUrl,
  buildVkAuthorization,
  parseVkCallback,
  sha256Base64Url,
  withTimeout,
} from '../supabase/functions/_shared/vkOAuth.ts';
import { runVkOAuth } from '../src/auth/vkAuth.ts';

const now = Date.parse('2026-08-14T20:00:00.000Z');
const fixedRandom = (length) => Uint8Array.from({ length }, (_, index) => index + 1);

test('VK authorization is a five-minute OAuth 2.1 PKCE transaction', async () => {
  const built = await buildVkAuthorization({
    clientId: 'vk-client',
    redirectUri: 'https://rvqiptyzsjcunzjhofid.supabase.co/functions/v1/vk-auth-callback',
    now,
    randomBytes: fixedRandom,
  });
  const url = new URL(built.authorizationUrl);

  assert.equal(url.origin + url.pathname, 'https://id.vk.ru/authorize');
  assert.equal(url.searchParams.get('client_id'), 'vk-client');
  assert.equal(url.searchParams.get('app_id'), 'vk-client');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  assert.equal(url.searchParams.get('code_challenge'), await sha256Base64Url(built.codeVerifier));
  assert.equal(url.searchParams.get('state'), built.state);
  assert.ok(url.searchParams.get('nonce'));
  assert.equal(await sha256Base64Url(url.searchParams.get('nonce')), built.nonceHash);
  assert.equal(url.searchParams.get('redirect_uri'), 'https://rvqiptyzsjcunzjhofid.supabase.co/functions/v1/vk-auth-callback');
  assert.equal(built.expiresAt, now + 5 * 60_000);
  assert.notEqual(built.state, built.codeVerifier);
});

test('VK callback rejects missing, mixed, expired and replayed values', async () => {
  const built = await buildVkAuthorization({
    clientId: 'vk-client',
    redirectUri: 'https://example.test/callback',
    now,
    randomBytes: fixedRandom,
  });
  const transaction = { stateHash: built.stateHash, expiresAt: built.expiresAt, consumed: false };

  assert.equal((await parseVkCallback(new URL('https://example.test/callback?code=c&device_id=d'), transaction, now)).ok, false);
  assert.equal((await parseVkCallback(new URL(`https://example.test/callback?code=c&device_id=d&state=${built.state}&error=denied`), transaction, now)).ok, false);
  assert.equal((await parseVkCallback(new URL(`https://example.test/callback?code=c&device_id=d&state=${built.state}`), transaction, built.expiresAt + 1)).ok, false);
  assert.equal((await parseVkCallback(new URL(`https://example.test/callback?code=c&device_id=d&state=${built.state}`), { ...transaction, consumed: true }, now)).ok, false);

  assert.deepEqual(
    await parseVkCallback(new URL(`https://example.test/callback?code=c&device_id=d&state=${built.state}`), transaction, now),
    { ok: true, code: 'c', deviceId: 'd' },
  );
});

test('VK application callback exposes only provider and opaque ticket', () => {
  const url = new URL(buildAppReturnUrl('opaque-ticket'));
  assert.equal(url.toString(), 'veloquest://auth/callback?provider=vk&ticket=opaque-ticket');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['provider', 'ticket']);
  for (const forbidden of ['access_token', 'refresh_token', 'code_verifier', 'client_secret', 'email']) {
    assert.equal(url.toString().includes(forbidden), false);
  }
});

test('VK provider timeout is normalized and aborts the request', async () => {
  let aborted = false;
  const request = (signal) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      aborted = true;
      reject(new DOMException('aborted', 'AbortError'));
    });
  });

  const result = await withTimeout(request, 5);

  assert.deepEqual(result, { ok: false, code: 'provider_timeout' });
  assert.equal(aborted, true);
});


test('VK app ticket is bound to the same client-held verifier', async () => {
  const calls = [];
  const result = await runVkOAuth({
    createBinding: async () => ({ verifier: 'app-verifier', challenge: 'app-challenge' }),
    start: async (intent, challenge) => {
      calls.push(['start', intent, challenge]);
      return { authorizationUrl: 'https://id.vk.ru/authorize?request=test' };
    },
    open: async (_authorizationUrl, redirectUrl) => {
      calls.push(['open', redirectUrl]);
      return { type: 'success', url: 'veloquest://auth/callback?provider=vk&ticket=opaque-ticket' };
    },
    finish: async (ticket, verifier) => {
      calls.push(['finish', ticket, verifier]);
      return { type: 'magiclink', email: 'vk@example.test', tokenHash: 'token-hash' };
    },
    verify: async (input) => {
      calls.push(['verify', input.tokenHash]);
      return {};
    },
  }, 'sign_in');

  assert.deepEqual(result, { kind: 'success' });
  assert.deepEqual(calls, [
    ['start', 'sign_in', 'app-challenge'],
    ['open', 'veloquest://auth/callback'],
    ['finish', 'opaque-ticket', 'app-verifier'],
    ['verify', 'token-hash'],
  ]);
});
