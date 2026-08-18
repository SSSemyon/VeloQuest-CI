import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('accepted ride displays the server privacy-masked point set', () => {
  const app = source('App.tsx');
  const processor = source('supabase/functions/ride-processor/index.ts');
  assert.match(app, /points:\s*result\.ride\.points/);
  assert.match(processor, /p_route_geojson:\s*routeGeoJson\(publicPoints\)/);
  assert.match(processor, /points:\s*publicPoints/);
});

test('cloud bike save is authoritative before local state and navigation', () => {
  const app = source('App.tsx');
  const cloudSave = app.indexOf('await saveBikeToCloud(userId, nextBike)');
  const localState = app.indexOf('setBike(nextBike)', cloudSave);
  const navigation = app.indexOf("setTab('garage')", cloudSave);
  assert.ok(cloudSave > 0 && localState > cloudSave && navigation > localState);
});

test('catalog verification comes from an enabled server row', () => {
  const migration = source('src/backend/localMigration.ts');
  assert.match(migration, /\.eq\('enabled', true\)\.gte\('model_year', 2020\)/);
  assert.match(migration, /catalog_verified:\s*verifiedCatalogId !== null/);
});

test('road, MTB and gravel route profiles are distinct', () => {
  const routes = source('supabase/functions/route-generator/index.ts');
  assert.match(routes, /kind === 'road'\) return 'fastbike-lowtraffic'/);
  assert.match(routes, /kind === 'mtb'\) return 'mtb'/);
  assert.match(routes, /return 'trekking'/);
});

test('backend gate includes server quest activation and active-quest conflict handling', () => {
  const hardening = source('supabase/migrations/20260811190000_release_hardening.sql');
  const processor = source('supabase/functions/ride-processor/index.ts');
  assert.match(hardening, /create or replace function public\.activate_quest_alpha/i);
  assert.match(hardening, /active_quest_conflict/i);
  assert.match(processor, /active_quest_conflict/);
});

test('catalog search covers all Garage component fields and human-readable brakes', () => {
  const catalog = source('supabase/schema/bike_catalog.sql');
  for (const key of ['fork', 'rear_shock', 'cassette', 'crankset', 'bottom_bracket', 'hubs', 'wheelset', 'tires']) {
    assert.match(catalog, new RegExp(`specs->>'${key}'`));
  }
  assert.match(catalog, /specs->>'brakes'.*ilike/s);
});

test('compatibility is explainable for compatible, conditional and incompatible outcomes', () => {
  const garage = source('src/backend/garageCatalog.ts');
  const schema = source('supabase/schema/garage_catalog.sql');
  const hardening = source('supabase/schema/release_upgrade_parity.sql');
  assert.match(schema, /'compatible', 'conditional', 'incompatible'/);
  assert.match(garage, /'compatible', 'conditional', 'incompatible'/);
  assert.match(garage, /Приоритет \+\$\{ridePriority\}/);
  assert.match(hardening, /'incompatible'/);
});

test('account-scoped async ride and bike operations cannot mutate a newly signed-in account', () => {
  const app = source('App.tsx');
  assert.match(app, /const accountEpoch = useRef\(0\)/);
  assert.match(app, /accountEpoch\.current = nextAccountEpoch/);
  assert.match(app, /const isCurrentAccount = \(\) => Boolean\(userId\) && activeUserId\.current === userId && accountEpoch\.current === operationEpoch/g);
  assert.match(app, /await saveBikeToCloud\(userId, nextBike\);\s*if \(!isCurrentAccount\(\)\) return;/s);
});

test('manual GPX and FIT imports are historical-only even with plausible timestamps', () => {
  const processor = source('supabase/functions/ride-processor/index.ts');
  const gpx = source('src/integrations/gpx.ts');
  const fit = source('src/integrations/fit.ts');
  assert.match(processor, /const manualFile = source === 'GPX' \|\| source === 'FIT'/);
  assert.match(processor, /forcedHistorical = payload\.isHistorical === true \|\| manualFile/);
  assert.match(gpx, /isHistorical: true/);
  assert.match(fit, /isHistorical: true/);
});

test('legacy local migration cannot mint XP from user-controlled device state', () => {
  const migration = source('supabase/functions/migrate-local-alpha/index.ts');
  assert.match(migration, /earnedXp:\s*0/);
  assert.doesNotMatch(migration, /payload\.totalXp/);
  assert.doesNotMatch(migration, /\.from\('xp_ledger'\)/);
});

