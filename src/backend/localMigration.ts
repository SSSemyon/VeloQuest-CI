import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const LOCAL_KEYS = {
  cells: 'veloquest.exploredCells.v1',
  rides: 'veloquest.processedRides.v1',
  xp: 'veloquest.xp.v1',
  onboarding: 'veloquest.onboarding.v1',
  bike: 'veloquest.bike.v1',
  history: 'veloquest.rideHistory.v1',
  syncMode: 'veloquest.syncMode.v1',
  garageMode: 'veloquest.garageMode.v1',
  activeQuest: 'veloquest.activeQuest.v1',
};

const MIGRATION_KEY = 'local-alpha-0.3.0';
const MIGRATION_OWNER_KEY = 'veloquest.migration.supabase.owner.v1';

type LocalBike = {
  catalogBikeId?: string;
  manufacturerUrl?: string;
  brand: string;
  model: string;
  modelYear?: number;
  drivetrain?: string;
  brakes?: string;
  fork?: string;
  rearShock?: string;
  cassette?: string;
  crankset?: string;
  bottomBracket?: string;
  hubs?: string;
  wheelset?: string;
  tires?: string;
};

type LocalRideSummary = {
  id: string;
  source: 'Apple Health' | 'Health Connect' | 'GPX' | 'FIT' | 'Strava';
  startTime: string;
  distanceKm: number;
  durationMinutes: number;
  elevationGainM: number;
};

export type CloudSnapshot = {
  adventureXp: number;
  level: number;
  seasonId: string;
  seasonXp: number;
  specialization: 'explorer' | 'climber' | 'stayer' | null;
  specializationChangesUsed: number;
  activeQuest: {
    code: 'new_land' | 'long_ride' | 'high_route' | 'close_the_loop';
    progressValue: number;
    targetValue: number;
    rewardXp: number;
  } | null;
  exploredCells: string[];
  bike: LocalBike | null;
  history: LocalRideSummary[];
};

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function accountStorageKey(key: string, userId: string) {
  return `${key}:${userId}`;
}

async function claimLegacyPreferences(userId: string) {
  const preferenceKeys = [LOCAL_KEYS.onboarding, LOCAL_KEYS.syncMode, LOCAL_KEYS.garageMode, LOCAL_KEYS.activeQuest];
  const values = await AsyncStorage.multiGet(preferenceKeys);
  for (const [key, value] of values) {
    if (value == null) continue;
    const scopedKey = accountStorageKey(key, userId);
    if ((await AsyncStorage.getItem(scopedKey)) == null) await AsyncStorage.setItem(scopedKey, value);
  }
}

async function removeLegacyGlobals() {
  await AsyncStorage.multiRemove(Object.values(LOCAL_KEYS));
}

export async function migrateLocalAlphaState(userId: string) {
  const deviceMarkerKey = `veloquest.migration.supabase.v1:${userId}`;
  const migrationOwner = await AsyncStorage.getItem(MIGRATION_OWNER_KEY);
  const migrationCompleted = (await AsyncStorage.getItem(deviceMarkerKey)) === MIGRATION_KEY;
  if (migrationCompleted) {
    // Older builds could write the per-user marker before the owner marker.
    // Repair that upgrade path and retire the global namespace immediately.
    if (!migrationOwner) await AsyncStorage.setItem(MIGRATION_OWNER_KEY, userId);
    if (!migrationOwner || migrationOwner === userId) await claimLegacyPreferences(userId);
    await removeLegacyGlobals();
    return { migrated: false, alreadyCompleted: true };
  }
  if (migrationOwner && migrationOwner !== userId) {
    // Legacy 0.3.0 storage had no account namespace. It may be claimed once,
    // never copied into every account that subsequently signs in on the device.
    await AsyncStorage.setItem(deviceMarkerKey, MIGRATION_KEY);
    await removeLegacyGlobals();
    return { migrated: false, alreadyCompleted: true };
  }

  const [cellsJson, xpValue, bikeJson, historyJson] = await Promise.all([
    AsyncStorage.getItem(LOCAL_KEYS.cells),
    AsyncStorage.getItem(LOCAL_KEYS.xp),
    AsyncStorage.getItem(LOCAL_KEYS.bike),
    AsyncStorage.getItem(LOCAL_KEYS.history),
  ]);

  const body = {
    localVersion: '0.3.0',
    exploredCells: parseJson<string[]>(cellsJson, []),
    totalXp: Number(xpValue ?? '1380'),
    bike: parseJson<LocalBike | null>(bikeJson, null),
    history: parseJson<LocalRideSummary[]>(historyJson, []),
  };

  const { data, error } = await supabase.functions.invoke('migrate-local-alpha', { body });
  if (error) throw new Error(`Не удалось перенести локальные данные: ${error.message}`);

  await AsyncStorage.setItem(deviceMarkerKey, MIGRATION_KEY);
  await AsyncStorage.setItem(MIGRATION_OWNER_KEY, userId);
  await claimLegacyPreferences(userId);
  await removeLegacyGlobals();
  return data as { migrated: boolean; alreadyCompleted?: boolean };
}

