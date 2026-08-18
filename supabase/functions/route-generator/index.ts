import { createClient } from 'npm:@supabase/supabase-js@2.112.1';
import { isValidCell, latLngToCell } from 'npm:h3-js@4.5.0';

type Point = { latitude: number; longitude: number };
type BikeKind = 'road' | 'gravel' | 'mtb';
type RouteMode = 'urban_quick' | 'regional_adventure';
type RouteBucket = '5-8' | '8-12' | '12-18' | '18-25' | '25-35' | '35-50';
type PoiKind = 'historic' | 'culture' | 'viewpoint' | 'park' | 'nature' | 'support';
type Anchor = Point & { name: string; poi: boolean; kind: PoiKind; interest: number };
type CandidateSpec = { key: string; title: string; theme: string; mode: RouteMode; bucket: RouteBucket; anchors: Anchor[]; alternative: number };

const ROUTER_BASE_URL = Deno.env.get('VQ_ROUTER_BASE_URL') ?? 'https://brouter.de';
const POI_BASE_URLS = [...new Set([
  Deno.env.get('VQ_POI_BASE_URL'),
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
].filter((value): value is string => Boolean(value)))];
const URBAN_POI_RADIUS_METERS = 9_000;
const REGIONAL_POI_RADIUS_METERS = 20_000;
const MAX_POI = 120;
const MAX_EXPLORED_CELLS = 5_000;
const CANDIDATE_CONCURRENCY = 8;
const POI_CACHE_TTL_MS = 10 * 60 * 1000;
const POI_CACHE = new Map<string, { expiresAt: number; pois: Anchor[] }>();
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
};

const URBAN_BUCKET_CONFIG: Array<{ bucket: RouteBucket; targetKm: number; title: string }> = [
  { bucket: '5-8', targetKm: 6.5, title: 'Быстрая петля' },
  { bucket: '8-12', targetKm: 10, title: 'Городской круг' },
  { bucket: '12-18', targetKm: 15, title: 'Маршрут исследования' },
  { bucket: '18-25', targetKm: 22, title: 'Большое городское кольцо' },
];

const REGIONAL_BUCKET_CONFIG: Array<{ bucket: RouteBucket; targetKm: number; title: string }> = [
  { bucket: '25-35', targetKm: 30, title: 'Лёгкое приключение' },
  { bucket: '35-50', targetKm: 43, title: 'Большой маршрут' },
];

function bucketConfig(mode: RouteMode) {
  return mode === 'regional_adventure' ? REGIONAL_BUCKET_CONFIG : URBAN_BUCKET_CONFIG;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json; charset=utf-8' },
  });
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function radians(value: number) {
  return value * Math.PI / 180;
}

function degrees(value: number) {
  return value * 180 / Math.PI;
}

function haversineKm(a: Point, b: Point) {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function bearingDegrees(a: Point, b: Point) {
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const deltaLongitude = radians(b.longitude - a.longitude);
  const y = Math.sin(deltaLongitude) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLongitude);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

function angularDistance(a: number, b: number) {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
}

function destination(start: Point, distanceKm: number, bearing: number): Point {
  const angularDistance = distanceKm / 6371;
  const bearingRad = radians(bearing);
  const lat1 = radians(start.latitude);
  const lon1 = radians(start.longitude);
  const latitude = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance)
      + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad),
  );
  const longitude = lon1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(latitude),
  );
  return { latitude: degrees(latitude), longitude: ((degrees(longitude) + 540) % 360) - 180 };
}

function profileForBike(kind: BikeKind) {
  if (kind === 'road') return 'fastbike-lowtraffic';
  if (kind === 'mtb') return 'mtb';
  return 'trekking';
}

