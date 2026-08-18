import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectGarageComponentIdsFromSql,
  compileProductEvidence,
  selectCompilableEvidenceRun,
} from '../catalog-harvester/product-evidence-compiler-core.mjs';

const config = {
  sources: [{ brand: 'Specialized', officialHosts: ['specialized.com', 'www.specialized.com'] }],
};

const entry = {
  bike_id: 'specialized-example-2026-global',
  brand: 'Specialized',
  model: 'Example',
  model_year: 2026,
  manufacturer_url: 'https://www.specialized.com/us/en/example/p/123',
  evidence_checked_at: '2026-08-17',
  status: 'ok',
  evidence: {
    identities: ['2026 Example | Specialized'],
    media: [{
      image_url: 'https://assets.specialized.com/example.webp',
      source_page_url: 'https://www.specialized.com/us/en/example/p/123',
      source_type: 'manufacturer',
    }],
    canonical: {
      frame_material: { value: 'Carbon', source_label: 'Frame', source_value: 'FACT 11m Carbon' },
      wheel_size: { value: '29', source_label: 'Wheel Size', source_value: '29' },
      drivetrain: { value: 'SRAM GX Eagle Transmission', source_label: 'Rear Derailleur', source_value: 'SRAM GX Eagle Transmission' },
      brakes: { value: 'SRAM Maven Silver', source_label: 'Brakes', source_value: 'SRAM Maven Silver' },
    },
    components: {
      rear_derailleur: {
        category: 'rear_derailleur',
        brand: 'SRAM',
        display_name: 'SRAM GX Eagle Transmission',
        source_label: 'Rear Derailleur',
        source_value: 'SRAM GX Eagle Transmission',
      },
    },
    ambiguities: [],
  },
};

const run = { schema_version: 1, generated_at: '2026-08-17', entries: [entry] };

test('compiler emits specs, durable exact-product marker, official media and factory-installed fitment only', () => {
  const sql = compileProductEvidence({
    run,
    config,
    knownBikeIds: new Set(['specialized-example-2026-global']),
  });

  assert.match(sql, /update public\.bike_catalog_models/i);
  assert.match(sql, /"product_evidence_url":"https:\/\/www\.specialized\.com\/us\/en\/example\/p\/123"/);
  assert.match(sql, /"spec_evidence":"https:\/\/www\.specialized\.com\/us\/en\/example\/p\/123"/);
  assert.match(sql, /"frame_material":"Carbon"/);
  assert.match(sql, /insert into public\.bike_catalog_images/i);
  assert.match(sql, /insert into public\.garage_components/i);
  assert.match(sql, /factory_installed/);
  assert.doesNotMatch(sql, /garage_compatibility/i);
  assert.doesNotMatch(sql, /manufacturer_approved/i);
  assert.doesNotMatch(sql, /garage_recommendation_outcomes/i);
  assert.doesNotMatch(sql, /no_upgrade/i);
});

test('compiler rejects tampered ok run whose page identity is a sibling trim', () => {
  const badRun = structuredClone(run);
  badRun.entries[0].evidence.identities = ['2026 Example Pro | Specialized'];
  assert.throws(() => compileProductEvidence({
    run: badRun,
    config,
    knownBikeIds: new Set([entry.bike_id]),
  }), /exact model identity/i);
});

test('compiler rejects tampered ok run whose page identity has the wrong model year', () => {
  const badRun = structuredClone(run);
  badRun.entries[0].evidence.identities = ['2025 Example | Specialized'];
  assert.throws(() => compileProductEvidence({
    run: badRun,
    config,
    knownBikeIds: new Set([entry.bike_id]),
  }), /model year/i);
});

test('compiler rejects same-brand media whose source page differs from exact evidence page', () => {
  const badRun = structuredClone(run);
  badRun.entries[0].evidence.media[0].source_page_url = 'https://www.specialized.com/us/en/example-pro/p/456';
  assert.throws(() => compileProductEvidence({
    run: badRun,
    config,
    knownBikeIds: new Set([entry.bike_id]),
  }), /exact evidence page/i);
});

test('media-only exact product evidence still persists identity-verified product_evidence_url without claiming spec_evidence', () => {
  const mediaOnly = structuredClone(entry);
  mediaOnly.evidence.canonical = {};
  mediaOnly.evidence.components = {};
  const sql = compileProductEvidence({
    run: { ...run, entries: [mediaOnly] },
    config,
    knownBikeIds: new Set([mediaOnly.bike_id]),
  });
  assert.match(sql, /update public\.bike_catalog_models/i);
  assert.match(sql, /"product_evidence_url":"https:\/\/www\.specialized\.com\/us\/en\/example\/p\/123"/);
  assert.doesNotMatch(sql, /"spec_evidence"/);
  assert.match(sql, /insert into public\.bike_catalog_images/i);
});

test('compiler rejects unknown bike ids', () => {
  assert.throws(() => compileProductEvidence({ run, config, knownBikeIds: new Set() }), /unknown bike_id/);
});

test('compiler rejects ambiguous or failed evidence entries', () => {
  const badRun = structuredClone(run);
  badRun.entries[0].status = 'ambiguous';
  assert.throws(() => compileProductEvidence({
    run: badRun,
    config,
    knownBikeIds: new Set(['specialized-example-2026-global']),
  }), /status ambiguous/);
});

