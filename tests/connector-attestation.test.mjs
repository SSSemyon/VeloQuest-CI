import assert from 'node:assert/strict';
import test from 'node:test';

import {
  signConnectorRequest,
  verifyConnectorRequest,
} from '../supabase/functions/_shared/connectorAttestation.ts';

const secret = 'test-connector-secret-with-enough-entropy';
const body = JSON.stringify({ source: 'Strava', sourceId: 'activity-1' });
const timestamp = '1786737600000';

test('connector attestation authenticates the exact body and timestamp', async () => {
  const signature = await signConnectorRequest(secret, timestamp, body);
  assert.equal(await verifyConnectorRequest({
    secret,
    timestamp,
    signature,
    body,
    now: Number(timestamp) + 1_000,
  }), true);
  assert.equal(await verifyConnectorRequest({
    secret,
    timestamp,
    signature,
    body: body + ' ',
    now: Number(timestamp) + 1_000,
  }), false);
});

test('connector attestation rejects expired and malformed claims', async () => {
  const signature = await signConnectorRequest(secret, timestamp, body);
  assert.equal(await verifyConnectorRequest({
    secret,
    timestamp,
    signature,
    body,
    now: Number(timestamp) + 5 * 60_000 + 1,
  }), false);
  assert.equal(await verifyConnectorRequest({
    secret,
    timestamp: 'not-a-time',
    signature: 'not-a-signature',
    body,
    now: Number(timestamp),
  }), false);
});
