const decodeHtml = (value) => String(value ?? '')
  .replace(/&amp;/giu, '&')
  .replace(/&quot;/giu, '"')
  .replace(/&#39;|&apos;/giu, "'")
  .replace(/&lt;/giu, '<')
  .replace(/&gt;/giu, '>');

function parseAttributes(tag) {
  const attrs = new Map();
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gu;
  for (const match of String(tag ?? '').matchAll(pattern)) {
    attrs.set(match[1].toLocaleLowerCase(), decodeHtml(match[2] ?? match[3] ?? match[4] ?? '').trim());
  }
  return attrs;
}

function resolveHttps(raw, baseUrl) {
  const value = String(raw ?? '').trim();
  if (!value || /^data:|^javascript:/iu.test(value)) return null;
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function srcsetUrls(value) {
  return String(value ?? '')
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/u)[0])
    .filter(Boolean);
}

export function collectGalleryMedia({ html, baseUrl }) {
  const results = [];
  for (const match of String(html ?? '').matchAll(/<img\b[^>]*>/giu)) {
    const attrs = parseAttributes(match[0]);
    const productHint = attrs.get('alt') || attrs.get('title') || attrs.get('aria-label') || '';
    const rawUrls = [];
    for (const name of ['src', 'data-src', 'data-lazy-src', 'data-original']) {
      if (attrs.get(name)) rawUrls.push(attrs.get(name));
    }
    for (const name of ['srcset', 'data-srcset']) {
      rawUrls.push(...srcsetUrls(attrs.get(name)));
    }
    for (const raw of rawUrls) {
      const imageUrl = resolveHttps(raw, baseUrl);
      if (!imageUrl) continue;
      results.push({ image_url: imageUrl, discovered_from: 'gallery', product_hint: productHint });
    }
  }
  return [...new Map(results.map((item) => [item.image_url, item])).values()];
}
