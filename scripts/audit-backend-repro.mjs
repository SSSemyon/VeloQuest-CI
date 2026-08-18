import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const supabaseRoot = path.join(root, 'supabase');
const migrationsRoot = path.join(supabaseRoot, 'migrations');
const failures = [];

const requireFile = (relative) => {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) failures.push(`${relative}: missing`);
  return target;
};
const read = (relative) => {
  const target = requireFile(relative);
  return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
};
const requireText = (text, pattern, label) => {
  if (!pattern.test(text)) failures.push(label);
};

const config = read('supabase/config.toml');
const rollout = read('PRODUCTION_BACKEND_ROLLOUT.md');

const jwtExpected = new Map([
  ['migrate-local-alpha', true],
  ['ride-processor', true],
  ['delete-account', true],
  ['route-generator', true],
  ['strava-sync', true],
  ['strava-oauth', false],
  ['strava-webhook', false],
  ['vk-auth-start', false],
  ['vk-auth-callback', false],
  ['vk-auth-finish', false],
]);
for (const [name, verifyJwt] of jwtExpected) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  requireText(config, new RegExp(`\\[functions\\.${escaped}\\]\\s+verify_jwt\\s*=\\s*${verifyJwt}`), `supabase/config.toml: ${name} verify_jwt must be ${verifyJwt}`);
  const source = read(`supabase/functions/${name}/index.ts`);
  requireText(source, /npm:\@supabase\/supabase-js@2\.112\.1/, `${name}: supabase-js dependency must be pinned`);
  if (!verifyJwt && name === 'strava-oauth') requireText(source, /auth\.getUser\(/, 'strava-oauth: custom user authentication missing');
  if (!verifyJwt && name.startsWith('vk-auth-')) requireText(source, /VK_|vk_|claim_vk_oauth_state|consume_vk_ticket_service/, `${name}: custom VK bridge authentication missing`);
  if (!verifyJwt && name === 'strava-webhook') {
    requireText(source, /STRAVA_WEBHOOK_VERIFY_TOKEN/, 'strava-webhook: subscription verification token missing');
    requireText(source, /STRAVA_WEBHOOK_CALLBACK_SECRET/, 'strava-webhook: callback authentication missing');
  }
  if (name === 'migrate-local-alpha') {
    requireText(source, /earnedXp:\s*0/, 'migrate-local-alpha: legacy migration must not award unverified XP');
    if (/payload\.totalXp|\.from\(['"]xp_ledger['"]\)/.test(source)) failures.push('migrate-local-alpha: user-controlled legacy state can mint XP');
  }
}

// The migration generator is the single source of truth for both the exact
// file set and generated contents. Its check must pass before the audit trusts
// the committed migration directory.
const generator = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-supabase-migrations.mjs'), '--check'], { cwd: root, encoding: 'utf8' });
if (generator.status !== 0) failures.push(`generated migration drift: ${(generator.stderr || generator.stdout).trim()}`);

const expectedMigrations = fs.existsSync(migrationsRoot)
  ? fs.readdirSync(migrationsRoot).filter((file) => file.endsWith('.sql')).sort()
  : [];
if (expectedMigrations.length === 0) failures.push('migration set: no committed SQL migrations');
for (const file of expectedMigrations) {
  const text = read(`supabase/migrations/${file}`);
  if (!text.trim()) failures.push(`${file}: empty migration`);
}
for (const file of expectedMigrations.slice(0, 2)) {
  const text = read(`supabase/migrations/${file}`);
  requireText(text, /Migration history compatibility stub/, `${file}: must remain a history compatibility stub`);
}

// Production 0.8.8 is intentionally through the Hagen migration only. Newer
// 0.8.9 migrations must not silently become requirements of the 0.8.8 runbook.
const productionMigrations = [
  '20260806190230_bike_catalog_search_and_filters.sql',
  '20260809105149_catalog_performance_indexes_wave_16_2026_08_09.sql',
  '20260811000000_veloquest_full_baseline.sql',
  '20260811190000_release_hardening.sql',
  '20260812170000_catalog_enrichment_catchup_waves_17_19.sql',
  '20260814190000_catalog_hagen_complete.sql',
];
for (const file of productionMigrations) {
  if (!expectedMigrations.includes(file)) failures.push(`production migration missing from generated set: ${file}`);
  requireText(rollout, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `rollout runbook: ${file} missing`);
}
if (/20260811\d+_alpha_backend_/i.test(rollout)) failures.push('rollout runbook: references obsolete alpha_backend migration name');

const baseline = read('supabase/migrations/20260811000000_veloquest_full_baseline.sql');
const hardening = read('supabase/migrations/20260811190000_release_hardening.sql');
const authAchievements = read('supabase/migrations/20260814230000_auth_achievements_0_8_9.sql');
const garageOutcomes = read('supabase/migrations/20260817092000_garage_no_upgrade_outcomes.sql');
const routeQuotaHardening = read('supabase/migrations/20260817143000_route_quota_parameter_hardening.sql');
const garageAliases = read('supabase/migrations/20260817165000_garage_enrichment_wave35.sql');

const expectedTables = [
  'profiles','source_connections','bikes','rides','ride_imports','explored_cells','quest_templates','quest_runs','xp_ledger','player_progress','client_migrations','client_events','garage_components','garage_compatibility','bike_catalog_models','bike_catalog_images','bike_catalog_component_fitments','season_chapters','quest_specialization_affinity','virtual_items','virtual_loadout','ride_inbox','strava_credentials','strava_oauth_states','strava_webhook_events',
];
for (const table of expectedTables) {
  requireText(baseline, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'), `baseline: ${table} DDL missing`);
  requireText(baseline, new RegExp(`alter table public\\.${table} enable row level security`, 'i'), `baseline: ${table} RLS missing`);
}
requireText(baseline, /create trigger veloquest_on_auth_user_created[\s\S]+private\.handle_new_user\(\)/i, 'baseline: auth.users provisioning trigger missing');
requireText(baseline, /security definer set search_path = ''/i, 'baseline: auth provisioning function must pin an empty search_path');
for (const [, policy, table] of baseline.matchAll(/create policy\s+([a-z0-9_]+)\s+on\s+public\.([a-z0-9_]+)/gi)) {
  requireText(baseline, new RegExp(`drop policy if exists ${policy} on public\\.${table}`, 'i'), `baseline: ${policy} must be safely replaceable on an existing project`);
}

for (const index of ['quest_specialization_affinity_quest_code_idx','ride_inbox_candidate_ride_idx','strava_oauth_states_user_idx','virtual_loadout_virtual_item_idx']) requireText(hardening, new RegExp(`create index if not exists ${index}`, 'i'), `hardening: ${index} missing`);
requireText(hardening, /create or replace function public\.activate_quest_alpha/i, 'hardening: server-side quest activation missing');
requireText(hardening, /activate_quest_alpha[\s\S]+security definer[\s\S]+set search_path = ''/i, 'hardening: quest activation SECURITY DEFINER must pin an empty search_path');
requireText(hardening, /create or replace function public\.process_ride_alpha/i, 'hardening: authoritative ride processor missing');
requireText(hardening, /create table if not exists private\.route_generation_rate_limits/i, 'hardening: durable route rate-limit table missing');
requireText(hardening, /create or replace function public\.consume_route_generation_quota/i, 'hardening: route quota function missing');
requireText(hardening, /revoke execute on function public\.enforce_virtual_item_unlock\(\) from public, anon, authenticated/i, 'hardening: trigger function execute privilege not revoked');
requireText(hardening, /revoke execute on function public\.guard_specialization_change\(\) from public, anon, authenticated/i, 'hardening: specialization trigger execute privilege not revoked');

for (const table of ['oauth_transactions', 'external_identities']) requireText(authAchievements, new RegExp(`create table if not exists private\\.${table}\\b`, 'i'), `0.8.9 migration: private.${table} DDL missing`);
for (const table of ['cosmetic_rewards', 'achievement_definitions', 'achievement_progress', 'achievement_events', 'achievement_unlocks', 'user_cosmetic_rewards']) {
  requireText(authAchievements, new RegExp(`create table if not exists public\\.${table}\\b`, 'i'), `0.8.9 migration: public.${table} DDL missing`);
  requireText(authAchievements, new RegExp(`alter table public\\.${table} enable row level security`, 'i'), `0.8.9 migration: public.${table} RLS missing`);
}
requireText(authAchievements, /create or replace function public\.evaluate_ride_achievements\(/i, '0.8.9 migration: achievement evaluator missing');
requireText(authAchievements, /pg_advisory_xact_lock/i, '0.8.9 migration: achievement concurrency lock missing');
if (/max(?:imum)?[_ ]speed|top[_ ]speed/i.test(authAchievements)) failures.push('0.8.9 migration: unsafe speed incentive detected');
requireText(authAchievements, /create or replace function private\.consume_vk_ticket\(p_ticket_hash text, p_app_challenge text\)/i, '0.8.9 migration: one-time VK ticket consume missing');
requireText(authAchievements, /security definer\s+set search_path = ''/i, '0.8.9 migration: VK ticket function must pin an empty search_path');
requireText(authAchievements, /revoke all on schema private from public, anon, authenticated/i, '0.8.9 migration: private schema client revokes missing');

requireText(garageOutcomes, /create table if not exists public\.garage_recommendation_outcomes\b/i, 'Garage outcome migration: table DDL missing');
requireText(garageOutcomes, /alter table public\.garage_recommendation_outcomes enable row level security/i, 'Garage outcome migration: RLS missing');
requireText(garageOutcomes, /outcome_type in \('no_upgrade'\)/i, 'Garage outcome migration: no_upgrade contract missing');
requireText(garageOutcomes, /evidence_url text not null/i, 'Garage outcome migration: evidence URL missing');
requireText(garageOutcomes, /evidence_checked_at date not null/i, 'Garage outcome migration: evidence date missing');

requireText(routeQuotaHardening, /SOURCE: supabase\/schema\/route_quota_parameter_hardening\.sql/i, 'Route quota hardening migration: source marker missing');
requireText(routeQuotaHardening, /v_user_id uuid := auth\.uid\(\)/i, 'Route quota hardening: auth.uid actor binding missing');
requireText(routeQuotaHardening, /p_limit <> 6 or p_window_seconds <> 60/i, 'Route quota hardening: exact 6/60 parameter contract missing');
requireText(routeQuotaHardening, /raise exception 'invalid_rate_limit'/i, 'Route quota hardening: invalid parameter rejection missing');
requireText(routeQuotaHardening, /grant execute on function public\.consume_route_generation_quota\(integer, integer\) to authenticated/i, 'Route quota hardening: authenticated execution contract missing');
if (/p_limit < 1 or p_limit > 30|p_window_seconds < 10 or p_window_seconds > 3600/i.test(routeQuotaHardening)) failures.push('Route quota hardening: caller-selectable weak bounds detected');

requireText(garageAliases, /SOURCE: supabase\/schema\/catalog_enrichment_wave_35_shimano_canonical_aliases_2026_08_17\.sql/i, 'Garage alias migration: source marker missing');
requireText(garageAliases, /create table if not exists public\.garage_component_aliases\b/i, 'Garage alias migration: table DDL missing');
requireText(garageAliases, /alias_component_id text primary key references public\.garage_components\(id\) on delete cascade/i, 'Garage alias migration: alias FK missing');
requireText(garageAliases, /canonical_component_id text not null references public\.garage_components\(id\) on delete restrict/i, 'Garage alias migration: canonical FK missing');
requireText(garageAliases, /alter table public\.garage_component_aliases enable row level security/i, 'Garage alias migration: RLS missing');
requireText(garageAliases, /create policy garage_component_aliases_read[\s\S]+for select to authenticated using \(true\)/i, 'Garage alias migration: authenticated read policy missing');
requireText(garageAliases, /grant select on public\.garage_component_aliases to authenticated/i, 'Garage alias migration: authenticated SELECT grant missing');
requireText(garageAliases, /revoke insert, update, delete on public\.garage_component_aliases from authenticated/i, 'Garage alias migration: authenticated writes must be revoked');
requireText(garageAliases, /https:\/\/productinfo\.shimano\.com\/en\/compatibility\/C-254/i, 'Garage alias migration: Shimano C-254 evidence missing');
if (/manufacturer_approved|garage_recommendation_outcomes|no_upgrade/i.test(garageAliases)) failures.push('Garage alias migration: bike-level recommendation inference detected');

const secretPatterns = [
  /sb_secret_[A-Za-z0-9_-]{12,}/,
  /(?:SUPABASE_SERVICE_ROLE_KEY|STRAVA_CLIENT_SECRET|EXPO_TOKEN)\s*=\s*['\"]?[A-Za-z0-9_-]{12,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
];
const scanRoots = ['App.tsx','app.json','eas.json','package.json','src','scripts','supabase','.github','README.md','PRE_DEVICE_QA.md','PRODUCTION_BACKEND_ROLLOUT.md','RC_0_8_1.md','RC_0_8_2.md','RC_0_8_7.md','HAGEN_CATALOG_0_8_7.md','XCODE_DEVICE_INSTALL.md','AUDIT_0_8_2_RELEASE_REPORT.md'];
const walk = (target) => {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
};
for (const file of scanRoots.flatMap((entry) => walk(path.join(root, entry)))) {
  const source = fs.readFileSync(file, 'utf8');
  if (secretPatterns.some((pattern) => pattern.test(source))) failures.push(`${path.relative(root, file)}: possible committed secret`);
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  tablesWithStaticRlsCoverage: expectedTables.length + 2,
  edgeFunctions: jwtExpected.size,
  migrations: expectedMigrations,
  productionMigrations,
  pendingAfterBaselineHistoryRepair: expectedMigrations.slice(3),
}, null, 2));
