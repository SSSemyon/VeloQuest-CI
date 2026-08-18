import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function read(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) {
    failures.push(`${relative}: missing`);
    return '';
  }
  return fs.readFileSync(target, 'utf8');
}

function requireText(text, pattern, label) {
  if (!pattern.test(text)) failures.push(label);
}

const config = read('supabase/config.toml');
const edge = read('supabase/functions/platform-ride-authorizer/index.ts');
const processor = read('supabase/functions/ride-processor/index.ts');
const schema = read('supabase/schema/platform_ride_ingest.sql');
const migration = read('supabase/migrations/20260817144000_platform_ride_ingest.sql');
const client = read('src/backend/rideProcessor.ts');

requireText(config, /\[functions\.platform-ride-authorizer\]\s+verify_jwt\s*=\s*true/, 'platform-ride-authorizer: verify_jwt must be true');
requireText(edge, /npm:\@supabase\/supabase-js@2\.112\.1/, 'platform-ride-authorizer: supabase-js dependency must be pinned');
requireText(edge, /auth\.getUser\(/, 'platform-ride-authorizer: authenticated user verification missing');
requireText(edge, /source === 'Apple Health'/, 'platform-ride-authorizer: Apple Health source mapping missing');
requireText(edge, /source === 'Health Connect'/, 'platform-ride-authorizer: Health Connect source mapping missing');
requireText(edge, /issue_platform_ride_ingest_ticket/, 'platform-ride-authorizer: service ticket RPC missing');
if (/source === 'GPX'|source === 'FIT'|source === 'Strava'/.test(edge)) failures.push('platform-ride-authorizer: non-platform source accepted');

requireText(schema, /create table if not exists public\.platform_ride_ingest_tickets/i, 'platform ride schema: ticket table missing');
requireText(schema, /alter table public\.platform_ride_ingest_tickets enable row level security/i, 'platform ride schema: RLS missing');
requireText(schema, /revoke all on public\.platform_ride_ingest_tickets from anon, authenticated/i, 'platform ride schema: client table revoke missing');
requireText(schema, /grant select, insert, update, delete on public\.platform_ride_ingest_tickets to service_role/i, 'platform ride schema: explicit service role table grant missing');
requireText(schema, /source_kind text not null check \(source_kind in \('healthkit', 'health_connect'\)\)/i, 'platform ride schema: source allow-list missing');
requireText(schema, /source_fingerprint text not null check \(source_fingerprint ~ '\^\[a-f0-9\]\{64\}\$'\)/i, 'platform ride schema: fingerprint shape missing');
requireText(schema, /expires_at timestamptz not null default \(now\(\) \+ interval '5 minutes'\)/i, 'platform ride schema: five-minute TTL missing');
requireText(schema, /interval '1 hour'/i, 'platform ride schema: hourly issue limit missing');
requireText(schema, /interval '1 day'/i, 'platform ride schema: daily issue limit missing');
requireText(schema, /consumed_at is null[\s\S]+expires_at > now\(\)/i, 'platform ride schema: one-time unexpired consume guard missing');
requireText(schema, /select public\.process_ride_alpha\([\s\S]+p_reward_eligible => v_reward_eligible/i, 'platform ride schema: atomic authoritative ride call missing');
requireText(schema, /grant execute on function public\.issue_platform_ride_ingest_ticket[\s\S]+to service_role/i, 'platform ride schema: service-only issue execution missing');
requireText(schema, /grant execute on function public\.process_ride_alpha_with_platform_ticket[\s\S]+to service_role/i, 'platform ride schema: service-only process execution missing');
if (/grant execute on function public\.issue_platform_ride_ingest_ticket[\s\S]+to authenticated/i.test(schema)) failures.push('platform ride schema: authenticated can mint ticket directly');

const expectedMigration = `-- SOURCE: supabase/schema/platform_ride_ingest.sql\n${schema.trim()}\n`;
if (migration !== expectedMigration) failures.push('platform ride migration: generated content drift');

requireText(client, /ride\.isHistorical !== true[\s\S]+ride\.source === 'Apple Health'[\s\S]+ride\.source === 'Health Connect'/, 'platform ride client: capability must be limited to fresh platform rides');
requireText(client, /platform-ride-authorizer/, 'platform ride client: authorizer call missing');
requireText(processor, /const trustedProvenance = kind === 'strava'/, 'ride processor: Strava attestation boundary changed');
requireText(processor, /platformCapabilityCandidate/, 'ride processor: platform capability candidate missing');
requireText(processor, /process_ride_alpha_with_platform_ticket/, 'ride processor: atomic platform wrapper missing');
requireText(processor, /effectiveRewardEligible = data\?\.quest\?\.rewardEligible === true/, 'ride processor: database-validated reward result missing');
requireText(processor, /rewardEligible:\s*effectiveRewardEligible/, 'ride processor: achievements do not consume database-validated reward result');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  edgeFunction: 'platform-ride-authorizer',
  jwtVerified: true,
  migration: '20260817144000_platform_ride_ingest.sql',
  productionMutation: false,
}, null, 2));
