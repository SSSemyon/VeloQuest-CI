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

test('parses a finite literal bike-id list without broadening catalog identity', () => {
  const sql = `
    insert into public.bike_catalog_component_fitments
      (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
    select m.id, 'oem-format-rd', 'factory_installed', 'https://www.format.bike/bike/example/', '2026-08-17', 'Exact product evidence.'
    from public.bike_catalog_models m
    where m.id in ('format-a-2026-ru', 'format-b-2025-ru')
    on conflict (bike_id, component_id, fitment_type) do nothing;
  `;
  const rows = parseBikeFitmentSelectRows(sql);
  assert.deepEqual(rows, [
    {
      bike_id: 'format-a-2026-ru',
      row: {
        component_id: 'oem-format-rd',
        fitment_type: 'factory_installed',
        evidence_url: 'https://www.format.bike/bike/example/',
        evidence_checked_at: '2026-08-17',
        notes: 'Exact product evidence.',
      },
    },
    {
      bike_id: 'format-b-2025-ru',
      row: {
        component_id: 'oem-format-rd',
        fitment_type: 'factory_installed',
        evidence_url: 'https://www.format.bike/bike/example/',
        evidence_checked_at: '2026-08-17',
        notes: 'Exact product evidence.',
      },
    },
  ]);
});

test('allows evidence_url to come only from the exact selected model manufacturer_url', () => {
  const sql = `
    insert into public.bike_catalog_component_fitments
      (bike_id, component_id, fitment_type, evidence_url, evidence_checked_at, notes)
    select m.id, 'oem-exact-rd', 'factory_installed', m.manufacturer_url, '2026-08-17', 'Uses the exact catalog product page.'
    from public.bike_catalog_models m
    where m.id in ('bike-a-2026-global', 'bike-b-2026-global')
    on conflict (bike_id, component_id, fitment_type) do nothing;
  `;
  assert.deepEqual(parseBikeFitmentSelectRows(sql), [
    {
      bike_id: 'bike-a-2026-global',
      model_columns: { evidence_url: 'manufacturer_url' },
      row: {
        component_id: 'oem-exact-rd',
        fitment_type: 'factory_installed',
        evidence_checked_at: '2026-08-17',
        notes: 'Uses the exact catalog product page.',
      },
    },
    {
      bike_id: 'bike-b-2026-global',
      model_columns: { evidence_url: 'manufacturer_url' },
      row: {
        component_id: 'oem-exact-rd',
        fitment_type: 'factory_installed',
        evidence_checked_at: '2026-08-17',
        notes: 'Uses the exact catalog product page.',
      },
    },
  ]);
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

test('fails closed on non-literal bike-id selectors', () => {
  const sql = `
    insert into public.bike_catalog_component_fitments (bike_id, component_id, fitment_type)
    select m.id, 'part', 'factory_installed'
    from public.bike_catalog_models m
    where m.id in (select bike_id from public.some_other_table)
    on conflict (bike_id, component_id, fitment_type) do nothing;
  `;
  assert.throws(() => parseBikeFitmentSelectRows(sql), /exact brand\/model\/model_year|literal bike ids/i);
});

test('fails closed on any other computed SELECT expression', () => {
  const sql = `
    insert into public.bike_catalog_component_fitments (bike_id, component_id, fitment_type, evidence_url)
    select m.id, 'part', 'factory_installed', m.evidence_checked_at
    from public.bike_catalog_models m
    where m.brand='WELT' and m.model='Ranger 3.0' and m.model_year=2026
    on conflict (bike_id, component_id, fitment_type) do nothing;
  `;
  assert.throws(() => parseBikeFitmentSelectRows(sql), /unsupported fitment SELECT expression/i);
});
