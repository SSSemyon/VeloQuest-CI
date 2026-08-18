import type { PlannedRoute, RouteBikeKind, RouteGeneratorResponse, RouteMode } from '../domain/route';
import { supabase } from '../lib/supabase';

export type RouteStart = { latitude: number; longitude: number };

export async function generateRoutes(input: {
  start: RouteStart;
  bikeKind: RouteBikeKind;
  mode?: RouteMode;
  seed?: number;
  areaLabel?: string;
  exploredCells?: string[];
  externalRoutingConsent: boolean;
  demoStart: boolean;
}): Promise<RouteGeneratorResponse> {
  const { data, error } = await supabase.functions.invoke('route-generator', {
    body: {
      mode: input.mode ?? 'urban_quick',
      start: input.start,
      bikeKind: input.bikeKind,
      seed: input.seed ?? Date.now(),
      areaLabel: input.areaLabel,
      exploredCells: input.exploredCells?.slice(-5000) ?? [],
      externalRoutingConsent: input.externalRoutingConsent,
      demoStart: input.demoStart,
    },
  });

  if (error) throw new Error(`Не удалось подобрать маршруты: ${error.message}`);
  if (!data || typeof data !== 'object' || !Array.isArray((data as RouteGeneratorResponse).routes)) {
    throw new Error('Route Generator вернул некорректный ответ.');
  }
  return data as RouteGeneratorResponse;
}

export function routeLine(route: PlannedRoute) {
  return {
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      properties: { routeId: route.id, planned: true },
      geometry: { type: 'LineString' as const, coordinates: route.points },
    }],
  };
}
