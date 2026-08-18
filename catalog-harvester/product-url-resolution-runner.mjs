import { isOfficialEvidenceUrl } from './product-evidence-rules.mjs';
import {
  discoverExactProductLinks,
  discoverExactProductUrlsFromSitemap,
} from './product-url-resolver-core.mjs';

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const MAX_CHILD_SITEMAPS = 20;
const MAX_ROBOTS_SITEMAPS = 5;

export function validateProductUrlResolutionManifest(manifest, config) {
  const entries = Array.isArray(manifest) ? manifest : manifest?.entries;
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('product URL resolution manifest must contain entries');
  const seen = new Set();
  return entries.map((entry, index) => {
    const bike_id = String(entry?.bike_id ?? '').trim();
    const brand = String(entry?.brand ?? '').trim();
    const model = String(entry?.model ?? '').trim();
    const model_year = Number(entry?.model_year);
    const source_url = String(entry?.source_url ?? '').trim();
    if (!bike_id || !brand || !model || !source_url) {
      throw new Error(`manifest entry ${index}: bike_id/brand/model/source_url required`);
    }
    if (!Number.isInteger(model_year) || model_year < 2020 || model_year > 2026) {
      throw new Error(`manifest entry ${index}: model_year must be 2020-2026`);
    }
    if (seen.has(bike_id)) throw new Error(`manifest entry ${index}: duplicate bike_id ${bike_id}`);
    seen.add(bike_id);
    if (!isOfficialEvidenceUrl(brand, source_url, config)) {
      throw new Error(`manifest entry ${index}: non-official source_url for ${brand}`);
    }
    return { bike_id, brand, model, model_year, source_url };
  });
}

function normalizedTimeout(value) {
  const timeout = Number(value ?? DEFAULT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 60_000) {
    throw new Error('requestTimeoutMs must be between 1 and 60000');
  }
  return Math.round(timeout);
}

