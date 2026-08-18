import assert from 'node:assert/strict';
import test from 'node:test';

import {
  discoverExactProductLinks,
  discoverExactProductUrlsFromSitemap,
} from '../catalog-harvester/product-url-resolver-core.mjs';

const config = {
  sources: [{ brand: 'Specialized', officialHosts: ['www.specialized.com'] }],
};

const base = {
  brand: 'Specialized',
  model: 'Example',
  modelYear: 2026,
  baseUrl: 'https://www.specialized.com/us/en/archive',
  config,
};

test('archive resolver prefers exact model over sibling trim', () => {
  const html = `
    <a href="/us/en/example-pro/p/124">2026 Example Pro</a>
    <a href="/us/en/example/p/123">2026 Example</a>`;
  const candidates = discoverExactProductLinks({ ...base, html });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].url, 'https://www.specialized.com/us/en/example/p/123');
});

test('archive resolver fails closed when only a sibling trim exists', () => {
  const html = '<a href="/us/en/example-pro/p/124">2026 Example Pro</a>';
  assert.deepEqual(discoverExactProductLinks({ ...base, html }), []);
});

test('archive resolver accepts exact model text when URL is opaque', () => {
  const html = '<a href="/us/en/p/12345">Specialized 2026 Example</a>';
  const candidates = discoverExactProductLinks({ ...base, html });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].url, 'https://www.specialized.com/us/en/p/12345');
});

test('sitemap resolver rejects sibling trim and keeps exact year/model path segment', () => {
  const sitemapXml = `
    <urlset>
      <url><loc>https://www.specialized.com/us/en/2026/example-pro/p/124</loc></url>
      <url><loc>https://www.specialized.com/us/en/2026/example/p/123</loc></url>
    </urlset>`;
  const candidates = discoverExactProductUrlsFromSitemap({
    brand: base.brand,
    model: base.model,
    modelYear: base.modelYear,
    sitemapXml,
    config,
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].url, 'https://www.specialized.com/us/en/2026/example/p/123');
});

test('resolver preserves punctuation-heavy model identity', () => {
  const model = 'C:62 ONE / EQ';
  const html = '<a href="/us/en/c-62-one-eq/p/777">2026 C:62 ONE / EQ</a>';
  const candidates = discoverExactProductLinks({ ...base, model, html });
  assert.equal(candidates.length, 1);
});
