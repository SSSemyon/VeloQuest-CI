import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

const waves = [
  [45, 'supabase/schema/catalog_enrichment_wave_45_shulz_russia_2026_08_17.sql', 'supabase/migrations/20260817183000_garage_enrichment_wave45.sql'],
  [46, 'supabase/schema/catalog_enrichment_wave_46_welt_russia_2026_08_17.sql', 'supabase/migrations/20260817184000_garage_enrichment_wave46.sql'],
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
  });
}

test('Wave45 adds four exact SHULZ 2026 core cards and four OEM fitments without media inference', () => {
  const sql = read(waves[0][1]);
  for (const id of [
    'shulz-big-time-2026-ru',
    'shulz-sunday-2026-ru',
    'shulz-mountain-monster-2026-ru',
    'shulz-kukisvumchorr-25-km-2026-ru',
  ]) assert.match(sql, new RegExp(id));
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, 4);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.bike_catalog_images/i);
});

test('Wave46 adds two exact WELT 2026 core cards and resolves fitments by catalog identity', () => {
  const sql = read(waves[1][1]);
  assert.match(sql, /welt-ranger-3-0-2026-ru/);
  assert.match(sql, /welt-voyager-1-0-2026-ru/);
  assert.match(sql, /Shimano Cues RD-U6020/);
  assert.match(sql, /Shimano Essa RD-U2000-GS/);
  assert.equal((sql.match(/'factory_installed'/g) ?? []).length, 2);
  assert.equal((sql.match(/from public\.bike_catalog_models m/g) ?? []).length, 2);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.bike_catalog_images/i);
});
