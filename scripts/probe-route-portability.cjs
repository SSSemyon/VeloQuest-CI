const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { isValidCell, latLngToCell } = require('h3-js');

const sourcePath = path.join(__dirname, '..', 'supabase', 'functions', 'route-generator', 'index.ts');
const source = fs.readFileSync(sourcePath, 'utf8').replace(/^import .*;$/gm, '');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

let handler;
const sandbox = {
  AbortSignal,
  URL,
  URLSearchParams,
  Request,
  Response,
  TextEncoder,
  console,
  crypto,
  fetch,
  isValidCell,
  latLngToCell,
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'portability-probe' } }, error: null }) },
    rpc: async (name) => name === 'consume_route_generation_quota'
      ? { data: true, error: null }
      : { data: null, error: { message: `Unexpected probe RPC: ${name}` } },
  }),
  Deno: {
    env: { get: (name) => name === 'SUPABASE_URL' ? 'https://probe.supabase.test' : name === 'SUPABASE_ANON_KEY' ? 'probe-key' : undefined },
    serve: (nextHandler) => { handler = nextHandler; },
  },
};
vm.runInNewContext(transpiled, sandbox, { filename: sourcePath });
if (typeof handler !== 'function') throw new Error('Route Generator handler was not captured.');

const regions = [
  { name: 'Taganrog regression', latitude: 47.213562, longitude: 38.938983, bikeKind: 'road', seed: 3 },
  { name: 'Freiburg hills', latitude: 47.9959, longitude: 7.8522, bikeKind: 'road', seed: 7 },
  { name: 'Girona gravel', latitude: 41.9794, longitude: 2.8214, bikeKind: 'gravel', seed: 11 },
];
const modeArgument = process.argv.find((argument) => argument.startsWith('--mode='));
const requestedMode = modeArgument?.slice('--mode='.length) === 'regional' ? 'regional_adventure' : 'urban_quick';
const regionArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const requestedRegion = regionArgument?.toLocaleLowerCase();
const selectedRegions = requestedRegion
  ? regions.filter((region) => region.name.toLocaleLowerCase().includes(requestedRegion))
  : regions;
if (selectedRegions.length === 0) throw new Error(`Unknown region filter: ${requestedRegion}`);

async function probe(region) {
  console.log(`START ${region.name}`);
  const response = await handler(new Request('https://local.test/route-generator', {
    method: 'POST',
    headers: { authorization: 'Bearer portability-probe', 'content-type': 'application/json' },
    body: JSON.stringify({
      start: { latitude: region.latitude, longitude: region.longitude },
      bikeKind: region.bikeKind,
      mode: requestedMode,
      seed: region.seed,
      areaLabel: region.name,
      exploredCells: [],
    }),
  }));
  const payload = await response.json();
  if (!response.ok) throw new Error(`${region.name}: ${response.status} ${JSON.stringify(payload)}`);
  const expectedBuckets = requestedMode === 'regional_adventure' ? ['25-35', '35-50'] : ['5-8', '8-12', '12-18', '18-25'];
  const buckets = Object.fromEntries(expectedBuckets.map((bucket) => [bucket, 0]));
  for (const route of payload.routes) buckets[route.bucket] += 1;
  const summary = {
    region: region.name,
    status: response.status,
    poi: payload.discovery.poiCount,
    candidates: payload.discovery.candidateCount,
    routed: payload.discovery.routedCount,
    selected: payload.routes.length,
    buckets,
    distanceKm: [
      Math.min(...payload.routes.map((route) => route.distanceKm)).toFixed(1),
      Math.max(...payload.routes.map((route) => route.distanceKm)).toFixed(1),
    ],
    confidenceAvg: Math.round(payload.routes.reduce((sum, route) => sum + route.routeConfidence, 0) / payload.routes.length * 100),
    poiRoutes: payload.routes.filter((route) => route.poi.length > 0).length,
    maxStepsM: Math.round(Math.max(...payload.routes.map((route) => route.stepsM))),
  };
  console.log(JSON.stringify(summary));
  const minimumRoutes = requestedMode === 'regional_adventure' ? 3 : 6;
  const minimumCandidates = requestedMode === 'regional_adventure' ? 12 : 30;
  if (payload.routes.length < minimumRoutes) throw new Error(`${region.name}: fewer than ${minimumRoutes} diverse routes`);
  if (Object.values(buckets).filter((count) => count > 0).length < expectedBuckets.length) throw new Error(`${region.name}: not all distance buckets are represented`);
  if (payload.discovery.candidateCount < minimumCandidates) throw new Error(`${region.name}: fewer than ${minimumCandidates} candidates`);
  if (requestedMode === 'regional_adventure') {
    const variants = new Set(payload.routes.map((route) => route.variant));
    for (const expected of ['Легче', 'Интереснее', 'Приключение']) {
      if (!variants.has(expected)) throw new Error(`${region.name}: missing regional variant ${expected}`);
    }
  }
  return summary;
}

(async () => {
  const summaries = [];
  for (const region of selectedRegions) summaries.push(await probe(region));
  console.log(`${requestedMode === 'regional_adventure' ? 'REGIONAL' : 'PORTABILITY'}_GATE_GREEN ${summaries.length}/${selectedRegions.length}`);
})().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