function bucketForDistance(distanceKm: number, mode: RouteMode): RouteBucket | null {
  if (mode === 'regional_adventure') {
    if (distanceKm >= 25 && distanceKm < 35) return '25-35';
    if (distanceKm >= 35 && distanceKm <= 50.8) return '35-50';
    return null;
  }
  if (distanceKm >= 5 && distanceKm < 8) return '5-8';
  if (distanceKm >= 8 && distanceKm < 12) return '8-12';
  if (distanceKm >= 12 && distanceKm < 18) return '12-18';
  if (distanceKm >= 18 && distanceKm <= 25.8) return '18-25';
  return null;
}

function quantizedEdge(a: [number, number], b: [number, number]) {
  const qa = `${a[0].toFixed(4)},${a[1].toFixed(4)}`;
  const qb = `${b[0].toFixed(4)},${b[1].toFixed(4)}`;
  return qa < qb ? `${qa}|${qb}` : `${qb}|${qa}`;
}

function edgeSet(points: [number, number][]) {
  const set = new Set<string>();
  for (let index = 1; index < points.length; index += 1) set.add(quantizedEdge(points[index - 1], points[index]));
  return set;
}

function overlap(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const edge of a) if (b.has(edge)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function loopQuality(points: [number, number][]) {
  if (points.length < 3) return 0;
  const seen = new Set<string>();
  let repeated = 0;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const key = quantizedEdge(points[index - 1], points[index]);
    total += 1;
    if (seen.has(key)) repeated += 1;
    else seen.add(key);
  }
  return clamp(1 - repeated / Math.max(1, total), 0, 1);
}

function simplify(points: [number, number][]) {
  if (points.length <= 650) return points;
  const stride = Math.ceil(points.length / 650);
  const simplified = points.filter((_point, index) => index % stride === 0);
  const finalPoint = points.at(-1)!;
  if (simplified.at(-1) !== finalPoint) simplified.push(finalPoint);
  return simplified;
}

function messageMetrics(messages: unknown, trackLengthM: number) {
  if (!Array.isArray(messages)) return { surfaceKnownPct: 0, stepsM: 0, primaryTrunkPct: 0 };
  let measuredM = 0;
  let surfaceM = 0;
  let stepsM = 0;
  let primaryM = 0;
  for (const row of messages.slice(1)) {
    if (!Array.isArray(row)) continue;
    const distance = Number(row[3]);
    const tags = String(row[9] ?? '');
    if (!Number.isFinite(distance) || distance <= 0) continue;
    measuredM += distance;
    if (/\bsurface=/.test(tags)) surfaceM += distance;
    if (/\bhighway=steps\b/.test(tags)) stepsM += distance;
    if (/\bhighway=(primary|trunk)\b/.test(tags)) primaryM += distance;
  }
  const denominator = measuredM > 0 ? measuredM : trackLengthM;
  return {
    surfaceKnownPct: denominator > 0 ? (surfaceM / denominator) * 100 : 0,
    stepsM,
    primaryTrunkPct: denominator > 0 ? (primaryM / denominator) * 100 : 0,
  };
}

function poiKind(tags: Record<string, unknown>): PoiKind {
  if (tags.historic) return 'historic';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.tourism) return 'culture';
  if (tags.leisure) return 'park';
  if (tags.natural) return 'nature';
  return 'support';
}

function poiInterest(kind: PoiKind, tags: Record<string, unknown>) {
  if (kind === 'historic') return 1;
  if (kind === 'viewpoint') return 0.98;
  if (kind === 'culture') return tags.tourism === 'museum' ? 0.94 : 0.88;
  if (kind === 'nature') return 0.86;
  if (kind === 'park') return 0.78;
  return 0.45;
}

function poiTheme(kind: PoiKind) {
  if (kind === 'historic') return 'История';
  if (kind === 'culture') return 'Культура';
  if (kind === 'viewpoint') return 'Панорама';
  if (kind === 'park') return 'Парк';
  if (kind === 'nature') return 'Природа';
  return 'Велоподдержка';
}

function shortName(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length <= 34 ? normalized : `${normalized.slice(0, 31).trim()}…`;
}

