import assert from 'node:assert/strict';
import test from 'node:test';

import { runGoogleOAuth } from '../src/auth/googleAuth.ts';
import { runVkOAuth } from '../src/auth/vkAuth.ts';

function dependencies(overrides = {}) {
  const calls = {
    begin: 0,
    open: 0,
    exchange: [],
  };

  return {
    calls,
    value: {
      begin: async () => {
        calls.begin += 1;
        return { url: 'https://accounts.google.test/authorize' };
      },
      open: async () => {
        calls.open += 1;
        return { type: 'success', url: 'veloquest://auth/callback?code=google-code' };
      },
      exchange: async (code) => {
        calls.exchange.push(code);
        return {};
      },
      ...overrides,
    },
  };
}

test('Google cancellation never exchanges a code', async () => {
  const fixture = dependencies({
    open: async () => ({ type: 'cancel' }),
  });

  const result = await runGoogleOAuth(fixture.value);

  assert.deepEqual(result, { kind: 'cancelled' });
  assert.equal(fixture.calls.begin, 1);
  assert.deepEqual(fixture.calls.exchange, []);
});

test('Google success exchanges exactly one canonical callback code', async () => {
  const fixture = dependencies();

  const result = await runGoogleOAuth(fixture.value);

  assert.deepEqual(result, { kind: 'success' });
  assert.equal(fixture.calls.begin, 1);
  assert.equal(fixture.calls.open, 1);
  assert.deepEqual(fixture.calls.exchange, ['google-code']);
});

test('Google stale account operation is rejected before session exchange', async () => {
  const fixture = dependencies({ isCurrent: () => false });

  const result = await runGoogleOAuth(fixture.value);

  assert.deepEqual(result, { kind: 'error', code: 'stale_account_operation' });
  assert.deepEqual(fixture.calls.exchange, []);
});

test('Google provider denial is normalized without leaking callback data', async () => {
  const fixture = dependencies({
    open: async () => ({
      type: 'success',
      url: 'veloquest://auth/callback?error=access_denied',
    }),
  });

  const result = await runGoogleOAuth(fixture.value);

  assert.deepEqual(result, { kind: 'error', code: 'access_denied' });
  assert.deepEqual(fixture.calls.exchange, []);
  assert.equal(JSON.stringify(result).includes('veloquest://'), false);
});

test('Google rejects malformed callbacks without exchanging a code', async () => {
  const fixture = dependencies({
    open: async () => ({
      type: 'success',
      url: 'https://evil.example/auth/callback?code=stolen',
    }),
  });

  const result = await runGoogleOAuth(fixture.value);

  assert.deepEqual(result, { kind: 'error', code: 'invalid_callback' });
  assert.deepEqual(fixture.calls.exchange, []);
});

test('VK cancellation never consumes a bridge ticket', async () => {
  let finishCalls = 0;
  let verifyCalls = 0;
  const result = await runVkOAuth({
    start: async () => ({ authorizationUrl: 'https://id.vk.ru/authorize' }),
    open: async () => ({ type: 'cancel' }),
    finish: async () => {
      finishCalls += 1;
      return { linked: true };
    },
    verify: async () => {
      verifyCalls += 1;
      return {};
    },
  }, 'sign_in');

  assert.deepEqual(result, { kind: 'cancelled' });
  assert.equal(finishCalls, 0);
  assert.equal(verifyCalls, 0);
});

test('VK sign-in verifies only one one-time magic-link result', async () => {
  const tickets = [];
  const verified = [];
  const result = await runVkOAuth({
    start: async () => ({ authorizationUrl: 'https://id.vk.ru/authorize' }),
    open: async () => ({
      type: 'success',
      url: 'veloquest://auth/callback?provider=vk&ticket=opaque-ticket',
    }),
    finish: async (ticket) => {
      tickets.push(ticket);
      return { type: 'magiclink', email: 'vk-test@auth.veloquest.invalid', tokenHash: 'hashed-token' };
    },
    verify: async (input) => {
      verified.push(input);
      return {};
    },
  }, 'sign_in');

  assert.deepEqual(result, { kind: 'success' });
  assert.deepEqual(tickets, ['opaque-ticket']);
  assert.deepEqual(verified, [{
    type: 'magiclink',
    email: 'vk-test@auth.veloquest.invalid',
    tokenHash: 'hashed-token',
  }]);
});

test('VK linking accepts a linked result without creating a new session', async () => {
  let verifyCalls = 0;
  const result = await runVkOAuth({
    start: async () => ({ authorizationUrl: 'https://id.vk.ru/authorize' }),
    open: async () => ({
      type: 'success',
      url: 'veloquest://auth/callback?provider=vk&ticket=link-ticket',
    }),
    finish: async () => ({ linked: true }),
    verify: async () => {
      verifyCalls += 1;
      return {};
    },
  }, 'link');

  assert.deepEqual(result, { kind: 'success' });
  assert.equal(verifyCalls, 0);
});
