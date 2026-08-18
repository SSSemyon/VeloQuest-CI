import assert from 'node:assert/strict';

const apiUrl = process.env.API_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = '66666666-6666-4666-8666-666666666666';
const rideId = 'aaaaaaaa-6666-4666-8666-666666666666';

assert.ok(apiUrl, 'API_URL is required');
assert.ok(serviceRoleKey, 'SERVICE_ROLE_KEY is required');

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function evaluate(eventKey) {
  const response = await fetch(`${apiUrl}/rest/v1/rpc/evaluate_ride_achievements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_user_id: userId,
      p_ride_id: rideId,
      p_event_key: eventKey,
      p_metrics: {
        rewardEligible: true,
        duplicate: false,
        historical: false,
        manualFile: false,
        gpsValid: true,
        distanceMeters: 5000,
        elevationGainMeters: 100,
      },
    }),
  });
  const body = await response.text();
  assert.ok(response.ok, `achievement RPC failed: ${response.status} ${body}`);
  return JSON.parse(body);
}

const stamp = Date.now();
const responses = await Promise.all([
  evaluate(`concurrent:a:${stamp}`),
  evaluate(`concurrent:b:${stamp}`),
]);

assert.deepEqual(
  responses.map((result) => result.reason).sort(),
  ['duplicate', 'processed'],
  'exactly one concurrent evaluator call must process the canonical ride',
);

console.log('Achievement concurrent RPC smoke: PASS');
