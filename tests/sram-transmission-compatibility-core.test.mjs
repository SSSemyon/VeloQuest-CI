import assert from 'node:assert/strict';
import test from 'node:test';

import { materializeSramEagleTransmissionCompatibility } from '../catalog-harvester/sram-transmission-compatibility-core.mjs';

const html = `
  <h2>COMPONENT COMPATABILITY</h2>
  <p>parts with the T-Type designation are engineered to work with the Transmission only.</p>
  <p>The freedom to mix and match Eagle components remains within each system.</p>
  <p>XX DH Transmission derailleurs and cassettes are not cross-compatible within the Eagle Transmission ecosystem.</p>`;

const officialTargets = [
  { id: 'sram-cs-xs-1275-a1', brand: 'SRAM', model: 'CS-XS-1275-A1', display_name: 'XS-1275 Eagle Transmission Cassette', category: 'cassette', specs: { speeds: 12, chain_technology: 'T-Type', system: 'Eagle Transmission' }, evidence_url: 'https://www.sram.com/en/service/models/cs-xs-1275-a1' },
  { id: 'sram-cs-xs-1295-a1', brand: 'SRAM', model: 'CS-XS-1295-A1', display_name: 'XS-1295 Eagle Transmission Cassette', category: 'cassette', specs: { speeds: 12, chain_technology: 'T-Type', system: 'Eagle Transmission' }, evidence_url: 'https://www.sram.com/en/service/models/cs-xs-1295-a1' },
];

test('standard SRAM Eagle Transmission OEM rear derailleur can mix with official non-DH T-Type cassette targets', () => {
  const source = { id: 'oem-bike-gx-transmission-rd', brand: 'SRAM', model: 'GX Eagle Transmission', display_name: 'SRAM GX Eagle Transmission', category: 'rear_derailleur', specs: { speeds: 12, evidence_scope: 'exact-product OEM listing' }, evidence_url: 'https://bike-maker.example/exact-bike' };
  const result = materializeSramEagleTransmissionCompatibility({ html, components: [source, ...officialTargets] });
  assert.deepEqual(result.pairs.map((pair) => pair.target_component_id).sort(), ['sram-cs-xs-1275-a1', 'sram-cs-xs-1295-a1']);
  assert.equal(result.pairs.every((pair) => pair.status === 'compatible'), true);
  assert.equal(result.pairs.every((pair) => pair.source_component_id === source.id), true);
});

test('XX DH Transmission stays excluded from standard Eagle Transmission compatibility', () => {
  const dh = { id: 'sram-rd-xx-dh-e-a1', brand: 'SRAM', model: 'XX DH Transmission', display_name: 'XX DH Transmission Derailleur', category: 'rear_derailleur', specs: { speeds: 7, chain_technology: 'T-Type', system: 'DH Transmission' }, evidence_url: 'https://www.sram.com/en/service/models/rd-xx-dh-e-a1' };
  const result = materializeSramEagleTransmissionCompatibility({ html, components: [dh, ...officialTargets] });
  assert.deepEqual(result.pairs, []);
  assert.match(result.unresolved[0].reason, /DH Transmission/i);
});

test('target must have official SRAM evidence and explicit T-Type Transmission identity', () => {
  const source = { id: 'sram-rd-gx-e-b1', brand: 'SRAM', model: 'RD-GX-E-B1', display_name: 'GX Eagle Transmission Derailleur', category: 'rear_derailleur', specs: { speeds: 12, chain_technology: 'T-Type', system: 'Eagle Transmission' }, evidence_url: 'https://www.sram.com/en/service/models/rd-gx-e-b1' };
  const badTargets = [
    { id: 'copied-target', brand: 'SRAM', model: 'XS-1275', display_name: 'Eagle Transmission', category: 'cassette', specs: { speeds: 12, chain_technology: 'T-Type', system: 'Eagle Transmission' }, evidence_url: 'https://example.com/copied' },
    { id: 'legacy-eagle', brand: 'SRAM', model: 'PG-1230', display_name: 'NX Eagle Cassette', category: 'cassette', specs: { speeds: 12, chain_technology: 'Eagle' }, evidence_url: 'https://www.sram.com/en/service/models/cs-pg-1230-a1' },
  ];
  const result = materializeSramEagleTransmissionCompatibility({ html, components: [source, ...badTargets] });
  assert.deepEqual(result.pairs, []);
  assert.match(result.unresolved[0].reason, /official non-DH T-Type cassette target/i);
});

test('missing explicit SRAM system statement fails closed', () => {
  const source = { id: 'sram-rd-gx-e-b1', brand: 'SRAM', model: 'RD-GX-E-B1', display_name: 'GX Eagle Transmission Derailleur', category: 'rear_derailleur', specs: { speeds: 12, chain_technology: 'T-Type', system: 'Eagle Transmission' }, evidence_url: 'https://www.sram.com/en/service/models/rd-gx-e-b1' };
  const result = materializeSramEagleTransmissionCompatibility({ html: '<p>Marketing copy only.</p>', components: [source, ...officialTargets] });
  assert.deepEqual(result.pairs, []);
  assert.match(result.unresolved[0].reason, /mix-and-match/i);
});