function directionName(bearing: number) {
  const names = ['Север', 'Северо-восток', 'Восток', 'Юго-восток', 'Юг', 'Юго-запад', 'Запад', 'Северо-запад'];
  return names[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
}

function syntheticAnchor(start: Point, distanceKm: number, bearing: number): Anchor {
  return {
    ...destination(start, distanceKm, bearing),
    name: directionName(bearing),
    poi: false,
    kind: 'nature',
    interest: 0,
  };
}

function poiCacheKey(start: Point, radiusMeters: number) {
  return `${start.latitude.toFixed(2)},${start.longitude.toFixed(2)},${radiusMeters}`;
}

async function discoverPoi(start: Point, radiusMeters: number) {
  const cacheKey = poiCacheKey(start, radiusMeters);
  const cached = POI_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { pois: cached.pois, degraded: false, cached: true };

  const query = `[out:json][timeout:20];(
    nwr(around:${radiusMeters},${start.latitude.toFixed(6)},${start.longitude.toFixed(6)})["name"]["historic"];
    nwr(around:${radiusMeters},${start.latitude.toFixed(6)},${start.longitude.toFixed(6)})["name"]["tourism"~"^(attraction|museum|gallery|viewpoint|artwork)$"];
    nwr(around:${radiusMeters},${start.latitude.toFixed(6)},${start.longitude.toFixed(6)})["name"]["leisure"~"^(park|garden|nature_reserve)$"];
    nwr(around:${radiusMeters},${start.latitude.toFixed(6)},${start.longitude.toFixed(6)})["name"]["natural"~"^(beach|peak|spring|water|wood)$"];
    nwr(around:${radiusMeters},${start.latitude.toFixed(6)},${start.longitude.toFixed(6)})["name"]["amenity"~"^(fountain|bicycle_repair_station)$"];
  );out center tags ${MAX_POI};`;

  for (const endpoint of POI_BASE_URLS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(24_000),
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'user-agent': 'VeloQuest-Alpha/0.8 route-generator',
        },
        body: new URLSearchParams({ data: query }),
      });
      if (!response.ok) throw new Error(`poi_${response.status}`);
      const payload = await response.json() as { elements?: Array<Record<string, unknown>> };
    const byName = new Map<string, Anchor>();
    for (const element of payload.elements ?? []) {
      const tags = (element.tags ?? {}) as Record<string, unknown>;
      const name = typeof tags.name === 'string' ? tags.name.trim() : '';
      const center = (element.center ?? {}) as Record<string, unknown>;
      const latitude = Number(element.lat ?? center.lat);
      const longitude = Number(element.lon ?? center.lon);
      if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
      const distanceKm = haversineKm(start, { latitude, longitude });
      if (distanceKm < 0.3 || distanceKm > radiusMeters / 1000 + 0.5) continue;
      const kind = poiKind(tags);
      const anchor: Anchor = { latitude, longitude, name, poi: true, kind, interest: poiInterest(kind, tags) };
      const key = name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
      const existing = byName.get(key);
      if (!existing || anchor.interest > existing.interest) byName.set(key, anchor);
    }
      const pois = [...byName.values()]
        .sort((a, b) => b.interest - a.interest || haversineKm(start, a) - haversineKm(start, b))
        .slice(0, MAX_POI);
      POI_CACHE.set(cacheKey, { expiresAt: Date.now() + POI_CACHE_TTL_MS, pois });
      while (POI_CACHE.size > 40) POI_CACHE.delete(POI_CACHE.keys().next().value!);
      return { pois, degraded: false, cached: false };
    } catch {
      // Try the next configured public instance before degrading to geometry-only shaping.
    }
  }
  return { pois: [] as Anchor[], degraded: true, cached: false };
}