test('FIT dedupe identity is based on file content rather than reusable file metadata', () => {
  const fit = source('src/integrations/fit.ts');
  assert.match(fit, /fitContentFingerprint\(bytes\)/);
  assert.match(fit, /parseFitMessages\(decoded\.messages, `content:\$\{fitContentFingerprint\(bytes\)\}`\)/);
  assert.doesNotMatch(fit, /parseFitMessages\(decoded\.messages, `\$\{asset\.name\}/);
});

test('route distance filters constrain both the list and highlighted map route', () => {
  const explorer = source('src/components/RouteExplorer.tsx');
  const visibleRoutes = explorer.indexOf('const visibleRoutes = useMemo');
  const selected = explorer.indexOf('const selected = visibleRoutes.find', visibleRoutes);
  const plannedRoute = explorer.indexOf('const plannedRoute = useMemo', selected);
  assert.ok(visibleRoutes > 0 && selected > visibleRoutes && plannedRoute > selected);
  assert.match(explorer, /visibleRoutes\.find\(\(item\) => item\.id === selectedId\) \?\? visibleRoutes\[0\] \?\? null/);
});

test('Garage recommendations refresh for every editable compatibility field', () => {
  const app = source('App.tsx');
  const effectStart = app.indexOf('void loadGarageRecommendations');
  const effectEnd = app.indexOf('\n  ]);', effectStart);
  const recommendationEffect = app.slice(effectStart, effectEnd + 6);
  for (const field of ['drivetrain', 'brakes', 'fork', 'rearShock', 'cassette', 'crankset', 'bottomBracket', 'hubs', 'wheelset', 'tires']) {
    assert.match(recommendationEffect, new RegExp(`bike\\?\\.${field}`));
  }
});

test('only the latest Route Engine request may update planner state', () => {
  const explorer = source('src/components/RouteExplorer.tsx');
  assert.match(explorer, /const routeRequest = useRef\(0\)/);
  assert.match(explorer, /const requestId = \+\+routeRequest\.current/);
  assert.match(explorer, /if \(routeRequest\.current !== requestId\) return;\s*setResponse\(nextResponse\)/s);
  assert.match(explorer, /if \(routeRequest\.current === requestId\) setLoading\(false\)/);
});

test('a fully privacy-masked short ride never emits an invalid empty LineString', () => {
  const map = source('src/components/QuestMap.tsx');
  assert.match(map, /ride && ride\.points\.length >= 2 \? rideFeature\(ride\) : null/);
});

test('route generation has an authenticated durable per-user quota', () => {
  const routes = source('supabase/functions/route-generator/index.ts');
  const hardening = source('supabase/schema/release_upgrade_parity.sql');
  assert.match(routes, /rpc\('consume_route_generation_quota'/);
  assert.match(routes, /error: 'rate_limited'.*429/s);
  assert.match(hardening, /create table if not exists private\.route_generation_rate_limits/i);
  assert.match(hardening, /auth\.uid\(\)/);
  assert.match(hardening, /for update/i);
});

test('post-baseline catalog evidence is delivered by an idempotent forward catch-up migration', () => {
  const generator = source('scripts/build-supabase-migrations.mjs');
  const migration = source('supabase/migrations/20260812170000_catalog_enrichment_catchup_waves_17_19.sql');
  assert.match(generator, /20260812170000_catalog_enrichment_catchup_waves_17_19\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_17_exact_product_pilot_2026_08_11\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_18_specialized_exact_2026_08_11\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_enrichment_wave_19_norco_exact_fitment_2026_08_12\.sql/);
  assert.match(migration, /norco-optic-a1-gen3-2025-ca/);
  assert.match(migration, /norco-optic-a2-gen3-2025-ca/);
  assert.match(migration, /factory_installed/);
});

test('all validated Hagen identities ship in a dedicated idempotent forward migration', () => {
  const manifest = JSON.parse(source('catalog-harvester/hagen-official-evidence.json'));
  const generator = source('scripts/build-supabase-migrations.mjs');
  assert.ok(fs.existsSync(path.join(root, 'supabase/schema/catalog_hagen_complete_2026_08_14.sql')), 'Hagen schema source must exist');
  assert.ok(fs.existsSync(path.join(root, 'supabase/migrations/20260814190000_catalog_hagen_complete.sql')), 'Hagen forward migration must exist');
  const schema = source('supabase/schema/catalog_hagen_complete_2026_08_14.sql');
  const migration = source('supabase/migrations/20260814190000_catalog_hagen_complete.sql');
  assert.match(generator, /20260814190000_catalog_hagen_complete\.sql/);
  assert.match(migration, /SOURCE: supabase\/schema\/catalog_hagen_complete_2026_08_14\.sql/);
  assert.match(schema, /on conflict \(brand, model, model_year, trim, market\) do update/i);
  assert.doesNotMatch(schema, /bike_component_compatibility|bike_catalog_component_fitments|recommendation/i);
  for (const entry of manifest.models) {
    assert.match(schema, new RegExp(entry.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(migration, new RegExp(entry.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('backend audit reports only forward migrations after baseline history repair', () => {
  const audit = source('scripts/audit-backend-repro.mjs');
  assert.match(audit, /pendingAfterBaselineHistoryRepair:\s*expectedMigrations\.slice\(3\)/);
  assert.doesNotMatch(audit, /pendingDeploy:\s*expectedMigrations\.slice\(2\)/);
});

test('quest activation qualifies template columns that collide with output variables', () => {
  const schema = source('supabase/schema/quest_selection.sql');
  const migration = source('supabase/migrations/20260811190000_release_hardening.sql');
  for (const sql of [schema, migration]) {
    assert.match(sql, /from public\.quest_templates template\s+where template\.code = p_template_code and template\.enabled = true/i);
    assert.doesNotMatch(sql, /where code = p_template_code and enabled = true/i);
  }
});

test('route quota counts the first request exactly once', () => {
  const schema = source('supabase/schema/release_upgrade_parity.sql');
  const migration = source('supabase/migrations/20260811190000_release_hardening.sql');
  for (const sql of [schema, migration]) {
    assert.match(sql, /on conflict \(user_id\) do nothing\s+returning \* into v_row;\s+if found then return true; end if;/i);
  }
});

test('external routing receives coordinates only after explicit in-app consent', () => {
  const explorer = source('src/components/RouteExplorer.tsx');
  const client = source('src/backend/routeGenerator.ts');
  const edge = source('supabase/functions/route-generator/index.ts');
  assert.match(explorer, /Точные координаты старта будут отправлены в BRouter и Overpass/);
  assert.match(explorer, /externalRoutingConsent/);
  assert.match(explorer, /useState\(false\)/);
  assert.match(client, /externalRoutingConsent: input\.externalRoutingConsent/);
  assert.match(client, /demoStart: input\.demoStart/);
  assert.match(edge, /externalRoutingConsent\?: boolean/);
  assert.match(edge, /verifiedDemoStart/);
  assert.match(edge, /body\?\.externalRoutingConsent !== true && !verifiedDemoStart/);
  assert.match(edge, /external_routing_consent_required/);
});

test('ride processor owns achievement metrics and evaluator invocation', () => {
  const edge = source('supabase/functions/ride-processor/index.ts');
  assert.doesNotMatch(edge, /payload\.(achievement|rewardXp|progressDelta|baseline)/);
  assert.match(edge, /safeTempoMetrics/);
  assert.match(edge, /safeCadenceMetrics/);
  assert.match(edge, /rpc\('evaluate_ride_achievements'/);
  assert.match(edge, /manualFile/);
  assert.match(edge, /gpsValid/);
  assert.match(edge, /verifyConnectorRequest/);
  assert.match(edge, /kind === 'strava'/);
  const strava = source('supabase/functions/strava-sync/index.ts');
  assert.match(strava, /signConnectorRequest/);
  assert.match(strava, /x-vq-connector-signature/);
  assert.match(edge, /rewardEligible = trustedProvenance\s*&& tempoMetrics\.gpsValid/s);
  assert.doesNotMatch(edge, /rideId === 'string' && data\.duplicate/);
});

test('VK opaque callback ticket is bound to an app-held verifier', () => {
  const start = source('supabase/functions/vk-auth-start/index.ts');
  const finish = source('supabase/functions/vk-auth-finish/index.ts');
  const schema = source('supabase/schema/auth_identity_bridge.sql');
  assert.match(start, /appCodeChallenge/);
  assert.match(finish, /appCodeVerifier/);
  assert.match(schema, /nonce_hash = p_app_challenge/);
  assert.match(schema, /consume_vk_ticket_service\(p_ticket_hash text, p_app_challenge text\)/);
});
