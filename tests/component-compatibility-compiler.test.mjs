import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compileResolvedCompatibilityRun,
  selectResolvedCompatibilityRun,
} from '../catalog-harvester/component-compatibility-compiler-core.mjs';

const officialSources = {
  schema_version: 1,
  sources: [
    { brands: ['Shimano'], official_hosts: ['productinfo.shimano.com'] },
    { brands: ['SRAM'], official_hosts: ['sram.com', 'www.sram.com', 'support.sram.com'] },
    { brands: ['microSHIFT', 'MicroSHIFT'], official_hosts: ['microshift.com', 'www.microshift.com'] },
    { brands: ['Campagnolo'], official_hosts: ['campagnolo.com', 'www.campagnolo.com'] },
  ],
};

const componentBrands = {
  'shimano-rd-r7150': 'Shimano',
  'shimano-cs-r7101-12-11-34': 'Shimano',
  'shimano-cs-hg710-12': 'Shimano',
  'sram-cs-xg-1275': 'SRAM',
};

const run = {
  generated_at: '2026-08-17',
  entries: [
    {
      component_id: 'shimano-rd-r7150',
      brand: 'Shimano',
      status: 'resolved',
      evidence_url: 'https://productinfo.shimano.com/en/compatibility/C-254',
      checked_at: '2026-08-17',
      pairs: [
        { source_component_id: 'shimano-rd-r7150', target_component_id: 'shimano-cs-r7101-12-11-34', status: 'compatible', rule_summary: 'Exact official matrix verdict.' },
        { source_component_id: 'shimano-rd-r7150', target_component_id: 'shimano-cs-hg710-12', status: 'compatible', rule_summary: 'Exact official matrix verdict.' },
      ],
    },
    { component_id: 'sram-rd-gx-1-b2', brand: 'SRAM', status: 'unsupported_adapter', error: 'not implemented' },
  ],
};

test('selector keeps only resolved entries with actual pairs', () => {
  const selected = selectResolvedCompatibilityRun(run);
  assert.equal(selected.summary.input, 2);
  assert.equal(selected.summary.accepted, 1);
  assert.equal(selected.summary.rejected, 1);
  assert.equal(selected.summary.pairs, 2);
  assert.deepEqual(selected.summary.rejectedByStatus, { unsupported_adapter: 1 });
});

test('compiler emits only garage_compatibility upserts from official manufacturer evidence', () => {
  const result = compileResolvedCompatibilityRun(run, { officialSources, componentBrands });
  assert.match(result.sql, /insert into public\.garage_compatibility/i);
  assert.match(result.sql, /shimano-rd-r7150/);
  assert.match(result.sql, /shimano-cs-r7101-12-11-34/);
  assert.match(result.sql, /https:\/\/productinfo\.shimano\.com\/en\/compatibility\/C-254/);
  assert.equal(result.summary.uniquePairs, 2);
  assert.doesNotMatch(result.sql, /manufacturer_approved|no_upgrade/i);
  assert.doesNotMatch(result.sql, /bike_catalog_component_fitments/i);
});

test('compiler accepts official target-manufacturer evidence only with exact component brand mapping', () => {
  const crossBrand = structuredClone(run);
  crossBrand.entries = [structuredClone(run.entries[0])];
  crossBrand.entries[0].pairs = [{
    source_component_id: 'shimano-rd-r7150',
    target_component_id: 'sram-cs-xg-1275',
    status: 'compatible',
    rule_summary: 'Exact official target-manufacturer verdict.',
  }];
  crossBrand.entries[0].evidence_url = 'https://www.sram.com/en/service/articles/example-cross-brand-verdict';
  const result = compileResolvedCompatibilityRun(crossBrand, { officialSources, componentBrands });
  assert.match(result.sql, /sram-cs-xg-1275/);
});

test('compiler rejects pair whose source differs from resolved demand component', () => {
  const bad = structuredClone(run);
  bad.entries = [structuredClone(run.entries[0])];
  bad.entries[0].pairs[0].source_component_id = 'other-component';
  assert.throws(() => compileResolvedCompatibilityRun(bad, { officialSources, componentBrands }), /source mismatch/i);
});

test('compiler rejects HTTPS retailer or forum evidence at the final materialization boundary', () => {
  for (const evidence_url of [
    'https://www.bike-discount.de/en/shimano-compatibility',
    'https://www.reddit.com/r/bikewrench/comments/example',
  ]) {
    const bad = structuredClone(run);
    bad.entries = [structuredClone(run.entries[0])];
    bad.entries[0].evidence_url = evidence_url;
    assert.throws(
      () => compileResolvedCompatibilityRun(bad, { officialSources, componentBrands }),
      /non-official compatibility evidence/i,
    );
  }
});

test('compiler rejects official host registered for a different component brand', () => {
  const bad = structuredClone(run);
  bad.entries = [structuredClone(run.entries[0])];
  bad.entries[0].evidence_url = 'https://www.sram.com/en/learn/example';
  assert.throws(
    () => compileResolvedCompatibilityRun(bad, { officialSources, componentBrands }),
    /non-official compatibility evidence/i,
  );
});

test('compiler fails closed when official source registry is missing', () => {
  assert.throws(() => compileResolvedCompatibilityRun(run, { componentBrands }), /official compatibility source registry/i);
});
