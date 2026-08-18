import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const config = JSON.parse(read('catalog-harvester/config.json'));

const waves = [
  [40, 'supabase/schema/catalog_enrichment_wave_40_hagen_exact_2026_08_17.sql', 'supabase/migrations/20260817174000_garage_enrichment_wave40.sql'],
  [41, 'supabase/schema/catalog_enrichment_wave_41_format_russia_exact_2026_08_17.sql', 'supabase/migrations/20260817175000_garage_enrichment_wave41.sql'],
  [42, 'supabase/schema/catalog_enrichment_wave_42_format_russia_fitment_2026_08_17.sql', 'supabase/migrations/20260817180000_garage_enrichment_wave42.sql'],
  [43, 'supabase/schema/catalog_enrichment_wave_43_stark_russia_2026_08_17.sql', 'supabase/migrations/20260817181000_garage_enrichment_wave43.sql'],
  [44, 'supabase/schema/catalog_enrichment_wave_44_aspect_russia_2026_08_17.sql', 'supabase/migrations/20260817182000_garage_enrichment_wave44.sql'],
];

for (const [wave, sourcePath, migrationPath] of waves) {
  test(`Wave${wave} migration is byte-derived from its source`, () => {
    const source = read(sourcePath);
    const migration = read(migrationPath);
    assert.equal(migration, `-- SOURCE: ${sourcePath}\n${source}`);
  });

  test(`Wave${wave} does not infer compatibility or recommendation outcomes`, () => {
    const source = read(sourcePath);
    assert.doesNotMatch(source, /insert\s+into\s+public\.garage_compatibility/i);
    assert.doesNotMatch(source, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
    assert.doesNotMatch(source, /manufacturer_approved/i);
  });
}

test('Russia-first harvester sources remain first and allowlisted', () => {
  const expected = ['Hagen', 'FORMAT', 'STARK', 'Aspect', 'STELS', 'Stinger', 'Bear Bike', 'SHULZ', 'WELT'];
  assert.deepEqual(config.sources.slice(0, expected.length).map((source) => source.brand), expected);
  for (const brand of expected) {
    const source = config.sources.find((item) => item.brand === brand);
    assert.ok(source, `${brand} source missing`);
    assert.ok(source.entry.startsWith('https://'), `${brand} entry must be HTTPS`);
    assert.ok(source.officialHosts.length > 0, `${brand} must have official host allowlist`);
  }
});

test('Wave40 materializes nine exact HAGEN bikes with media and fitment', () => {
  const sql = read(waves[0][1]);
  assert.equal((sql.match(/'manufacturer','HAGEN'/g) ?? []).length, 9);
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, 9);
  assert.match(sql, /hagen-7-12gr-2026-ru/);
  assert.doesNotMatch(sql, /RD-RX822-(?:GS|SGS)/i);
});

test('Wave41 adds twenty Russia-market FORMAT models and twenty media rows', () => {
  const sql = read(waves[1][1]);
  assert.equal((sql.match(/'FORMAT'/g) ?? []).length >= 20, true);
  assert.equal((sql.match(/'authorized_retailer','FORMAT Russia official representative'/g) ?? []).length, 20);
  assert.equal((sql.match(/'source_scope':'official_russia_representative'/g) ?? []).length, 0, 'source_scope must live inside JSON, not SQL pseudo-fields');
  assert.equal((sql.match(/"source_scope":"official_russia_representative"/g) ?? []).length, 20);
});

test('Wave42 makes all twenty FORMAT fitments explicit for static replay', () => {
  const sql = read(waves[2][1]);
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, 20);
  assert.equal((sql.match(/oem-format-[^']+-rd/g) ?? []).length >= 40, true);
});

test('Wave43 adds six STARK core cards and six exact OEM fitments', () => {
  const sql = read(waves[3][1]);
  assert.equal((sql.match(/'STARK'/g) ?? []).length >= 6, true);
  assert.equal((sql.match(/'manufacturer','STARK official store'/g) ?? []).length, 6);
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, 6);
  assert.match(sql, /single-speed/);
  assert.match(sql, /oem-stark-pusher-pro-hd-2026-brake/);
});

test('Wave44 adds only explicitly 2026 Aspect cards with five media and fitments', () => {
  const sql = read(waves[4][1]);
  const ids = [
    'aspect-allroad-elite-2026-ru',
    'aspect-cobalt-29-2026-ru',
    'aspect-cobalt-elite-29-2026-ru',
    'aspect-cobalt-expert-29-2026-ru',
    'aspect-cobalt-pro-29-2026-ru',
  ];
  for (const id of ids) assert.match(sql, new RegExp(id));
  assert.equal((sql.match(/'manufacturer','Aspect'/g) ?? []).length, 5);
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, 5);
  assert.doesNotMatch(sql, /RD-RX822-(?:GS|SGS)/i);
  assert.doesNotMatch(sql, /RD-M6100-(?:GS|SGS)/i);
});