export async function loadCloudSnapshot(userId: string): Promise<CloudSnapshot> {
  const [progressResult, cellsResult, bikeResult, ridesResult, activeQuestResult] = await Promise.all([
    supabase.from('player_progress').select('adventure_xp, level, season_id, season_xp, specialization, specialization_changes_used').eq('user_id', userId).maybeSingle(),
    supabase.from('explored_cells').select('h3_index').eq('user_id', userId).limit(5000),
    supabase.from('bikes').select('brand, model, model_year, configuration').eq('user_id', userId).eq('is_active', true).maybeSingle(),
    supabase.from('rides').select('id, started_at, distance_meters, moving_time_seconds, elevation_gain_meters').eq('user_id', userId).order('started_at', { ascending: false }).limit(50),
    supabase.from('quest_runs').select('template_code, progress_value, target_value, reward_xp').eq('user_id', userId).eq('status', 'active').order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (progressResult.error) throw progressResult.error;
  if (cellsResult.error) throw cellsResult.error;
  if (bikeResult.error) throw bikeResult.error;
  if (ridesResult.error) throw ridesResult.error;
  if (activeQuestResult.error) throw activeQuestResult.error;

  const rideIds = (ridesResult.data ?? []).map((row) => row.id);
  const importsResult = rideIds.length > 0
    ? await supabase.from('ride_imports').select('canonical_ride_id, source_kind, external_ride_id, imported_at').eq('user_id', userId).in('canonical_ride_id', rideIds).order('imported_at', { ascending: true })
    : { data: [], error: null };
  if (importsResult.error) throw importsResult.error;
  const sourceByRide = new Map<string, LocalRideSummary['source']>();
  for (const row of importsResult.data ?? []) {
    if (!row.canonical_ride_id || sourceByRide.has(row.canonical_ride_id)) continue;
    const source = row.source_kind === 'healthkit'
      ? 'Apple Health'
      : row.source_kind === 'health_connect'
        ? 'Health Connect'
        : row.source_kind === 'strava'
          ? 'Strava'
          : row.source_kind === 'gpx_fit' && typeof row.external_ride_id === 'string' && /\.fit(?::|$)/i.test(row.external_ride_id)
            ? 'FIT'
            : 'GPX';
    sourceByRide.set(row.canonical_ride_id, source);
  }

  const configuration = (bikeResult.data?.configuration ?? {}) as Record<string, unknown>;
  const bike = bikeResult.data
    ? {
        catalogBikeId: typeof configuration.catalogBikeId === 'string' ? configuration.catalogBikeId : undefined,
        manufacturerUrl: typeof configuration.manufacturerUrl === 'string' ? configuration.manufacturerUrl : undefined,
        brand: bikeResult.data.brand ?? '',
        model: bikeResult.data.model ?? '',
        modelYear: typeof bikeResult.data.model_year === 'number' ? bikeResult.data.model_year : undefined,
        drivetrain: typeof configuration.drivetrain === 'string' ? configuration.drivetrain : undefined,
        brakes: typeof configuration.brakes === 'string' ? configuration.brakes : undefined,
        fork: typeof configuration.fork === 'string' ? configuration.fork : undefined,
        rearShock: typeof configuration.rearShock === 'string' ? configuration.rearShock : undefined,
        cassette: typeof configuration.cassette === 'string' ? configuration.cassette : undefined,
        crankset: typeof configuration.crankset === 'string' ? configuration.crankset : undefined,
        bottomBracket: typeof configuration.bottomBracket === 'string' ? configuration.bottomBracket : undefined,
        hubs: typeof configuration.hubs === 'string' ? configuration.hubs : undefined,
        wheelset: typeof configuration.wheelset === 'string' ? configuration.wheelset : undefined,
        tires: typeof configuration.tires === 'string' ? configuration.tires : undefined,
      }
    : null;

  return {
    adventureXp: progressResult.data?.adventure_xp ?? 0,
    level: progressResult.data?.level ?? 1,
    seasonId: progressResult.data?.season_id ?? 'alpha-1',
    seasonXp: progressResult.data?.season_xp ?? 0,
    specialization: progressResult.data?.specialization === 'explorer' || progressResult.data?.specialization === 'climber' || progressResult.data?.specialization === 'stayer'
      ? progressResult.data.specialization
      : null,
    specializationChangesUsed: progressResult.data?.specialization_changes_used ?? 0,
    activeQuest: activeQuestResult.data?.template_code === 'new_land'
      || activeQuestResult.data?.template_code === 'long_ride'
      || activeQuestResult.data?.template_code === 'high_route'
      || activeQuestResult.data?.template_code === 'close_the_loop'
      ? {
          code: activeQuestResult.data.template_code,
          progressValue: Number(activeQuestResult.data.progress_value ?? 0),
          targetValue: Number(activeQuestResult.data.target_value ?? 0),
          rewardXp: Number(activeQuestResult.data.reward_xp ?? 0),
        }
      : null,
    exploredCells: (cellsResult.data ?? []).map((row) => row.h3_index),
    bike,
    history: (ridesResult.data ?? []).map((row) => ({
      id: row.id,
      source: sourceByRide.get(row.id) ?? 'GPX',
      startTime: row.started_at,
      distanceKm: row.distance_meters / 1000,
      durationMinutes: row.moving_time_seconds / 60,
      elevationGainM: row.elevation_gain_meters ?? 0,
    })),
  };
}

export async function saveBikeToCloud(userId: string, bike: LocalBike) {
  const catalogResult = bike.catalogBikeId
    ? await supabase.from('bike_catalog_models').select('id').eq('id', bike.catalogBikeId).eq('enabled', true).gte('model_year', 2020).maybeSingle()
    : { data: null, error: null };
  if (catalogResult.error) throw catalogResult.error;
  const verifiedCatalogId = catalogResult.data?.id ?? null;
  const payload = {
    user_id: userId,
    mode: 'real',
    name: `${bike.brand} ${bike.model}`.trim(),
    brand: bike.brand,
    model: bike.model,
    model_year: bike.modelYear ?? null,
    configuration: {
      catalogBikeId: verifiedCatalogId,
      manufacturerUrl: bike.manufacturerUrl ?? null,
      drivetrain: bike.drivetrain ?? null,
      brakes: bike.brakes ?? null,
      fork: bike.fork ?? null,
      rearShock: bike.rearShock ?? null,
      cassette: bike.cassette ?? null,
      crankset: bike.crankset ?? null,
      bottomBracket: bike.bottomBracket ?? null,
      hubs: bike.hubs ?? null,
      wheelset: bike.wheelset ?? null,
      tires: bike.tires ?? null,
    },
    catalog_verified: verifiedCatalogId !== null,
    is_active: true,
  };

  const existing = await supabase.from('bikes').select('id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (existing.error) throw existing.error;

  const result = existing.data
    ? await supabase.from('bikes').update(payload).eq('id', existing.data.id).eq('user_id', userId)
    : await supabase.from('bikes').insert(payload);
  if (result.error) throw result.error;
}
