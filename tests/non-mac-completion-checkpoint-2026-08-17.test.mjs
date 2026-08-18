import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const app = JSON.parse(read('app.json'));
const oauthRunbook = read('OAUTH_PROVIDER_SETUP_0_8_9.md');
const quota = read('supabase/schema/route_quota_parameter_hardening.sql');
const wave33 = read('supabase/schema/catalog_enrichment_wave_33_specialized_final_2026_08_17.sql');
const builder = read('scripts/build-supabase-migrations.mjs');

test('final non-Mac checkpoint contains Android Health Connect route permission hardening', () => {
  const permissions = new Set(app.expo?.android?.permissions ?? []);
  assert.equal(permissions.has('android.permission.health.READ_EXERCISE'), true);
  assert.equal(permissions.has('android.permission.health.READ_EXERCISE_ROUTES'), true);
  assert.equal(permissions.has('android.permission.health.WRITE_EXERCISE'), false);
  assert.equal(permissions.has('android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND'), false);
});

test('final non-Mac checkpoint contains provider console boundaries without client secrets', () => {
  assert.match(oauthRunbook, /https:\/\/rvqiptyzsjcunzjhofid\.supabase\.co\/auth\/v1\/callback/);
  assert.match(oauthRunbook, /veloquest:\/\/auth\/callback/);
  assert.match(oauthRunbook, /https:\/\/rvqiptyzsjcunzjhofid\.supabase\.co\/functions\/v1\/vk-auth-callback/);
  assert.match(oauthRunbook, /Never expose the Google client secret, service-role key, `VK_BRIDGE_ENCRYPTION_KEY`, or `RIDE_CONNECTOR_ATTESTATION_KEY`/);
});

test('final non-Mac checkpoint locks Route Engine quota to six per minute', () => {
  assert.match(quota, /p_limit <> 6 or p_window_seconds <> 60/i);
  assert.match(quota, /raise exception 'invalid_rate_limit'/i);
  assert.match(quota, /v_user_id uuid := auth\.uid\(\)/i);
});

test('final non-Mac Garage checkpoint reaches wave 33 without inferred compatibility', () => {
  assert.match(wave33, /specialized-epic-8-expert-sram-gx-axs-rockshox-select-2026-global/);
  assert.doesNotMatch(wave33, /specialized-epic-8-expert-sram-gx-axs-rockshox-ultimate-2026-global/);
  assert.match(wave33, /specialized-s-works-epic-8-evo-sram-xx-sl-axs-rockshox-ultimate-2026-global/);
  assert.match(wave33, /specialized-s-works-tarmac-sl8-sram-red-axs-2026-global/);
  assert.doesNotMatch(wave33, /manufacturer_approved/i);
  assert.doesNotMatch(wave33, /insert\s+into\s+public\.garage_compatibility/i);
  assert.match(builder, /discoverLateGarageWaves/);
});
