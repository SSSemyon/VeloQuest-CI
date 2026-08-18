import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

test('platform ride tickets are private, short-lived, source-bound and one-time', () => {
  const sql = read('supabase/schema/platform_ride_ingest.sql');
  assert.match(sql, /create table if not exists public\.platform_ride_ingest_tickets/i);
  assert.match(sql, /source_kind text not null check \(source_kind in \('healthkit', 'health_connect'\)\)/i);
  assert.match(sql, /source_fingerprint text not null/i);
  assert.match(sql, /expires_at timestamptz not null/i);
  assert.match(sql, /consumed_at timestamptz/i);
  assert.match(sql, /revoke all on public\.platform_ride_ingest_tickets from anon, authenticated/i);
  assert.match(sql, /expires_at > now\(\)/i);
  assert.match(sql, /consumed_at is null/i);
});

test('platform ticket issue is service-only and rate limited', () => {
  const sql = read('supabase/schema/platform_ride_ingest.sql');
  assert.match(sql, /issue_platform_ride_ingest_ticket/i);
  assert.match(sql, /interval '1 hour'/i);
  assert.match(sql, /interval '1 day'/i);
  assert.match(sql, /grant execute on function public\.issue_platform_ride_ingest_ticket[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.issue_platform_ride_ingest_ticket[\s\S]*to authenticated/i);
});

test('platform ticket consumption and ride processing share one database transaction', () => {
  const sql = read('supabase/schema/platform_ride_ingest.sql');
  assert.match(sql, /process_ride_alpha_with_platform_ticket/i);
  assert.match(sql, /update public\.platform_ride_ingest_tickets[\s\S]*set consumed_at = now\(\)/i);
  assert.match(sql, /source_fingerprint = p_source_fingerprint/i);
  assert.match(sql, /select public\.process_ride_alpha\(/i);
  assert.match(sql, /p_reward_eligible => v_reward_eligible/i);
});

test('direct source declaration still cannot mint platform rewards', () => {
  const edge = read('supabase/functions/ride-processor/index.ts');
  assert.match(edge, /platformTicket/);
  assert.match(edge, /process_ride_alpha_with_platform_ticket/);
  assert.doesNotMatch(edge, /trustedProvenance\s*=\s*kind\s*===\s*'healthkit'/);
  assert.doesNotMatch(edge, /trustedProvenance\s*=\s*kind\s*===\s*'health_connect'/);
});

test('achievement eligibility comes from the database-validated ride result', () => {
  const edge = read('supabase/functions/ride-processor/index.ts');
  assert.match(edge, /effectiveRewardEligible\s*=\s*data\?\.quest\?\.rewardEligible\s*===\s*true/);
  assert.match(edge, /rewardEligible:\s*effectiveRewardEligible/);
});

test('client requests platform capability only for fresh HealthKit or Health Connect rides', () => {
  const client = read('src/backend/rideProcessor.ts');
  assert.match(client, /platform-ride-authorizer/);
  assert.match(client, /ride\.source === 'Apple Health'/);
  assert.match(client, /ride\.source === 'Health Connect'/);
  assert.match(client, /ride\.isHistorical !== true/);
  assert.match(client, /platformTicket/);
});

test('platform authorizer authenticates the user and never accepts GPX, FIT or Strava', () => {
  const edge = read('supabase/functions/platform-ride-authorizer/index.ts');
  assert.match(edge, /auth\.getUser/);
  assert.match(edge, /source === 'Apple Health'/);
  assert.match(edge, /source === 'Health Connect'/);
  assert.match(edge, /issue_platform_ride_ingest_ticket/);
  assert.doesNotMatch(edge, /source === 'GPX'|source === 'FIT'|source === 'Strava'/);
});
