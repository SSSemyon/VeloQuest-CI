import { parseOAuthCallback } from './oauthCallback';
import { parseRecoveryCallback } from './recoveryCallback';

const STRAVA_STATUSES = new Set([
  'connected',
  'invalid_state',
  'expired',
  'denied',
  'scope_missing',
  'exchange_failed',
  'save_failed',
]);

function isBarePath(url: URL) {
  return url.pathname === '' || url.pathname === '/';
}

function validStravaCallback(url: URL) {
  if (
    url.hostname !== 'strava-connected'
    || !isBarePath(url)
    || url.username
    || url.password
    || url.port
    || url.hash
  ) return false;
  const keys = [...url.searchParams.keys()];
  if (keys.length !== 1 || keys[0] !== 'status') return false;
  const statuses = url.searchParams.getAll('status');
  return statuses.length === 1 && STRAVA_STATUSES.has(statuses[0]);
}

export function shouldDeliverAppLink(input: string | null | undefined) {
  if (!input) return true;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return false;
  }

  if (url.protocol !== 'veloquest:') return true;

  if (url.hostname === 'auth' && url.pathname === '/callback') {
    const recovery = parseRecoveryCallback(input);
    if (recovery.kind === 'recovery' || recovery.kind === 'error') return true;
    if (recovery.kind === 'invalid') return false;
    return parseOAuthCallback(input).kind !== 'invalid';
  }

  if (url.hostname === 'reset-password' && isBarePath(url)) {
    const recovery = parseRecoveryCallback(input);
    return recovery.kind === 'recovery' || recovery.kind === 'error';
  }

  if (url.hostname === 'strava-connected') return validStravaCallback(url);

  return false;
}
