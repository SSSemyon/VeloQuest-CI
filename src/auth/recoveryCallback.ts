const INVALID_LINK = 'Ссылка восстановления недействительна или устарела.';
const MISSING_SESSION = 'В ссылке восстановления не хватает данных сессии. Запроси новое письмо.';

export type RecoveryCallbackResult =
  | { kind: 'ignore' }
  | { kind: 'error'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'recovery'; accessToken: string; refreshToken: string };

function decodePart(value: string) {
  if (/%(?![0-9a-f]{2})/iu.test(value)) throw new Error('invalid percent encoding');
  return decodeURIComponent(value.replaceAll('+', ' '));
}

function parseSection(raw: string, values: Map<string, string>) {
  if (!raw) return;
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const separator = pair.indexOf('=');
    const rawKey = separator < 0 ? pair : pair.slice(0, separator);
    const rawValue = separator < 0 ? '' : pair.slice(separator + 1);
    const key = decodePart(rawKey);
    const value = decodePart(rawValue);
    if (!key || values.has(key)) throw new Error('duplicate or empty callback parameter');
    values.set(key, value);
  }
}

function isRecoveryRoute(url: URL) {
  if (url.protocol !== 'veloquest:' || url.username || url.password || url.port) return false;
  if (url.hostname === 'auth' && url.pathname === '/callback') return true;
  return url.hostname === 'reset-password' && (url.pathname === '' || url.pathname === '/');
}

export function parseRecoveryCallback(input: string | null | undefined): RecoveryCallbackResult {
  if (!input) return { kind: 'ignore' };

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { kind: 'ignore' };
  }

  if (!isRecoveryRoute(url)) return { kind: 'ignore' };

  const values = new Map<string, string>();
  try {
    parseSection(url.search.startsWith('?') ? url.search.slice(1) : url.search, values);
    parseSection(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash, values);
  } catch {
    return { kind: 'invalid', message: INVALID_LINK };
  }

  if (values.has('error') || values.has('error_code')) {
    const allowedErrorKeys = new Set(['error', 'error_code', 'error_description']);
    if ([...values.keys()].some((key) => !allowedErrorKeys.has(key))) {
      return { kind: 'invalid', message: INVALID_LINK };
    }
    return {
      kind: 'error',
      message: values.get('error_description') || values.get('error') || INVALID_LINK,
    };
  }

  if (values.get('type') !== 'recovery') return { kind: 'ignore' };

  const allowed = new Set([
    'type',
    'access_token',
    'refresh_token',
    'expires_in',
    'expires_at',
    'token_type',
  ]);
  if ([...values.keys()].some((key) => !allowed.has(key))) {
    return { kind: 'invalid', message: INVALID_LINK };
  }

  const accessToken = values.get('access_token')?.trim();
  const refreshToken = values.get('refresh_token')?.trim();
  if (!accessToken || !refreshToken) return { kind: 'invalid', message: MISSING_SESSION };

  return { kind: 'recovery', accessToken, refreshToken };
}
