import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyProductIdentity } from '../catalog-harvester/product-evidence-identity.mjs';

const entry = {
  brand: 'Specialized',
  model: 'Example',
  model_year: 2026,
  manufacturer_url: 'https://www.specialized.com/us/en/2026-example/p/123',
};

test('accepts exact page model identity with expected year', () => {
  assert.deepEqual(verifyProductIdentity(entry, {
    identities: ['2026 Example | Specialized'],
    source_url: entry.manufacturer_url,
  }), { valid: true, reason: null });
});

test('rejects sibling trim even when official URL contains the base family segment', () => {
  const result = verifyProductIdentity(entry, {
    identities: ['2026 Example Pro | Specialized'],
    source_url: 'https://www.specialized.com/us/en/example/2026-example-pro/p/456',
  });
  assert.equal(result.valid, false);
  assert.match(result.reason, /exact model identity/i);
});

test('content page identity outranks path identities when they disagree', () => {
  const result = verifyProductIdentity(entry, {
    identities: ['2026 Example Pro | Specialized', '/us/en/2026-example/p/123'],
    source_url: entry.manufacturer_url,
  });
  assert.equal(result.valid, false);
  assert.match(result.reason, /exact model identity/i);
});

test('path-only identity can prove exact model and year', () => {
  assert.equal(verifyProductIdentity(entry, {
    identities: ['/us/en/2026-example/p/123'],
    source_url: entry.manufacturer_url,
  }).valid, true);
});

test('rejects explicit wrong model year even when model name is exact', () => {
  const result = verifyProductIdentity(entry, {
    identities: ['2025 Example | Specialized'],
    source_url: 'https://www.specialized.com/us/en/2025-example/p/123',
  });
  assert.equal(result.valid, false);
  assert.match(result.reason, /model year/i);
});

test('rejects exact model when expected year is nowhere in page identity or URL', () => {
  const result = verifyProductIdentity(entry, {
    identities: ['Example | Specialized'],
    source_url: 'https://www.specialized.com/us/en/example/p/123',
  });
  assert.equal(result.valid, false);
  assert.match(result.reason, /confirm model year/i);
});

test('accepts a yearless exact product page only with resolver-backed exact model/year evidence', () => {
  const result = verifyProductIdentity(entry, {
    identities: ['Example | Specialized'],
    source_url: 'https://www.specialized.com/us/en/example/p/123',
    model_year_evidence: {
      source_url: 'https://www.specialized.com/us/en/archive/2026',
      identity: '2026 Example | Specialized',
      evidence_scope: 'official_archive_link',
    },
  });
  assert.deepEqual(result, { valid: true, reason: null });
});

test('rejects resolver year evidence for a sibling trim', () => {
  const result = verifyProductIdentity(entry, {
    identities: ['Example | Specialized'],
    source_url: 'https://www.specialized.com/us/en/example/p/123',
    model_year_evidence: {
      source_url: 'https://www.specialized.com/us/en/archive/2026',
      identity: '2026 Example Pro | Specialized',
      evidence_scope: 'official_archive_link',
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.reason, /confirm model year/i);
});

test('rejects resolver year evidence from an explicitly wrong-year source path', () => {
  const result = verifyProductIdentity(entry, {
    identities: ['Example | Specialized'],
    source_url: 'https://www.specialized.com/us/en/example/p/123',
    model_year_evidence: {
      source_url: 'https://www.specialized.com/us/en/archive/2025',
      identity: '2026 Example | Specialized',
      evidence_scope: 'official_archive_link',
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.reason, /confirm model year/i);
});

test('explicit wrong year on exact product page cannot be overridden by resolver evidence', () => {
  const result = verifyProductIdentity(entry, {
    identities: ['2025 Example | Specialized'],
    source_url: 'https://www.specialized.com/us/en/2025-example/p/123',
    model_year_evidence: {
      source_url: 'https://www.specialized.com/us/en/archive/2026',
      identity: '2026 Example | Specialized',
      evidence_scope: 'official_archive_link',
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.reason, /model year/i);
});

test('allows page identity to prove model while URL proves expected year', () => {
  assert.equal(verifyProductIdentity(entry, {
    identities: ['Example | Specialized'],
    source_url: 'https://www.specialized.com/us/en/2026/example/p/123',
  }).valid, true);
});

test('uses URL path only when page identity is absent and still requires exact model plus year', () => {
  assert.equal(verifyProductIdentity(entry, {
    identities: [],
    source_url: 'https://www.specialized.com/us/en/2026-example/p/123',
  }).valid, true);
  assert.equal(verifyProductIdentity(entry, {
    identities: [],
    source_url: 'https://www.specialized.com/us/en/2026-example-pro/p/123',
  }).valid, false);
});

test('unicode accents and bullet separators normalize without splitting model identity', () => {
  const accented = {
    brand: 'Cervélo',
    model: 'Áspero-5',
    model_year: 2026,
    manufacturer_url: 'https://www.cervelo.com/en-US/bikes/gravel/2026-aspero-5',
  };
  assert.equal(verifyProductIdentity(accented, {
    identities: ['2026 Áspero-5 • Cervélo'],
    source_url: accented.manufacturer_url,
  }).valid, true);
});
