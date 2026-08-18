export type RouteMode = 'urban_quick' | 'regional_adventure';
export type RouteBikeKind = 'road' | 'gravel' | 'mtb';
export type RouteBucket = '5-8' | '8-12' | '12-18' | '18-25' | '25-35' | '35-50';

export type PlannedRoute = {
  id: string;
  title: string;
  theme: string;
  mode: RouteMode;
  bikeKind: RouteBikeKind;
  bucket: RouteBucket;
  distanceKm: number;
  durationMinutes: number;
  elevationGainM: number;
  score: number;
  loopQuality: number;
  routeConfidence: number;
  surfaceKnownPct: number;
  stepsM: number;
  primaryTrunkPct: number;
  explorationNovelty: number;
  newH3Cells: number;
  routeH3Cells: number;
  poiInterestScore: number;
  points: [number, number][];
  poi: string[];
  provider: string;
  variant?: 'Легче' | 'Интереснее' | 'Приключение';
};

export type RouteGeneratorResponse = {
  mode: RouteMode;
  area: string;
  start: { latitude: number; longitude: number };
  generatedAt: string;
  routes: PlannedRoute[];
  discovery: {
    provider: string;
    poiCount: number;
    radiusKm: number;
    degraded: boolean;
    candidateCount: number;
    routedCount: number;
  };
  warnings: string[];
};
