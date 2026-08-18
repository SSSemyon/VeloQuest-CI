import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateGarageAliasContracts } from './garage-alias-contract-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const collectSql = (dir) => fs.readdirSync(dir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => fs.readFileSync(path.join(dir, file), 'utf8'));

const sources = [
  ...collectSql(path.join(root, 'supabase', 'schema')),
  ...collectSql(path.join(root, 'supabase', 'migrations')),
];
const failures = validateGarageAliasContracts(sources);

const wave35 = fs.readFileSync(path.join(root, 'supabase', 'schema', 'catalog_enrichment_wave_35_shimano_canonical_aliases_2026_08_17.sql'), 'utf8');
const wave36 = fs.readFileSync(path.join(root, 'supabase', 'schema', 'catalog_enrichment_wave_36_shimano_grx_alias_2026_08_17.sql'), 'utf8');
const wave37 = fs.readFileSync(path.join(root, 'supabase', 'schema', 'catalog_enrichment_wave_37_sram_transmission_aliases_2026_08_17.sql'), 'utf8');
const client = fs.readFileSync(path.join(root, 'src', 'backend', 'garageCatalog.ts'), 'utf8');

const requireText = (text, pattern, message) => {
  if (!pattern.test(text)) failures.push(message);
};
requireText(wave35, /revoke all on public\.garage_component_aliases from anon/i, 'Wave35 must revoke all alias-table privileges from anon');
requireText(wave35, /grant select on public\.garage_component_aliases to authenticated/i, 'Wave35 must grant authenticated SELECT on aliases');
requireText(wave35, /revoke insert, update, delete on public\.garage_component_aliases from authenticated/i, 'Wave35 must revoke authenticated alias writes');
requireText(wave35, /productinfo\.shimano\.com\/en\/compatibility\/C-254/i, 'Wave35 must retain Shimano C-254 evidence');
requireText(wave36, /productinfo\.shimano\.com\/en\/compatibility\/C-254/i, 'Wave36 must retain Shimano C-254 evidence');
requireText(wave37, /sram\.com\/en\/learn\/eagle-transmission-welcome-guide\/easy-maintenance/i, 'Wave37 must retain SRAM Transmission evidence');

for (const [name, source] of [['Wave35', wave35], ['Wave36', wave36], ['Wave37', wave37]]) {
  if (/insert\s+into\s+public\.garage_recommendation_outcomes/i.test(source)) failures.push(`${name} must not emit bike-level recommendation outcomes`);
  if (/manufacturer_approved/i.test(source)) failures.push(`${name} must not emit manufacturer_approved fitments`);
}
if (/from\('garage_component_aliases'\)[\s\S]{0,250}\.(?:insert|update|upsert|delete)\(/i.test(client)) {
  failures.push('client must never write garage_component_aliases');
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: [...new Set(failures)] }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  sqlSources: sources.length,
  contractWaves: [35, 36, 37],
  clientWritesAliases: false,
}, null, 2));
