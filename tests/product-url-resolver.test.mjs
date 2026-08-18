import assert from 'node:assert/strict';
import test from 'node:test';

import { discoverExactProductLinks, discoverExactProductUrlsFromSitemap } from '../catalog-harvester/product-url-resolver-core.mjs';

const config = {
  sources: [
    { brand: 'Rocky Mountain', officialHosts: ['bikes.com'] },
  ],
};

test('resolver prefers an exact model link and expected year on official host', () => {
  const html = `
    <a href="/collections/2025-bikes">2025 Bikes</a>
    <a href="/products/element-carbon-70">Element Carbon 70</a>
    <a href="/products/element-carbon-50">Element Carbon 50</a>
    <a href="https://example.com/products/element-carbon-70">Element Carbon 70 mirror</a>
  `;
  const result = discoverExactProductLinks({
    brand: 'Rocky Mountain',
    model: 'Element Carbon 70',
    modelYear: 2025,
    baseUrl: 'https://bikes.com/collections/2025-bikes',
    html,
    config,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].url, 'https://bikes.com/products/element-carbon-70');
  assert.equal(result[0].model_match, true);
  assert.equal(result[0].year_conflict, false);
});

test('resolver rejects candidate links that explicitly identify another model year', () => {
  const html = `
    <a href="/2024/products/element-carbon-70">2024 Element Carbon 70</a>
    <a href="/2025/products/element-carbon-70">2025 Element Carbon 70</a>
  `;
  const result = discoverExactProductLinks({
    brand: 'Rocky Mountain',
    model: 'Element Carbon 70',
    modelYear: 2025,
    baseUrl: 'https://bikes.com/archive',
    html,
    config,
  });

  assert.deepEqual(result.map((item) => item.url), ['https://bikes.com/2025/products/element-carbon-70']);
});

test('resolver requires full normalized model identity rather than loose token overlap', () => {
  const html = `
    <a href="/products/element-carbon-50">Element Carbon 50</a>
    <a href="/products/element-alloy-70">Element Alloy 70</a>
  `;
  const result = discoverExactProductLinks({
    brand: 'Rocky Mountain',
    model: 'Element Carbon 70',
    modelYear: 2025,
    baseUrl: 'https://bikes.com/archive',
    html,
    config,
  });
  assert.deepEqual(result, []);
});

test('resolver preserves Cyrillic model identity instead of reducing it to digits', () => {
  const html = `
    <a href="/products/2610-a">Десна 2610</a>
    <a href="/products/2610-b">Кама 2610</a>
  `;
  const result = discoverExactProductLinks({
    brand: 'Rocky Mountain',
    model: 'Десна 2610',
    modelYear: 2025,
    baseUrl: 'https://bikes.com/archive',
    html,
    config,
  });
  assert.deepEqual(result.map((item) => item.url), ['https://bikes.com/products/2610-a']);
});

test('resolver is deterministic when text and URL both match', () => {
  const html = `
    <a href="/products/element-carbon-70-b">Element Carbon 70</a>
    <a href="/products/element-carbon-70-a">Element Carbon 70</a>
  `;
  const result = discoverExactProductLinks({
    brand: 'Rocky Mountain',
    model: 'Element Carbon 70',
    modelYear: 2025,
    baseUrl: 'https://bikes.com/archive',
    html,
    config,
  });
  assert.deepEqual(result.map((item) => item.url), [
    'https://bikes.com/products/element-carbon-70-a',
    'https://bikes.com/products/element-carbon-70-b',
  ]);
});

test('sitemap fallback accepts only exact official model URLs and rejects explicit wrong year', () => {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://bikes.com/products/2024-element-carbon-70</loc></url>
    <url><loc>https://bikes.com/products/2025-element-carbon-70</loc></url>
    <url><loc>https://example.com/products/2025-element-carbon-70</loc></url>
  </urlset>`;
  const result = discoverExactProductUrlsFromSitemap({
    brand: 'Rocky Mountain',
    model: 'Element Carbon 70',
    modelYear: 2025,
    sitemapXml: xml,
    config,
  });
  assert.deepEqual(result.map((item) => item.url), ['https://bikes.com/products/2025-element-carbon-70']);
  assert.equal(result[0].year_match, true);
  assert.equal(result[0].source, 'official_sitemap');
});
