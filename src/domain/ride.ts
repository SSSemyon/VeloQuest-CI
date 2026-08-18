import { cellToBoundary, latLngToCell } from 'h3-js';

export type RideSource = 'Apple Health' | 'Health Connect' | 'GPX' | 'FIT' | 'Strava';

export type RidePoint = {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: string;
};

export type CanonicalRide = {
  id: string;
  source: RideSource;
  sourceId: string;
  startTime: string;
  endTime: string;
  points: RidePoint[];
  distanceKm: number;
  durationMinutes: number;
  elevationGainM: number;
  /** User-controlled manual files are historical-only and cannot earn XP. */
  isHistorical?: boolean;
};

export type Quest = {
  id: 'explore' | 'endurance' | 'climb' | 'loop';
  serverCode: 'new_land' | 'long_ride' | 'high_route' | 'close_the_loop';
  title: string;
  description: string;
  rewardXp: number;
};

export const QUESTS: Quest[] = [
  { id: 'explore', serverCode: 'new_land', title: 'Новая земля', description: 'Открой 20 новых клеток', rewardXp: 200 },
  { id: 'endurance', serverCode: 'long_ride', title: 'Дальний путь', description: '60 минут в движении', rewardXp: 200 },
  { id: 'climb', serverCode: 'high_route', title: 'Высокий маршрут', description: 'Набери 500 м высоты', rewardXp: 200 },
  { id: 'loop', serverCode: 'close_the_loop', title: 'Замкнуть круг', description: 'Финишируй рядом со стартом после 5 км', rewardXp: 200 },
];

const EARTH_RADIUS_KM = 6371.0088;

function radians(value: number) {
  return value * Math.PI / 180;
}

export function haversineKm(a: RidePoint, b: RidePoint) {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function distanceKm(points: RidePoint[]) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversineKm(points[i - 1], points[i]);
  return total;
}

export function elevationGainM(points: RidePoint[]) {
  let gain = 0;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1].altitude;
    const current = points[i].altitude;
    if (previous == null || current == null) continue;
    const delta = current - previous;
    if (delta > 1.5) gain += delta;
  }
  return gain;
}

export function rideCells(points: RidePoint[], resolution = 8) {
  const cells = new Set<string>();
  for (const point of points) cells.add(latLngToCell(point.latitude, point.longitude, resolution));
  return [...cells];
}

export function cellPolygon(cell: string) {
  return cellToBoundary(cell).map(([latitude, longitude]) => ({ latitude, longitude }));
}

export function newCellsForRide(points: RidePoint[], exploredCells: string[]) {
  const explored = new Set(exploredCells);
  return rideCells(points).filter((cell) => !explored.has(cell));
}

export function questCompleted(quest: Quest, ride: CanonicalRide, newCellCount: number) {
  if (quest.id === 'explore') return newCellCount >= 20;
  if (quest.id === 'endurance') return ride.durationMinutes >= 60;
  if (quest.id === 'climb') return ride.elevationGainM >= 500;
  return ride.distanceKm >= 5 && haversineKm(ride.points[0], ride.points.at(-1)!) <= 0.25;
}

export function canonicalRideId(source: RideSource, sourceId: string, startTime: string) {
  return `${source}:${sourceId}:${startTime}`;
}

export function createRide(input: Omit<CanonicalRide, 'id' | 'distanceKm' | 'durationMinutes' | 'elevationGainM'>): CanonicalRide {
  const start = new Date(input.startTime).getTime();
  const end = new Date(input.endTime).getTime();
  return {
    ...input,
    id: canonicalRideId(input.source, input.sourceId, input.startTime),
    distanceKm: distanceKm(input.points),
    durationMinutes: Math.max(0, (end - start) / 60000),
    elevationGainM: elevationGainM(input.points),
  };
}