async function fetchArchivePage({ sourceUrl, fetchImpl, timeoutMs, config }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(sourceUrl, {
      headers: {
        'user-agent': config?.userAgent ?? 'VeloQuestCatalogHarvester/1.0 (+catalog research; evidence-first)',
        accept: 'text/html,application/xhtml+xml,application/xml,text/xml,text/plain',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response?.ok) return { ok: false, error: `HTTP ${response?.status ?? 'unknown'}`, source_url: sourceUrl };
    try {
      return { ok: true, html: await response.text(), source_url: sourceUrl };
    } catch (error) {
      return { ok: false, error: `body read failed: ${String(error?.message ?? error)}`, source_url: sourceUrl };
    }
  } catch (error) {
    return {
      ok: false,
      error: controller.signal.aborted
        ? `request timeout after ${timeoutMs}ms`
        : String(error?.message ?? error),
      source_url: sourceUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function decodeSitemapUrl(value) {
  return String(value ?? '')
    .replace(/&amp;/giu, '&')
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .trim();
}

function officialChildSitemapUrls({ brand, sitemapXml, config }) {
  if (!/<sitemapindex\b/iu.test(String(sitemapXml ?? ''))) return [];
  const urls = [];
  for (const match of String(sitemapXml ?? '').matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/giu)) {
    const url = decodeSitemapUrl(match[1]);
    if (!isOfficialEvidenceUrl(brand, url, config) || urls.includes(url)) continue;
    urls.push(url);
    if (urls.length >= MAX_CHILD_SITEMAPS) break;
  }
  return urls;
}

function officialRobotsSitemapUrls({ brand, robotsText, config }) {
  const urls = [];
  for (const match of String(robotsText ?? '').matchAll(/^\s*sitemap\s*:\s*(\S+)\s*$/gimu)) {
    const url = decodeSitemapUrl(match[1]);
    if (!isOfficialEvidenceUrl(brand, url, config) || urls.includes(url)) continue;
    urls.push(url);
    if (urls.length >= MAX_ROBOTS_SITEMAPS) break;
  }
  return urls;
}

function mergeCandidates(candidates) {
  return [...new Map(candidates.map((candidate) => [candidate.url, candidate])).values()]
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
}

function tagCandidates(candidates, sourceUrl, evidenceScope) {
  return candidates.map((candidate) => ({
    ...candidate,
    evidence_source_url: sourceUrl,
    year_evidence_scope: evidenceScope,
  }));
}

export async function runProductUrlResolution({
  manifest,
  config,
  fetchImpl = globalThis.fetch,
  evidenceCheckedAt = new Date().toISOString().slice(0, 10),
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(evidenceCheckedAt)) throw new Error('evidenceCheckedAt must be YYYY-MM-DD');
  const timeoutMs = normalizedTimeout(requestTimeoutMs);
  const entries = validateProductUrlResolutionManifest(manifest, config);

  const pagePromiseByUrl = new Map();
  const getPage = (sourceUrl) => {
    if (!pagePromiseByUrl.has(sourceUrl)) {
      pagePromiseByUrl.set(sourceUrl, fetchArchivePage({ sourceUrl, fetchImpl, timeoutMs, config }));
    }
    return pagePromiseByUrl.get(sourceUrl);
  };
  const rootSitemapPromiseByOrigin = new Map();
  const robotsPromiseByOrigin = new Map();
  const getRootSitemap = (sourceUrl) => {
    const origin = new URL(sourceUrl).origin;
    if (!rootSitemapPromiseByOrigin.has(origin)) {
      rootSitemapPromiseByOrigin.set(origin, getPage(new URL('/sitemap.xml', origin).href));
    }
    return rootSitemapPromiseByOrigin.get(origin);
  };
  const getRobots = (sourceUrl) => {
    const origin = new URL(sourceUrl).origin;
    if (!robotsPromiseByOrigin.has(origin)) {
      robotsPromiseByOrigin.set(origin, getPage(new URL('/robots.txt', origin).href));
    }
    return robotsPromiseByOrigin.get(origin);
  };

  const candidatesFromSitemap = async (entry, sitemap) => {
    let candidates = tagCandidates(discoverExactProductUrlsFromSitemap({
      brand: entry.brand,
      model: entry.model,
      modelYear: entry.model_year,
      sitemapXml: sitemap.html,
      config,
    }), sitemap.source_url, 'official_sitemap_candidate');
    if (candidates.length > 0) return candidates;

    const childCandidates = [];
    for (const childUrl of officialChildSitemapUrls({ brand: entry.brand, sitemapXml: sitemap.html, config })) {
      const child = await getPage(childUrl);
      if (!child.ok) continue;
      childCandidates.push(...tagCandidates(discoverExactProductUrlsFromSitemap({
        brand: entry.brand,
        model: entry.model,
        modelYear: entry.model_year,
        sitemapXml: child.html,
        config,
      }), child.source_url, 'official_sitemap_candidate'));
    }
    return mergeCandidates(childCandidates);
  };

  const results = [];
  for (const entry of entries) {
    const page = await getPage(entry.source_url);
    if (!page.ok) {
      results.push({
        ...entry,
        evidence_checked_at: evidenceCheckedAt,
        status: 'fetch_error',
        error: page.error,
      });
      continue;
    }

    let candidates = tagCandidates(discoverExactProductLinks({
      brand: entry.brand,
      model: entry.model,
      modelYear: entry.model_year,
      baseUrl: entry.source_url,
      html: page.html,
      config,
    }), entry.source_url, 'official_archive_link');
    let sitemapError = null;

    if (candidates.length === 0) {
      const sitemap = await getRootSitemap(entry.source_url);
      if (sitemap.ok) {
        candidates = await candidatesFromSitemap(entry, sitemap);
      } else {
        sitemapError = sitemap.error;
        const robots = await getRobots(entry.source_url);
        if (robots.ok) {
          const declaredCandidates = [];
          for (const sitemapUrl of officialRobotsSitemapUrls({ brand: entry.brand, robotsText: robots.html, config })) {
            const declared = await getPage(sitemapUrl);
            if (!declared.ok) continue;
            declaredCandidates.push(...await candidatesFromSitemap(entry, declared));
          }
          candidates = mergeCandidates(declaredCandidates);
        }
      }
    }

    if (candidates.length === 0) {
      results.push({
        ...entry,
        evidence_checked_at: evidenceCheckedAt,
        status: 'no_match',
        candidates: [],
        ...(sitemapError ? { sitemap_error: sitemapError } : {}),
      });
      continue;
    }

    const topScore = candidates[0].score;
    const top = candidates.filter((candidate) => candidate.score === topScore);
    if (top.length !== 1) {
      results.push({
        ...entry,
        evidence_checked_at: evidenceCheckedAt,
        status: 'ambiguous',
        candidates: top,
      });
      continue;
    }

    const resolution = top[0];
    const modelYearEvidence = resolution.year_match && resolution.year_identity
      ? {
        source_url: resolution.evidence_source_url,
        identity: resolution.year_identity,
        evidence_scope: resolution.year_evidence_scope,
      }
      : null;
    results.push({
      ...entry,
      evidence_checked_at: evidenceCheckedAt,
      status: 'resolved',
      manufacturer_url: resolution.url,
      resolution,
      ...(modelYearEvidence ? { model_year_evidence: modelYearEvidence } : {}),
      candidates: top,
    });
  }

  const statuses = ['resolved', 'ambiguous', 'no_match', 'fetch_error'];
  return {
    schema_version: 1,
    generated_at: evidenceCheckedAt,
    entries: results,
    summary: Object.fromEntries(statuses.map((status) => [status, results.filter((entry) => entry.status === status).length])),
  };
}
