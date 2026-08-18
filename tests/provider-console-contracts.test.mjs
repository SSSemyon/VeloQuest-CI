import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const runbook = read('OAUTH_PROVIDER_SETUP_0_8_9.md');
const google = read('src/auth/googleAuth.ts');
const vkAuthorization = read('supabase/functions/_shared/vkOAuth.ts');
const vkCallback = read('supabase/functions/vk-auth-callback/index.ts');

const googleProviderCallback = 'https://rvqiptyzsjcunzjhofid.supabase.co/auth/v1/callback';
const appCallback = 'veloquest://auth/callback';
const vkProviderCallback = 'https://rvqiptyzsjcunzjhofid.supabase.co/functions/v1/vk-auth-callback';

test('provider console redirects are separated from the mobile deep link', () => {
  assert.match(runbook, new RegExp(googleProviderCallback.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(runbook, new RegExp(vkProviderCallback.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(runbook, /The mobile deep link is \*\*not\*\* a Google or VK provider callback/);
  assert.match(runbook, /Google OAuth Web client/);
  assert.match(runbook, /Supabase Auth Redirect URLs/);
  assert.match(runbook, /VK ID application/);
  assert.match(google, /export const GOOGLE_REDIRECT = 'veloquest:\/\/auth\/callback'/);
});

test('Google testing-mode operational caveats are recorded for alpha QA', () => {
  assert.match(runbook, /Testing/);
  assert.match(runbook, /100 listed test users/);
  assert.match(runbook, /expire seven days after consent/);
  assert.match(runbook, /redirect_uri_mismatch|exact match/i);
});

test('VK authorization follows current OAuth 2.1 PKCE application parameters', () => {
  assert.match(vkAuthorization, /https:\/\/id\.vk\.ru\/authorize/);
  assert.match(vkAuthorization, /searchParams\.set\('client_id', input\.clientId\)/);
  assert.match(vkAuthorization, /searchParams\.set\('app_id', input\.clientId\)/);
  assert.match(vkAuthorization, /searchParams\.set\('response_type', 'code'\)/);
  assert.match(vkAuthorization, /searchParams\.set\('code_challenge_method', 's256'\)/);
  assert.match(vkAuthorization, /searchParams\.set\('state', state\)/);
  assert.match(vkAuthorization, /searchParams\.set\('nonce', nonce\)/);
});

test('VK server exchanges the code and reads user_info with provider material kept off the app callback', () => {
  assert.match(vkCallback, /new URL\('https:\/\/id\.vk\.ru\/oauth2\/auth'\)/);
  for (const param of ['grant_type', 'redirect_uri', 'client_id', 'code_verifier', 'state', 'device_id']) {
    assert.match(vkCallback, new RegExp(`tokenUrl\\.searchParams\\.set\\('${param}'`));
  }
  assert.match(vkCallback, /body: new URLSearchParams\(\{ code: parsed\.code \}\)/);
  assert.match(vkCallback, /new URL\('https:\/\/id\.vk\.ru\/oauth2\/user_info'\)/);
  assert.match(vkCallback, /userInfoUrl\.searchParams\.set\('client_id', clientId\)/);
  assert.match(vkCallback, /body: new URLSearchParams\(\{ access_token: token\.access_token as string \}\)/);
  assert.match(vkCallback, /const subject = providerSubject\(token, userInfo\)/);
  assert.doesNotMatch(vkCallback, /client_secret/i);
  assert.match(runbook, new RegExp(appCallback.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(runbook, /one-time opaque app ticket/);
});
