import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { parseRecoveryCallback } from '../src/auth/recoveryCallback.ts';
import { shouldDeliverAppLink } from '../src/auth/recoveryLinkPolicy.ts';

const access = 'header.payload.signature';
const refresh = 'refresh-token-value';

function callback(parts = '') {
  return `veloquest://auth/callback${parts}`;
}

const recoveryHash = `#type=recovery&access_token=${access}&refresh_token=${refresh}`;

test('accepts canonical and legacy exact recovery routes', () => {
  for (const url of [callback(recoveryHash), `veloquest://reset-password${recoveryHash}`]) {
    assert.deepEqual(parseRecoveryCallback(url), {
      kind: 'recovery',
      accessToken: access,
      refreshToken: refresh,
    });
  }
});

test('rejects recovery tokens delivered to another VeloQuest host or path', () => {
  for (const url of [
    `veloquest://evil/callback${recoveryHash}`,
    `veloquest://auth/other${recoveryHash}`,
    `veloquest://profile${recoveryHash}`,
    `https://example.test/auth/callback${recoveryHash}`,
  ]) {
    assert.deepEqual(parseRecoveryCallback(url), { kind: 'ignore' });
  }
});

test('rejects duplicate, conflicting or extra recovery parameters', () => {
  for (const url of [
    callback(`#type=recovery&access_token=${access}&access_token=other&refresh_token=${refresh}`),
    callback(`?type=recovery#type=recovery&access_token=${access}&refresh_token=${refresh}`),
    callback(`?access_token=query#type=recovery&access_token=${access}&refresh_token=${refresh}`),
    callback(`#type=recovery&access_token=${access}&refresh_token=${refresh}&refresh_token=other`),
    callback(`#type=recovery&access_token=${access}&refresh_token=${refresh}&unexpected=x`),
  ]) {
    assert.deepEqual(parseRecoveryCallback(url), { kind: 'invalid', message: 'Ссылка восстановления недействительна или устарела.' });
  }
});

test('normalizes provider error only on a recovery-capable exact route', () => {
  assert.deepEqual(
    parseRecoveryCallback(callback('?error=access_denied&error_description=Expired%20link')),
    { kind: 'error', message: 'Expired link' },
  );
  assert.deepEqual(
    parseRecoveryCallback('veloquest://reset-password?error=access_denied&error_description=Expired%20link'),
    { kind: 'error', message: 'Expired link' },
  );
  assert.deepEqual(
    parseRecoveryCallback('veloquest://other?error=access_denied&error_description=Ignore%20me'),
    { kind: 'ignore' },
  );
});

test('requires both recovery tokens and rejects malformed encodings', () => {
  assert.deepEqual(
    parseRecoveryCallback(callback(`#type=recovery&access_token=${access}`)),
    { kind: 'invalid', message: 'В ссылке восстановления не хватает данных сессии. Запроси новое письмо.' },
  );
  assert.deepEqual(
    parseRecoveryCallback(callback('#type=recovery&access_token=%E0%A4%A&refresh_token=x')),
    { kind: 'invalid', message: 'Ссылка восстановления недействительна или устарела.' },
  );
});

test('ignores exact auth callbacks that are not password recovery callbacks', () => {
  assert.deepEqual(parseRecoveryCallback(callback('?provider=vk&ticket=opaque-ticket')), { kind: 'ignore' });
});

test('OS link policy permits only typed auth, recovery and Strava callback routes', () => {
  assert.equal(shouldDeliverAppLink(callback(recoveryHash)), true);
  assert.equal(shouldDeliverAppLink(`veloquest://reset-password${recoveryHash}`), true);
  assert.equal(shouldDeliverAppLink(callback('?provider=vk&ticket=opaque-ticket')), true);
  assert.equal(shouldDeliverAppLink(callback('?code=pkce-code')), true);
  assert.equal(shouldDeliverAppLink('veloquest://strava-connected?status=connected'), true);
  assert.equal(shouldDeliverAppLink('veloquest://strava-connected?status=denied'), true);
  assert.equal(shouldDeliverAppLink('veloquest://profile'), false);
  assert.equal(shouldDeliverAppLink('veloquest://evil/callback?provider=vk&ticket=x'), false);
  assert.equal(shouldDeliverAppLink(callback(`#type=recovery&access_token=${access}&access_token=x&refresh_token=${refresh}`)), false);
});

test('Strava callback rejects unknown status, duplicate status, extra data and fragments', () => {
  for (const url of [
    'veloquest://strava-connected?status=unknown',
    'veloquest://strava-connected?status=connected&status=denied',
    'veloquest://strava-connected?status=connected&ticket=x',
    'veloquest://strava-connected?status=connected#fragment',
    'veloquest://strava-connected/other?status=connected',
  ]) assert.equal(shouldDeliverAppLink(url), false);
});

test('entrypoint installs the link guard before importing App', () => {
  const source = fs.readFileSync('index.ts', 'utf8');
  const guard = source.indexOf("import './src/auth/installRecoveryLinkGuard';");
  const app = source.indexOf("import App from './App';");
  assert.ok(guard >= 0 && app > guard, 'recovery link guard must be imported before App');
});