function bestPoiForAnchor(start: Point, target: Anchor, pois: Anchor[], targetRadiusKm: number, excluded: Set<string>) {
  let selected: Anchor | null = null;
  let selectedScore = Number.NEGATIVE_INFINITY;
  const targetBearing = bearingDegrees(start, target);
  for (const poi of pois) {
    if (excluded.has(poi.name)) continue;
    const radius = haversineKm(start, poi);
    if (radius < targetRadiusKm * 0.48 || radius > targetRadiusKm * 1.55) continue;
    const bearingFit = 1 - angularDistance(targetBearing, bearingDegrees(start, poi)) / 180;
    const radialFit = 1 - Math.min(1, Math.abs(radius - targetRadiusKm) / Math.max(1, targetRadiusKm));
    const score = poi.interest * 0.55 + bearingFit * 0.28 + radialFit * 0.17;
    if (score > selectedScore) {
      selected = poi;
      selectedScore = score;
    }
  }
  return selected;
}

function buildCandidateSpecs(start: Point, pois: Anchor[], seed: number, mode: RouteMode) {
  const normalizedSeed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 1;
  const specs: CandidateSpec[] = [];
  for (const config of bucketConfig(mode)) {
    const variants = mode === 'regional_adventure' ? 6 : 8;
    for (let index = 0; index < variants; index += 1) {
      const bearing = (index * 45 + normalizedSeed * 17 + config.targetKm * 3) % 360;
      const radiusScale = 0.89 + (index % 3) * 0.075;
      const regionalDivisor = config.bucket === '25-35' ? 4.35 : 3.25;
      const radiusKm = config.targetKm / (mode === 'regional_adventure' ? regionalDivisor : 3.4) * radiusScale;
      const secondBearing = (bearing + 82 + (index % 2) * 26) % 360;
      const firstSynthetic = syntheticAnchor(start, radiusKm, bearing);
      const secondSynthetic = syntheticAnchor(start, radiusKm, secondBearing);
      const used = new Set<string>();
      const firstPoi = bestPoiForAnchor(start, firstSynthetic, pois, radiusKm, used);
      if (firstPoi) used.add(firstPoi.name);
      const secondPoi = bestPoiForAnchor(start, secondSynthetic, pois, radiusKm, used);
      const anchors = [firstPoi ?? firstSynthetic, secondPoi ?? secondSynthetic];
      const actualPoi = anchors.filter((anchor) => anchor.poi);
      const title = actualPoi.length >= 2
        ? `${shortName(actualPoi[0].name)} · ${shortName(actualPoi[1].name)}`
        : actualPoi.length === 1
          ? `${shortName(actualPoi[0].name)} · петля`
          : `${config.title} · ${directionName(bearing)}`;
      const themes = [...new Set(actualPoi.map((anchor) => poiTheme(anchor.kind)))];
      const theme = [...themes, 'Исследование'].slice(0, 3).join(' · ');
      specs.push({
        key: `${config.bucket}-${index}-${normalizedSeed % 10_000}`,
        title,
        theme,
        mode,
        bucket: config.bucket,
        anchors,
        alternative: index % 2,
      });
    }
  }
  return specs;
}

function routeCells(points: [number, number][]) {
  const cells = new Set<string>();
  const stride = Math.max(1, Math.floor(points.length / 1_500));
  for (let index = 0; index < points.length; index += stride) {
    const [longitude, latitude] = points[index];
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) cells.add(latLngToCell(latitude, longitude, 8));
  }
  const finalPoint = points.at(-1);
  if (finalPoint) cells.add(latLngToCell(finalPoint[1], finalPoint[0], 8));
  return cells;
}

