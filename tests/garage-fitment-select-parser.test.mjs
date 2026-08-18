import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBikeFitmentSelectRows } from '../scripts/garage-fitment-select-parser.mjs';

test('parses exact identity-bound factory fitment SELECT', () => {
  const sql = `
    insert into public.bike_catalog_component_fitments
      (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
    select m.id, 'oem-welt-ranger-rd', 'factory_installed', 'https://example.com/ranger', '2026-08-17', 'Exact OEM spec.'
    from public.bike_catalog_models m
    where m.brand='WELT' and m.model='Ranger 3.0' and m.model_year=2026 and m.trim='' and m.market='ru'
    on conflict (bike_id, component_id, fitment_type) do update set notes=excluded.notes;
  `;
  const rows = parseBikeFitmentSelectRows(sql);
  assert.deepEqual(rows, [{
    identity: { brand: 'WELT', model: 'Ranger 3.0', model_year: 2026, trim: '', market: 'ru' },
    row: {
      component_id: 'oem-welt-ranger-rd',
      fitment_type: 'factory_installed',
      evidence_url: 'https://example.com/ranger',
      evidence_checked_at: '2026-08-17',
      notes: 'Exact OEM spec.',
    },
  }]);
});

test('fails closed when bike identity is not exact', () => {
  const sql = `
    insert into public.bike_catalog_component_fitments (bike_id, component_id, fitment_type)
    select m.id, 'part', 'factory_installed'
    from public.bike_catalog_models m
    where m.brand='WELT' and m.model_year=2026
    on conflict (bike_id, component_id, fitment_type) do nothing;
  `;
  assert.throws(() => parseBikeFitmentSelectRows(sql), /exact brand\/model\/model_year/i);
});

test('fails closed on computed SELECT expressions instead of guessing', () => {
  const sql = `
    insert into public.bike_catalog_component_fitments (bike_id, component_id, fitment_type)
    select m.id, m.model, 'factory_installed'
    from public.bike_catalog_models m
    where m.brand='WELT' and m.model='Ranger 3.0' and m.model_year=2026
    on conflict (bike_id, component_id, fitment_type) do nothing;
  `;
  assert.throws(() => parseBikeFitmentSelectRows(sql), /unsupported fitment SELECT expression/i);
});
