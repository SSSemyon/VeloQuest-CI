export type OAuthCallbackOutcome =
  | { kind: 'success-code'; code: string }
  | { kind: 'success-vk-ticket'; ticket: string }
  | { kind: 'cancelled' }
  | { kind: 'provider-error'; code: string }
  | { kind: 'invalid' };

const MAX_VALUE_LENGTH = 2048;
const ALLOWED_KEYS = new Set(['code', 'provider', 'ticket', 'cancelled', 'error']);

function oneValue(params: URLSearchParams, key: string) {
  const values = params.getAll(key);
  if (values.length === 0) return null;
  if (values.length !== 1) return undefined;
  const value = values[0];
  if (!value || value.length > MAX_VALUE_LENGTH) return undefined;
  return value;
}

export function parseOAuthCallback(rawUrl: string): OAuthCallbackOutcome {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: 'invalid' };
  }

  if (
    url.protocol !== 'veloquest:'
    || url.hostname !== 'auth'
    || url.pathname !== '/callback'
    || url.username
    || url.password
    || url.port
    || url.hash
  ) {
    return { kind: 'invalid' };
  }

  for (const key of url.searchParams.keys()) {
    if (!ALLOWED_KEYS.has(key)) return { kind: 'invalid' };
  }

  const code = oneValue(url.searchParams, 'code');
  const provider = oneValue(url.searchParams, 'provider');
  const ticket = oneValue(url.searchParams, 'ticket');
  const cancelled = oneValue(url.searchParams, 'cancelled');
  const providerError = oneValue(url.searchParams, 'error');

  if (
    code === undefined
    || provider === undefined
    || ticket === undefined
    || cancelled === undefined
    || providerError === undefined
  ) {
    return { kind: 'invalid' };
  }

  const successCount = Number(code !== null) + Number(ticket !== null);
  const terminalCount = successCount + Number(cancelled !== null) + Number(providerError !== null);
  if (terminalCount !== 1) return { kind: 'invalid' };

  if (cancelled !== null) {
    return cancelled === '1' ? { kind: 'cancelled' } : { kind: 'invalid' };
  }
  if (providerError !== null) return { kind: 'provider-error', code: providerError };
  if (code !== null) {
    return provider === null ? { kind: 'success-code', code } : { kind: 'invalid' };
  }
  if (ticket !== null) {
    return provider === 'vk' ? { kind: 'success-vk-ticket', ticket } : { kind: 'invalid' };
  }
  return { kind: 'invalid' };
}
