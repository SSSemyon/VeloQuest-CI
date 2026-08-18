import { Camera, GeoJSONSource, Layer, Map, type LngLatBounds } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { Feature, FeatureCollection, LineString, MultiPolygon } from 'geojson';
import { gridDisk } from 'h3-js';
import { cellPolygon, type CanonicalRide } from '../domain/ride';
import { useTheme } from '../theme';

const OPENFREE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

type QuestMapProps = {
  ride?: CanonicalRide | null;
  cells: string[];
  interactive?: boolean;
  plannedRoute?: FeatureCollection<LineString> | null;
};

function boundsForContent(ride: CanonicalRide | null | undefined, cells: string[], plannedRoute?: FeatureCollection<LineString> | null): LngLatBounds {
  const territoryPoints = cells.slice(-400).flatMap((cell) => cellPolygon(cell));
  const plannedPoints = plannedRoute?.features.flatMap((feature) => feature.geometry.coordinates.map(([longitude, latitude]) => ({ longitude, latitude }))) ?? [];
  const points = plannedPoints.length > 0 ? plannedPoints : ride?.points.length ? ride.points : territoryPoints;
  if (points.length === 0) return [-0.05, -0.05, 0.05, 0.05];
  const longitudes = points.map((point) => point.longitude);
  const latitudes = points.map((point) => point.latitude);
  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

function rideFeature(ride: CanonicalRide): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: ride.points.map((point) => [point.longitude, point.latitude]),
      },
    }],
  };
}

function fogFeature(cells: string[]): FeatureCollection<MultiPolygon> {
  const explored = new Set(cells);
  const frontier = new Set<string>();
  for (const cell of cells.slice(-180)) {
    for (const candidate of gridDisk(cell, 2)) {
      if (!explored.has(candidate)) frontier.add(candidate);
    }
  }
  return territoryFeature([...frontier]);
}

function territoryFeature(cells: string[]): FeatureCollection<MultiPolygon> {
  const polygons = cells.map((cell) => {
    const ring = cellPolygon(cell).map((point) => [point.longitude, point.latitude]);
    if (ring.length > 0) ring.push([...ring[0]]);
    return [ring];
  });

  const feature: Feature<MultiPolygon> = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'MultiPolygon', coordinates: polygons },
  };

  return { type: 'FeatureCollection', features: [feature] };
}

export function QuestMap({ ride, cells, interactive = true, plannedRoute = null }: QuestMapProps) {
  const { dark } = useTheme();
  const bounds = useMemo(() => boundsForContent(ride, cells, plannedRoute), [ride, cells, plannedRoute]);
  // A privacy zone may intentionally remove every public route point from a
  // short ride. LineString requires at least two coordinates, so render only
  // the territory/result metrics in that case instead of sending invalid
  // GeoJSON to MapLibre.
  const route = useMemo(() => ride && ride.points.length >= 2 ? rideFeature(ride) : null, [ride]);
  const territories = useMemo(() => territoryFeature(cells), [cells]);
  const fog = useMemo(() => fogFeature(cells), [cells]);

  return (
    <Map
      style={styles.map}
      mapStyle={OPENFREE_STYLE}
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
      doubleTapHoldZoom={interactive}
      touchRotate={false}
      touchPitch={false}
      compass={false}
      logo={false}
      attribution
      attributionPosition={{ right: 8, bottom: 8 }}
    >
      <Camera key={bounds.join(':')} initialViewState={{ bounds, padding: { top: 44, right: 34, bottom: 44, left: 34 } }} />
      <GeoJSONSource id="veloquest-fog" data={fog}>
        <Layer
          id="veloquest-fog-fill"
          type="fill"
          paint={{ 'fill-color': dark ? '#1A211D' : '#E9E8E1', 'fill-opacity': dark ? 0.68 : 0.82 }}
        />
      </GeoJSONSource>
      <GeoJSONSource id="veloquest-territories" data={territories}>
        <Layer
          id="veloquest-territory-fill"
          type="fill"
          paint={{ 'fill-color': dark ? '#78A986' : '#7F9B73', 'fill-opacity': dark ? 0.34 : 0.28 }}
        />
        <Layer
          id="veloquest-territory-outline"
          type="line"
          paint={{ 'line-color': dark ? '#9BC7A4' : '#53704D', 'line-width': 1, 'line-opacity': dark ? 0.72 : 0.55 }}
        />
      </GeoJSONSource>
      {route ? (
        <GeoJSONSource id="veloquest-route" data={route}>
          <Layer
            id="veloquest-route-line"
            type="line"
            paint={{
              'line-color': '#EF7311',
              'line-width': 4,
              'line-opacity': 0.96,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </GeoJSONSource>
      ) : null}
      {plannedRoute ? (
        <GeoJSONSource id="veloquest-planned-route" data={plannedRoute}>
          <Layer
            id="veloquest-planned-route-line"
            type="line"
            paint={{ 'line-color': '#F05B11', 'line-width': 5, 'line-opacity': 0.92, 'line-dasharray': [2, 1.2] }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </GeoJSONSource>
      ) : null}
    </Map>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
