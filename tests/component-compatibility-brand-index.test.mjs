import assert from 'node:assert/strict';
import test from 'node:test';

import * as compiler from '../catalog-harvester/component-compatibility-compiler-core.mjs';

test('component brand index is built only from exact committed garage_components rows', () => {
  assert.equal(typeof compiler.buildGarageComponentBrandIndex, 'function');
  const index = compiler.buildGarageComponentBrandIndex([
    {
      file: 'garage_catalog.sql',
      sql: `insert into public.garage_components (id, brand, model, category) values
        ('shimano-rd-r7150', 'Shimano', 'RD-R7150', 'rear_derailleur'),
        ('sram-cs-xg-1275-b1', 'SRAM', 'CS-XG-1275-B1', 'cassette')
      on conflict (id) do update set brand = excluded.brand;`,
    },
  ]);
  assert.equal(index['shimano-rd-r7150'], 'Shimano');
  assert.equal(index['sram-cs-xg-1275-b1'], 'SRAM');
});

test('component brand index does not confuse a non-brand UPDATE with a later upsert brand clause', () => {
  const index = compiler.buildGarageComponentBrandIndex([
    {
      file: 'mixed-wave.sql',
      sql: `
        update public.garage_components set specs = specs || '{"speeds":12}'::jsonb where id = 'existing-part';
        insert into public.garage_components (id, brand) values ('new-part', 'Shimano')
        on conflict (id) do update set brand = excluded.brand;
      `,
    },
  ]);
  assert.equal(index['new-part'], 'Shimano');
});

test('component brand index fails closed on conflicting brands for one exact component id', () => {
  assert.equal(typeof compiler.buildGarageComponentBrandIndex, 'function');
  assert.throws(() => compiler.buildGarageComponentBrandIndex([
    { file: 'wave-a.sql', sql: `insert into public.garage_components (id, brand) values ('part-1', 'Shimano') on conflict (id) do update set brand = excluded.brand;` },
    { file: 'wave-b.sql', sql: `insert into public.garage_components (id, brand) values ('part-1', 'SRAM') on conflict (id) do update set brand = excluded.brand;` },
  ]), /conflicting garage component brand/i);
});

test('component brand index rejects non-VALUES garage_components inserts instead of guessing', () => {
  assert.equal(typeof compiler.buildGarageComponentBrandIndex, 'function');
  assert.throws(() => compiler.buildGarageComponentBrandIndex([
    { file: 'unsafe.sql', sql: `insert into public.garage_components (id, brand) select id, brand from public.other_components;` },
  ]), /cannot build exact component brand index/i);
});
