import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { generateRoutes, routeLine, type RouteStart } from '../backend/routeGenerator';
import type { CanonicalRide } from '../domain/ride';
import type { PlannedRoute, RouteBikeKind, RouteBucket, RouteGeneratorResponse, RouteMode } from '../domain/route';
import { QuestMap } from './QuestMap';
import { useTheme, useThemedStyles } from '../theme';

const TAGANROG_START = { latitude: 47.213562, longitude: 38.938983 };
const URBAN_BUCKETS: { id: RouteBucket | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: '5-8', label: '5–8' },
  { id: '8-12', label: '8–12' },
  { id: '12-18', label: '12–18' },
  { id: '18-25', label: '18–25' },
];
const REGIONAL_BUCKETS: { id: RouteBucket | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: '25-35', label: '25–35' },
  { id: '35-50', label: '35–50' },
];
const MODES: { id: RouteMode; label: string; hint: string }[] = [
  { id: 'urban_quick', label: 'По городу', hint: '5–25 км' },
  { id: 'regional_adventure', label: 'За город', hint: '25–50 км' },
];
const BIKES: { id: RouteBikeKind; label: string }[] = [
  { id: 'road', label: 'Road' },
  { id: 'gravel', label: 'Gravel' },
  { id: 'mtb', label: 'MTB' },
];

function confidenceLabel(value: number) {
  if (value >= 0.72) return 'данных много';
  if (value >= 0.5) return 'данных достаточно';
  return 'часть покрытия неизвестна';
}

function addressLabel(address: Location.LocationGeocodedAddress | undefined) {
  if (!address) return 'Рядом со мной';
  const city = address.city ?? address.subregion ?? address.district ?? address.region;
  const country = address.country;
  return [city, country].filter(Boolean).join(' · ') || 'Рядом со мной';
}

