import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isTrustedProductMediaUrl,
  selectTrustedProductMedia,
} from '../catalog-harvester/product-media-policy.mjs';

test('product JSON-LD media wins over generic meta media', () => {
  const result = selectTrustedProductMedia([
    { image_url: 'https://cdn.example.com/social-share.jpg', discovered_from: 'meta' },
    { image_url: 'https://cdn.example.com/bikes/model-hero.webp', discovered_from: 'json-ld' },
    { image_url: 'https://cdn.example.com/bikes/model-side.webp', discovered_from: 'json-ld' },
  ]);
  assert.deepEqual(result.map((item) => item.image_url), [
    'https://cdn.example.com/bikes/model-hero.webp',
    'https://cdn.example.com/bikes/model-side.webp',
  ]);
});

test('generic logo placeholder icon banner and social assets never count as product photos', () => {
  const result = selectTrustedProductMedia([
    { image_url: 'https://cdn.example.com/assets/logo.svg', discovered_from: 'meta' },
    { image_url: 'https://cdn.example.com/images/placeholder-bike.png', discovered_from: 'meta' },
    { image_url: 'https://cdn.example.com/icons/icon-bike.png', discovered_from: 'json-ld' },
    { image_url: 'https://cdn.example.com/banners/model-banner.webp', discovered_from: 'gallery', product_hint: 'Ranger 3.0' },
    { image_url: 'https://cdn.example.com/products/ranger-3-0.webp', discovered_from: 'meta' },
  ], { expectedModel: 'Ranger 3.0' });
  assert.deepEqual(result.map((item) => item.image_url), ['https://cdn.example.com/products/ranger-3-0.webp']);
});

test('gallery fallback requires an exact model token sequence plus neutral media descriptors', () => {
  const result = selectTrustedProductMedia([
    { image_url: 'https://cdn.example.com/gallery/other-bike.webp', discovered_from: 'gallery', product_hint: 'Other Bike' },
    { image_url: 'https://cdn.example.com/gallery/element-carbon-70-side.webp', discovered_from: 'gallery', product_hint: 'Element Carbon 70 side view' },
    { image_url: 'https://cdn.example.com/gallery/element-carbon-70-front.webp', discovered_from: 'gallery', product_hint: '' },
  ], { expectedModel: 'Element Carbon 70' });
  assert.deepEqual(result.map((item) => item.image_url), [
    'https://cdn.example.com/gallery/element-carbon-70-side.webp',
    'https://cdn.example.com/gallery/element-carbon-70-front.webp',
  ]);
});

test('gallery fallback rejects sibling trim media even when expected model is its prefix', () => {
  const result = selectTrustedProductMedia([
    { image_url: 'https://cdn.example.com/gallery/element-carbon-70-pro-side.webp', discovered_from: 'gallery', product_hint: 'Element Carbon 70 Pro side view' },
    { image_url: 'https://cdn.example.com/gallery/element-carbon-70-pro-front.webp', discovered_from: 'gallery', product_hint: '' },
    { image_url: 'https://cdn.example.com/gallery/element-carbon-70-rear.webp', discovered_from: 'gallery', product_hint: 'Element Carbon 70 rear view' },
  ], { expectedModel: 'Element Carbon 70' });

  assert.deepEqual(result.map((item) => item.image_url), [
    'https://cdn.example.com/gallery/element-carbon-70-rear.webp',
  ]);
});

test('gallery fallback is disabled without an expected model', () => {
  const result = selectTrustedProductMedia([
    { image_url: 'https://cdn.example.com/gallery/element-carbon-70-side.webp', discovered_from: 'gallery', product_hint: 'Element Carbon 70' },
  ]);
  assert.deepEqual(result, []);
});

test('shared URL predicate rejects historical generic and non-HTTPS assets', () => {
  assert.equal(isTrustedProductMediaUrl('https://cdn.example.com/products/ranger-3-0.webp'), true);
  assert.equal(isTrustedProductMediaUrl('https://cdn.example.com/assets/logo.svg'), false);
  assert.equal(isTrustedProductMediaUrl('https://cdn.example.com/social-share.jpg'), false);
  assert.equal(isTrustedProductMediaUrl('https://cdn.example.com/banner/model.webp'), false);
  assert.equal(isTrustedProductMediaUrl('http://cdn.example.com/model.jpg'), false);
  assert.equal(isTrustedProductMediaUrl('not a url'), false);
});

test('non-HTTPS media is fail-closed', () => {
  assert.deepEqual(selectTrustedProductMedia([
    { image_url: 'http://cdn.example.com/model.jpg', discovered_from: 'json-ld' },
  ]), []);
});