async function routeCandidate(start: Point, bikeKind: BikeKind, spec: CandidateSpec, exploredCells: Set<string>) {
  const url = new URL('/brouter', ROUTER_BASE_URL);
  const waypoints = [start, ...spec.anchors, start];
  url.searchParams.set('lonlats', waypoints.map((point) => `${point.longitude.toFixed(6)},${point.latitude.toFixed(6)}`).join('|'));
  url.searchParams.set('profile', profileForBike(bikeKind));
  url.searchParams.set('alternativeidx', String(spec.alternative));
  url.searchParams.set('format', 'geojson');

  const response = await fetch(url, {
    signal: AbortSignal.timeout(spec.mode === 'regional_adventure' ? 24_000 : 16_000),
    headers: { accept: 'application/vnd.geo+json, application/json', 'user-agent': 'VeloQuest-Alpha/0.8 route-generator' },
  });
  if (!response.ok) throw new Error(`routing_${response.status}`);
  const payload = await response.json() as Record<string, unknown>;
  const feature = (payload.features as Array<Record<string, unknown>> | undefined)?.[0];
  const geometry = feature?.geometry as { type?: string; coordinates?: [number, number][] } | undefined;
  const properties = (feature?.properties ?? {}) as Record<string, unknown>;
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) throw new Error('routing_geometry_invalid');

  const distanceKm = Number(properties['track-length']) / 1000;
  const bucket = bucketForDistance(distanceKm, spec.mode);
  if (!bucket) return null;
  const elevationGainM = Number(properties['filtered ascend']) || 0;
  const durationMinutes = (Number(properties['total-time']) || distanceKm * 240) / 60;
  const metrics = messageMetrics(properties.messages, distanceKm * 1000);
  const stepsLimitM = bikeKind === 'road' ? 35 : bikeKind === 'gravel' ? 100 : 180;
  if (metrics.stepsM > stepsLimitM || metrics.primaryTrunkPct > 28) return null;

  const quality = loopQuality(geometry.coordinates);
  const h3Cells = routeCells(geometry.coordinates);
  let newH3Cells = 0;
  for (const cell of h3Cells) if (!exploredCells.has(cell)) newH3Cells += 1;
  const explorationNovelty = h3Cells.size > 0 ? newH3Cells / h3Cells.size : 0;
  const poi = spec.anchors.filter((anchor) => anchor.poi);
  const poiInterestScore = poi.length > 0 ? poi.reduce((sum, anchor) => sum + anchor.interest, 0) / poi.length : 0;
  const routeConfidence = clamp(
    0.39
      + Math.min(metrics.surfaceKnownPct, 100) / 100 * 0.38
      + quality * 0.17
      + (poi.length > 0 ? 0.04 : 0)
      - Math.min(0.22, metrics.stepsM / 500)
      - Math.min(0.2, metrics.primaryTrunkPct / 100),
    0.18,
    0.96,
  );
  const bucketFit = spec.bucket === bucket ? 1 : 0.45;
  const score = clamp(
    36
      + quality * 23
      + routeConfidence * 18
      + explorationNovelty * 13
      + poiInterestScore * 7
      + bucketFit * 5
      - Math.min(18, metrics.stepsM / 8)
      - Math.min(12, metrics.primaryTrunkPct / 2),
    0,
    100,
  );
  const points = simplify(geometry.coordinates);

  return {
    id: `${spec.key}-${bikeKind}`,
    title: spec.title,
    theme: spec.theme,
    mode: spec.mode,
    bikeKind,
    bucket,
    distanceKm,
    durationMinutes,
    elevationGainM,
    score,
    loopQuality: quality,
    routeConfidence,
    surfaceKnownPct: metrics.surfaceKnownPct,
    stepsM: metrics.stepsM,
    primaryTrunkPct: metrics.primaryTrunkPct,
    explorationNovelty,
    newH3Cells,
    routeH3Cells: h3Cells.size,
    poiInterestScore,
    points,
    poi: poi.map((anchor) => anchor.name),
    provider: 'brouter-alpha',
    edges: edgeSet(points),
  };
}

