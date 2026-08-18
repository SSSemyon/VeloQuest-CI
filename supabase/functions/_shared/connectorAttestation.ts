const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function signConnectorRequest(secret: string, timestamp: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`));
  return base64Url(new Uint8Array(signature));
}

export async function verifyConnectorRequest(input: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  body: string;
  now?: number;
  maxSkewMs?: number;
}) {
  if (
    input.secret.length < 32
    || !input.timestamp
    || !/^\d{13}$/u.test(input.timestamp)
    || !input.signature
    || !/^[A-Za-z0-9_-]{43}$/u.test(input.signature)
  ) return false;

  const timestampMs = Number(input.timestamp);
  const now = input.now ?? Date.now();
  if (!Number.isSafeInteger(timestampMs) || Math.abs(now - timestampMs) > (input.maxSkewMs ?? 5 * 60_000)) {
    return false;
  }

  const expected = await signConnectorRequest(input.secret, input.timestamp, input.body);
  return constantTimeEqual(expected, input.signature);
}