function confirmExternalRouting() {
  return new Promise<boolean>((resolve) => Alert.alert(
    'Маршрут через внешние сервисы',
    'Точные координаты старта будут отправлены в BRouter и Overpass только для построения маршрута. VeloQuest их не сохраняет в Route Engine. Продолжить?',
    [
      { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Разрешить', onPress: () => resolve(true) },
    ],
    { cancelable: true, onDismiss: () => resolve(false) },
  ));
}

export function RouteExplorer({
  ride,
  cells,
  exploredCells,
}: {
  ride?: CanonicalRide | null;
  cells: string[];
  exploredCells: string[];
}) {
  const styles = useThemedStyles(baseStyles);
  const { colors, dark } = useTheme();
  const green = colors.green;
  const orange = colors.orange;
  const white = dark ? '#F4F7F5' : '#FFFFFF';
  const mutedIcon = dark ? colors.muted : '#9A9D96';
  const [routes, setRoutes] = useState<PlannedRoute[]>([]);
  const [response, setResponse] = useState<RouteGeneratorResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<RouteMode>('urban_quick');
  const [bikeKind, setBikeKind] = useState<RouteBikeKind>('road');
  const [bucket, setBucket] = useState<RouteBucket | 'all'>('all');
  const [start, setStart] = useState<RouteStart>(TAGANROG_START);
  const [areaLabel, setAreaLabel] = useState('Таганрог · демо');
  const [locationSource, setLocationSource] = useState<'demo' | 'device'>('demo');
  const [externalRoutingConsent, setExternalRoutingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(1);
  const routeRequest = useRef(0);

  const visibleRoutes = useMemo(
    () => routes.filter((item) => bucket === 'all' || item.bucket === bucket),
    [bucket, routes],
  );
  // A distance filter applies to the highlighted card and map as well as the
  // list. Falling back to routes[0] here used to display a route outside the
  // chosen bucket while the filtered list showed something else.
  const selected = visibleRoutes.find((item) => item.id === selectedId) ?? visibleRoutes[0] ?? null;
  const buckets = mode === 'regional_adventure' ? REGIONAL_BUCKETS : URBAN_BUCKETS;
  const plannedRoute = useMemo(() => selected ? routeLine(selected) : null, [selected]);

  const loadRoutes = async (
    nextSeed = seed,
    nextBikeKind = bikeKind,
    nextStart = start,
    nextAreaLabel = areaLabel,
    nextMode = mode,
    nextExternalRoutingConsent = externalRoutingConsent,
    nextDemoStart = locationSource === 'demo',
  ) => {
    const requestId = ++routeRequest.current;
    setLoading(true);
    setError(null);
    try {
      const nextResponse = await generateRoutes({
        start: nextStart,
        bikeKind: nextBikeKind,
        mode: nextMode,
        seed: nextSeed,
        areaLabel: nextAreaLabel,
        exploredCells,
        externalRoutingConsent: nextExternalRoutingConsent,
        demoStart: nextDemoStart,
      });
      if (routeRequest.current !== requestId) return;
      setResponse(nextResponse);
      setRoutes(nextResponse.routes);
      setSelectedId(nextResponse.routes[0]?.id ?? null);
      setBucket('all');
    } catch (cause) {
      if (routeRequest.current === requestId) setError(cause instanceof Error ? cause.message : 'Не удалось подобрать маршруты.');
    } finally {
      if (routeRequest.current === requestId) setLoading(false);
    }
  };

  const useDeviceLocation = async () => {
    setLocationBusy(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Геопозиция не разрешена. Можно продолжить с демо-точкой Таганрога.');
        return;
      }
      const consented = await confirmExternalRouting();
      if (!consented) {
        setError('Построение маршрута отменено: внешняя передача координат не разрешена.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextStart = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      let nextAreaLabel = 'Рядом со мной';
      try {
        const addresses = await Location.reverseGeocodeAsync(nextStart);
        nextAreaLabel = addressLabel(addresses[0]);
      } catch {
        // A readable label is optional; routing only needs coordinates.
      }
      setStart(nextStart);
      setAreaLabel(nextAreaLabel);
      setLocationSource('device');
      setExternalRoutingConsent(true);
      setSeed(1);
      await loadRoutes(1, bikeKind, nextStart, nextAreaLabel, mode, true, false);
    } catch {
      setError('Не удалось определить текущую геопозицию. Проверь системные настройки и попробуй снова.');
    } finally {
      setLocationBusy(false);
    }
  };

  const useTaganrogDemo = () => {
    setStart(TAGANROG_START);
    setAreaLabel('Таганрог · демо');
    setLocationSource('demo');
    setExternalRoutingConsent(false);
    setSeed(1);
    if (routes.length > 0) void loadRoutes(1, bikeKind, TAGANROG_START, 'Таганрог · демо', mode, false, true);
  };

  const refresh = () => {
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    void loadRoutes(nextSeed);
  };

  return (
    <View>
      <View style={styles.plannerHeader}>
        <View style={styles.plannerTitleCopy}>
          <Text style={styles.kicker}>ROUTE ENGINE · CITY + REGIONAL</Text>
          <Text style={styles.title}>Куда поедем?</Text>
          <Text style={styles.hint}>OSM POI · реальные дороги · H3 novelty · без XP до фактической поездки</Text>
        </View>
        <View style={styles.beta}><Text style={styles.betaText}>BETA</Text></View>
      </View>

      <View style={styles.modeRow}>
        {MODES.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              setMode(item.id);
              setBucket('all');
              if (routes.length > 0 && item.id !== mode) void loadRoutes(seed, bikeKind, start, areaLabel, item.id);
            }}
            style={[styles.modeCard, mode === item.id && styles.modeCardActive]}
          >
            <Text style={[styles.modeLabel, mode === item.id && styles.modeLabelActive]}>{item.label}</Text>
            <Text style={[styles.modeHint, mode === item.id && styles.modeHintActive]}>{item.hint}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.locationCard}>
        <View style={styles.locationCopy}>
          <Ionicons name={locationSource === 'device' ? 'locate' : 'flag-outline'} size={18} color={green} />
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationLabel}>{locationSource === 'device' ? 'СТАРТ С МОЕЙ ПОЗИЦИИ' : 'ДЕМО-СТАРТ'}</Text>
            <Text style={styles.locationValue}>{response?.area ?? areaLabel}</Text>
          </View>
        </View>
        <View style={styles.locationActions}>
          <Pressable disabled={locationBusy || loading} onPress={() => void useDeviceLocation()} style={[styles.locationButton, locationSource === 'device' && styles.locationButtonActive]}>
            {locationBusy ? <ActivityIndicator size="small" color={green} /> : <Ionicons name="locate-outline" size={15} color={green} />}
            <Text style={styles.locationButtonText}>Моя геопозиция</Text>
          </Pressable>
          <Pressable disabled={locationBusy || loading} onPress={useTaganrogDemo} style={[styles.demoButton, locationSource === 'demo' && styles.demoButtonActive]}>
            <Text style={[styles.demoButtonText, locationSource === 'demo' && styles.demoButtonTextActive]}>Таганрог</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.chipRow}>
        {BIKES.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              setBikeKind(item.id);
              if (routes.length > 0 && item.id !== bikeKind) void loadRoutes(seed, item.id);
            }}
            style={[styles.chip, bikeKind === item.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, bikeKind === item.id && styles.chipTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {selected ? (
        <>
          <View style={styles.mapWrap}><QuestMap ride={ride} cells={cells} plannedRoute={plannedRoute} interactive /></View>
          <View style={styles.selectedCard}>
            <View style={styles.selectedTop}>
              <View style={styles.selectedCopy}>
                <Text style={styles.selectedTitle}>{selected.title}</Text>
                <Text style={styles.selectedTheme}>{selected.variant ? `${selected.variant} · ` : ''}{selected.theme}</Text>
              </View>
              <Text style={styles.selectedDistance}>{selected.distanceKm.toFixed(1)} км</Text>
            </View>
            <View style={styles.metrics}>
              <Text style={styles.metric}>{Math.round(selected.durationMinutes)} мин</Text>
              <Text style={styles.metric}>+{Math.round(selected.elevationGainM)} м</Text>
              <Text style={styles.metric}>петля {Math.round(selected.loopQuality * 100)}%</Text>
            </View>
            <View style={styles.explorationRow}>
              <Ionicons name="compass-outline" size={15} color={orange} />
              <Text style={styles.explorationText}>Новая территория {Math.round(selected.explorationNovelty * 100)}% · +{selected.newH3Cells} H3</Text>
            </View>
            {selected.poi.length > 0 ? <Text style={styles.poiText}>POI · {selected.poi.slice(0, 3).join(' · ')}</Text> : null}
            <View style={styles.confidence}>
              <Ionicons name="information-circle-outline" size={15} color={green} />
              <Text style={styles.confidenceText}>Route confidence {Math.round(selected.routeConfidence * 100)}% · {confidenceLabel(selected.routeConfidence)}</Text>
            </View>
          </View>
          {response ? (
            <Text style={styles.discoveryMeta}>
              OSM POI: {response.discovery.poiCount} · кандидатов: {response.discovery.candidateCount} · рассчитано: {response.discovery.routedCount}
              {response.discovery.degraded ? ' · POI fallback' : ''}
            </Text>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyMap}>
          <Ionicons name="navigate-circle-outline" size={39} color={green} />
          <Text style={styles.emptyTitle}>Маршрут появится здесь</Text>
          <Text style={styles.emptyText}>Используй текущую геопозицию или оставь демо-старт в Таганроге.</Text>
        </View>
      )}

      {routes.length > 0 ? (
        <>
          <View style={styles.bucketRow}>
            {buckets.map((item) => (
              <Pressable key={item.id} onPress={() => setBucket(item.id)} style={[styles.bucket, bucket === item.id && styles.bucketActive]}>
                <Text style={[styles.bucketText, bucket === item.id && styles.bucketTextActive]}>{item.label}{item.id === 'all' ? '' : ' км'}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.routeList}>
            {visibleRoutes.map((route) => {
              const active = selected?.id === route.id;
              return (
                <Pressable key={route.id} onPress={() => setSelectedId(route.id)} style={[styles.routeCard, active && styles.routeCardActive]}>
                  <View style={[styles.routeIcon, active && styles.routeIconActive]}><Ionicons name="navigate" size={17} color={active ? white : green} /></View>
                  <View style={styles.routeCopy}>
                    <Text style={styles.routeTitle}>{route.title}</Text>
                    <Text style={styles.routeMeta}>{route.distanceKm.toFixed(1)} км · {Math.round(route.durationMinutes)} мин · +{Math.round(route.elevationGainM)} м · новое {Math.round(route.explorationNovelty * 100)}% · confidence {Math.round(route.routeConfidence * 100)}%</Text>
                  </View>
                  <Ionicons name={active ? 'checkmark-circle' : 'chevron-forward'} size={18} color={active ? green : mutedIcon} />
                </Pressable>
              );
            })}
            {visibleRoutes.length === 0 ? <Text style={styles.noBucket}>В этой дистанции текущая пачка пустая — нажми «Ещё маршруты».</Text> : null}
          </View>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={loading || locationBusy} onPress={routes.length ? refresh : () => void loadRoutes()} style={[styles.generateButton, (loading || locationBusy) && styles.generateButtonDisabled]}>
        {loading ? <ActivityIndicator color={white} /> : <Ionicons name={routes.length ? 'shuffle' : 'sparkles'} size={18} color={white} />}
        <Text style={styles.generateText}>{loading ? 'Ищу POI и строю петли…' : routes.length ? 'Ещё маршруты' : mode === 'regional_adventure' ? 'Найти приключение' : 'Подобрать маршруты'}</Text>
      </Pressable>
      <Text style={styles.disclaimer}>Покрытие и дорожные теги OSM могут быть неполными. Route confidence — полнота данных, а не гарантия безопасности.</Text>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  plannerHeader: { marginTop: 6, marginBottom: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  plannerTitleCopy: { flex: 1 },
  kicker: { color: '#174C2C', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: '#141714', fontSize: 25, fontWeight: '900', letterSpacing: -0.7, marginTop: 4 },
  hint: { color: '#696D68', fontSize: 10, lineHeight: 15, marginTop: 4 },
  beta: { backgroundColor: '#FCE6D8', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  betaText: { color: '#B7460D', fontSize: 8, fontWeight: '900' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeCard: { flex: 1, minHeight: 54, borderRadius: 13, borderWidth: 1, borderColor: '#D3D9CE', backgroundColor: '#F1F3EC', paddingHorizontal: 12, paddingVertical: 9 },
  modeCardActive: { borderColor: '#174C2C', backgroundColor: '#E4ECE0' },
  modeLabel: { color: '#626860', fontSize: 11, fontWeight: '900' },
  modeLabelActive: { color: '#174C2C' },
  modeHint: { color: '#91958E', fontSize: 8, fontWeight: '800', marginTop: 3 },
  modeHintActive: { color: '#5D775F' },
  locationCard: { marginBottom: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#D8DDD3', backgroundColor: '#F7F8F3' },
  locationCopy: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  locationTextWrap: { flex: 1 },
  locationLabel: { color: '#7B8078', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  locationValue: { color: '#141714', fontSize: 12, fontWeight: '900', marginTop: 2 },
  locationActions: { flexDirection: 'row', gap: 7, marginTop: 10 },
  locationButton: { flex: 1, minHeight: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#B8C6B4', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  locationButtonActive: { backgroundColor: '#E7EEE2' },
  locationButtonText: { color: '#174C2C', fontSize: 9, fontWeight: '900' },
  demoButton: { minHeight: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#ECEDE7', alignItems: 'center', justifyContent: 'center' },
  demoButtonActive: { backgroundColor: '#174C2C' },
  demoButtonText: { color: '#6E736C', fontSize: 9, fontWeight: '900' },
  demoButtonTextActive: { color: '#FFFFFF' },
  chipRow: { flexDirection: 'row', gap: 7, marginBottom: 13 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#ECEFE7', borderWidth: 1, borderColor: '#D3D9CE' },
  chipActive: { backgroundColor: '#174C2C', borderColor: '#174C2C' },
  chipText: { color: '#174C2C', fontSize: 10, fontWeight: '800' },
  chipTextActive: { color: '#FFFFFF' },
  mapWrap: { height: 330, marginHorizontal: -20, overflow: 'hidden', backgroundColor: '#E7ECDF' },
  selectedCard: { marginTop: 12, padding: 15, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCDBD3' },
  selectedTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  selectedCopy: { flex: 1 },
  selectedTitle: { color: '#141714', fontSize: 16, fontWeight: '900' },
  selectedTheme: { color: '#696D68', fontSize: 10, marginTop: 3 },
  selectedDistance: { color: '#F05B11', fontSize: 15, fontWeight: '900' },
  metrics: { flexDirection: 'row', gap: 13, marginTop: 10 },
  metric: { color: '#174C2C', fontSize: 10, fontWeight: '800' },
  explorationRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  explorationText: { color: '#B7460D', fontSize: 10, fontWeight: '900' },
  poiText: { color: '#696D68', fontSize: 9, lineHeight: 13, marginTop: 7 },
  confidence: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DCDBD3', flexDirection: 'row', gap: 6, alignItems: 'center' },
  confidenceText: { flex: 1, color: '#696D68', fontSize: 9, lineHeight: 13 },
  discoveryMeta: { color: '#858981', fontSize: 8, lineHeight: 12, textAlign: 'center', marginTop: 7 },
  emptyMap: { height: 235, borderRadius: 18, backgroundColor: '#E9EFE3', alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyTitle: { color: '#141714', fontSize: 16, fontWeight: '900', marginTop: 8 },
  emptyText: { color: '#696D68', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 4 },
  bucketRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  bucket: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F0EFE9' },
  bucketActive: { backgroundColor: '#E0E9DA' },
  bucketText: { color: '#777B74', fontSize: 8, fontWeight: '800' },
  bucketTextActive: { color: '#174C2C' },
  routeList: { marginTop: 8 },
  routeCard: { minHeight: 65, paddingVertical: 9, paddingHorizontal: 9, marginBottom: 7, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0DFD8', flexDirection: 'row', alignItems: 'center', gap: 9 },
  routeCardActive: { borderColor: '#8DA68C', backgroundColor: '#F4F7F0' },
  routeIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E7EEE2', alignItems: 'center', justifyContent: 'center' },
  routeIconActive: { backgroundColor: '#174C2C' },
  routeCopy: { flex: 1 },
  routeTitle: { color: '#141714', fontSize: 12, fontWeight: '800' },
  routeMeta: { color: '#696D68', fontSize: 8, lineHeight: 12, marginTop: 3 },
  noBucket: { color: '#696D68', fontSize: 10, lineHeight: 15, textAlign: 'center', paddingVertical: 14 },
  error: { color: '#9A3D25', fontSize: 10, lineHeight: 15, marginTop: 9 },
  generateButton: { minHeight: 49, marginTop: 11, borderRadius: 13, backgroundColor: '#174C2C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateButtonDisabled: { opacity: 0.65 },
  generateText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  disclaimer: { color: '#858981', fontSize: 8, lineHeight: 12, textAlign: 'center', marginTop: 9, marginHorizontal: 8 },
});