async function routeInBatches(start: Point, bikeKind: BikeKind, specs: CandidateSpec[], exploredCells: Set<string>) {
  const candidates: Array<Awaited<ReturnType<typeof routeCandidate>>> = [];
  let routedCount = 0;
  const concurrency = specs[0]?.mode === 'regional_adventure' ? 4 : CANDIDATE_CONCURRENCY;
  for (let index = 0; index < specs.length; index += concurrency) {
    const batch = specs.slice(index, index + concurrency);
    const settled = await Promise.allSettled(batch.map((spec) => routeCandidate(start, bikeKind, spec, exploredCells)));
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        routedCount += 1;
        if (result.value) candidates.push(result.value);
      }
    }
  }
  return { candidates: candidates.filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null), routedCount };
}

function scoreJitter(id: string, seed: number) {
  let hash = Math.abs(Math.trunc(seed)) || 1;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ((hash % 1000) / 1000 - 0.5) * 3;
}

function selectUrbanDiverse<T extends { bucket: RouteBucket; score: number; edges: Set<string> }>(candidates: T[]) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const selected: T[] = [];
  const add = (candidate: T) => {
    if (selected.includes(candidate)) return false;
    if (selected.some((existing) => overlap(candidate.edges, existing.edges) >= 0.72)) return false;
    selected.push(candidate);
    return true;
  };
  for (const config of URBAN_BUCKET_CONFIG) {
    let bucketCount = 0;
    for (const candidate of sorted) {
      if (candidate.bucket !== config.bucket || bucketCount >= 2) continue;
      if (add(candidate)) bucketCount += 1;
    }
  }
  for (const candidate of sorted) {
    if (selected.length >= 12) break;
    add(candidate);
  }
  return selected.slice(0, 12);
}

function selectRegionalDiverse<T extends {
  distanceKm: number;
  elevationGainM: number;
  explorationNovelty: number;
  poiInterestScore: number;
  routeConfidence: number;
  score: number;
  edges: Set<string>;
}>(candidates: T[]) {
  const selected: T[] = [];
  const add = (ordered: T[], overlapLimit: number) => {
    const candidate = ordered.find((item) => !selected.includes(item)
      && !selected.some((existing) => overlap(item.edges, existing.edges) >= overlapLimit));
    if (candidate) selected.push(candidate);
  };
  const easiest = [...candidates].sort((a, b) =>
    (a.distanceKm + a.elevationGainM / 120) - (b.distanceKm + b.elevationGainM / 120));
  const interesting = [...candidates].sort((a, b) =>
    (b.poiInterestScore * 45 + b.explorationNovelty * 35 + b.routeConfidence * 20)
      - (a.poiInterestScore * 45 + a.explorationNovelty * 35 + a.routeConfidence * 20));
  const adventurous = [...candidates].sort((a, b) =>
    (b.score + b.distanceKm * 0.35 + b.explorationNovelty * 12)
      - (a.score + a.distanceKm * 0.35 + a.explorationNovelty * 12));
  add(easiest, 0.66);
  add(interesting, 0.66);
  add(adventurous, 0.66);
  for (const overlapLimit of [0.82, 1.01]) {
    for (const ordered of [easiest, interesting, adventurous]) {
      if (selected.length >= 3) break;
      add(ordered, overlapLimit);
    }
  }
  return selected.slice(0, 3);
}

