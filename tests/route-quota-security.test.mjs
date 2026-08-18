import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync('supabase/schema/route_quota_parameter_hardening.sql', 'utf8');
const route = fs.readFileSync('supabase/functions/route-generator/index.ts', 'utf8');
const builder = fs.readFileSync('scripts/build-supabase-migrations.mjs', 'utf8');

test('authenticated callers cannot weaken the Route Engine quota parameters', () => {
  assert.match(sql, /p_limit <> 6 or p_window_seconds <> 60/i);
  assert.match(sql, /raise exception 'invalid_rate_limit'/i);
  assert.match(sql, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(sql, /if v_user_id is null then raise exception 'unauthorized'/i);
  assert.match(sql, /grant execute on function public\.consume_route_generation_quota\(integer, integer\) to authenticated/i);
  assert.doesNotMatch(sql, /p_limit < 1 or p_limit > 30/i);
  assert.doesNotMatch(sql, /p_window_seconds < 10 or p_window_seconds > 3600/i);
});

test('route generator always asks for the fixed six-per-minute contract', () => {
  assert.match(route, /userClient\.rpc\('consume_route_generation_quota', \{ p_limit: 6, p_window_seconds: 60 \}\)/);
});

test('quota parameter hardening is a generated forward migration', () => {
  assert.match(builder, /routeQuotaParameterHardeningOrder/);
  assert.match(builder, /20260817143000_route_quota_parameter_hardening\.sql/);
});
