import assert from 'node:assert/strict';
import test from 'node:test';

async function loadParser() {
  try {
    return await import('../scripts/garage-model-update-parser.mjs');
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return { parseBikeCatalogModelUpdates: () => [] };
  }
}

const specsFirst = `
update public.bike_catalog_models
set specs=specs||'{"rear_derailleur":"Shimano XT"}'::jsonb,
    manufacturer_url='https://example.com/exact-bike-2026',
    evidence_checked_at='2026-08-17'
where id='bike-specs-first';
`;

const manufacturerFirst = `
update public.bike_catalog_models
set manufacturer_url='https://example.com/exact-author-2020',
    specs=specs||'{"rear_derailleur":"Shimano Deore"}'::jsonb,
    evidence_checked_at=greatest(evidence_checked_at,'2026-08-17')
where id='bike-manufacturer-first';
`;

test('parses exact manufacturer URL when specs assignment comes first', async () => {
  const { parseBikeCatalogModelUpdates } = await loadParser();
  const [row] = parseBikeCatalogModelUpdates(specsFirst);
  assert.equal(row?.id, 'bike-specs-first');
  assert.equal(row?.manufacturerUrl, 'https://example.com/exact-bike-2026');
  assert.equal(row?.evidenceCheckedAt, '2026-08-17');
  assert.equal(row?.patch.rear_derailleur, 'Shimano XT');
});

test('parses exact manufacturer URL when manufacturer assignment comes before specs', async () => {
  const { parseBikeCatalogModelUpdates } = await loadParser();
  const [row] = parseBikeCatalogModelUpdates(manufacturerFirst);
  assert.equal(row?.id, 'bike-manufacturer-first');
  assert.equal(row?.manufacturerUrl, 'https://example.com/exact-author-2020');
  assert.equal(row?.evidenceCheckedAt, '2026-08-17');
  assert.equal(row?.patch.rear_derailleur, 'Shimano Deore');
});

test('ignores model updates that do not merge a specs JSON patch', async () => {
  const { parseBikeCatalogModelUpdates } = await loadParser();
  const rows = parseBikeCatalogModelUpdates(`update public.bike_catalog_models set manufacturer_url='https://example.com/x' where id='x';`);
  assert.deepEqual(rows, []);
});