function sanitizeAreaLabel(value: unknown) {
  if (typeof value !== 'string') return null;
  const label = value.trim().replace(/\s+/g, ' ');
  return label && label.length <= 80 ? label : null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return json({ error: 'server_not_configured' }, 500);
  const token = authorization.slice('Bearer '.length);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);
  const body = await request.json().catch(() => null) as {
    start?: Point;
    bikeKind?: BikeKind;
    mode?: string;
    seed?: number;
    areaLabel?: string;
    exploredCells?: unknown[];
    externalRoutingConsent?: boolean;
    demoStart?: boolean;
  } | null;
  const verifiedDemoStart = body?.demoStart === true
    && Math.abs(Number(body?.start?.latitude) - 47.213562) < 0.000001
    && Math.abs(Number(body?.start?.longitude) - 38.938983) < 0.000001;
  if (body?.externalRoutingConsent !== true && !verifiedDemoStart) {
    return json({ error: 'external_routing_consent_required' }, 403);
  }
  const quota = await userClient.rpc('consume_route_generation_quota', { p_limit: 6, p_window_seconds: 60 });
  if (quota.error) return json({ error: 'rate_limit_unavailable' }, 503);
  if (quota.data !== true) return json({ error: 'rate_limited', retryAfterSeconds: 60 }, 429);
  const start = body?.start;
  const bikeKind = body?.bikeKind;
  if (!start || !Number.isFinite(start.latitude) || start.latitude < -85 || start.latitude > 85 || !Number.isFinite(start.longitude) || start.longitude < -180 || start.longitude > 180) {
    return json({ error: 'invalid_start' }, 400);
  }
  if (!bikeKind || !['road', 'gravel', 'mtb'].includes(bikeKind)) return json({ error: 'invalid_bike_kind' }, 400);
  const requestedMode = body?.mode ?? 'urban_quick';
  if (requestedMode !== 'urban_quick' && requestedMode !== 'regional_adventure') return json({ error: 'invalid_mode' }, 422);
  const mode: RouteMode = requestedMode;
  const seed = Number.isFinite(body?.seed) ? Number(body?.seed) : Date.now();
  const areaLabel = sanitizeAreaLabel(body?.areaLabel) ?? `${start.latitude.toFixed(3)}, ${start.longitude.toFixed(3)}`;
  const exploredCells = new Set(
    (Array.isArray(body?.exploredCells) ? body.exploredCells : [])
      .slice(-MAX_EXPLORED_CELLS)
      .filter((cell): cell is string => typeof cell === 'string' && isValidCell(cell)),
  );

  const poiRadiusMeters = mode === 'regional_adventure' ? REGIONAL_POI_RADIUS_METERS : URBAN_POI_RADIUS_METERS;
  const discovery = await discoverPoi(start, poiRadiusMeters);
  const specs = buildCandidateSpecs(start, discovery.pois, seed, mode);
  const { candidates, routedCount } = await routeInBatches(start, bikeKind, specs, exploredCells);
  for (const candidate of candidates) candidate.score = clamp(candidate.score + scoreJitter(candidate.id, seed), 0, 100);
  const selected = mode === 'regional_adventure' ? selectRegionalDiverse(candidates) : selectUrbanDiverse(candidates);
  const regionalVariants = ['Легче', 'Интереснее', 'Приключение'];
  const routes = selected.map(({ edges: _edges, ...route }, index) => ({
    ...route,
    variant: mode === 'regional_adventure' ? regionalVariants[index] : undefined,
  }));
  if (routes.length === 0) return json({
    error: 'no_routes',
    message: `Routing provider returned no usable ${mode === 'regional_adventure' ? '25–50' : '5–25'} km candidates.`,
  }, 503);

  return json({
    mode,
    area: areaLabel,
    start,
    generatedAt: new Date().toISOString(),
    routes,
    discovery: {
      provider: 'overpass-alpha',
      poiCount: discovery.pois.length,
      radiusKm: poiRadiusMeters / 1000,
      degraded: discovery.degraded,
      candidateCount: specs.length,
      routedCount,
    },
    warnings: [
      'Route confidence measures OSM data completeness; it is not a safety guarantee.',
      discovery.degraded
        ? 'OSM POI discovery was unavailable; routes use geometry shaping and receive no POI bonus.'
        : 'POI are discovered dynamically from OpenStreetMap through a replaceable provider adapter.',
      bikeKind === 'mtb'
        ? 'MTB uses the dedicated BRouter MTB costing profile.'
        : 'BRouter remains an Alpha routing provider behind a replaceable adapter.',
      mode === 'regional_adventure'
        ? 'Regional routes are 25–50 km loops ranked as easier, more interesting and adventurous alternatives.'
        : 'Urban routes are short 5–25 km loops grouped by distance.',
    ],
  });
});
