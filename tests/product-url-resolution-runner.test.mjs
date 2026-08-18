import assert from 'node:assert/strict';
import test from 'node:test';

import { runProductUrlResolution } from '../catalog-harvester/product-url-resolution-runner.mjs';

const config = {
  sources: [{ brand: 'Rocky Mountain', officialHosts: ['bikes.com'] }],
};

const manifest = {
  entries: [
    { bike_id: 'a', brand: 'Rocky Mountain', model: 'Element Carbon 70', model_year: 2025, source_url: 'https://bikes.com/archive/2025' },
    { bike_id: 'b', brand: 'Rocky Mountain', model: 'Instinct Carbon 50', model_year: 2025, source_url: 'https://bikes.com/archive/2025' },
  ],
};

const html = `
  <a href="/products/element-carbon-70">Element Carbon 70</a>
  <a href="/products/instinct-carbon-50">Instinct Carbon 50</a>
`;

test('resolver fetches shared archive once and resolves exact product candidates', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, status: 200, text: async () => html };
  };
  const result = await runProductUrlResolution({ manifest, config, fetchImpl, evidenceCheckedAt: '2026-08-17' });
  assert.equal(calls, 1);
  assert.deepEqual(result.entries.map((entry) => [entry.bike_id, entry.status]), [['a', 'resolved'], ['b', 'resolved']]);
  assert.equal(result.entries[0].manufacturer_url, 'https://bikes.com/products/element-carbon-70');
  assert.equal(result.summary.resolved, 2);
});

test('resolver fails closed on equally strong multiple exact candidates', async () => {
  const ambiguousHtml = `
    <a href="/products/element-carbon-70-red">Element Carbon 70</a>
    <a href="/products/element-carbon-70-blue">Element Carbon 70</a>
  `;
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => ambiguousHtml });
  const result = await runProductUrlResolution({
    manifest: { entries: [manifest.entries[0]] },
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
  });
  assert.equal(result.entries[0].status, 'ambiguous');
  assert.equal(result.entries[0].candidates.length, 2);
});

test('resolver records no_match instead of inventing a product URL', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => '<a href="/products/other">Other Bike</a>' });
  const result = await runProductUrlResolution({
    manifest: { entries: [manifest.entries[0]] },
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-17',
  });
  assert.equal(result.entries[0].status, 'no_match');
  assert.equal(result.entries[0].manufacturer_url, undefined);
});

test('resolver records archive fetch errors for every affected bike', async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, text: async () => '' });
  const result = await runProductUrlResolution({ manifest, config, fetchImpl, evidenceCheckedAt: '2026-08-17' });
  assert.deepEqual(result.entries.map((entry) => entry.status), ['fetch_error', 'fetch_error']);
  assert.match(result.entries[0].error, /429/);
});

test('resolver falls back to the official root sitemap when an archive has no exact link', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    if (url === 'https://bikes.com/archive/2025') {
      return { ok: true, status: 200, text: async () => '<html>No product link</html>' };
    }
    if (url === 'https://bikes.com/sitemap.xml') {
      return {
        ok: true,
        status: 200,
        text: async () => '<urlset><url><loc>https://bikes.com/products/2025-element-carbon-70</loc></url></urlset>',
      };
    }
    return { ok: false, status: 404, text: async () => '' };
  };
  const result = await runProductUrlResolution({
    manifest: { entries: [manifest.entries[0]] },
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'resolved');
  assert.equal(result.entries[0].manufacturer_url, 'https://bikes.com/products/2025-element-carbon-70');
  assert.equal(result.entries[0].resolution.source, 'official_sitemap');
  assert.deepEqual(requested, ['https://bikes.com/archive/2025', 'https://bikes.com/sitemap.xml']);
});

test('resolver follows at most the official child sitemaps from a root sitemap index', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    if (url === 'https://bikes.com/archive/2025') {
      return { ok: true, status: 200, text: async () => '<html>No product link</html>' };
    }
    if (url === 'https://bikes.com/sitemap.xml') {
      return {
        ok: true,
        status: 200,
        text: async () => '<sitemapindex><sitemap><loc>https://bikes.com/sitemaps/products.xml</loc></sitemap><sitemap><loc>https://example.com/foreign.xml</loc></sitemap></sitemapindex>',
      };
    }
    if (url === 'https://bikes.com/sitemaps/products.xml') {
      return {
        ok: true,
        status: 200,
        text: async () => '<urlset><url><loc>https://bikes.com/products/2025-element-carbon-70</loc></url></urlset>',
      };
    }
    return { ok: false, status: 404, text: async () => '' };
  };
  const result = await runProductUrlResolution({
    manifest: { entries: [manifest.entries[0]] },
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'resolved');
  assert.equal(result.entries[0].manufacturer_url, 'https://bikes.com/products/2025-element-carbon-70');
  assert.deepEqual(requested, [
    'https://bikes.com/archive/2025',
    'https://bikes.com/sitemap.xml',
    'https://bikes.com/sitemaps/products.xml',
  ]);
});

test('resolver uses only official robots.txt Sitemap declarations when the root sitemap is unavailable', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    if (url === 'https://bikes.com/archive/2025') {
      return { ok: true, status: 200, text: async () => '<html>No product link</html>' };
    }
    if (url === 'https://bikes.com/sitemap.xml') return { ok: false, status: 404, text: async () => '' };
    if (url === 'https://bikes.com/robots.txt') {
      return {
        ok: true,
        status: 200,
        text: async () => 'User-agent: *\nSitemap: https://bikes.com/custom-sitemap.xml\nSitemap: https://example.com/foreign.xml\n',
      };
    }
    if (url === 'https://bikes.com/custom-sitemap.xml') {
      return {
        ok: true,
        status: 200,
        text: async () => '<urlset><url><loc>https://bikes.com/products/2025-element-carbon-70</loc></url></urlset>',
      };
    }
    return { ok: false, status: 404, text: async () => '' };
  };
  const result = await runProductUrlResolution({
    manifest: { entries: [manifest.entries[0]] },
    config,
    fetchImpl,
    evidenceCheckedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'resolved');
  assert.equal(result.entries[0].manufacturer_url, 'https://bikes.com/products/2025-element-carbon-70');
  assert.deepEqual(requested, [
    'https://bikes.com/archive/2025',
    'https://bikes.com/sitemap.xml',
    'https://bikes.com/robots.txt',
    'https://bikes.com/custom-sitemap.xml',
  ]);
});
