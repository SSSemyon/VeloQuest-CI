import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

const waves = [
  [47, 'supabase/schema/catalog_enrichment_wave_47_stinger_russia_exact_2026_08_17.sql', 'supabase/migrations/20260817185000_garage_enrichment_wave47.sql'],
  [48, 'supabase/schema/catalog_enrichment_wave_48_bearbike_russia_exact_2026_08_17.sql', 'supabase/migrations/20260817190000_garage_enrichment_wave48.sql'],
];

for (const [wave, sourcePath, migrationPath] of waves) {
  test(`Wave${wave} migration is byte-derived from its source`, () => {
    const source = read(sourcePath);
    const migration = read(migrationPath);
    assert.equal(migration, `-- SOURCE: ${sourcePath}\n${source}`);
  });

  test(`Wave${wave} remains evidence-only and does not infer compatibility or outcomes`, () => {
    const source = read(sourcePath);
    assert.doesNotMatch(source, /insert\s+into\s+public\.garage_compatibility/i);
    assert.doesNotMatch(source, /insert\s+into\s+public\.garage_recommendation_outcomes/i);
    assert.doesNotMatch(source, /manufacturer_approved/i);
    assert.doesNotMatch(source, /no_upgrade/i);
    assert.doesNotMatch(source, /insert\s+into\s+public\.bike_catalog_images/i);
  });
}

test('Wave47 adds one exact Stinger 2025 core card and one OEM fitment', () => {
  const sql = read(waves[0][1]);
  assert.match(sql, /stinger-graphite-pro-29-2025-ru/);
  assert.match(sql, /Shimano CUES U6000/);
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, 1);
  assert.match(sql, /model year 2025/i);
});

test('Wave48 adds one exact Bear Bike 2023 core card and one Nexus OEM fitment', () => {
  const sql = read(waves[1][1]);
  assert.match(sql, /bearbike-palermo-2023-ru/);
  assert.match(sql, /Shimano Nexus 8-speed/);
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, 1);
  assert.match(sql, /model year 2023/i);
});
