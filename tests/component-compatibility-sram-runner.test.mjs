import assert from 'node:assert/strict';
import test from 'node:test';

import { runComponentCompatibilityManifest } from '../catalog-harvester/component-compatibility-runner.mjs';

const ruleHtml = `
  <h2>COMPONENT COMPATABILITY</h2>
  <p>parts with the T-Type designation are engineered to work with the Transmission only.</p>
  <p>The freedom to mix and match Eagle components remains within each system.</p>
  <p>XX DH Transmission derailleurs and cassettes are not cross-compatible within the Eagle Transmission ecosystem.</p>`;

const target = { id: 'sram-cs-xs-1295-a1', brand: 'SRAM', model: 'CS-XS-1295-A1', display_name: 'XS-1295 Eagle Transmission Cassette', category: 'cassette', specs: { speeds: 12, chain_technology: 'T-Type', system: 'Eagle Transmission' }, evidence_url: 'https://www.sram.com/en/service/models/cs-xs-1295-a1' };

test('runner resolves standard SRAM Eagle Transmission demand from one official system-rule fetch', async () => {
  const source = { id: 'sram-rd-x0-e-b1', brand: 'SRAM', model: 'RD-X0-E-B1', display_name: 'X0 Eagle Transmission Derailleur', category: 'rear_derailleur', specs: { speeds: 12, chain_technology: 'T-Type', system: 'Eagle Transmission' }, evidence_url: 'https://www.sram.com/en/service/models/rd-x0-e-b1' };
  const manifest = { entries: [{ component_id: source.id, brand: 'SRAM', model: source.model, category: 'rear_derailleur', impact_bikes: 2, bike_ids: ['a', 'b'] }] };
  const requested = [];
  const result = await runComponentCompatibilityManifest({
    manifest,
    componentRegistry: [source, target],
    fetchImpl: async (url) => {
      requested.push(url);
      return { ok: true, status: 200, text: async () => ruleHtml };
    },
    checkedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'resolved');
  assert.equal(result.entries[0].evidence_url, 'https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance');
  assert.deepEqual(result.entries[0].pairs.map((pair) => pair.target_component_id), ['sram-cs-xs-1295-a1']);
  assert.deepEqual(requested, ['https://www.sram.com/en/learn/eagle-transmission-welcome-guide/easy-maintenance']);
});

test('runner resolves bike-scoped S-1000 OEM evidence when the exact manufacturer page explicitly identifies Eagle Transmission', async () => {
  const source = { id: 'sram-s1000-eagle-transmission-oem-specialized', brand: 'SRAM', model: 'S-1000 Eagle Transmission', display_name: 'SRAM S-1000 Eagle Transmission', category: 'rear_derailleur', specs: { speeds: 12, evidence_scope: 'Specialized exact-product OEM listing' }, evidence_url: 'https://www.specialized.com/ch/en/epic-8-comp-sram-s-1000-axs-rockshox-select/p/4221499' };
  const manifest = { entries: [{ component_id: source.id, brand: 'SRAM', model: source.model, category: 'rear_derailleur', impact_bikes: 1, bike_ids: ['specialized-epic-8-comp-sram-s-1000-axs-rockshox-select-2026-global'] }] };
  const result = await runComponentCompatibilityManifest({
    manifest,
    componentRegistry: [source, target],
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => ruleHtml }),
    checkedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'resolved');
  assert.deepEqual(result.entries[0].pairs.map((pair) => [pair.source_component_id, pair.target_component_id, pair.status]), [
    ['sram-s1000-eagle-transmission-oem-specialized', 'sram-cs-xs-1295-a1', 'compatible'],
  ]);
});

test('runner keeps XX DH Transmission default-deny', async () => {
  const source = { id: 'sram-rd-xx-dh-e-a1', brand: 'SRAM', model: 'XX DH Transmission', display_name: 'XX DH Transmission Derailleur', category: 'rear_derailleur', specs: { speeds: 7, chain_technology: 'T-Type', system: 'DH Transmission' }, evidence_url: 'https://www.sram.com/en/service/models/rd-xx-dh-e-a1' };
  const manifest = { entries: [{ component_id: source.id, brand: 'SRAM', model: source.model, category: 'rear_derailleur', impact_bikes: 1, bike_ids: ['dh'] }] };
  const result = await runComponentCompatibilityManifest({
    manifest,
    componentRegistry: [source, target],
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => ruleHtml }),
    checkedAt: '2026-08-18',
  });
  assert.equal(result.entries[0].status, 'unsupported_adapter');
  assert.equal(result.entries[0].pairs, undefined);
});
