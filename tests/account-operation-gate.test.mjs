import assert from 'node:assert/strict';
import test from 'node:test';
import { captureAccountOperation, isCurrentAccountOperation, nextAccountEpoch } from '../src/lib/accountOperationGate.ts';

test('an operation captured for A is stale after switching to B', () => {
  let userId = 'A';
  let epoch = 0;
  const token = captureAccountOperation(userId, epoch);
  epoch = nextAccountEpoch(userId, 'B', epoch);
  userId = 'B';
  assert.equal(isCurrentAccountOperation(token, userId, epoch), false);
});

test('epoch blocks ABA account switching', () => {
  let userId = 'A';
  let epoch = 0;
  const oldToken = captureAccountOperation(userId, epoch);
  epoch = nextAccountEpoch(userId, null, epoch);
  userId = null;
  epoch = nextAccountEpoch(userId, 'A', epoch);
  userId = 'A';
  const newToken = captureAccountOperation(userId, epoch);
  assert.equal(isCurrentAccountOperation(oldToken, userId, epoch), false);
  assert.equal(isCurrentAccountOperation(newToken, userId, epoch), true);
});

test('a token refresh for the same user does not invalidate work', () => {
  const token = captureAccountOperation('A', 7);
  assert.equal(nextAccountEpoch('A', 'A', 7), 7);
  assert.equal(isCurrentAccountOperation(token, 'A', 7), true);
});

test('a token can authorize only its captured account and epoch', () => {
  const tokenB = captureAccountOperation('B', 4);
  assert.equal(isCurrentAccountOperation(tokenB, 'A', 4), false);
  assert.equal(isCurrentAccountOperation(tokenB, 'B', 5), false);
  assert.equal(isCurrentAccountOperation(tokenB, 'B', 4), true);
});
