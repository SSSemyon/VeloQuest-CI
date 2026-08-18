const GENERIC_ASSET_TOKEN = /(?:^|[\/_\-.])(logo|favicon|icon|placeholder|default|social|share|brandmark|sprite|banner|avatar|badge|loader)(?:[\/_\-.]|$)/iu;

const MEDIA_DESCRIPTOR_TOKENS = new Set([
  'side', 'front', 'rear', 'left', 'right', 'view', 'views', 'angle', 'detail', 'details',
  'hero', 'studio', 'profile', 'lifestyle', 'main', 'thumbnail', 'thumb', 'closeup', 'close', 'up',
]);

const PATH_WRAPPER_TOKENS = new Set([
  'gallery', 'galleries', 'image', 'images', 'img', 'photo', 'photos', 'media', 'asset', 'assets',
  'product', 'products', 'bike', 'bikes', 'bicycle', 'bicycles', 'cdn',
  'jpg', 'jpeg', 'png', 'webp', 'avif', 'gif',
]);

const normalize = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/gu, '')
  .toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

export function isTrustedProductMediaUrl(rawUrl) {
  const url = String(rawUrl ?? '').trim();
  if (!/^https:\/\//iu.test(url)) return false;
  let pathname = '';
  try { pathname = decodeURIComponent(new URL(url).pathname); } catch { return false; }
  return !GENERIC_ASSET_TOKEN.test(pathname);
}

function exactModelMediaMatch(value, expectedModel, { path = false } = {}) {
  const expectedTokens = normalize(expectedModel).split(' ').filter(Boolean);
  const tokens = normalize(value).split(' ').filter(Boolean);
  if (expectedTokens.length === 0 || tokens.length < expectedTokens.length) return false;
  const allowedOutside = path
    ? new Set([...MEDIA_DESCRIPTOR_TOKENS, ...PATH_WRAPPER_TOKENS])
    : MEDIA_DESCRIPTOR_TOKENS;

  for (let start = 0; start <= tokens.length - expectedTokens.length; start += 1) {
    const matches = expectedTokens.every((token, index) => tokens[start + index] === token);
    if (!matches) continue;
    const outside = [...tokens.slice(0, start), ...tokens.slice(start + expectedTokens.length)];
    if (outside.every((token) => allowedOutside.has(token))) return true;
  }
  return false;
}

function galleryMatchesModel(item, expectedModel) {
  const expected = normalize(expectedModel);
  if (!expected) return false;
  const hint = String(item?.product_hint ?? '').trim();
  if (hint && exactModelMediaMatch(hint, expectedModel)) return true;
  let path = '';
  try { path = decodeURIComponent(new URL(item?.image_url).pathname); } catch { return false; }
  return exactModelMediaMatch(path, expectedModel, { path: true });
}

export function selectTrustedProductMedia(media = [], { expectedModel } = {}) {
  const valid = media.filter((item) => isTrustedProductMediaUrl(item?.image_url));
  const productStructured = valid.filter((item) => item?.discovered_from === 'json-ld');
  if (productStructured.length > 0) return productStructured;
  const meta = valid.filter((item) => item?.discovered_from === 'meta');
  if (meta.length > 0) return meta;
  return valid.filter((item) => item?.discovered_from === 'gallery' && galleryMatchesModel(item, expectedModel));
}
