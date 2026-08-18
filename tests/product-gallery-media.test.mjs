import assert from 'node:assert/strict';
import test from 'node:test';

import { collectGalleryMedia } from '../catalog-harvester/product-gallery-media.mjs';

test('collects HTTPS gallery candidates from img lazy attributes and srcset with product hints', () => {
  const html = `
    <img src="/images/placeholder-bike.png" data-src="https://cdn.example.com/bikes/element-carbon-70-side.webp" alt="Element Carbon 70 side view">
    <img srcset="/bikes/element-carbon-70-small.webp 640w, /bikes/element-carbon-70-large.webp 1600w" title="Element Carbon 70">
  `;
  const result = collectGalleryMedia({ html, baseUrl: 'https://bikes.com/products/element-carbon-70' });
  assert.deepEqual(result.map((item) => item.image_url), [
    'https://bikes.com/images/placeholder-bike.png',
    'https://cdn.example.com/bikes/element-carbon-70-side.webp',
    'https://bikes.com/bikes/element-carbon-70-small.webp',
    'https://bikes.com/bikes/element-carbon-70-large.webp',
  ]);
  assert.equal(result[1].product_hint, 'Element Carbon 70 side view');
  assert.equal(result[3].discovered_from, 'gallery');
});

test('ignores data URLs malformed URLs and non-image link elements', () => {
  const html = `
    <img src="data:image/png;base64,AAAA" alt="Element Carbon 70">
    <img src="javascript:alert(1)" alt="Element Carbon 70">
    <a href="https://cdn.example.com/bikes/element-carbon-70.webp">photo</a>
  `;
  const result = collectGalleryMedia({ html, baseUrl: 'https://bikes.com/product' });
  assert.deepEqual(result, []);
});

test('deduplicates the same resolved image URL deterministically', () => {
  const html = `
    <img src="/bike.webp" alt="Element Carbon 70">
    <img data-src="https://bikes.com/bike.webp" title="Element Carbon 70">
  `;
  const result = collectGalleryMedia({ html, baseUrl: 'https://bikes.com/product' });
  assert.deepEqual(result.map((item) => item.image_url), ['https://bikes.com/bike.webp']);
});