test('batch selector keeps only explicit ok evidence and reports every rejection', () => {
  const mixedRun = {
    ...run,
    entries: [
      entry,
      { ...entry, bike_id: 'ambiguous-bike', status: 'ambiguous' },
      { ...entry, bike_id: 'insufficient-bike', status: 'insufficient' },
      { ...entry, bike_id: 'fetch-error-bike', status: 'fetch_error' },
    ],
  };

  const selected = selectCompilableEvidenceRun(mixedRun);
  assert.deepEqual(selected.run.entries.map((item) => item.bike_id), ['specialized-example-2026-global']);
  assert.deepEqual(selected.summary, {
    input: 4,
    accepted: 1,
    rejected: 3,
    rejectedByStatus: { ambiguous: 1, insufficient: 1, fetch_error: 1 },
  });
});

test('batch selector fails closed when extractor output has no accepted evidence', () => {
  assert.throws(() => selectCompilableEvidenceRun({
    ...run,
    entries: [{ ...entry, status: 'ambiguous' }],
  }), /no compilable evidence entries/);
});

test('compiler rejects media whose evidence page is outside the brand allow-list', () => {
  const badRun = structuredClone(run);
  badRun.entries[0].evidence.media[0].source_page_url = 'https://example.com/copied-bike-page';
  assert.throws(() => compileProductEvidence({
    run: badRun,
    config,
    knownBikeIds: new Set(['specialized-example-2026-global']),
  }), /non-official media source page/);
});

test('component registry parser collects only explicit garage component ids', () => {
  const sql = `
    insert into public.garage_components (id, brand, model, category, display_name, specs, unlock_level, evidence_url, evidence_checked_at)
    values
      ('shimano-rd-r9250', 'Shimano', 'RD-R9250', 'rear_derailleur', 'DURA-ACE RD-R9250', '{}'::jsonb, 1, 'https://productinfo.shimano.com/a', '2026-08-17'),
      ('shimano-cs-r9200', 'Shimano', 'CS-R9200', 'cassette', 'DURA-ACE CS-R9200', '{}'::jsonb, 1, 'https://productinfo.shimano.com/b', '2026-08-17');
    insert into public.other_table (id) values ('must-not-be-collected');
  `;
  assert.deepEqual([...collectGarageComponentIdsFromSql(sql)].sort(), ['shimano-cs-r9200', 'shimano-rd-r9250']);
});

test('compiler aliases an OEM rear derailleur only when exact part number names existing canonical component', () => {
  const exact = structuredClone(entry);
  exact.evidence.components.rear_derailleur = {
    category: 'rear_derailleur',
    brand: 'Shimano',
    display_name: 'Shimano Dura-Ace Di2 RD-R9250, 12-speed',
    source_label: 'Rear Derailleur',
    source_value: 'Shimano Dura-Ace Di2 RD-R9250, 12-speed',
  };
  const sql = compileProductEvidence({
    run: { ...run, entries: [exact] },
    config,
    knownBikeIds: new Set([exact.bike_id]),
    knownComponentIds: new Set(['shimano-rd-r9250']),
  });
  assert.match(sql, /insert into public\.garage_component_aliases/i);
  assert.match(sql, /'shimano-rd-r9250'/);
  assert.match(sql, /Exact OEM evidence contains canonical part number RD-R9250/);
});

test('compiler canonicalizes exact cassette part numbers without inferring compatibility', () => {
  const exact = structuredClone(entry);
  exact.evidence.components = {
    cassette: {
      category: 'cassette',
      brand: 'Shimano',
      display_name: 'Shimano CS-M6100-12 10-51T',
      source_label: 'Cassette',
      source_value: 'Shimano CS-M6100-12 10-51T',
    },
  };
  const sql = compileProductEvidence({
    run: { ...run, entries: [exact] },
    config,
    knownBikeIds: new Set([exact.bike_id]),
    knownComponentIds: new Set(['shimano-cs-m6100-12']),
  });
  assert.match(sql, /garage_component_aliases/i);
  assert.match(sql, /'shimano-cs-m6100-12'/);
  assert.match(sql, /canonical part number CS-M6100-12/);
  assert.doesNotMatch(sql, /insert into public\.garage_compatibility/i);
});

test('compiler does not cross-alias a part-number prefix into the wrong component category', () => {
  const exact = structuredClone(entry);
  exact.evidence.components = {
    cassette: {
      category: 'cassette',
      brand: 'Shimano',
      display_name: 'Shimano RD-M6100-SGS text copied into cassette field',
      source_label: 'Cassette',
      source_value: 'Shimano RD-M6100-SGS text copied into cassette field',
    },
  };
  const sql = compileProductEvidence({
    run: { ...run, entries: [exact] },
    config,
    knownBikeIds: new Set([exact.bike_id]),
    knownComponentIds: new Set(['shimano-rd-m6100-sgs']),
  });
  assert.doesNotMatch(sql, /garage_component_aliases/i);
});

test('compiler does not infer identity from family name or unknown part number', () => {
  const familyOnly = structuredClone(entry);
  familyOnly.evidence.components.rear_derailleur = {
    category: 'rear_derailleur',
    brand: 'Shimano',
    display_name: 'Shimano Dura-Ace Di2 R9250',
    source_label: 'Rear Derailleur',
    source_value: 'Shimano Dura-Ace Di2 R9250',
  };
  const unknownExact = structuredClone(entry);
  unknownExact.evidence.components.rear_derailleur = {
    ...familyOnly.evidence.components.rear_derailleur,
    display_name: 'Shimano RD-Z9999',
    source_value: 'Shimano RD-Z9999',
  };
  for (const candidate of [familyOnly, unknownExact]) {
    const sql = compileProductEvidence({
      run: { ...run, entries: [candidate] },
      config,
      knownBikeIds: new Set([candidate.bike_id]),
      knownComponentIds: new Set(['shimano-rd-r9250']),
    });
    assert.doesNotMatch(sql, /garage_component_aliases/i);
  }
});
