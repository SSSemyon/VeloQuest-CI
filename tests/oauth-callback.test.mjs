import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOAuthCallback } from '../src/auth/oauthCallback.ts';

test('accepts one Google authorization code on the canonical callback', () => {
  assert.deepEqual(parseOAuthCallback('veloquest://auth/callback?code=abc'), {
    kind: 'success-code',
    code: 'abc',
  });
});

test('accepts one VK bridge ticket without exposing provider tokens', () => {
  assert.deepEqual(parseOAuthCallback('veloquest://auth/callback?provider=vk&ticket=t1'), {
    kind: 'success-vk-ticket',
    ticket: 't1',
  });
});

test('rejects unknown schemes, hosts, paths and mixed success parameters', () => {
  assert.equal(parseOAuthCallback('https://evil.example/auth/callback?code=abc').kind, 'invalid');
  assert.equal(parseOAuthCallback('veloquest://other/callback?code=abc').kind, 'invalid');
  assert.equal(parseOAuthCallback('veloquest://auth/other?code=abc').kind, 'invalid');
  assert.equal(parseOAuthCallback('veloquest://auth/callback?code=a&ticket=b').kind, 'invalid');
  assert.equal(parseOAuthCallback('veloquest://auth/callback?provider=vk&ticket=a&ticket=b').kind, 'invalid');
});

test('normalizes cancellation and provider denial', () => {
  assert.deepEqual(parseOAuthCallback('veloquest://auth/callback?cancelled=1'), { kind: 'cancelled' });
  assert.deepEqual(parseOAuthCallback('veloquest://auth/callback?error=access_denied'), {
    kind: 'provider-error',
    code: 'access_denied',
  });
});

test('rejects empty and oversized values', () => {
  assert.equal(parseOAuthCallback('veloquest://auth/callback?code=').kind, 'invalid');
  assert.equal(parseOAuthCallback(`veloquest://auth/callback?code=${'a'.repeat(2049)}`).kind, 'invalid');
});
