const VK_AUTHORIZE_ENDPOINT = 'https://id.vk.ru/authorize';
const APP_CALLBACK = 'veloquest://auth/callback';
const MAX_VALUE_LENGTH = 2048;

type RandomBytes = (length: number) => Uint8Array;

export type VkAuthorization = {
  authorizationUrl: string;
  state: string;
  stateHash: string;
  nonceHash: string;
  codeVerifier: string;
  expiresAt: number;
};

export type VkCallbackTransaction = {
  stateHash: string;
  expiresAt: number;
  consumed: boolean;
};

export type VkCallbackResult =
  | { ok: true; code: string; deviceId: string }
  | { ok: false; code: string };

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function secureRandom(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function utf8(value: string) {
  return new TextEncoder().encode(value);
}

export async function sha256Base64Url(value: string) {
  return base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(value))));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function createAppTicketBinding(randomBytes: RandomBytes = secureRandom) {
  const verifier = base64Url(randomBytes(64));
  return { verifier, challenge: await sha256Base64Url(verifier) };
}

export async function buildVkAuthorization({
  clientId,
  redirectUri,
  now = Date.now(),
  randomBytes = secureRandom,
  scope = '',
}: {
  clientId: string;
  redirectUri: string;
  now?: number;
  randomBytes?: RandomBytes;
  scope?: string;
}): Promise<VkAuthorization> {
  const state = base64Url(randomBytes(32));
  const codeVerifier = base64Url(randomBytes(64));
  const nonce = base64Url(randomBytes(48));
  const [stateHash, nonceHash, codeChallenge] = await Promise.all([
    sha256Base64Url(state),
    sha256Base64Url(nonce),
    sha256Base64Url(codeVerifier),
  ]);

  const authorizationUrl = new URL(VK_AUTHORIZE_ENDPOINT);
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('app_id', clientId);
  authorizationUrl.searchParams.set('redirect_uri', redirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('code_challenge', codeChallenge);
  authorizationUrl.searchParams.set('code_challenge_method', 's256');
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('nonce', nonce);
  if (scope) authorizationUrl.searchParams.set('scope', scope);

  return {
    authorizationUrl: authorizationUrl.toString(),
    state,
    stateHash,
    nonceHash,
    codeVerifier,
    expiresAt: now + 5 * 60_000,
  };
}

function single(params: URLSearchParams, key: string) {
  const values = params.getAll(key);
  if (values.length === 0) return null;
  if (values.length !== 1) return undefined;
  const value = values[0];
  if (!value || value.length > MAX_VALUE_LENGTH) return undefined;
  return value;
}

function callbackParams(url: URL) {
  const payload = single(url.searchParams, 'payload');
  if (payload === undefined) return null;
  if (payload === null) return url.searchParams;

  if ([...url.searchParams.keys()].some((key) => key !== 'payload')) return null;
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const allowed = new Set(['code', 'state', 'device_id', 'error']);
    if (Object.keys(parsed).some((key) => !allowed.has(key))) return null;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') return null;
      params.set(key, value);
    }
    return params;
  } catch {
    return null;
  }
}

export async function parseVkCallback(
  url: URL,
  transaction: VkCallbackTransaction,
  now = Date.now(),
): Promise<VkCallbackResult> {
  if (transaction.consumed || transaction.expiresAt <= now) {
    return { ok: false, code: 'invalid_or_expired' };
  }

  const params = callbackParams(url);
  if (!params) return { ok: false, code: 'invalid_callback' };
  const allowed = new Set(['code', 'state', 'device_id', 'error']);
  if ([...params.keys()].some((key) => !allowed.has(key))) {
    return { ok: false, code: 'invalid_callback' };
  }

  const code = single(params, 'code');
  const state = single(params, 'state');
  const deviceId = single(params, 'device_id');
  const providerError = single(params, 'error');
  if ([code, state, deviceId, providerError].includes(undefined)) {
    return { ok: false, code: 'invalid_callback' };
  }
  if (!state) return { ok: false, code: 'invalid_callback' };

  const actualStateHash = await sha256Base64Url(state);
  if (!safeEqual(actualStateHash, transaction.stateHash)) {
    return { ok: false, code: 'invalid_state' };
  }

  if (providerError !== null) {
    return code === null && deviceId === null
      ? { ok: false, code: 'provider_denied' }
      : { ok: false, code: 'invalid_callback' };
  }
  if (typeof code !== 'string' || typeof deviceId !== 'string') {
    return { ok: false, code: 'invalid_callback' };
  }

  return { ok: true, code, deviceId };
}

export function buildAppReturnUrl(ticket: string) {
  if (!/^[A-Za-z0-9_-]{8,512}$/u.test(ticket)) {
    throw new Error('Invalid opaque ticket');
  }
  const url = new URL(APP_CALLBACK);
  url.searchParams.set('provider', 'vk');
  url.searchParams.set('ticket', ticket);
  return url.toString();
}

export async function withTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<{ ok: true; value: T } | { ok: false; code: 'provider_timeout' | 'provider_error' }> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return { ok: true, value: await request(controller.signal) };
  } catch {
    return {
      ok: false,
      code: timedOut ? 'provider_timeout' : 'provider_error',
    };
  } finally {
    clearTimeout(timer);
  }
}
