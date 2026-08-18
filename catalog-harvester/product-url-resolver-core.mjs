import { isOfficialEvidenceUrl } from './product-evidence-rules.mjs';

const decodeHtml = (value) => String(value ?? '')
  .replace(/&amp;/giu, '&')
  .replace(/&quot;/giu, '"')
  .replace(/&#39;|&apos;/giu, "'")
  .replace(/&lt;/giu, '<')
  .replace(/&gt;/giu, '>')
  .replace(/&nbsp;|&#160;/giu, ' ');

const cleanText = (value) => decodeHtml(value)
  .replace(/<[^>]+>/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

const normalize = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/gu, '')
  .toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim();

function explicitYears(value) {
  return [...String(value ?? '').matchAll(/\b(20(?:2[0-6]))\b/gu)].map((match) => Number(match[1]));
}

function removeEdgeTokenSequence(tokens, edgeTokens, side) {
  if (edgeTokens.length === 0 || tokens.length < edgeTokens.length) return false;
  const offset = side === 'start' ? 0 : tokens.length - edgeTokens.length;
  const matches = edgeTokens.every((token, index) => tokens[offset + index] === token);
  if (!matches) return false;
  tokens.splice(offset, edgeTokens.length);
  return true;
}

function trimIdentityWrappers(value, { brand, modelYear }) {
  const tokens = normalize(value).split(' ').filter(Boolean);
  const brandTokens = normalize(brand).split(' ').filter(Boolean);
  const yearToken = String(modelYear);
  let changed = true;
  while (changed && tokens.length > 0) {
    changed = false;
    if (tokens[0] === yearToken) {
      tokens.shift();
      changed = true;
    }
    if (tokens.at(-1) === yearToken) {
      tokens.pop();
      changed = true;
    }
    if (removeEdgeTokenSequence(tokens, brandTokens, 'start')) changed = true;
    if (removeEdgeTokenSequence(tokens, brandTokens, 'end')) changed = true;
  }
  return tokens.join(' ');
}

function exactTextModelMatch({ text, brand, model, modelYear }) {
  const expected = normalize(model);
  if (!expected) return false;
  const segments = String(text ?? '')
    .split(/\s+[|•·–—-]\s+/gu)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.some((segment) => trimIdentityWrappers(segment, { brand, modelYear }) === expected);
}

function exactPathModelMatch({ path, brand, model, modelYear }) {
  const expected = normalize(model);
  if (!expected) return false;
  const segments = String(path ?? '')
    .split(/\/+/gu)
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.some((segment) => trimIdentityWrappers(segment, { brand, modelYear }) === expected);
}

export function discoverExactProductLinks({ brand, model, modelYear, baseUrl, html, config }) {
  const expected = normalize(model);
  if (!expected) throw new Error('model is required for exact product URL resolution');
  if (!Number.isInteger(Number(modelYear)) || Number(modelYear) < 2020 || Number(modelYear) > 2026) {
    throw new Error('modelYear must be 2020-2026');
  }
  if (!isOfficialEvidenceUrl(brand, baseUrl, config)) throw new Error('baseUrl must be an official HTTPS brand URL');

  const candidates = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu;
  for (const match of String(html ?? '').matchAll(pattern)) {
    let url;
    try { url = new URL(decodeHtml(match[1]), baseUrl).href; } catch { continue; }
    if (!isOfficialEvidenceUrl(brand, url, config)) continue;
    const text = cleanText(match[2]);
    let decodedPath = '';
    try { decodedPath = decodeURIComponent(new URL(url).pathname); } catch { decodedPath = url; }
    const textMatch = exactTextModelMatch({ text, brand, model, modelYear });
    const urlMatch = exactPathModelMatch({ path: decodedPath, brand, model, modelYear });
    if (!textMatch && !urlMatch) continue;

    const textYears = new Set(explicitYears(text));
    const pathYears = new Set(explicitYears(decodedPath));
    const years = new Set([...textYears, ...pathYears]);
    const yearConflict = years.size > 0 && !years.has(Number(modelYear));
    if (yearConflict) continue;
    const yearMatch = years.has(Number(modelYear));
    const yearIdentity = yearMatch
      ? (textYears.has(Number(modelYear)) ? text : url)
      : null;
    const score = (textMatch ? 100 : 0) + (urlMatch ? 80 : 0) + (yearMatch ? 20 : 0);
    candidates.push({
      url,
      link_text: text,
      score,
      model_match: true,
      year_match: yearMatch,
      year_identity: yearIdentity,
      year_conflict: false,
    });
  }

  return [...new Map(candidates.map((candidate) => [candidate.url, candidate])).values()]
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
}

export function discoverExactProductUrlsFromSitemap({ brand, model, modelYear, sitemapXml, config }) {
  const expected = normalize(model);
  if (!expected) throw new Error('model is required for sitemap product URL resolution');
  if (!Number.isInteger(Number(modelYear)) || Number(modelYear) < 2020 || Number(modelYear) > 2026) {
    throw new Error('modelYear must be 2020-2026');
  }

  const candidates = [];
  for (const match of String(sitemapXml ?? '').matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/giu)) {
    const raw = decodeHtml(match[1]).trim();
    if (!isOfficialEvidenceUrl(brand, raw, config)) continue;
    let decodedPath = '';
    try { decodedPath = decodeURIComponent(new URL(raw).pathname); } catch { continue; }
    if (!exactPathModelMatch({ path: decodedPath, brand, model, modelYear })) continue;
    const years = new Set(explicitYears(decodedPath));
    if (years.size > 0 && !years.has(Number(modelYear))) continue;
    const yearMatch = years.has(Number(modelYear));
    const canonicalUrl = new URL(raw).href;
    candidates.push({
      url: canonicalUrl,
      link_text: '',
      score: 80 + (yearMatch ? 20 : 0),
      model_match: true,
      year_match: yearMatch,
      year_identity: yearMatch ? canonicalUrl : null,
      year_conflict: false,
      source: 'official_sitemap',
    });
  }

  return [...new Map(candidates.map((candidate) => [candidate.url, candidate])).values()]
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
}
