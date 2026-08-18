import assert from 'node:assert/strict';
import test from 'node:test';

import { validateGarageAliasContracts } from '../scripts/garage-alias-contract-core.mjs';

const validSources = [
  `insert into public.garage_components (id) values\n  ('alias-oem'),\n  ('canonical-rd'),\n  ('target-cassette');`,
  `insert into public.garage_component_aliases (alias_component_id, canonical_component_id, evidence_url, evidence_checked_at, notes) values\n  ('alias-oem', 'canonical-rd', 'https://example.com/evidence', '2026-08-17', 'exact identity');\ninsert into public.garage_compatibility (source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at, evidence_notes) values\n  ('canonical-rd', 'target-cassette', 'compatible', 'rule', 'https://example.com/compat', '2026-08-17', 'notes');`,
];

test('accepts aliases and compatibility rules whose component identities exist', () => {
  assert.deepEqual(validateGarageAliasContracts(validSources), []);
});

test('rejects alias source or canonical target that does not exist', () => {
  const sources = [validSources[0], validSources[1].replace("'alias-oem', 'canonical-rd'", "'missing-oem', 'missing-canonical'")];
  const failures = validateGarageAliasContracts(sources);
  assert.match(failures.join('\n'), /missing alias component missing-oem/);
  assert.match(failures.join('\n'), /missing canonical component missing-canonical/);
});

test('rejects compatibility source or target that does not exist', () => {
  const sources = [validSources[0], validSources[1].replace("'canonical-rd', 'target-cassette', 'compatible'", "'missing-source', 'missing-target', 'compatible'")];
  const failures = validateGarageAliasContracts(sources);
  assert.match(failures.join('\n'), /missing compatibility source missing-source/);
  assert.match(failures.join('\n'), /missing compatibility target missing-target/);
});

test('rejects unsupported compatibility status', () => {
  const sources = [validSources[0], validSources[1].replace("'compatible'", "'guessed'")];
  assert.match(validateGarageAliasContracts(sources).join('\n'), /unsupported compatibility status guessed/);
});
