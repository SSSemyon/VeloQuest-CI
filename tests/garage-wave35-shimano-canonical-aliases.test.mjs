import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/catalog_enrichment_wave_35_shimano_canonical_aliases_2026_08_17.sql', 'utf8');
const migration = fs.existsSync('supabase/migrations/20260817165000_garage_enrichment_wave35.sql')
  ? fs.readFileSync('supabase/migrations/20260817165000_garage_enrichment_wave35.sql', 'utf8') : '';

test('Wave35 creates read-only component alias contract', () => {
  assert.match(sql, /create table if not exists public\.garage_component_aliases/i);
  assert.match(sql, /alter table public\.garage_component_aliases enable row level security/i);
  assert.match(sql, /for select to authenticated using \(true\)/i);
  assert.match(sql, /revoke all on public\.garage_component_aliases from anon/i);
  assert.match(sql, /grant select on public\.garage_component_aliases to authenticated/i);
  assert.match(sql, /revoke insert, update, delete on public\.garage_component_aliases from authenticated/i);
});

test('Wave35 aliases exact OEM Shimano road derailleurs to canonical identities', () => {
  for (const pair of [
    ['shimano-rd-r9250-oem-specialized','shimano-rd-r9250'],
    ['shimano-rd-r9250-oem-lapierre','shimano-rd-r9250'],
    ['oem-specialized-tarmac-sl8-pro-ultegra-2025-rd','shimano-rd-r8150'],
    ['oem-specialized-roubaix-sl8-comp-2025-rd','shimano-rd-r7150'],
  ]) assert.match(sql, new RegExp(`'${pair[0]}'\\s*,\\s*'${pair[1]}'`));
});

test('Wave35 encodes Shimano C-254 cassette verdicts only', () => {
  assert.match(sql, /shimano-rd-r9250[\s\S]*shimano-cs-r9200[\s\S]*'compatible'/i);
  assert.match(sql, /shimano-rd-r7150[\s\S]*shimano-cs-r7101-12-11-34[\s\S]*'compatible'/i);
  assert.match(sql, /shimano-rd-r7150[\s\S]*shimano-cs-hg710-12[\s\S]*'compatible'/i);
  assert.match(sql, /productinfo\.shimano\.com\/en\/compatibility\/C-254/);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /garage_recommendation_outcomes/i);
});

test('Wave35 has deterministic migration', () => {
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_35_shimano_canonical_aliases_2026_08_17\.sql/);
});
