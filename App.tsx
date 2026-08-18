import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  QUESTS,
  type CanonicalRide,
  type Quest,
} from './src/domain/ride';
import { QuestMap } from './src/components/QuestMap';
import { RouteExplorer } from './src/components/RouteExplorer';
import { AuthScreen, PasswordResetScreen } from './src/components/AuthScreen';
import { linkGoogleIdentity } from './src/auth/googleAuth';
import { linkVkIdentity, loadVkIdentityStatus, unlinkVkIdentity } from './src/auth/vkAuth';
import { RemoteBikeImage } from './src/components/RemoteBikeImage';
import { AchievementsPanel } from './src/components/AchievementsPanel';
import { loadCloudSnapshot, migrateLocalAlphaState, saveBikeToCloud } from './src/backend/localMigration';
import { EMPTY_SNAPSHOT, loadAchievementSnapshot, type AchievementSnapshot } from './src/backend/achievements';
import { disconnectSource, loadSyncDiagnostics, logClientEvent, recordSourceSync, sourceKindForMode, type SourceKind, type SyncDiagnostic } from './src/backend/diagnostics';
import { loadCatalogBikeConfiguration, loadGarageBikeMedia, loadGarageRecommendations, searchBikeCatalog, type BikeCatalogResult, type GarageBikeMedia, type GarageRecommendation } from './src/backend/garageCatalog';
import {
  chooseSpecialization,
  ensureVeloQuestBike,
  installVirtualItem,
  loadPrivacySettings,
  loadQuestOrder,
  loadSeasonChapters,
  loadVirtualItems,
  savePrivacySettings,
  type PrivacySettings,
  type SeasonChapter,
  type Specialization,
  type VirtualItem,
} from './src/backend/gameplay';
import { deleteVeloQuestAccount } from './src/backend/privacy';
import { activateQuest, type ActiveQuestRun } from './src/backend/questState';
import { processRideOnServer } from './src/backend/rideProcessor';
import { loadRideInbox, resolveRideInboxItem, type RideInboxItem } from './src/backend/rideInbox';
import { importRide, type SyncMode } from './src/integrations/rideSync';
import { backfillStravaRides, connectStrava, disconnectStrava, syncLatestStravaRide } from './src/integrations/strava';
import { supabase } from './src/lib/supabase';
import { captureAccountOperation, isCurrentAccountOperation, nextAccountEpoch } from './src/lib/accountOperationGate';
import { ThemeProvider, useTheme, useThemedStyles } from './src/theme';

const COLORS = {
  ivory: '#FBFAF6',
  paper: '#F4F2EB',
  graphite: '#141714',
  muted: '#696D68',
  line: '#DCDBD3',
  sage: '#E5EBDD',
  green: '#174C2C',
  orange: '#F05B11',
  white: '#FFFFFF',
};

const STORAGE = {
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

function accountStorageKey(key: string, userId: string) {
  return `${key}:${userId}`;
}

async function readAccountStorage(key: string, userId: string) {
  // Never fall back to the pre-account global namespace here. Legacy values are
  // claimed once by migrateLocalAlphaState; runtime reads are always per-user.
  return AsyncStorage.getItem(accountStorageKey(key, userId));
}

type Screen = 'auth' | 'passwordReset' | 'welcome' | 'sync' | 'bikeMode' | 'quest' | 'ride' | 'result' | 'app' | 'bikeEdit' | 'history' | 'privacy' | 'rideInbox';
type MainTab = 'home' | 'map' | 'quests' | 'garage' | 'profile';
type CloudStatus = 'idle' | 'syncing' | 'synced' | 'error';

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

type RideSummary = Pick<CanonicalRide, 'id' | 'source' | 'startTime' | 'distanceKm' | 'durationMinutes' | 'elevationGainM'>;

const MAIN_TABS: { id: MainTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', label: 'Главная', icon: 'home' },
  { id: 'map', label: 'Карта', icon: 'map' },
  { id: 'quests', label: 'Квесты', icon: 'flag' },
  { id: 'garage', label: 'Гараж', icon: 'bicycle' },
  { id: 'profile', label: 'Профиль', icon: 'person' },
];

const SPECIALIZATIONS = {
  explorer: { title: 'Исследователь', detail: 'Больше новых территорий', icon: 'compass-outline' as const },
  climber: { title: 'Горняк', detail: 'Больше набора высоты', icon: 'trending-up-outline' as const },
  stayer: { title: 'Стайер', detail: 'Дальние и длительные поездки', icon: 'trail-sign-outline' as const },
};

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const styles = useThemedStyles(baseStyles);
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && !disabled && styles.primaryPressed, disabled && styles.disabled]}>
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

function FlowHeader({ onBack, onSkip }: { onBack?: () => void; onSkip?: () => void }) {
  const styles = useThemedStyles(baseStyles);
  const { colors: COLORS } = useTheme();
  return (
    <View style={styles.flowHeader}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.flowHeaderAction}>
        <Ionicons name="arrow-back" size={25} color={COLORS.green} />
      </Pressable>
      {onSkip ? <Pressable onPress={onSkip} hitSlop={12} style={styles.flowHeaderAction}><Text style={styles.skipText}>Пропустить</Text></Pressable> : <View />}
    </View>
  );
}

function Option({ title, detail, icon, selected, onPress }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; selected: boolean; onPress: () => void }) {
  const styles = useThemedStyles(baseStyles);
  const { colors: COLORS } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && styles.optionSelected]}>
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}><Ionicons name={icon} size={19} color={selected ? COLORS.white : COLORS.green} /></View>
      <View style={styles.optionCopy}><Text style={styles.optionTitle}>{title}</Text><Text style={styles.optionDetail}>{detail}</Text></View>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? COLORS.green : '#B8BBB3'} />
    </Pressable>
  );
}

function questIcon(questId: Quest['id']): keyof typeof Ionicons.glyphMap {
  if (questId === 'explore') return 'compass-outline';
  if (questId === 'endurance') return 'trail-sign-outline';
  if (questId === 'climb') return 'trending-up-outline';
  return 'repeat-outline';
}

function formatDuration(minutes: number) {
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function sourceKindLabel(kind: SourceKind) {
  if (kind === 'healthkit') return 'Apple Health';
  if (kind === 'health_connect') return 'Health Connect';
  if (kind === 'strava') return 'Strava';
  return 'GPX / FIT';
}

function authRedirectParams(url: string) {
  const values: Record<string, string> = {};
  const sections = [url.split('?')[1]?.split('#')[0], url.split('#')[1]].filter(Boolean) as string[];
  for (const section of sections) {
    for (const pair of section.split('&')) {
      const [rawKey, ...rawValue] = pair.split('=');
      if (!rawKey) continue;
      const decode = (value: string) => decodeURIComponent(value.replace(/\+/g, ' '));
      values[decode(rawKey)] = decode(rawValue.join('='));
    }
  }
  return values;
}

function MiniBrand({ suffix }: { suffix?: string }) {
  const styles = useThemedStyles(baseStyles);
  return (
    <View style={styles.miniBrandRow}>
      <View style={styles.miniBrand}><Image source={require('./assets/veloquest-icon.png')} style={styles.miniBrandIcon} /><Text style={styles.miniBrandText}>VeloQuest</Text></View>
      {suffix ? <View style={styles.versionChip}><Text style={styles.versionChipText}>{suffix}</Text></View> : null}
    </View>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ failed: true });
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      return logClientEvent(data.session.user.id, 'client_render_error', 'error', undefined, {
        message: error.message.slice(0, 180),
        componentStack: info.componentStack?.slice(0, 500),
      });
    }).catch(() => undefined);
  }

  render() {
    if (this.state.failed) {
      return <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: COLORS.ivory }}><Ionicons name="warning-outline" size={34} color={COLORS.orange} /><Text style={{ marginTop: 14, color: COLORS.graphite, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>VeloQuest нужно перезапустить</Text><Text style={{ marginTop: 7, color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>Ошибка интерфейса записана в Alpha diagnostics без содержимого твоих маршрутов.</Text></SafeAreaView>;
    }
    return this.props.children;
  }
}

function VeloQuestApp() {
  const styles = useThemedStyles(baseStyles);
  const { colors: COLORS, dark, mode: themeMode, setMode: setThemeMode } = useTheme();
  const [screen, setScreen] = useState<Screen>('welcome');
  const [session, setSession] = useState<Session | null>(null);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('idle');
  const [syncDiagnostics, setSyncDiagnostics] = useState<SyncDiagnostic[]>([]);
  const [tab, setTab] = useState<MainTab>('home');
  const [questFilter, setQuestFilter] = useState<'active' | 'all'>('active');
  const [syncMode, setSyncMode] = useState<SyncMode>('platform');
  const [quest, setQuest] = useState<Quest>(QUESTS[0]);
  const [questOptions, setQuestOptions] = useState<Quest[]>(QUESTS);
  const [activeQuestRun, setActiveQuestRun] = useState<ActiveQuestRun | null>(null);
  const [ride, setRide] = useState<CanonicalRide | null>(null);
  const [newCells, setNewCells] = useState<string[]>([]);
  const [exploredCells, setExploredCells] = useState<string[]>([]);
  const [history, setHistory] = useState<RideSummary[]>([]);
  const [bike, setBike] = useState<LocalBike | null>(null);
  const [garageBikeMedia, setGarageBikeMedia] = useState<GarageBikeMedia | null>(null);
  const [garageRecommendations, setGarageRecommendations] = useState<GarageRecommendation[]>([]);
  const [garageMode, setGarageMode] = useState<'real' | 'veloquest'>('real');
  const [virtualItems, setVirtualItems] = useState<VirtualItem[]>([]);
  const [rideInbox, setRideInbox] = useState<RideInboxItem[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({ enabled: true, radiusM: 250 });
  const [seasonChapters, setSeasonChapters] = useState<SeasonChapter[]>([]);
  const [bikeBrand, setBikeBrand] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [bikeModelYear, setBikeModelYear] = useState('');
  const [bikeDrivetrain, setBikeDrivetrain] = useState('');
  const [bikeBrakes, setBikeBrakes] = useState('');
  const [bikeFork, setBikeFork] = useState('');
  const [bikeRearShock, setBikeRearShock] = useState('');
  const [bikeCassette, setBikeCassette] = useState('');
  const [bikeCrankset, setBikeCrankset] = useState('');
  const [bikeBottomBracket, setBikeBottomBracket] = useState('');
  const [bikeHubs, setBikeHubs] = useState('');
  const [bikeWheelset, setBikeWheelset] = useState('');
  const [bikeTires, setBikeTires] = useState('');
  const [catalogBikeId, setCatalogBikeId] = useState<string | undefined>();
  const [catalogManufacturerUrl, setCatalogManufacturerUrl] = useState<string | undefined>();
  const [bikeFinderQuery, setBikeFinderQuery] = useState('');
  const [bikeFinderExpanded, setBikeFinderExpanded] = useState(false);
  const [bikeFinderBrand, setBikeFinderBrand] = useState('');
  const [bikeFinderCategory, setBikeFinderCategory] = useState('');
  const [bikeFinderYearFrom, setBikeFinderYearFrom] = useState('2020');
  const [bikeFinderFrame, setBikeFinderFrame] = useState('');
  const [bikeFinderWheel, setBikeFinderWheel] = useState('');
  const [bikeFinderDrivetrain, setBikeFinderDrivetrain] = useState('');
  const [bikeFinderBrake, setBikeFinderBrake] = useState('');
  const [bikeFinderResults, setBikeFinderResults] = useState<BikeCatalogResult[]>([]);
  const [bikeFinderLoading, setBikeFinderLoading] = useState(false);
  const [bikeFinderLoadingMore, setBikeFinderLoadingMore] = useState(false);
  const [bikeFinderHasMore, setBikeFinderHasMore] = useState(false);
  const [bikeFinderError, setBikeFinderError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [routeInfluenceReported, setRouteInfluenceReported] = useState<boolean | null>(null);
  // 0.3.0 used 1380 XP as a visual demo baseline. Runtime progression is now
  // server-authoritative, so a fresh UI must never render that legacy value.
  const [totalXp, setTotalXp] = useState(0);
  const [serverLevel, setServerLevel] = useState(1);
  const [seasonId, setSeasonId] = useState('alpha-1');
  const [seasonXp, setSeasonXp] = useState(0);
  const [specialization, setSpecialization] = useState<keyof typeof SPECIALIZATIONS | null>(null);
  const [specializationChangesUsed, setSpecializationChangesUsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [vkLinked, setVkLinked] = useState(false);
  const [vkCanUnlink, setVkCanUnlink] = useState(false);
  const [achievementSnapshot, setAchievementSnapshot] = useState<AchievementSnapshot>(EMPTY_SNAPSHOT);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recoveryInProgress = useRef(false);
  const catalogSearchRequest = useRef(0);
  const activeUserId = useRef<string | null>(null);
  const accountEpoch = useRef(0);
  const captureAccount = (userId: string) => captureAccountOperation(userId, accountEpoch.current);
  const accountIsCurrent = (token: ReturnType<typeof captureAccountOperation>) => isCurrentAccountOperation(token, activeUserId.current, accountEpoch.current);

  const resetAccountRuntime = () => {
    catalogSearchRequest.current += 1;
    setRide(null);
    setNewCells([]);
    setExploredCells([]);
    setHistory([]);
    setBike(null);
    setBikeBrand('');
    setBikeModel('');
    setBikeModelYear('');
    setBikeDrivetrain('');
    setBikeBrakes('');
    setBikeFork('');
    setBikeRearShock('');
    setBikeCassette('');
    setBikeCrankset('');
    setBikeBottomBracket('');
    setBikeHubs('');
    setBikeWheelset('');
    setBikeTires('');
    setCatalogBikeId(undefined);
    setCatalogManufacturerUrl(undefined);
    catalogSearchRequest.current += 1;
    setBikeFinderQuery('');
    setBikeFinderExpanded(false);
    setBikeFinderBrand('');
    setBikeFinderCategory('');
    setBikeFinderYearFrom('2020');
    setBikeFinderFrame('');
    setBikeFinderWheel('');
    setBikeFinderDrivetrain('');
    setBikeFinderBrake('');
    setBikeFinderResults([]);
    setBikeFinderLoading(false);
    setBikeFinderLoadingMore(false);
    setBikeFinderHasMore(false);
    setBikeFinderError(null);
    setGarageBikeMedia(null);
    setGarageRecommendations([]);
    setTotalXp(0);
    setServerLevel(1);
    setSeasonXp(0);
    setSpecialization(null);
    setSpecializationChangesUsed(0);
    setSyncDiagnostics([]);
    setRideInbox([]);
    setCloudStatus('idle');
    setHydratedUserId(null);
    setOnboardingDone(false);
    setSyncMode('platform');
    setGarageMode('real');
    setTab('home');
    setQuestFilter('active');
    setQuest(QUESTS[0]);
    setQuestOptions(QUESTS);
    setActiveQuestRun(null);
    setVirtualItems([]);
    setSeasonChapters([]);
    setPrivacySettings({ enabled: true, radiusM: 250 });
    setCompleted(false);
    setEarnedXp(0);
    setRouteInfluenceReported(null);
    setBusy(false);
    setVkLinked(false);
    setVkCanUnlink(false);
    setAchievementSnapshot(EMPTY_SNAPSHOT);
    setAchievementsLoading(false);
    setError(null);
  };

  useEffect(() => {
    if (screen !== 'bikeEdit' || !session) return;
    const requestId = ++catalogSearchRequest.current;
    setBikeFinderLoadingMore(false);
    const timer = setTimeout(() => {
      const parsedYearFrom = Number(bikeFinderYearFrom);
      setBikeFinderLoading(true);
      setBikeFinderLoadingMore(false);
      setBikeFinderError(null);
      void searchBikeCatalog({
        query: bikeFinderQuery,
        brand: bikeFinderBrand,
        category: bikeFinderCategory,
        yearFrom: Number.isInteger(parsedYearFrom) ? parsedYearFrom : 2020,
        frameMaterial: bikeFinderFrame,
        wheelSize: bikeFinderWheel,
        drivetrainBrand: bikeFinderDrivetrain,
        brakeType: bikeFinderBrake,
        limit: 20,
      }).then((items) => {
        if (catalogSearchRequest.current === requestId) {
          setBikeFinderResults(items);
          setBikeFinderHasMore(items.length === 20);
        }
      }).catch((cause) => {
        if (catalogSearchRequest.current !== requestId) return;
        setBikeFinderResults([]);
        setBikeFinderError(cause instanceof Error ? cause.message : 'Не удалось выполнить поиск по каталогу.');
      }).finally(() => {
        if (catalogSearchRequest.current === requestId) setBikeFinderLoading(false);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [screen, session?.user.id, bikeFinderQuery, bikeFinderBrand, bikeFinderCategory, bikeFinderYearFrom, bikeFinderFrame, bikeFinderWheel, bikeFinderDrivetrain, bikeFinderBrake]);

  const platformName = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';
  const platformDetail = Platform.OS === 'ios' ? 'Apple Watch и совместимые приложения' : 'Android и совместимые приложения';
  const syncSourceName = syncMode === 'platform' ? platformName : syncMode === 'fit' ? 'FIT' : syncMode === 'strava' ? 'Strava' : 'GPX';
  const syncInstruction = syncMode === 'platform'
    ? `VeloQuest найдёт последнюю велопоездку в ${platformName}.`
    : syncMode === 'strava'
      ? 'VeloQuest безопасно получит последнюю реальную велопоездку из Strava через backend connector.'
    : syncMode === 'fit'
      ? 'Выбери FIT-файл с GPS-треком из велокомпьютера или другого приложения.'
      : 'Выбери GPX-файл с GPS-треком.';
  const stravaConnected = syncDiagnostics.some((item) => item.kind === 'strava' && item.status === 'connected');
  const googleLinked = session?.user.identities?.some((identity) => identity.provider === 'google') ?? false;

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserId.current !== nextUserId) {
        accountEpoch.current = nextAccountEpoch(activeUserId.current, nextUserId, accountEpoch.current);
        resetAccountRuntime();
      }
      activeUserId.current = nextUserId;
      setSession(nextSession);
    });

    const handleAuthRedirect = async (url: string | null) => {
      if (!url?.startsWith('veloquest://')) return;
      const params = authRedirectParams(url);
      if (params.error || params.error_code) {
        setError(params.error_description || params.error || 'Ссылка восстановления недействительна или устарела.');
        setScreen('auth');
        return;
      }
      if (params.type !== 'recovery') return;
      if (!params.access_token || !params.refresh_token) {
        setError('В ссылке восстановления не хватает данных сессии. Запроси новое письмо.');
        setScreen('auth');
        return;
      }

      recoveryInProgress.current = true;
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (sessionError) {
        recoveryInProgress.current = false;
        setError(sessionError.message);
        setScreen('auth');
        return;
      }
      setError(null);
      setScreen('passwordReset');
    };

    const restore = async () => {
      const restoreEpoch = accountEpoch.current;
      try {
        const sessionResult = await supabase.auth.getSession();
        if (accountEpoch.current !== restoreEpoch) return;
        const restoredSession = sessionResult.data.session;
        const userId = restoredSession?.user.id;
        activeUserId.current = userId ?? null;
        const [storedXp, storedCellsJson, storedHistoryJson, storedBikeJson, onboarding, storedSyncMode, storedGarageMode, storedQuestCode] = await Promise.all([
          userId ? readAccountStorage(STORAGE.xp, userId) : null,
          userId ? readAccountStorage(STORAGE.cells, userId) : null,
          userId ? readAccountStorage(STORAGE.history, userId) : null,
          userId ? readAccountStorage(STORAGE.bike, userId) : null,
          userId ? readAccountStorage(STORAGE.onboarding, userId) : null,
          userId ? readAccountStorage(STORAGE.syncMode, userId) : null,
          userId ? readAccountStorage(STORAGE.garageMode, userId) : null,
          userId ? readAccountStorage(STORAGE.activeQuest, userId) : null,
        ]);
        if (accountEpoch.current !== restoreEpoch || activeUserId.current !== (userId ?? null)) return;
        if (storedXp) setTotalXp(Number(storedXp));
        if (storedCellsJson) setExploredCells(JSON.parse(storedCellsJson));
        if (storedHistoryJson) setHistory(JSON.parse(storedHistoryJson));
        if (storedBikeJson) {
          const restoredBike: LocalBike = JSON.parse(storedBikeJson);
          setBike(restoredBike);
          setBikeBrand(restoredBike.brand);
          setBikeModel(restoredBike.model);
          setBikeModelYear(restoredBike.modelYear ? String(restoredBike.modelYear) : '');
          setBikeDrivetrain(restoredBike.drivetrain ?? '');
          setBikeBrakes(restoredBike.brakes ?? '');
          setBikeFork(restoredBike.fork ?? '');
          setBikeRearShock(restoredBike.rearShock ?? '');
          setBikeCassette(restoredBike.cassette ?? '');
          setBikeCrankset(restoredBike.crankset ?? '');
          setBikeBottomBracket(restoredBike.bottomBracket ?? '');
          setBikeHubs(restoredBike.hubs ?? '');
          setBikeWheelset(restoredBike.wheelset ?? '');
          setBikeTires(restoredBike.tires ?? '');
          setCatalogBikeId(restoredBike.catalogBikeId);
          setCatalogManufacturerUrl(restoredBike.manufacturerUrl);
        }
        if (storedSyncMode === 'platform' || storedSyncMode === 'gpx' || storedSyncMode === 'fit' || storedSyncMode === 'strava') setSyncMode(storedSyncMode);
        if (storedGarageMode === 'real' || storedGarageMode === 'veloquest') setGarageMode(storedGarageMode);
        const offlineQuest = QUESTS.find((item) => item.serverCode === storedQuestCode);
        if (offlineQuest) {
          setQuest(offlineQuest);
          setActiveQuestRun({ code: offlineQuest.serverCode, progressValue: 0, targetValue: 0, rewardXp: offlineQuest.rewardXp });
        }
        const didFinishOnboarding = onboarding === 'done';
        setOnboardingDone(didFinishOnboarding);
        setSession(restoredSession);
        if (!recoveryInProgress.current) setScreen(restoredSession ? (didFinishOnboarding ? 'app' : 'welcome') : 'auth');
      } finally {
        setBooting(false);
      }
    };
    void restore();
    void Linking.getInitialURL().then(handleAuthRedirect).catch(() => undefined);
    const linkingListener = Linking.addEventListener('url', ({ url }) => { void handleAuthRedirect(url); });

    return () => {
      authListener.subscription.unsubscribe();
      linkingListener.remove();
    };
  }, []);

  useEffect(() => {
    if (booting || !session || hydratedUserId !== session.user.id) return;
    void AsyncStorage.setItem(accountStorageKey(STORAGE.syncMode, session.user.id), syncMode);
  }, [syncMode, booting, session?.user.id, hydratedUserId]);

  useEffect(() => {
    if (booting || !session || hydratedUserId !== session.user.id) return;
    void AsyncStorage.setItem(accountStorageKey(STORAGE.garageMode, session.user.id), garageMode);
  }, [garageMode, booting, session?.user.id, hydratedUserId]);

  useEffect(() => {
    if (booting) return;
    if (!session) {
      setCloudStatus('idle');
      setScreen('auth');
      return;
    }

    let cancelled = false;
    const syncAccount = async () => {
      setCloudStatus('syncing');
      try {
        await migrateLocalAlphaState(session.user.id);
        const snapshot = await loadCloudSnapshot(session.user.id);
        await ensureVeloQuestBike(session.user.id);
        const [diagnostics, chapters, virtualRewards, privacy, inbox, orderedQuests, storedQuestCode, storedOnboarding, storedSyncMode, storedGarageMode] = await Promise.all([
          loadSyncDiagnostics(session.user.id),
          loadSeasonChapters(snapshot.seasonId),
          loadVirtualItems(session.user.id),
          loadPrivacySettings(session.user.id),
          loadRideInbox(session.user.id),
          loadQuestOrder(snapshot.specialization, QUESTS),
          AsyncStorage.getItem(accountStorageKey(STORAGE.activeQuest, session.user.id)),
          readAccountStorage(STORAGE.onboarding, session.user.id),
          readAccountStorage(STORAGE.syncMode, session.user.id),
          readAccountStorage(STORAGE.garageMode, session.user.id),
        ]);
        if (cancelled) return;
        setTotalXp(snapshot.adventureXp);
        setServerLevel(snapshot.level);
        setSeasonId(snapshot.seasonId);
        setSeasonXp(snapshot.seasonXp);
        setSpecialization(snapshot.specialization);
        setSpecializationChangesUsed(snapshot.specializationChangesUsed);
        setSeasonChapters(chapters);
        setVirtualItems(virtualRewards);
        setPrivacySettings(privacy);
        setRideInbox(inbox);
        setQuestOptions(orderedQuests);
        // An active server run is authoritative so a stale device choice cannot
        // silently abandon partially completed progress on the next ride.
        const restoredQuestCode = snapshot.activeQuest?.code ?? storedQuestCode;
        const restoredQuest = orderedQuests.find((item) => item.serverCode === restoredQuestCode) ?? orderedQuests[0];
        if (restoredQuest) setQuest(restoredQuest);
        setActiveQuestRun(snapshot.activeQuest);
        setExploredCells(snapshot.exploredCells);
        setHistory(snapshot.history);
        setSyncDiagnostics(diagnostics);
        await Promise.all([
          AsyncStorage.setItem(accountStorageKey(STORAGE.xp, session.user.id), String(snapshot.adventureXp)),
          AsyncStorage.setItem(accountStorageKey(STORAGE.cells, session.user.id), JSON.stringify(snapshot.exploredCells)),
          AsyncStorage.setItem(accountStorageKey(STORAGE.history, session.user.id), JSON.stringify(snapshot.history)),
        ]);
        if (snapshot.bike && snapshot.bike.brand && snapshot.bike.model) {
          setBike(snapshot.bike);
          setBikeBrand(snapshot.bike.brand);
          setBikeModel(snapshot.bike.model);
          setBikeModelYear(snapshot.bike.modelYear ? String(snapshot.bike.modelYear) : '');
          setBikeDrivetrain(snapshot.bike.drivetrain ?? '');
          setBikeBrakes(snapshot.bike.brakes ?? '');
          setBikeFork(snapshot.bike.fork ?? '');
          setBikeRearShock(snapshot.bike.rearShock ?? '');
          setBikeCassette(snapshot.bike.cassette ?? '');
          setBikeCrankset(snapshot.bike.crankset ?? '');
          setBikeBottomBracket(snapshot.bike.bottomBracket ?? '');
          setBikeHubs(snapshot.bike.hubs ?? '');
          setBikeWheelset(snapshot.bike.wheelset ?? '');
          setBikeTires(snapshot.bike.tires ?? '');
          setCatalogBikeId(snapshot.bike.catalogBikeId);
          setCatalogManufacturerUrl(snapshot.bike.manufacturerUrl);
        } else {
          setBike(null);
          setBikeBrand('');
          setBikeModel('');
          setBikeModelYear('');
          setBikeDrivetrain('');
          setBikeBrakes('');
          setBikeFork('');
          setBikeRearShock('');
          setBikeCassette('');
          setBikeCrankset('');
          setBikeBottomBracket('');
          setBikeHubs('');
          setBikeWheelset('');
          setBikeTires('');
          setCatalogBikeId(undefined);
          setCatalogManufacturerUrl(undefined);
        }
        const didFinishOnboarding = storedOnboarding === 'done';
        setOnboardingDone(didFinishOnboarding);
        if (storedSyncMode === 'platform' || storedSyncMode === 'gpx' || storedSyncMode === 'fit' || storedSyncMode === 'strava') setSyncMode(storedSyncMode);
        if (storedGarageMode === 'real' || storedGarageMode === 'veloquest') setGarageMode(storedGarageMode);
        setHydratedUserId(session.user.id);
        if (!recoveryInProgress.current) setScreen(didFinishOnboarding ? 'app' : 'welcome');
        setCloudStatus('synced');
      } catch (cause) {
        if (cancelled) return;
        setCloudStatus('error');
        setError(cause instanceof Error ? cause.message : 'Не удалось синхронизировать аккаунт.');
        void logClientEvent(session.user.id, 'cloud_hydration_failed', 'error', undefined, {
          message: cause instanceof Error ? cause.message.slice(0, 180) : 'unknown',
        }).catch(() => undefined);
      }
    };
    void syncAccount();
    return () => { cancelled = true; };
  }, [session?.user.id, booting]);

  useEffect(() => {
    if (!session) {
      setGarageRecommendations([]);
      return;
    }
    let cancelled = false;
    const rideContext = {
      rideCount: history.length,
      distanceKm: history.reduce((total, item) => total + item.distanceKm, 0),
      elevationGainM: history.reduce((total, item) => total + item.elevationGainM, 0),
    };
    void loadGarageRecommendations(bike, rideContext).then((items) => {
      if (!cancelled) setGarageRecommendations(items);
    }).catch(() => {
      if (!cancelled) setGarageRecommendations([{ status: 'unknown', title: 'Каталог временно недоступен', detail: 'Совместимость не определена. VeloQuest не будет показывать предположение.' }]);
    });
    return () => { cancelled = true; };
  }, [
    session?.user.id,
    bike?.catalogBikeId,
    bike?.brand,
    bike?.model,
    bike?.modelYear,
    bike?.drivetrain,
    bike?.brakes,
    bike?.fork,
    bike?.rearShock,
    bike?.cassette,
    bike?.crankset,
    bike?.bottomBracket,
    bike?.hubs,
    bike?.wheelset,
    bike?.tires,
    history,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!session || !bike) {
      setGarageBikeMedia(null);
      return () => { cancelled = true; };
    }
    void loadGarageBikeMedia(bike).then((media) => {
      if (!cancelled) setGarageBikeMedia(media);
    }).catch(() => {
      if (!cancelled) setGarageBikeMedia(null);
    });
    return () => { cancelled = true; };
  }, [session?.user.id, bike?.catalogBikeId, bike?.brand, bike?.model, bike?.modelYear]);

  const syncLatestRide = async () => {
    setBusy(true);
    setError(null);
    setRouteInfluenceReported(null);
    const userId = session?.user.id;
    const operationEpoch = accountEpoch.current;
    const isCurrentAccount = () => Boolean(userId) && activeUserId.current === userId && accountEpoch.current === operationEpoch;
    try {
      if (!userId) throw new Error('Войди в VeloQuest, чтобы засчитать поездку.');
      const stravaSync = syncMode === 'strava' ? await syncLatestStravaRide(quest.serverCode) : null;
      const imported = stravaSync?.ride ?? await importRide(syncMode);
      if (!isCurrentAccount()) return;
      if (!imported) {
        setError(syncMode === 'platform' ? 'Не нашёл велопоездку с доступным GPS-маршрутом.' : 'Импорт отменён.');
        return;
      }

      setCloudStatus('syncing');
      const result = stravaSync?.result ?? await processRideOnServer(imported, quest.serverCode);
      if (!isCurrentAccount()) return;
      if (result.duplicate) {
        setError('Эта поездка уже засчитана. Двойной XP заблокирован. Cross-source совпадения можно проверить в Ride Inbox.');
        setRide(imported);
        const nextInbox = await loadRideInbox(userId).catch(() => rideInbox);
        if (!isCurrentAccount()) return;
        setRideInbox(nextInbox);
        setCloudStatus('synced');
        return;
      }

      const acceptedRide: CanonicalRide = {
        ...imported,
        id: result.ride.id,
        startTime: result.ride.startTime,
        endTime: result.ride.endTime,
        points: result.ride.points,
        distanceKm: result.ride.distanceKm,
        durationMinutes: result.ride.durationMinutes,
        elevationGainM: result.ride.elevationGainM,
      };
      const summary: RideSummary = {
        id: acceptedRide.id,
        source: acceptedRide.source,
        startTime: acceptedRide.startTime,
        distanceKm: acceptedRide.distanceKm,
        durationMinutes: acceptedRide.durationMinutes,
        elevationGainM: acceptedRide.elevationGainM,
      };
      let nextHistory = [summary, ...history.filter((item) => item.id !== acceptedRide.id)].slice(0, 50);

      let authoritativeXp = result.totalXp;
      let authoritativeCells = [...new Set([...exploredCells, ...result.newCells])];
      try {
        const snapshot = await loadCloudSnapshot(userId);
        if (!isCurrentAccount()) return;
        authoritativeXp = snapshot.adventureXp;
        setServerLevel(snapshot.level);
        setSeasonId(snapshot.seasonId);
        setSeasonXp(snapshot.seasonXp);
        setSpecialization(snapshot.specialization);
        setSpecializationChangesUsed(snapshot.specializationChangesUsed);
        const nextVirtualItems = await loadVirtualItems(userId);
        if (!isCurrentAccount()) return;
        setVirtualItems(nextVirtualItems);
        authoritativeCells = snapshot.exploredCells;
        nextHistory = snapshot.history;
      } catch {
        // The processor response is already authoritative; hydration can retry on the next app start.
      }

      if (!isCurrentAccount()) return;
      const storedRidesJson = await AsyncStorage.getItem(accountStorageKey(STORAGE.rides, userId));
      const cachedRideIds: string[] = storedRidesJson ? JSON.parse(storedRidesJson) : [];

      await Promise.all([
        AsyncStorage.setItem(accountStorageKey(STORAGE.cells, userId), JSON.stringify(authoritativeCells)),
        AsyncStorage.setItem(accountStorageKey(STORAGE.rides, userId), JSON.stringify([...new Set([...cachedRideIds, acceptedRide.id])])),
        AsyncStorage.setItem(accountStorageKey(STORAGE.xp, userId), String(authoritativeXp)),
        AsyncStorage.setItem(accountStorageKey(STORAGE.history, userId), JSON.stringify(nextHistory)),
      ]);
      if (!isCurrentAccount()) return;

      setRide(acceptedRide);
      setNewCells(result.newCells);
      setExploredCells(authoritativeCells);
      setHistory(nextHistory);
      setCompleted(result.quest.completed);
      setActiveQuestRun(result.quest.completed ? null : {
        code: quest.serverCode,
        progressValue: Number(result.quest.progressValue ?? 0),
        targetValue: Number(result.quest.targetValue ?? 0),
        rewardXp: Number(result.quest.rewardXp ?? quest.rewardXp),
      });
      setEarnedXp(result.xpAwarded);
      setTotalXp(authoritativeXp);
      const nextAchievements = await loadAchievementSnapshot(userId).catch(() => null);
      if (!isCurrentAccount()) return;
      if (nextAchievements) setAchievementSnapshot(nextAchievements);
      await recordSourceSync(userId, syncMode).catch(() => undefined);
      const nextDiagnostics = await loadSyncDiagnostics(userId).catch(() => syncDiagnostics);
      if (!isCurrentAccount()) return;
      setSyncDiagnostics(nextDiagnostics);
      setCloudStatus('synced');
      setScreen('result');
    } catch (cause) {
      if (userId && !isCurrentAccount()) return;
      setCloudStatus('error');
      const message = cause instanceof Error ? cause.message : 'Не удалось импортировать поездку.';
      setError(message);
      if (userId) {
        void logClientEvent(userId, 'ride_sync_failed', 'error', sourceKindForMode(syncMode), { message: message.slice(0, 180) }).catch(() => undefined);
      }
    } finally {
      if (!userId || isCurrentAccount()) setBusy(false);
    }
  };

  const clearDeviceData = () => {
    Alert.alert('Очистить данные на устройстве?', 'Удалится локальный кэш и настройки VeloQuest. Облачный прогресс и исходные данные Apple Health / Health Connect останутся и снова синхронизируются после входа.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Сбросить', style: 'destructive', onPress: async () => {
        const accountKeys = session ? Object.values(STORAGE).map((key) => accountStorageKey(key, session.user.id)) : [];
        await AsyncStorage.multiRemove([...Object.values(STORAGE), ...accountKeys]);
        // Keep the already hydrated cloud-authoritative progression in memory.
        // A cold restart will hydrate the same values from Supabase again.
        setRide(null);
        setNewCells([]);
        setSyncMode('platform');
        setGarageMode('real');
        setOnboardingDone(false);
        setScreen('welcome');
      } },
    ]);
  };

  const finishOnboarding = async () => {
    if (session) await AsyncStorage.setItem(accountStorageKey(STORAGE.onboarding, session.user.id), 'done');
    setOnboardingDone(true);
    setTab('home');
    setScreen('app');
  };

  const saveBike = async () => {
    const parsedModelYear = bikeModelYear.trim() ? Number(bikeModelYear.trim()) : undefined;
    const maxSupportedModelYear = new Date().getFullYear() + 2;
    if (parsedModelYear !== undefined && (!Number.isInteger(parsedModelYear) || parsedModelYear < 1900 || parsedModelYear > maxSupportedModelYear)) {
      setError(`Проверь модельный год велосипеда (до ${maxSupportedModelYear}).`);
      return;
    }
    const nextBike: LocalBike = {
      catalogBikeId,
      manufacturerUrl: catalogManufacturerUrl,
      brand: bikeBrand.trim(),
      model: bikeModel.trim(),
      modelYear: parsedModelYear,
      drivetrain: bikeDrivetrain.trim() || undefined,
      brakes: bikeBrakes.trim() || undefined,
      fork: bikeFork.trim() || undefined,
      rearShock: bikeRearShock.trim() || undefined,
      cassette: bikeCassette.trim() || undefined,
      crankset: bikeCrankset.trim() || undefined,
      bottomBracket: bikeBottomBracket.trim() || undefined,
      hubs: bikeHubs.trim() || undefined,
      wheelset: bikeWheelset.trim() || undefined,
      tires: bikeTires.trim() || undefined,
    };
    if (!nextBike.brand || !nextBike.model) {
      setError('Укажи бренд и модель велосипеда.');
      return;
    }
    setBusy(true);
    const userId = session?.user.id;
    const operationEpoch = accountEpoch.current;
    const isCurrentAccount = () => Boolean(userId) && activeUserId.current === userId && accountEpoch.current === operationEpoch;
    try {
      // The cloud row is authoritative. Do not replace the current bike or
      // navigate away until the complete update has been accepted.
      if (userId) {
        setCloudStatus('syncing');
        await saveBikeToCloud(userId, nextBike);
        if (!isCurrentAccount()) return;
        try {
          await AsyncStorage.setItem(accountStorageKey(STORAGE.bike, userId), JSON.stringify(nextBike));
        } catch {
          // The cloud row is authoritative. A cache write failure must not be
          // reported as a failed bike save or roll the accepted cloud update back.
          void logClientEvent(userId, 'bike_cache_write_failed', 'warning').catch(() => undefined);
        }
        if (!isCurrentAccount()) return;
        setCloudStatus('synced');
      }
      setBike(nextBike);
      setError(null);
      setGarageMode('real');
      if (onboardingDone) {
        setTab('garage');
        setScreen('app');
      } else {
        setScreen('quest');
      }
    } catch (cause) {
      if (userId && !isCurrentAccount()) return;
      setCloudStatus('error');
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить велосипед в облаке. Изменения не применены — попробуй ещё раз.');
    } finally {
      if (!userId || isCurrentAccount()) setBusy(false);
    }
  };

  const selectCatalogBike = async (item: BikeCatalogResult) => {
    if (!session) return;
    const operation = captureAccount(session.user.id);
    setBikeFinderLoading(true);
    setBikeFinderError(null);
    try {
      const configuration = await loadCatalogBikeConfiguration(item);
      if (!accountIsCurrent(operation)) return;
      setBikeBrand(item.brand);
      setBikeModel([item.model, item.trim].filter(Boolean).join(' '));
      setBikeModelYear(String(item.modelYear));
      setBikeDrivetrain(configuration.drivetrain ?? '');
      setBikeBrakes(configuration.brakes ?? '');
      setBikeFork(configuration.fork ?? '');
      setBikeRearShock(configuration.rearShock ?? '');
      setBikeCassette(configuration.cassette ?? '');
      setBikeCrankset(configuration.crankset ?? '');
      setBikeBottomBracket(configuration.bottomBracket ?? '');
      setBikeHubs(configuration.hubs ?? '');
      setBikeWheelset(configuration.wheelset ?? '');
      setBikeTires(configuration.tires ?? '');
      setCatalogBikeId(item.id);
      setCatalogManufacturerUrl(item.manufacturerUrl);
      setBikeFinderQuery(`${item.brand} ${item.model}`);
      setBikeFinderResults([]);
    } catch (cause) {
      if (accountIsCurrent(operation)) setBikeFinderError(cause instanceof Error ? cause.message : 'Не удалось загрузить подтверждённую комплектацию велосипеда.');
    } finally {
      if (accountIsCurrent(operation)) setBikeFinderLoading(false);
    }
  };

  const loadMoreCatalogBikes = async () => {
    if (bikeFinderLoading || bikeFinderLoadingMore || !bikeFinderHasMore) return;
    const requestId = ++catalogSearchRequest.current;
    const parsedYearFrom = Number(bikeFinderYearFrom);
    setBikeFinderLoadingMore(true);
    setBikeFinderError(null);
    try {
      const items = await searchBikeCatalog({
        query: bikeFinderQuery,
        brand: bikeFinderBrand,
        category: bikeFinderCategory,
        yearFrom: Number.isInteger(parsedYearFrom) ? parsedYearFrom : 2020,
        frameMaterial: bikeFinderFrame,
        wheelSize: bikeFinderWheel,
        drivetrainBrand: bikeFinderDrivetrain,
        brakeType: bikeFinderBrake,
        limit: 20,
        offset: bikeFinderResults.length,
      });
      if (catalogSearchRequest.current !== requestId) return;
      setBikeFinderResults((current) => [...current, ...items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setBikeFinderHasMore(items.length === 20);
    } catch (cause) {
      if (catalogSearchRequest.current === requestId) setBikeFinderError(cause instanceof Error ? cause.message : 'Не удалось загрузить следующую страницу каталога.');
    } finally {
      if (catalogSearchRequest.current === requestId) setBikeFinderLoadingMore(false);
    }
  };

  const refreshAchievements = async () => {
    if (!session) {
      setAchievementSnapshot(EMPTY_SNAPSHOT);
      return;
    }
    const operation = captureAccount(session.user.id);
    setAchievementsLoading(true);
    try {
      const snapshot = await loadAchievementSnapshot(operation.userId);
      if (snapshot && accountIsCurrent(operation)) setAchievementSnapshot(snapshot);
    } catch {
      if (accountIsCurrent(operation)) setError('Не удалось обновить достижения.');
    } finally {
      if (accountIsCurrent(operation)) setAchievementsLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'profile' || !session) return;
    void refreshAchievements();
  }, [tab, session?.user.id]);

  useEffect(() => {
    if (tab !== 'profile' || !session) return;
    const operation = captureAccount(session.user.id);
    void loadVkIdentityStatus()
      .then((status) => {
        if (!accountIsCurrent(operation)) return;
        setVkLinked(status.linked);
        setVkCanUnlink(status.canUnlink);
      })
      .catch(() => {
        if (accountIsCurrent(operation)) setError('Не удалось обновить способы входа.');
      });
  }, [tab, session?.user.id]);

  const linkGoogleAccount = async () => {
    if (!session || googleLinked) return;
    const operation = captureAccount(session.user.id);
    setBusy(true);
    setError(null);
    try {
      const result = await linkGoogleIdentity(() => accountIsCurrent(operation));
      if (!accountIsCurrent(operation)) return;
      if (result.kind === 'success') {
        Alert.alert('Google', 'Аккаунт Google безопасно привязан.');
      } else if (result.kind === 'cancelled') {
        Alert.alert('Google', 'Привязка аккаунта отменена.');
      } else {
        setError('Не удалось привязать Google. Повтори попытку.');
      }
    } catch {
      if (accountIsCurrent(operation)) setError('Не удалось привязать Google. Повтори попытку.');
    } finally {
      if (accountIsCurrent(operation)) setBusy(false);
    }
  };

  const linkVkAccount = async () => {
    if (!session) return;
    const operation = captureAccount(session.user.id);
    setBusy(true);
    setError(null);
    try {
      const result = await linkVkIdentity();
      if (!accountIsCurrent(operation)) return;
      if (result.kind === 'success') {
        const status = await loadVkIdentityStatus();
        if (!accountIsCurrent(operation)) return;
        setVkLinked(status.linked);
        setVkCanUnlink(status.canUnlink);
        Alert.alert('VK', 'Аккаунт VK безопасно привязан.');
      } else if (result.kind === 'cancelled') {
        Alert.alert('VK', 'Привязка аккаунта отменена.');
      } else {
        setError('Не удалось привязать VK. Повтори попытку.');
      }
    } catch {
      if (accountIsCurrent(operation)) setError('Не удалось привязать VK. Повтори попытку.');
    } finally {
      if (accountIsCurrent(operation)) setBusy(false);
    }
  };

  const unlinkVkAccount = () => {
    if (!session || !vkLinked) return;
    if (!vkCanUnlink) {
      Alert.alert('VK', 'Сначала добавь другой способ входа — последний способ входа отключить нельзя.');
      return;
    }
    Alert.alert('Отключить VK?', 'После отключения вход через этот аккаунт VK перестанет работать.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Отключить',
        style: 'destructive',
        onPress: () => {
          const operation = captureAccount(session.user.id);
          setBusy(true);
          setError(null);
          void unlinkVkIdentity()
            .then((removed) => {
              if (!accountIsCurrent(operation)) return;
              setVkLinked(!removed);
              setVkCanUnlink(false);
            })
            .catch(() => {
              if (accountIsCurrent(operation)) setError('Не удалось отключить VK.');
            })
            .finally(() => {
              if (accountIsCurrent(operation)) setBusy(false);
            });
        },
      },
    ]);
  };

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    await AsyncStorage.multiRemove(Object.values(STORAGE));
    activeUserId.current = null;
    resetAccountRuntime();
    setSession(null);
    setScreen('auth');
  };

  const revokeSource = async (kind: SourceKind) => {
    if (!session) return;
    const operation = captureAccount(session.user.id);
    setBusy(true);
    setError(null);
    try {
      if (kind === 'strava') await disconnectStrava();
      else await disconnectSource(session.user.id, kind);
      if (!accountIsCurrent(operation)) return;
      const diagnostics = await loadSyncDiagnostics(operation.userId);
      if (!accountIsCurrent(operation)) return;
      setSyncDiagnostics(diagnostics);
    } catch (cause) {
      if (accountIsCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Не удалось отключить источник.');
    } finally {
      if (accountIsCurrent(operation)) setBusy(false);
    }
  };

  const connectStravaSource = async () => {
    if (!session) return;
    const operation = captureAccount(session.user.id);
    setBusy(true);
    setError(null);
    try {
      const connected = await connectStrava();
      if (!accountIsCurrent(operation)) return;
      if (connected) {
        const diagnostics = await loadSyncDiagnostics(operation.userId);
        if (!accountIsCurrent(operation)) return;
        setSyncDiagnostics(diagnostics);
      }
    } catch (cause) {
      if (accountIsCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Не удалось подключить Strava.');
    } finally {
      if (accountIsCurrent(operation)) setBusy(false);
    }
  };

  const backfillStrava = async () => {
    if (!session) return;
    const operation = captureAccount(session.user.id);
    setBusy(true);
    setError(null);
    try {
      const count = await backfillStravaRides(quest.serverCode);
      if (!accountIsCurrent(operation)) return;
      const snapshot = await loadCloudSnapshot(operation.userId);
      if (!accountIsCurrent(operation)) return;
      setTotalXp(snapshot.adventureXp);
      setServerLevel(snapshot.level);
      setSeasonXp(snapshot.seasonXp);
      setExploredCells(snapshot.exploredCells);
      setHistory(snapshot.history);
      Alert.alert('Strava', `Импортировано поездок: ${count}. Исторические поездки открывают территорию, но не фармят XP.`);
    } catch (cause) {
      if (accountIsCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Не удалось импортировать историю Strava.');
    } finally {
      if (accountIsCurrent(operation)) setBusy(false);
    }
  };

  const confirmAccountDeletion = () => {
    if (!session) return;
    Alert.alert(
      'Удалить аккаунт VeloQuest?',
      'Аккаунт, поездки, территория, XP и данные велосипеда будут удалены без возможности восстановления. Данные Apple Health / Health Connect не изменятся.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить навсегда', style: 'destructive', onPress: () => {
          void (async () => {
            const operation = captureAccount(session.user.id);
            setBusy(true);
            setError(null);
            try {
              await logClientEvent(operation.userId, 'account_delete_requested', 'warning').catch(() => undefined);
              if (!accountIsCurrent(operation)) return;
              await deleteVeloQuestAccount(operation.userId);
              if (!accountIsCurrent(operation)) return;
              resetAccountRuntime();
              setSession(null);
              setScreen('auth');
            } catch (cause) {
              if (accountIsCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Не удалось удалить аккаунт.');
            } finally {
              if (accountIsCurrent(operation)) setBusy(false);
            }
          })();
        } },
      ],
    );
  };

  const openRideImport = () => {
    setError(null);
    setScreen('ride');
  };

  const chooseQuest = (next: Quest) => {
    if (!session) {
      setQuest(next);
      return;
    }
    const userId = session.user.id;
    const applyChoice = async (confirmAbandon: boolean) => {
      const operation = captureAccount(userId);
      setBusy(true);
      setError(null);
      try {
        const run = await activateQuest(next.serverCode, confirmAbandon);
        if (!accountIsCurrent(operation)) return;
        setQuest(next);
        setActiveQuestRun(run);
        await AsyncStorage.setItem(accountStorageKey(STORAGE.activeQuest, userId), next.serverCode);
        if (!accountIsCurrent(operation)) return;
        void logClientEvent(userId, 'quest_selected', 'info', undefined, { questCode: next.serverCode }).catch(() => undefined);
      } catch (cause) {
        if (accountIsCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Не удалось выбрать квест.');
      } finally {
        if (accountIsCurrent(operation)) setBusy(false);
      }
    };
    const abandonsProgress = activeQuestRun && activeQuestRun.code !== next.serverCode && activeQuestRun.progressValue > 0;
    if (abandonsProgress) {
      Alert.alert(
        'Сменить активный квест?',
        `Текущий прогресс ${Math.round(activeQuestRun.progressValue)} из ${Math.round(activeQuestRun.targetValue)} будет завершён без награды.`,
        [
          { text: 'Оставить текущий', style: 'cancel' },
          { text: 'Сменить квест', style: 'destructive', onPress: () => { void applyChoice(true); } },
        ],
      );
      return;
    }
    void applyChoice(false);
  };

  const reportRouteInfluence = (influenced: boolean) => {
    if (!session || routeInfluenceReported !== null) return;
    setRouteInfluenceReported(influenced);
    void logClientEvent(session.user.id, 'route_influence_reported', 'info', undefined, { influenced, questCode: quest.serverCode }).catch(() => undefined);
  };

  const selectVeloQuestBike = async () => {
    if (!session) return;
    const operation = captureAccount(session.user.id);
    setBusy(true);
    setError(null);
    try {
      await ensureVeloQuestBike(operation.userId);
      if (!accountIsCurrent(operation)) return;
      setGarageMode('veloquest');
      const items = await loadVirtualItems(operation.userId);
      if (!accountIsCurrent(operation)) return;
      setVirtualItems(items);
      setScreen('quest');
    } catch (cause) {
      if (accountIsCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Не удалось подготовить VeloQuest Bike.');
    } finally {
      if (accountIsCurrent(operation)) setBusy(false);
    }
  };

  const selectSpecialization = async (next: Specialization) => {
    if (!session || serverLevel < 3 || next === specialization) return;
    const operation = captureAccount(session.user.id);
    setBusy(true);
    setError(null);
    try {
      await chooseSpecialization(operation.userId, next);
      if (!accountIsCurrent(operation)) return;
      const snapshot = await loadCloudSnapshot(operation.userId);
      if (!accountIsCurrent(operation)) return;
      setSpecialization(snapshot.specialization);
      setSpecializationChangesUsed(snapshot.specializationChangesUsed);
      const ordered = await loadQuestOrder(snapshot.specialization, QUESTS);
      if (!accountIsCurrent(operation)) return;
      setQuestOptions(ordered);
      const stillActive = ordered.find((item) => item.serverCode === snapshot.activeQuest?.code);
      if (stillActive) setQuest(stillActive);
      await logClientEvent(operation.userId, 'specialization_selected', 'info', undefined, { specialization: next }).catch(() => undefined);
    } catch (cause) {
      if (accountIsCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Не удалось выбрать специализацию.');
    } finally {
      if (accountIsCurrent(operation)) setBusy(false);
    }
  };

  const equipVirtualItem = async (item: VirtualItem) => {
    if (!session || item.unlockLevel > serverLevel) return;
    const operation = captureAccount(session.user.id);
    setBusy(true);
    setError(null);
    try {
      await installVirtualItem(operation.userId, item);
      if (!accountIsCurrent(operation)) return;
      const items = await loadVirtualItems(operation.userId);
      if (!accountIsCurrent(operation)) return;
      setVirtualItems(items);
      await logClientEvent(operation.userId, 'virtual_item_installed', 'info', undefined, { itemId: item.id, slot: item.slot }).catch(() => undefined);
    } catch (cause) {
      if (accountIsCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Не удалось установить игровую деталь.');
    } finally {
      if (accountIsCurrent(operation)) setBusy(false);
    }
  };

  const updatePrivacy = async (next: PrivacySettings) => {
    if (!session) return;
    const operation = captureAccount(session.user.id);
    setBusy(true);
    setError(null);
    try {
      await savePrivacySettings(operation.userId, next);
      if (!accountIsCurrent(operation)) return;
      setPrivacySettings(next);
      await logClientEvent(operation.userId, 'privacy_zone_updated', 'info', undefined, next).catch(() => undefined);
    } catch (cause) {
      if (accountIsCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Не удалось сохранить приватную зону.');
    } finally {
      if (accountIsCurrent(operation)) setBusy(false);
    }
  };

  const resolveInbox = async (item: RideInboxItem, status: 'confirmed_duplicate' | 'dismissed') => {
    if (!session) return;
    const operation = captureAccount(session.user.id);
    setBusy(true);
    setError(null);
    try {
      await resolveRideInboxItem(operation.userId, item.id, status);
      if (!accountIsCurrent(operation)) return;
      const inbox = await loadRideInbox(operation.userId);
      if (!accountIsCurrent(operation)) return;
      setRideInbox(inbox);
      await logClientEvent(operation.userId, 'ride_inbox_reviewed', 'info', undefined, { status }).catch(() => undefined);
    } catch (cause) {
      if (accountIsCurrent(operation)) setError(cause instanceof Error ? cause.message : 'Не удалось обновить Ride Inbox.');
    } finally {
      if (accountIsCurrent(operation)) setBusy(false);
    }
  };

  const level = Math.max(1, serverLevel || Math.floor(totalXp / 500) + 1);
  const levelProgress = totalXp % 500;
  const specializationInfo = specialization ? SPECIALIZATIONS[specialization] : null;
  const currentChapter = [...seasonChapters].reverse().find((chapter) => seasonXp >= chapter.minXp) ?? seasonChapters[0];
  const pendingInboxCount = rideInbox.filter((item) => item.status === 'needs_review').length;
  const nextQuest = questOptions.find((item) => item.id !== quest.id) ?? questOptions[0];
  const bikeDistanceKm = useMemo(() => history.reduce((total, item) => total + item.distanceKm, 0), [history]);

  if (booting) {
    return (
      <SafeAreaView style={[styles.safe, styles.boot]}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <ActivityIndicator color={COLORS.green} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      {screen === 'auth' && <AuthScreen />}

      {screen === 'passwordReset' && <PasswordResetScreen onComplete={() => {
        recoveryInProgress.current = false;
        setError(null);
        setScreen(onboardingDone ? 'app' : 'welcome');
      }} />}

      {screen === 'welcome' && (
        <ScrollView contentContainerStyle={styles.welcomeContent} showsVerticalScrollIndicator={false}>
          <View style={styles.onboardingHero}>
            <Image source={require('./assets/onboarding-cyclist-hero.jpg')} style={styles.onboardingImage} resizeMode="cover" />
          </View>
          <Text style={styles.heroTitle}>Каждая поездка{`\n`}открывает мир.</Text>
          <Text style={styles.lead}>Твои поездки становятся территорией, квестами и прогрессом. Исследуй. Преодолевай. Становись лучше с каждой дорогой.</Text>
          <View style={styles.pagerDots}><View style={[styles.pagerDot, styles.pagerDotActive]} /><View style={styles.pagerDot} /><View style={styles.pagerDot} /></View>
          <PrimaryButton label="Начать приключение" onPress={() => setScreen('sync')} />
        </ScrollView>
      )}

      {screen === 'sync' && (
        <ScrollView contentContainerStyle={styles.screenPad}>
          <FlowHeader onBack={() => setScreen(onboardingDone ? 'app' : 'welcome')} onSkip={() => setScreen('bikeMode')} />
          <View style={styles.flowIcon}><Ionicons name="pulse-outline" size={31} color={COLORS.green} /></View>
          <Text style={styles.title}>Откуда брать поездки?</Text>
          <Text style={styles.subtitle}>Выбери источник данных о тренировках. Его можно изменить позже в настройках.</Text>
          <View style={styles.optionList}>
            <Option title={platformName} detail={platformDetail} icon={Platform.OS === 'ios' ? 'heart' : 'fitness'} selected={syncMode === 'platform'} onPress={() => setSyncMode('platform')} />
            <Option title="Strava" detail={stravaConnected ? 'Подключена · OAuth token хранится только на backend' : 'OAuth sync · потребуется подключение аккаунта'} icon="flash-outline" selected={syncMode === 'strava'} onPress={() => setSyncMode('strava')} />
            <Option title="GPX" detail="Загружай файлы GPX вручную или из других приложений" icon="document-text" selected={syncMode === 'gpx'} onPress={() => setSyncMode('gpx')} />
            <Option title="FIT" detail="Импорт из Garmin, Wahoo и других велокомпьютеров" icon="hardware-chip-outline" selected={syncMode === 'fit'} onPress={() => setSyncMode('fit')} />
          </View>
          <View style={styles.flexFill} />
          {syncMode === 'strava' && !stravaConnected
            ? <PrimaryButton label={busy ? 'Подключение…' : 'Подключить Strava'} disabled={busy} onPress={() => { void connectStravaSource(); }} />
            : <PrimaryButton label="Продолжить" onPress={() => setScreen('bikeMode')} />}
        </ScrollView>
      )}

      {screen === 'bikeMode' && (
        <ScrollView contentContainerStyle={styles.screenPad}>
          <FlowHeader onBack={() => setScreen('sync')} />
          <View style={styles.flowIcon}><Ionicons name="bicycle-outline" size={31} color={COLORS.green} /></View>
          <Text style={styles.title}>Какой велосипед показывать?</Text>
          <Text style={styles.subtitle}>Реальный велосипед и VeloQuest Bike — разные слои. Игровые награды никогда не выдаются за реальные детали.</Text>
          <View style={styles.optionList}>
            <Option title="Мой велосипед" detail="Бренд, модель и реальная комплектация для evidence-backed рекомендаций" icon="construct-outline" selected={garageMode === 'real'} onPress={() => setGarageMode('real')} />
            <Option title="VeloQuest Bike" detail="Виртуальный велосипед с игровыми деталями, которые открываются по уровню" icon="sparkles-outline" selected={garageMode === 'veloquest'} onPress={() => setGarageMode('veloquest')} />
          </View>
          {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={18} color="#9A3D25" /><Text style={styles.errorText}>{error}</Text></View>}
          <View style={styles.flexFill} />
          <PrimaryButton
            label={busy ? 'Подготавливаю…' : garageMode === 'real' ? (bike ? 'Использовать мой велосипед' : 'Настроить мой велосипед') : 'Использовать VeloQuest Bike'}
            disabled={busy}
            onPress={() => {
              if (garageMode === 'veloquest') void selectVeloQuestBike();
              else if (bike) setScreen('quest');
              else setScreen('bikeEdit');
            }}
          />
        </ScrollView>
      )}

      {screen === 'quest' && (
        <ScrollView contentContainerStyle={styles.screenPad}>
          <FlowHeader onBack={() => setScreen('sync')} onSkip={() => setScreen('ride')} />
          <View style={styles.flowIcon}><Ionicons name="flag-outline" size={31} color={COLORS.green} /></View>
          <Text style={styles.title}>Куда сегодня?</Text>
          <Text style={styles.subtitle}>Выбери квест и получай награды за активные поездки.</Text>
          <View style={styles.questList}>
            {questOptions.map((item, index) => (
              <Pressable key={item.id} onPress={() => chooseQuest(item)} style={[styles.questCard, quest.id === item.id && styles.questCardSelected]}>
                <View style={styles.questChoiceIcon}><Ionicons name={questIcon(item.id)} size={24} color={COLORS.green} /></View>
                <View style={styles.questChoiceCopy}><Text style={styles.questTitle}>{item.title}</Text><Text style={styles.questDetail}>{item.description}{specialization && index === 0 ? ' · рекомендован специализацией' : ''}</Text></View>
                <Text style={styles.questReward}>{item.rewardXp}{`\n`}XP</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.flexFill} />
          <PrimaryButton label="Активировать квест" onPress={() => setScreen('ride')} />
        </ScrollView>
      )}

      {screen === 'ride' && (
        <ScrollView contentContainerStyle={[styles.screenPad, styles.centered]}>
          <View style={styles.rideHeader}><Pressable hitSlop={12} onPress={() => setScreen('quest')}><Ionicons name="arrow-back" size={25} color={COLORS.green} /></Pressable></View>
          <View style={styles.syncOrb}><Ionicons name={syncMode === 'platform' ? 'sync' : 'document-text'} size={34} color={COLORS.green} /></View>
          <Text style={styles.titleCentered}>Готов к поездке</Text>
          <Text style={styles.subtitleCentered}>{syncInstruction}</Text>
          <View style={styles.activeQuest}><View style={styles.activeQuestIcon}><Ionicons name={questIcon(quest.id)} size={22} color={COLORS.green} /></View><View style={styles.activeQuestCopy}><Text style={styles.activeLabel}>АКТИВНЫЙ КВЕСТ</Text><Text style={styles.activeTitle}>{quest.title}</Text><Text style={styles.activeDetail}>{quest.description} · +{quest.rewardXp} XP{activeQuestRun?.code === quest.serverCode && activeQuestRun.targetValue > 0 ? ` · ${Math.round(activeQuestRun.progressValue)} / ${Math.round(activeQuestRun.targetValue)}` : ''}</Text></View></View>
          {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={18} color="#9A3D25" /><Text style={styles.errorText}>{error}</Text></View>}
          <View style={styles.flexFill} />
          {busy ? <View style={styles.loading}><ActivityIndicator color={COLORS.green} /><Text style={styles.loadingText}>Читаю маршрут…</Text></View> : <PrimaryButton label={syncMode === 'platform' || syncMode === 'strava' ? `Синхронизировать ${syncSourceName}` : `Выбрать ${syncSourceName}`} onPress={syncLatestRide} />}
        </ScrollView>
      )}

      {screen === 'result' && ride && (
        <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
          <View style={styles.mapWrap}>
            <QuestMap ride={ride} cells={newCells.slice(0, 180)} interactive={false} />
            <View style={styles.territoryBadge}><Text style={styles.badgeLabel}>ОТКРЫТО ТЕРРИТОРИИ</Text><Text style={styles.badgeValue}>{newCells.length} <Text style={styles.badgeUnit}>клеток</Text></Text></View>
          </View>
          <View style={styles.resultSheet}>
            <View style={[styles.questSeal, !completed && styles.questSealArchive]}><Ionicons name={completed ? 'checkmark' : 'archive'} size={28} color={COLORS.white} /></View>
            <Text style={styles.resultTitle}>{completed ? 'Квест выполнен' : 'Поездка сохранена'}</Text>
            <Text style={styles.resultCaption}>{completed ? quest.title : 'Архивная поездка или цель квеста не достигнута'}</Text>
            <Text style={styles.xp}>+{earnedXp} <Text style={styles.xpUnit}>XP</Text></Text>
            <View style={styles.seasonRow}><View><Text style={styles.seasonTitle}>СЕЗОН {seasonId.toUpperCase()}</Text><Text style={styles.seasonSubtitle}>Уровень {level}</Text></View><Text style={styles.seasonValue}>{seasonXp} / 2500 XP</Text></View>
            <View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.min(100, seasonXp / 25)}%` }]} /></View>
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statValue}>{ride.distanceKm.toFixed(1)} км</Text><Text style={styles.statLabel}>Дистанция</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{Math.round(ride.durationMinutes)} мин</Text><Text style={styles.statLabel}>Время</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{Math.round(ride.elevationGainM)} м</Text><Text style={styles.statLabel}>Набор</Text></View>
            </View>
            <View style={styles.sourceRow}><Ionicons name="sync" size={18} color={COLORS.green} /><View style={styles.sourceCopy}><Text style={styles.sourceLabel}>{ride.source}</Text><Text style={styles.sourceValue}>Синхронизировано · один канонический Ride</Text></View></View>
            {completed && <View style={styles.routeInfluenceCard}><Text style={styles.sourceValue}>Квест повлиял на маршрут этой поездки?</Text><View style={styles.routeInfluenceActions}>{routeInfluenceReported === null ? <><Pressable style={styles.routeInfluenceButton} onPress={() => reportRouteInfluence(true)}><Text style={styles.routeInfluenceButtonText}>Да</Text></Pressable><Pressable style={styles.routeInfluenceButton} onPress={() => reportRouteInfluence(false)}><Text style={styles.routeInfluenceButtonText}>Нет</Text></Pressable></> : <Text style={styles.settingAction}>Спасибо · ответ сохранён</Text>}</View></View>}
            {nextQuest && <Pressable style={styles.nextQuestStrip} onPress={() => { chooseQuest(nextQuest); setTab('quests'); setScreen('app'); }}><View style={styles.sourceCopy}><Text style={styles.sourceLabel}>СЛЕДУЮЩИЙ КВЕСТ</Text><Text style={styles.sourceValue}>{nextQuest.title} · {nextQuest.description}</Text></View><Ionicons name="arrow-forward" size={18} color={COLORS.green} /></Pressable>}
            <PrimaryButton label="В VeloQuest" onPress={() => { void finishOnboarding(); }} />
          </View>
        </ScrollView>
      )}

      {screen === 'app' && (
        <View style={styles.appShell}>
          <ScrollView style={styles.appScroll} contentContainerStyle={styles.appContent} showsVerticalScrollIndicator={false}>
            {tab === 'home' && (
              <>
                <View style={styles.topBar}>
                  <View>
                    <Text style={styles.appEyebrow}>VELOQUEST  ·  УРОВЕНЬ {level}</Text>
                    <Text style={styles.appTitle}>В путь.</Text>
                  </View>
                  <View style={styles.levelPill}><Text style={styles.levelPillText}>{totalXp} XP</Text></View>
                </View>

                <Text style={styles.sectionKicker}>АКТИВНЫЙ КВЕСТ</Text>
                <View style={styles.heroCard}>
                  <View style={styles.heroQuestRow}>
                    <View style={styles.heroQuestIcon}><Ionicons name={questIcon(quest.id)} size={31} color={COLORS.white} /></View>
                    <View style={styles.heroQuestCopy}><Text style={styles.heroCardTitle}>{quest.title}</Text><Text style={styles.heroCardDetail}>{quest.description}{activeQuestRun?.code === quest.serverCode && activeQuestRun.targetValue > 0 ? ` · прогресс ${Math.round(activeQuestRun.progressValue)} / ${Math.round(activeQuestRun.targetValue)}` : ''}</Text></View>
                    <Text style={styles.rewardText}>+{quest.rewardXp} XP</Text>
                  </View>
                  <Pressable style={styles.heroRideButton} onPress={openRideImport}><Ionicons name="bicycle-outline" size={19} color={COLORS.green} /><Text style={styles.heroRideButtonText}>Засчитать поездку</Text><Ionicons name="arrow-forward" size={17} color={COLORS.green} /></Pressable>
                </View>

                <View style={styles.metricGrid}>
                  <View style={styles.metricCard}><Ionicons name="map-outline" size={25} color={COLORS.green} /><Text style={styles.metricValue}>{exploredCells.length}</Text><Text style={styles.metricLabel}>Открыто клеток</Text></View>
                  <View style={styles.metricCard}><Ionicons name="bicycle-outline" size={25} color={COLORS.green} /><Text style={styles.metricValue}>{history.length}</Text><Text style={styles.metricLabel}>Поездки</Text></View>
                  <View style={styles.metricCard}><Ionicons name="speedometer-outline" size={25} color={COLORS.green} /><Text style={styles.metricValue}>{bike ? bike.model : '—'}</Text><Text style={styles.metricLabel}>Велосипед</Text></View>
                </View>

                <View style={styles.sectionHeading}><Text style={styles.sectionKicker}>ПОСЛЕДНЯЯ ПОЕЗДКА</Text><Pressable onPress={() => setScreen('history')}><Text style={styles.sectionLink}>История</Text></Pressable></View>
                {history[0] ? (
                  <View style={styles.rideCard}>
                    <View style={styles.rideIconLarge}><Ionicons name="bicycle" size={30} color={COLORS.green} /></View>
                    <View style={styles.rideCardCopy}><Text style={styles.rideDate}>{new Date(history[0].startTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</Text><Text style={styles.rideTitle}>Последний маршрут</Text><Text style={styles.rideDetail}>{history[0].distanceKm.toFixed(1)} км  ·  {formatDuration(history[0].durationMinutes)}  ·  {Math.round(history[0].elevationGainM)} м</Text></View>
                    <Ionicons name="chevron-forward" size={18} color="#A1A59D" />
                  </View>
                ) : (
                  <View style={styles.emptyCard}><Ionicons name="bicycle-outline" size={28} color={COLORS.green} /><Text style={styles.emptyTitle}>Первая поездка ждёт</Text><Text style={styles.emptyText}>Импортируй реальный маршрут — он сразу откроет территорию.</Text></View>
                )}
              </>
            )}

            {tab === 'map' && (
              <>
                <View style={styles.mapHeader}><Text style={styles.mapTitle}>Карта мира</Text><View style={styles.mapStat}><Ionicons name="map-outline" size={19} color={COLORS.green} /><View><Text style={styles.mapStatValue}>{exploredCells.length}</Text><Text style={styles.mapStatLabel}>Открыто клеток</Text></View></View></View>
                <RouteExplorer ride={ride} cells={exploredCells.slice(-400)} exploredCells={exploredCells} />
                <View style={styles.mapLegend}><View style={[styles.legendDot, { backgroundColor: COLORS.orange }]} /><Text style={styles.legendText}>маршрут / план</Text><View style={[styles.legendDot, { backgroundColor: '#91A982' }]} /><Text style={styles.legendText}>исследовано</Text><View style={[styles.legendDot, { backgroundColor: '#E9E8E1' }]} /><Text style={styles.legendText}>туман</Text></View>
              </>
            )}

            {tab === 'quests' && (
              <>
                <Text style={styles.appTitle}>Квесты</Text>
                <View style={styles.segmentTabs}><Pressable onPress={() => setQuestFilter('active')} style={[styles.segmentTab, questFilter === 'active' && styles.segmentTabActive]}><Text style={[styles.segmentText, questFilter === 'active' && styles.segmentTextActive]}>Активный</Text></Pressable><Pressable onPress={() => setQuestFilter('all')} style={[styles.segmentTab, questFilter === 'all' && styles.segmentTabActive]}><Text style={[styles.segmentText, questFilter === 'all' && styles.segmentTextActive]}>Все</Text></Pressable></View>
                <View style={styles.questList}>
                  {(questFilter === 'active' ? [quest] : questOptions).map((item, index) => (
                    <Pressable key={item.id} onPress={() => chooseQuest(item)} style={[styles.bigQuestCard, quest.id === item.id && styles.bigQuestCardSelected]}>
                      <View style={styles.questIcon}><Ionicons name={questIcon(item.id)} size={24} color={COLORS.green} /></View>
                      <View style={styles.bigQuestCopy}><Text style={styles.bigQuestTitle}>{item.title}</Text><Text style={styles.bigQuestDetail}>{item.description}{activeQuestRun?.code === item.serverCode && activeQuestRun.targetValue > 0 ? ` · ${Math.round(activeQuestRun.progressValue)} / ${Math.round(activeQuestRun.targetValue)}` : ''}</Text><View style={styles.questMetaRow}><Ionicons name="bicycle-outline" size={14} color={COLORS.green} /><Text style={styles.bigQuestState}>{quest.id === item.id ? 'Активен' : specialization && index === 0 ? 'Рекомендуется твоей специализацией' : 'Нажми, чтобы выбрать'}</Text></View></View>
                      <Text style={styles.questReward}>+{item.rewardXp} XP</Text><Ionicons name="chevron-forward" size={17} color="#91968F" />
                    </Pressable>
                  ))}
                </View>
                <PrimaryButton label="Поехать с активным квестом" onPress={openRideImport} />
              </>
            )}

            {tab === 'garage' && (
              <>
                <MiniBrand suffix="0.8.3" />
                <Text style={styles.appEyebrow}>REAL BIKE GARAGE</Text>
                <Text style={styles.appTitle}>Гараж</Text>
                <View style={styles.segmentTabs}>
                  <Pressable onPress={() => setGarageMode('real')} style={[styles.segmentTab, garageMode === 'real' && styles.segmentTabActive]}><Text style={[styles.segmentText, garageMode === 'real' && styles.segmentTextActive]}>Мой велосипед</Text></Pressable>
                  <Pressable onPress={() => setGarageMode('veloquest')} style={[styles.segmentTab, garageMode === 'veloquest' && styles.segmentTabActive]}><Text style={[styles.segmentText, garageMode === 'veloquest' && styles.segmentTextActive]}>VeloQuest Bike</Text></Pressable>
                </View>
                {garageMode === 'real' && (bike ? (
                  <View style={styles.bikeCard}>
                    <Text style={styles.cardEyebrow}>МОЙ ВЕЛОСИПЕД</Text>
                    <View style={styles.bikeVisual}>
                      <RemoteBikeImage sources={garageBikeMedia?.sources ?? []} fallback={require('./assets/garage-bike-hero-v2.jpg')} />
                      {(garageBikeMedia?.sources.length ?? 0) === 0 && <View style={styles.bikeVisualBadge}><Text style={styles.bikeVisualBadgeText}>ИЛЛЮСТРАЦИЯ · ФОТО МОДЕЛИ НЕТ</Text></View>}
                    </View>
                    <Text style={styles.bikeTitle}>{bike.brand} {bike.model}</Text>
                    <Text style={styles.bikeModel}>{bike.modelYear ?? garageBikeMedia?.modelYear ? `${bike.modelYear ?? garageBikeMedia?.modelYear} модельный год` : 'Твой реальный велосипед'}</Text>
                    {bike.manufacturerUrl && <Pressable accessibilityRole="link" style={styles.inlineAction} onPress={() => { void Linking.openURL(bike.manufacturerUrl!); }}><Text style={styles.inlineActionText}>Официальная карточка модели</Text><Ionicons name="open-outline" size={16} color={COLORS.green} /></Pressable>}
                    <View style={styles.bikeMetaRow}><View style={styles.bikeMetaItem}><Ionicons name="bicycle-outline" size={18} color={COLORS.green} /><Text style={styles.bikeMetaValue}>{history.length}</Text><Text style={styles.bikeMetaLabel}>ПОЕЗДКИ</Text></View><View style={styles.bikeMetaItem}><Ionicons name="location-outline" size={18} color={COLORS.green} /><Text style={styles.bikeMetaValue}>{bikeDistanceKm.toFixed(0)}</Text><Text style={styles.bikeMetaLabel}>КМ</Text></View><View style={styles.bikeMetaItem}><Ionicons name="flash-outline" size={18} color={COLORS.orange} /><Text style={styles.bikeMetaValue}>{exploredCells.length}</Text><Text style={styles.bikeMetaLabel}>КЛЕТКИ</Text></View></View>
                    <Pressable style={styles.inlineAction} onPress={() => { setError(null); setScreen('bikeEdit'); }}><Text style={styles.inlineActionText}>Изменить велосипед</Text><Ionicons name="create-outline" size={17} color={COLORS.green} /></Pressable>
                  </View>
                ) : (
                  <View style={styles.bikeCard}>
                    <Text style={styles.cardEyebrow}>МОЙ ВЕЛОСИПЕД</Text>
                    <View style={styles.bikeVisual}>
                      <Image source={require('./assets/garage-bike-hero-v2.jpg')} style={styles.bikeImage} resizeMode="contain" />
                    </View>
                    <Text style={styles.bikeTitle}>Добавь свой велосипед</Text>
                    <Text style={styles.bikeEmptyText}>Укажи бренд, модель и, если хочешь, текущие компоненты. Позже каталог сможет заполнить их автоматически.</Text>
                    <PrimaryButton label="Добавить велосипед" onPress={() => { setError(null); setScreen('bikeEdit'); }} />
                  </View>
                ))}
                {garageMode === 'real' && bike && (
                  <View style={styles.componentsCard}>
                    <View style={styles.sectionHeading}><Text style={styles.sectionKicker}>КОМПЛЕКТАЦИЯ</Text><Text style={styles.sectionMeta}>реальные детали</Text></View>
                    {[
                      { icon: 'git-branch-outline' as const, label: 'Трансмиссия', value: bike.drivetrain || 'Не указана' },
                      { icon: 'stop-circle-outline' as const, label: 'Тормоза', value: bike.brakes || 'Не указаны' },
                      { icon: 'hardware-chip-outline' as const, label: 'Кассета', value: bike.cassette || 'Не указана' },
                      { icon: 'cog-outline' as const, label: 'Система', value: bike.crankset || 'Не указана' },
                      { icon: 'options-outline' as const, label: 'Вилка', value: bike.fork || 'Не указана' },
                      { icon: 'swap-vertical-outline' as const, label: 'Амортизатор', value: bike.rearShock || 'Не указан' },
                      { icon: 'radio-button-on-outline' as const, label: 'Каретка', value: bike.bottomBracket || 'Не указана' },
                      { icon: 'ellipse-outline' as const, label: 'Втулки', value: bike.hubs || 'Не указаны' },
                      { icon: 'disc-outline' as const, label: 'Колёса', value: bike.wheelset || 'Не указаны' },
                      { icon: 'ellipse-outline' as const, label: 'Покрышки', value: bike.tires || 'Не указаны' },
                    ].map((item) => <View key={item.label} style={styles.componentRow}><View style={styles.componentIcon}><Ionicons name={item.icon} size={17} color={COLORS.green} /></View><View style={styles.componentCopy}><Text style={styles.componentLabel}>{item.label}</Text><Text style={[styles.componentValue, item.value.startsWith('Не ') && styles.componentValueMuted]}>{item.value}</Text></View></View>)}
                  </View>
                )}
                {garageMode === 'real' && <View style={styles.upgradeSection}>
                  <View style={styles.sectionHeading}><Text style={styles.sectionKicker}>ПРОВЕРЕННЫЕ АПГРЕЙДЫ</Text><Text style={styles.sectionMeta}>manufacturer evidence</Text></View>
                  {garageRecommendations.map((item, index) => (
                    <View key={`${item.model ?? item.title}:${index}`} style={styles.upgradeCard}>
                      <View style={[styles.upgradeStatus, item.status === 'compatible' ? styles.upgradeStatusGood : item.status === 'conditional' ? styles.upgradeStatusConditional : item.status === 'incompatible' ? styles.upgradeStatusBad : item.status === 'locked' ? styles.upgradeStatusLocked : styles.upgradeStatusUnknown]}>
                        <Ionicons name={item.status === 'compatible' ? 'checkmark' : item.status === 'conditional' ? 'warning-outline' : item.status === 'incompatible' ? 'close' : item.status === 'locked' ? 'lock-closed-outline' : 'help'} size={16} color={item.status === 'compatible' || item.status === 'conditional' || item.status === 'incompatible' ? COLORS.white : COLORS.green} />
                      </View>
                      <View style={styles.lockedCopy}><Text style={styles.lockedTitle}>{item.title}</Text><Text style={styles.lockedText}>{item.detail}</Text>{item.evidenceUrl ? <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(item.evidenceUrl!); }}><Text style={styles.evidenceText}>Открыть официальный источник{item.evidenceCheckedAt ? ` · проверено ${new Date(`${item.evidenceCheckedAt}T00:00:00Z`).toLocaleDateString('ru-RU')}` : ''}</Text></Pressable> : null}</View>
                    </View>
                  ))}
                </View>}
                {garageMode === 'veloquest' && (
                  <>
                    <View style={[styles.bikeCard, styles.virtualBikeCard]}>
                      <Text style={styles.cardEyebrow}>ВИРТУАЛЬНЫЙ · ИГРОВОЙ</Text>
                      <View style={styles.virtualBikeVisual}><Ionicons name="bicycle" size={92} color={COLORS.green} /></View>
                      <Text style={styles.bikeTitle}>VeloQuest Bike</Text>
                      <Text style={styles.bikeEmptyText}>Косметические детали открываются только уровнем. Они не являются реальными компонентами и не влияют на XP.</Text>
                    </View>
                    <View style={styles.upgradeSection}>
                      <View style={styles.sectionHeading}><Text style={styles.sectionKicker}>ИГРОВЫЕ ДЕТАЛИ</Text><Text style={styles.sectionMeta}>server-backed unlocks</Text></View>
                      {virtualItems.map((item) => {
                        const unlocked = level >= item.unlockLevel;
                        return (
                          <View key={item.id} style={styles.upgradeCard}>
                            <View style={[styles.upgradeStatus, item.installed ? styles.upgradeStatusGood : unlocked ? styles.upgradeStatusLocked : styles.upgradeStatusUnknown]}><Ionicons name={item.installed ? 'checkmark' : unlocked ? 'sparkles-outline' : 'lock-closed-outline'} size={16} color={item.installed ? COLORS.white : COLORS.green} /></View>
                            <View style={styles.lockedCopy}><Text style={styles.lockedTitle}>{item.displayName}</Text><Text style={styles.lockedText}>{item.description} · уровень {item.unlockLevel}</Text></View>
                            {unlocked && !item.installed ? <Pressable disabled={busy} onPress={() => { void equipVirtualItem(item); }}><Text style={styles.sectionLink}>Установить</Text></Pressable> : item.installed ? <Text style={styles.sectionMeta}>Установлено</Text> : null}
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </>
            )}

            {tab === 'profile' && (
              <>
                <MiniBrand suffix="0.8.3" />
                <Text style={styles.appTitle}>Профиль</Text>
                <View style={styles.profileHero}><View style={styles.avatar}><Text style={styles.avatarText}>V</Text></View><View style={styles.profileCopy}><Text style={styles.profileName}>VeloQuest Rider</Text><Text style={styles.profileLevel}>Уровень {level}</Text><View style={styles.profileProgress}><View style={[styles.profileProgressFill, { width: `${Math.max(4, levelProgress / 5)}%` }]} /></View><Text style={styles.profileXp}>{levelProgress} / 500 XP</Text></View></View>

                <AchievementsPanel snapshot={achievementSnapshot} loading={achievementsLoading} onRefresh={() => { void refreshAchievements(); }} />

                <View style={styles.settingsGroup}>
                  <View style={styles.settingRow}><Ionicons name={specializationInfo?.icon ?? 'sparkles-outline'} size={23} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>Специализация</Text><Text style={styles.settingDetail}>{specializationInfo?.detail ?? (level >= 3 ? 'Выбери стиль — он изменит порядок квестов' : 'Откроется на уровне 3')}</Text></View><Text style={styles.settingAction}>{specializationInfo?.title ?? (level >= 3 ? 'Выбрать' : 'Закрыто')}</Text></View>
                  <View style={styles.settingRow}><Ionicons name="trophy-outline" size={23} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>Сезон {seasonId.toUpperCase()}</Text><Text style={styles.settingDetail}>{currentChapter ? `Глава ${currentChapter.number}/4 · ${currentChapter.title}` : '4-главная кампания'}</Text></View><Text style={styles.settingAction}>{seasonXp} XP</Text></View>
                </View>

                {level >= 3 && (specialization === null || specializationChangesUsed < 1) && (
                  <View style={styles.specializationCard}>
                    <Text style={styles.sectionKicker}>{specialization ? 'СМЕНА СПЕЦИАЛИЗАЦИИ · 1 РАЗ ЗА СЕЗОН' : 'ВЫБЕРИ СПЕЦИАЛИЗАЦИЮ'}</Text>
                    <Text style={styles.settingDetail}>{specialization ? 'После смены выбор будет зафиксирован до следующего сезона.' : 'Выбор основан на стиле поездок, а не на скорости.'}</Text>
                    <View style={styles.specializationChoices}>
                      {(Object.keys(SPECIALIZATIONS) as Specialization[]).map((key) => <Pressable key={key} disabled={busy || key === specialization} onPress={() => { void selectSpecialization(key); }} style={[styles.specializationChoice, key === specialization && styles.specializationChoiceActive]}><Ionicons name={SPECIALIZATIONS[key].icon} size={17} color={COLORS.green} /><Text style={styles.specializationChoiceText}>{SPECIALIZATIONS[key].title}</Text></Pressable>)}
                    </View>
                  </View>
                )}

                <View style={styles.settingsGroup}>
                  <View style={styles.settingRow}><Ionicons name={cloudStatus === 'synced' ? 'cloud-done-outline' : cloudStatus === 'error' ? 'cloud-offline-outline' : 'cloud-upload-outline'} size={23} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>Облачная синхронизация</Text></View><Text style={styles.settingAction}>{cloudStatus === 'synced' ? 'Включена' : cloudStatus === 'syncing' ? 'Синхронизация…' : cloudStatus === 'error' ? 'Ошибка' : 'Ожидание'}</Text></View>
                  <Pressable style={styles.settingRow} onPress={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}><Ionicons name={themeMode === 'dark' ? 'moon-outline' : 'sunny-outline'} size={23} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>Тема оформления</Text><Text style={styles.settingDetail}>Выбор сохраняется на устройстве</Text></View><Text style={styles.settingAction}>{themeMode === 'dark' ? 'Тёмная' : 'Светлая'}</Text></Pressable>
                  <Pressable style={styles.settingRow} onPress={() => setScreen('sync')}><Ionicons name="heart-outline" size={23} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>Источник поездок</Text></View><Text style={styles.settingAction}>{syncSourceName}</Text><Ionicons name="chevron-forward" size={16} color="#8A8E88" /></Pressable>
                  <View style={styles.settingRow}><Ionicons name="pulse-outline" size={23} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>Диагностика источников</Text><Text style={styles.settingDetail}>{syncDiagnostics.filter((item) => item.status === 'connected').length} подключено · последние sync сохраняются</Text></View><Ionicons name="checkmark-circle-outline" size={18} color={COLORS.green} /></View>
                  <View style={styles.settingRow}><Ionicons name="mail-outline" size={23} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>E-mail</Text></View><Text style={styles.settingEmail} numberOfLines={1}>{session?.user.email ?? '—'}</Text></View>
                  <Pressable disabled={busy || googleLinked} style={styles.settingRow} onPress={() => { void linkGoogleAccount(); }}><Ionicons name="logo-google" size={23} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>Google</Text><Text style={styles.settingDetail}>Дополнительный безопасный способ входа</Text></View><Text style={styles.settingAction}>{googleLinked ? 'Подключён' : busy ? 'Подключение…' : 'Подключить'}</Text></Pressable>
                  <Pressable disabled={busy} style={styles.settingRow} onPress={() => { if (vkLinked) unlinkVkAccount(); else void linkVkAccount(); }}><Ionicons name="logo-vk" size={23} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>VK</Text><Text style={styles.settingDetail}>{vkLinked ? (vkCanUnlink ? 'Подключён · можно безопасно отключить' : 'Подключён · последний способ входа') : 'Связь подтверждается через защищённый backend bridge'}</Text></View><Text style={styles.settingAction}>{vkLinked ? 'Отключить' : busy ? 'Подключение…' : 'Подключить'}</Text></Pressable>
                </View>

                <Pressable style={styles.secondaryButton} onPress={() => setScreen('history')}><View style={styles.secondaryButtonLeft}><Ionicons name="reader-outline" size={20} color={COLORS.green} /><Text style={styles.secondaryButtonText}>История поездок</Text></View><Ionicons name="chevron-forward" size={18} color={COLORS.green} /></Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => setScreen('rideInbox')}><View style={styles.secondaryButtonLeft}><Ionicons name="git-compare-outline" size={20} color={COLORS.green} /><Text style={styles.secondaryButtonText}>Ride Inbox · проверки дублей</Text></View><Text style={styles.settingAction}>{pendingInboxCount || '—'}</Text><Ionicons name="chevron-forward" size={18} color={COLORS.green} /></Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => { setError(null); setScreen('privacy'); }}><View style={styles.secondaryButtonLeft}><Ionicons name="shield-checkmark-outline" size={20} color={COLORS.green} /><Text style={styles.secondaryButtonText}>Источники и приватность</Text></View><Ionicons name="chevron-forward" size={18} color={COLORS.green} /></Pressable>
                <Pressable style={styles.signOutButton} onPress={() => { void signOut(); }}><Ionicons name="log-out-outline" size={20} color={COLORS.orange} /><Text style={styles.signOutButtonText}>Выйти из аккаунта</Text></Pressable>
                <Pressable onPress={clearDeviceData}><Text style={styles.resetDanger}>Очистить данные VeloQuest на этом устройстве</Text></Pressable>
              </>
            )}
          </ScrollView>

          <View style={styles.tabBar}>
            {MAIN_TABS.map((item) => {
              const active = tab === item.id;
              return <Pressable key={item.id} onPress={() => setTab(item.id)} style={styles.tabItem}><Ionicons name={active ? item.icon : `${item.icon}-outline` as keyof typeof Ionicons.glyphMap} size={22} color={active ? COLORS.green : '#8B8F87'} /><Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text></Pressable>;
            })}
          </View>
        </View>
      )}

      {screen === 'bikeEdit' && (
        <ScrollView contentContainerStyle={styles.screenPad} keyboardShouldPersistTaps="handled">
          <View style={styles.detailHeader}><Pressable style={styles.backRow} onPress={() => { setError(null); setScreen('app'); }}><Ionicons name="chevron-back" size={22} color={COLORS.green} /><Text style={styles.backText}>Гараж</Text></Pressable><Text style={styles.detailHeaderTitle}>Велосипед</Text><View style={styles.detailHeaderSpacer} /></View>
          <View style={styles.bikeFinderCard}>
            <Text style={styles.bikeFinderTitle}>Найти велосипед в каталоге</Text>
            <Text style={styles.bikeFinderHint}>Ищи по бренду, модели или характеристикам. В каталоге — только велосипеды 2020+.</Text>
            <View style={styles.bikeFinderSearchRow}>
              <View style={styles.bikeFinderSearchBox}><Ionicons name="search-outline" size={19} color={COLORS.muted} /><TextInput value={bikeFinderQuery} onChangeText={setBikeFinderQuery} placeholder="Canyon Endurace carbon Shimano" placeholderTextColor="#A4A69F" autoCapitalize="none" autoCorrect={false} style={styles.bikeFinderSearchInput} /></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Фильтры каталога" onPress={() => setBikeFinderExpanded((value) => !value)} style={[styles.bikeFinderFilterButton, bikeFinderExpanded && styles.bikeFinderFilterButtonActive]}><Ionicons name="options-outline" size={20} color={bikeFinderExpanded ? COLORS.white : COLORS.green} /></Pressable>
            </View>
            {bikeFinderExpanded && <View style={styles.bikeFinderFilters}>
              <TextInput value={bikeFinderBrand} onChangeText={setBikeFinderBrand} placeholder="Бренд · Trek" placeholderTextColor="#A4A69F" style={styles.finderInput} />
              <TextInput value={bikeFinderCategory} onChangeText={setBikeFinderCategory} placeholder="Тип · gravel / road / mtb" placeholderTextColor="#A4A69F" autoCapitalize="none" style={styles.finderInput} />
              <View style={styles.bikeFinderFilterRow}><TextInput value={bikeFinderYearFrom} onChangeText={setBikeFinderYearFrom} placeholder="Год от · 2020" placeholderTextColor="#A4A69F" keyboardType="number-pad" maxLength={4} style={[styles.finderInput, styles.finderHalf]} /><TextInput value={bikeFinderWheel} onChangeText={setBikeFinderWheel} placeholder="Колёса · 29" placeholderTextColor="#A4A69F" style={[styles.finderInput, styles.finderHalf]} /></View>
              <View style={styles.bikeFinderFilterRow}><TextInput value={bikeFinderFrame} onChangeText={setBikeFinderFrame} placeholder="Рама · carbon" placeholderTextColor="#A4A69F" style={[styles.finderInput, styles.finderHalf]} /><TextInput value={bikeFinderDrivetrain} onChangeText={setBikeFinderDrivetrain} placeholder="Трансмиссия · Shimano" placeholderTextColor="#A4A69F" style={[styles.finderInput, styles.finderHalf]} /></View>
              <TextInput value={bikeFinderBrake} onChangeText={setBikeFinderBrake} placeholder="Тормоза · hydraulic / disc" placeholderTextColor="#A4A69F" style={styles.finderInput} />
            </View>}
            {bikeFinderLoading && <View style={styles.bikeFinderLoading}><ActivityIndicator color={COLORS.green} /><Text style={styles.bikeFinderLoadingText}>Ищу в каталоге…</Text></View>}
            {bikeFinderError && <Text style={styles.bikeFinderError}>{bikeFinderError}</Text>}
            {!bikeFinderLoading && !bikeFinderError && bikeFinderResults.map((item) => (
              <Pressable key={item.id} onPress={() => { void selectCatalogBike(item); }} style={styles.bikeFinderResult}>
                <View style={styles.bikeFinderResultImage}>{item.imageUrl ? <RemoteBikeImage sources={[{ url: item.imageUrl, sourceLabel: item.imageSource ? `Фото: ${item.imageSource}` : 'Фото производителя' }]} fallback={require('./assets/garage-bike-hero-v2.jpg')} /> : <Ionicons name="bicycle-outline" size={28} color={COLORS.green} />}</View>
                <View style={styles.bikeFinderResultCopy}><Text style={styles.bikeFinderResultTitle}>{item.brand} {item.model}{item.trim ? ` ${item.trim}` : ''}</Text><Text style={styles.bikeFinderResultMeta}>{item.modelYear} · {item.category?.replaceAll('_', ' ') ?? 'категория не указана'} · {item.market}</Text></View>
                <Ionicons name="add-circle-outline" size={22} color={COLORS.green} />
              </Pressable>
            ))}
            {!bikeFinderLoading && bikeFinderHasMore && <Pressable disabled={bikeFinderLoadingMore} style={styles.catalogMoreButton} onPress={() => { void loadMoreCatalogBikes(); }}><Text style={styles.catalogMoreText}>{bikeFinderLoadingMore ? 'Загружаю…' : 'Показать ещё'}</Text></Pressable>}
            {!bikeFinderLoading && !bikeFinderError && bikeFinderResults.length === 0 && [bikeFinderQuery, bikeFinderBrand, bikeFinderCategory, bikeFinderFrame, bikeFinderWheel, bikeFinderDrivetrain, bikeFinderBrake].some((value) => value.trim()) && <Text style={styles.bikeFinderEmpty}>Ничего не найдено. Измени запрос или заполни велосипед вручную ниже.</Text>}
          </View>
          <View style={styles.manualBikeDivider}><View style={styles.manualBikeLine} /><Text style={styles.manualBikeText}>ИЛИ ВВЕСТИ ВРУЧНУЮ</Text><View style={styles.manualBikeLine} /></View>
          <Text style={styles.inputLabel}>БРЕНД</Text>
          <TextInput value={bikeBrand} onChangeText={(value) => { setBikeBrand(value); setCatalogBikeId(undefined); setCatalogManufacturerUrl(undefined); }} placeholder="Например, Canyon" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>МОДЕЛЬ</Text>
          <TextInput value={bikeModel} onChangeText={(value) => { setBikeModel(value); setCatalogBikeId(undefined); setCatalogManufacturerUrl(undefined); }} placeholder="Например, Endurace CF 7" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>МОДЕЛЬНЫЙ ГОД</Text>
          <TextInput value={bikeModelYear} onChangeText={(value) => { setBikeModelYear(value); setCatalogBikeId(undefined); setCatalogManufacturerUrl(undefined); }} placeholder="2024" placeholderTextColor="#A4A69F" keyboardType="number-pad" maxLength={4} style={styles.input} />
          <Text style={styles.formHint}>Каталог VeloQuest поддерживает велосипеды 2020 модельного года и новее.</Text>
          <View style={styles.formSection}><Text style={styles.formSectionTitle}>КОМПЛЕКТАЦИЯ · НЕОБЯЗАТЕЛЬНО</Text></View>
          <Text style={styles.inputLabel}>ТРАНСМИССИЯ</Text>
          <TextInput value={bikeDrivetrain} onChangeText={setBikeDrivetrain} placeholder="Например, Shimano 105 Di2" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>ТОРМОЗА</Text>
          <TextInput value={bikeBrakes} onChangeText={setBikeBrakes} placeholder="Например, Shimano GRX RX820" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>КАССЕТА</Text>
          <TextInput value={bikeCassette} onChangeText={setBikeCassette} placeholder="Например, CS-M6100 10–51T" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>СИСТЕМА / ШАТУНЫ</Text>
          <TextInput value={bikeCrankset} onChangeText={setBikeCrankset} placeholder="Например, Shimano FC-M6100" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>КАРЕТКА / СТАНДАРТ</Text>
          <TextInput value={bikeBottomBracket} onChangeText={setBikeBottomBracket} placeholder="Например, BSA 73 мм" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>ВИЛКА</Text>
          <TextInput value={bikeFork} onChangeText={setBikeFork} placeholder="Например, RockShox Pike 140 мм" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>ЗАДНИЙ АМОРТИЗАТОР</Text>
          <TextInput value={bikeRearShock} onChangeText={setBikeRearShock} placeholder="Например, FOX Float X 185×50" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>ВТУЛКИ / ОСИ</Text>
          <TextInput value={bikeHubs} onChangeText={setBikeHubs} placeholder="Например, Boost 110×15 / 148×12" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>КОЛЁСА</Text>
          <TextInput value={bikeWheelset} onChangeText={setBikeWheelset} placeholder="Например, DT Swiss Endurance LN" placeholderTextColor="#A4A69F" autoCapitalize="words" style={styles.input} />
          <Text style={styles.inputLabel}>ПОКРЫШКИ</Text>
          <TextInput value={bikeTires} onChangeText={setBikeTires} placeholder="Например, Continental GP5000 30 мм" placeholderTextColor="#A4A69F" autoCapitalize="sentences" style={styles.input} />
          {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={18} color="#9A3D25" /><Text style={styles.errorText}>{error}</Text></View>}
          <View style={styles.flexFill} />
          <PrimaryButton label="Сохранить велосипед" onPress={() => { void saveBike(); }} />
        </ScrollView>
      )}

      {screen === 'history' && (
        <ScrollView contentContainerStyle={styles.screenPad}>
          <View style={styles.detailHeader}><Pressable style={styles.backRow} onPress={() => setScreen('app')}><Ionicons name="chevron-back" size={22} color={COLORS.green} /><Text style={styles.backText}>Профиль</Text></Pressable><Text style={styles.detailHeaderTitle}>История поездок</Text><View style={styles.detailHeaderSpacer} /></View>
          <View style={styles.historyList}>
            {history.map((item) => <View key={item.id} style={styles.historyCard}><View style={styles.historyBike}><Ionicons name="bicycle" size={27} color={COLORS.green} /></View><View style={styles.rideCardCopy}><Text style={styles.rideDate}>{new Date(item.startTime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</Text><View style={styles.historyMetrics}><Text style={styles.historyMetric}><Text style={styles.historyMetricValue}>{item.distanceKm.toFixed(1)}</Text>{`\n`}КМ</Text><Text style={styles.historyMetric}><Text style={styles.historyMetricValue}>{formatDuration(item.durationMinutes)}</Text>{`\n`}ВРЕМЯ</Text><Text style={styles.historyMetric}><Text style={styles.historyMetricValue}>{Math.round(item.elevationGainM)}</Text>{`\n`}М</Text><Text style={styles.historyMetric}><Text style={styles.historyMetricValue}>{item.source}</Text>{`\n`}ИСТОЧНИК</Text></View></View><Ionicons name="chevron-forward" size={17} color="#8A8E88" /></View>)}
            {history.length === 0 && <View style={styles.emptyCard}><Ionicons name="trail-sign-outline" size={28} color={COLORS.green} /><Text style={styles.emptyTitle}>Здесь пока пусто</Text><Text style={styles.emptyText}>Первая импортированная поездка появится в истории автоматически.</Text></View>}
          </View>
        </ScrollView>
      )}

      {screen === 'rideInbox' && (
        <ScrollView contentContainerStyle={styles.screenPad}>
          <View style={styles.detailHeader}><Pressable style={styles.backRow} onPress={() => setScreen('app')}><Ionicons name="chevron-back" size={22} color={COLORS.green} /><Text style={styles.backText}>Профиль</Text></Pressable><Text style={styles.detailHeaderTitle}>Ride Inbox</Text><View style={styles.detailHeaderSpacer} /></View>
          <Text style={styles.privacyHint}>Здесь появляются cross-source совпадения. XP уже защищён от повторной выдачи; эта проверка нужна для прозрачности объединения поездок.</Text>
          <View style={styles.historyList}>
            {rideInbox.map((item) => (
              <View key={item.id} style={styles.inboxCard}>
                <View style={styles.sectionHeading}><Text style={styles.sectionKicker}>СОВПАДЕНИЕ ИСТОЧНИКОВ</Text><Text style={styles.sectionMeta}>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</Text></View>
                <Text style={styles.lockedTitle}>{item.sourceKind}</Text>
                <Text style={styles.lockedText}>{item.reason === 'cross_source_duplicate' ? 'Тот же маршрут уже найден в другом источнике по каноническому fingerprint.' : item.reason}</Text>
                {item.status === 'needs_review' ? <View style={styles.inboxActions}><Pressable disabled={busy} style={styles.compactAction} onPress={() => { void resolveInbox(item, 'confirmed_duplicate'); }}><Text style={styles.compactActionText}>Подтвердить дубль</Text></Pressable><Pressable disabled={busy} onPress={() => { void resolveInbox(item, 'dismissed'); }}><Text style={styles.resetDangerInline}>Скрыть</Text></Pressable></View> : <Text style={styles.settingAction}>{item.status === 'confirmed_duplicate' ? 'Дубль подтверждён' : 'Проверено'}</Text>}
              </View>
            ))}
            {rideInbox.length === 0 && <View style={styles.emptyCard}><Ionicons name="checkmark-done-outline" size={28} color={COLORS.green} /><Text style={styles.emptyTitle}>Очередь чистая</Text><Text style={styles.emptyText}>Спорных cross-source совпадений сейчас нет.</Text></View>}
          </View>
          {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={18} color="#9A3D25" /><Text style={styles.errorText}>{error}</Text></View>}
        </ScrollView>
      )}

      {screen === 'privacy' && (
        <ScrollView contentContainerStyle={styles.screenPad}>
          <View style={styles.detailHeader}><Pressable style={styles.backRow} onPress={() => setScreen('app')}><Ionicons name="chevron-back" size={22} color={COLORS.green} /><Text style={styles.backText}>Профиль</Text></Pressable><Text style={styles.detailHeaderTitle}>Приватность</Text><View style={styles.detailHeaderSpacer} /></View>
          <Text style={styles.sectionKicker}>ПРИВАТНАЯ ЗОНА</Text>
          <View style={styles.privacyZoneCard}>
            <View style={styles.settingRow}><Ionicons name="eye-off-outline" size={22} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>Скрывать начало и конец</Text><Text style={styles.settingDetail}>Клетки внутри зоны не попадают в отображаемую территорию.</Text></View><Pressable disabled={busy} onPress={() => { void updatePrivacy({ ...privacySettings, enabled: !privacySettings.enabled }); }} style={[styles.togglePill, privacySettings.enabled && styles.togglePillOn]}><View style={[styles.toggleKnob, privacySettings.enabled && styles.toggleKnobOn]} /></Pressable></View>
            <Text style={styles.inputLabel}>РАДИУС · {privacySettings.radiusM} М</Text>
            <View style={styles.radiusRow}>{[150, 250, 500, 1000].map((radius) => <Pressable key={radius} disabled={busy} onPress={() => { void updatePrivacy({ ...privacySettings, radiusM: radius }); }} style={[styles.radiusChip, privacySettings.radiusM === radius && styles.radiusChipActive]}><Text style={[styles.radiusChipText, privacySettings.radiusM === radius && styles.radiusChipTextActive]}>{radius} м</Text></Pressable>)}</View>
          </View>
          <Text style={styles.sectionKicker}>ИСТОЧНИКИ ПОЕЗДОК</Text>
          <View style={styles.settingsGroup}>
            {syncDiagnostics.map((item) => (
              <View key={item.kind} style={styles.settingRow}>
                <Ionicons name={item.status === 'connected' ? 'link-outline' : 'unlink-outline'} size={22} color={COLORS.green} />
                <View style={styles.settingCopy}><Text style={styles.settingTitle}>{sourceKindLabel(item.kind)}</Text><Text style={styles.settingDetail}>{item.status === 'connected' ? 'Подключён' : 'Отключён'}{item.lastSyncedAt ? ` · ${new Date(item.lastSyncedAt).toLocaleDateString('ru-RU')}` : ''}</Text></View>
                {item.status === 'connected' && <Pressable disabled={busy} onPress={() => { void revokeSource(item.kind); }}><Text style={styles.resetDangerInline}>Отключить</Text></Pressable>}
              </View>
            ))}
            {syncDiagnostics.length === 0 && <View style={styles.settingRow}><Ionicons name="information-circle-outline" size={22} color={COLORS.green} /><View style={styles.settingCopy}><Text style={styles.settingTitle}>Нет активных подключений</Text><Text style={styles.settingDetail}>Источник появится здесь после первой успешной синхронизации.</Text></View></View>}
          </View>
          {stravaConnected && <Pressable disabled={busy} style={styles.secondaryButton} onPress={() => { void backfillStrava(); }}><View style={styles.secondaryButtonLeft}><Ionicons name="cloud-download-outline" size={20} color={COLORS.green} /><Text style={styles.secondaryButtonText}>Импортировать 30 дней Strava</Text></View><Ionicons name="arrow-forward" size={18} color={COLORS.green} /></Pressable>}
          <Text style={styles.privacyHint}>VeloQuest использует только необходимые данные поездок. Отключение прекращает дальнейшую синхронизацию; системные разрешения Health можно дополнительно отозвать в настройках iOS/Android.</Text>
          {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={18} color="#9A3D25" /><Text style={styles.errorText}>{error}</Text></View>}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Удаление аккаунта</Text>
            <Text style={styles.dangerText}>Удаляет данные VeloQuest в облаке и на этом устройстве. Исходные данные Health не удаляются.</Text>
            <Pressable disabled={busy} style={styles.signOutButton} onPress={confirmAccountDeletion}><Ionicons name="trash-outline" size={20} color={COLORS.orange} /><Text style={styles.signOutButtonText}>Удалить аккаунт</Text></Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return <ThemeProvider><AppErrorBoundary><VeloQuestApp /></AppErrorBoundary></ThemeProvider>;
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.ivory },
  boot: { alignItems: 'center', justifyContent: 'center' },
  fullPad: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 26, paddingTop: 18, paddingBottom: 26 },
  screenPad: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  welcomeContent: { flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 22 },
  onboardingHero: { height: 420, marginHorizontal: -22, marginBottom: 30, overflow: 'hidden', borderBottomLeftRadius: 38, borderBottomRightRadius: 38, backgroundColor: '#E6E8DE' },
  onboardingImage: { width: '100%', height: '100%' },
  pagerDots: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 'auto', marginBottom: 28 },
  pagerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C9D2C9' },
  pagerDotActive: { backgroundColor: COLORS.green },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: COLORS.green },
  brandText: { color: COLORS.green, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  heroSpace: { height: 108 },
  eyebrow: { color: COLORS.green, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 12 },
  step: { color: '#8A8D84', fontSize: 11, fontWeight: '800', letterSpacing: 1.3, marginBottom: 14 },
  flowHeader: { minHeight: 54, marginBottom: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flowHeaderAction: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  skipText: { color: COLORS.green, fontSize: 14, fontWeight: '600' },
  flowIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#E7ECDE', alignItems: 'center', justifyContent: 'center', marginBottom: 19 },
  heroTitle: { color: COLORS.graphite, fontSize: 38, lineHeight: 40, fontWeight: '900', letterSpacing: -1.7 },
  title: { color: COLORS.graphite, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1.3 },
  titleCentered: { color: COLORS.graphite, fontSize: 31, lineHeight: 34, fontWeight: '800', letterSpacing: -1.2, textAlign: 'center' },
  lead: { color: '#626660', fontSize: 15, lineHeight: 24, marginTop: 18, marginBottom: 24 },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 25 },
  subtitleCentered: { maxWidth: 320, color: COLORS.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 12, marginBottom: 26 },
  promiseList: { gap: 10, marginBottom: 30 },
  promise: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  promiseText: { color: '#38413A', fontSize: 14 },
  primaryButton: { minHeight: 57, borderRadius: 13, paddingHorizontal: 20, backgroundColor: COLORS.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryPressed: { backgroundColor: '#113C22', transform: [{ translateY: 1 }] },
  disabled: { opacity: 0.45 },
  primaryLabel: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  reset: { color: '#9A9C96', fontSize: 11, textAlign: 'center', marginTop: 14 },
  optionList: { gap: 14 },
  option: { minHeight: 112, padding: 16, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', gap: 14 },
  optionSelected: { borderWidth: 2, borderColor: COLORS.green, backgroundColor: '#F1F4EB' },
  optionIcon: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9EFE2' },
  optionIconSelected: { backgroundColor: '#E1E8D8' },
  optionCopy: { flex: 1, gap: 3 },
  optionTitle: { color: COLORS.graphite, fontSize: 15, fontWeight: '800' },
  optionDetail: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  note: { flexDirection: 'row', gap: 10, marginTop: 18, padding: 15, borderRadius: 15, backgroundColor: '#EFF1EA' },
  noteText: { flex: 1, color: '#667063', fontSize: 12, lineHeight: 17 },
  flexFill: { flex: 1, minHeight: 28 },
  questList: { gap: 11 },
  questCard: { minHeight: 104, padding: 14, borderWidth: 1, borderColor: '#D9DCCF', borderRadius: 14, backgroundColor: '#F5F6F0', flexDirection: 'row', alignItems: 'center', gap: 13 },
  questCardSelected: { borderColor: '#9AAA91', backgroundColor: '#EEF2E6' },
  questChoiceIcon: { width: 53, height: 53, borderRadius: 27, backgroundColor: '#E3E9DA', alignItems: 'center', justifyContent: 'center' },
  questChoiceCopy: { flex: 1 },
  questTitle: { color: COLORS.graphite, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  questDetail: { color: COLORS.muted, fontSize: 12 },
  questReward: { color: COLORS.orange, fontSize: 15, lineHeight: 19, fontWeight: '900', textAlign: 'right' },
  centered: { alignItems: 'center' },
  rideHeader: { width: '100%', minHeight: 46, justifyContent: 'center' },
  syncOrb: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5ECDB', marginTop: 50, marginBottom: 24 },
  activeQuest: { width: '100%', padding: 16, borderRadius: 16, backgroundColor: '#EDF2E5', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeQuestIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#DEE7D6', alignItems: 'center', justifyContent: 'center' },
  activeQuestCopy: { flex: 1 },
  activeLabel: { color: '#7A8077', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  activeTitle: { color: COLORS.graphite, fontSize: 17, fontWeight: '800', marginTop: 5 },
  activeDetail: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  errorBox: { width: '100%', flexDirection: 'row', gap: 9, padding: 14, borderRadius: 14, backgroundColor: '#FAEAE4', marginTop: 13 },
  errorText: { flex: 1, color: '#7D3827', fontSize: 12, lineHeight: 17 },
  loading: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: COLORS.green, fontSize: 14, fontWeight: '700' },
  resultScroll: { flex: 1, backgroundColor: COLORS.ivory },
  resultContent: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingBottom: 28 },
  mapWrap: { height: 420, backgroundColor: '#E7ECDF' },
  territoryBadge: { position: 'absolute', left: 22, top: 22, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 13, backgroundColor: 'rgba(251,250,246,0.94)' },
  badgeLabel: { color: '#5B6259', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  badgeValue: { color: COLORS.graphite, fontSize: 40, lineHeight: 44, fontWeight: '900', letterSpacing: -1.8 },
  badgeUnit: { fontSize: 15, letterSpacing: -0.3 },
  resultSheet: { marginTop: -24, paddingHorizontal: 26, paddingTop: 42, paddingBottom: 26, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: COLORS.ivory, alignItems: 'center' },
  questSeal: { position: 'absolute', top: -34, width: 70, height: 70, borderRadius: 35, borderWidth: 6, borderColor: COLORS.ivory, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  questSealArchive: { backgroundColor: '#727971' },
  resultTitle: { color: COLORS.graphite, fontSize: 30, fontWeight: '900', letterSpacing: -1.2 },
  resultCaption: { color: COLORS.muted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  xp: { color: COLORS.orange, fontSize: 46, fontWeight: '900', letterSpacing: -2, marginTop: 2 },
  xpUnit: { color: COLORS.orange, fontSize: 31 },
  seasonRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 18, marginTop: 18 },
  seasonTitle: { color: COLORS.graphite, fontSize: 13, fontWeight: '800' },
  seasonSubtitle: { color: '#65705F', fontSize: 11, marginTop: 2 },
  seasonValue: { color: COLORS.graphite, fontSize: 11, fontWeight: '700' },
  progress: { width: '100%', height: 7, borderRadius: 4, backgroundColor: '#DEDDD7', marginTop: 11, marginBottom: 18, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.orange },
  statsRow: { width: '100%', flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.line, paddingVertical: 15 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { color: COLORS.graphite, fontSize: 15, fontWeight: '800' },
  statLabel: { color: COLORS.muted, fontSize: 10 },
  sourceRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, marginBottom: 10 },
  sourceCopy: { flex: 1 },
  sourceLabel: { color: COLORS.muted, fontSize: 10 },
  sourceValue: { color: COLORS.graphite, fontSize: 12, fontWeight: '700', marginTop: 2 },
  nextCard: { marginTop: 2, padding: 22, borderRadius: 22, borderWidth: 1, borderColor: '#B7C2AE', backgroundColor: '#EEF2E7' },
  nextTag: { color: COLORS.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  nextTitle: { color: COLORS.graphite, fontSize: 25, fontWeight: '900', letterSpacing: -0.9, marginTop: 22 },
  nextDetail: { color: '#646961', fontSize: 13, lineHeight: 19, marginTop: 7 },
  nextMeta: { flexDirection: 'row', gap: 18, marginTop: 18 },
  nextMetaText: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
  appShell: { flex: 1, backgroundColor: COLORS.ivory },
  appScroll: { flex: 1 },
  appContent: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30 },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  appEyebrow: { color: COLORS.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginBottom: 7 },
  appTitle: { color: COLORS.graphite, fontSize: 36, lineHeight: 39, fontWeight: '900', letterSpacing: -1.5 },
  appLead: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 24 },
  levelPill: { minHeight: 39, paddingHorizontal: 14, borderRadius: 12, backgroundColor: COLORS.green, flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelPillText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  sectionKicker: { color: '#60665F', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 9 },
  heroCard: { padding: 18, borderRadius: 18, backgroundColor: '#E9EDDF', borderWidth: 1, borderColor: '#C9D1C0', marginBottom: 18 },
  heroCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardEyebrow: { color: '#70796B', fontSize: 10, fontWeight: '900', letterSpacing: 1.15 },
  heroQuestRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  heroQuestIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  heroQuestCopy: { flex: 1 },
  rewardText: { color: COLORS.orange, fontSize: 15, fontWeight: '900' },
  heroCardTitle: { color: COLORS.graphite, fontSize: 21, fontWeight: '900', letterSpacing: -0.5 },
  heroCardDetail: { color: '#626B5E', fontSize: 12, lineHeight: 17, marginTop: 4 },
  heroRideButton: { minHeight: 45, borderTopWidth: 1, borderTopColor: '#CBD2C3', marginTop: 16, paddingTop: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroRideButtonText: { flex: 1, color: COLORS.green, fontSize: 12, fontWeight: '900' },
  inlineAction: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 19, paddingVertical: 3 },
  inlineActionText: { color: COLORS.green, fontSize: 13, fontWeight: '900' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 11 },
  sectionTitle: { color: COLORS.graphite, fontSize: 17, fontWeight: '900' },
  sectionMeta: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  sectionLink: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  metricGrid: { flexDirection: 'row', gap: 8, marginBottom: 27 },
  metricCard: { flex: 1, minHeight: 133, padding: 12, borderRadius: 15, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: COLORS.graphite, fontSize: 23, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center', marginTop: 10 },
  metricLabel: { color: COLORS.muted, fontSize: 9, marginTop: 4, textAlign: 'center' },
  rideCard: { minHeight: 115, padding: 12, borderRadius: 15, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rideIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8EFE2', alignItems: 'center', justifyContent: 'center' },
  rideIconLarge: { width: 78, height: 78, borderRadius: 13, backgroundColor: '#E9EFE2', alignItems: 'center', justifyContent: 'center' },
  rideCardCopy: { flex: 1 },
  rideDate: { color: COLORS.muted, fontSize: 10, marginBottom: 4 },
  rideTitle: { color: COLORS.graphite, fontSize: 14, fontWeight: '800' },
  rideDetail: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  emptyCard: { padding: 22, borderRadius: 20, backgroundColor: '#F0F2EB', borderWidth: 1, borderColor: COLORS.line, alignItems: 'center' },
  emptyTitle: { color: COLORS.graphite, fontSize: 16, fontWeight: '900', marginTop: 10 },
  emptyText: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  mapEmpty: { minHeight: 300, justifyContent: 'center' },
  mapHeader: { minHeight: 59, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  mapTitle: { color: COLORS.graphite, fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  mapStat: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#AEB8A8', backgroundColor: '#FCFBF7', flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapStatValue: { color: COLORS.graphite, fontSize: 16, lineHeight: 16, fontWeight: '900' },
  mapStatLabel: { color: COLORS.muted, fontSize: 7, marginTop: 2 },
  worldMapWrap: { height: 570, marginHorizontal: -20, overflow: 'hidden', backgroundColor: '#E7ECDF', marginBottom: 12 },
  mapCount: { position: 'absolute', top: 16, left: 16, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 13, backgroundColor: 'rgba(251,250,246,0.94)' },
  mapCountValue: { color: COLORS.graphite, fontSize: 30, lineHeight: 32, fontWeight: '900' },
  mapCountLabel: { color: COLORS.muted, fontSize: 9, marginTop: 2 },
  mapLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  legendText: { color: COLORS.muted, fontSize: 10 },
  segmentTabs: { flexDirection: 'row', gap: 22, marginTop: 20, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  segmentTab: { paddingHorizontal: 8, paddingBottom: 10 },
  segmentTabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.green },
  segmentText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: COLORS.green },
  bigQuestCard: { minHeight: 116, padding: 14, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', gap: 11 },
  bigQuestCardSelected: { backgroundColor: '#EDF2E6', borderColor: '#9CAF92' },
  questIcon: { width: 51, height: 51, borderRadius: 16, backgroundColor: '#E3EADB', alignItems: 'center', justifyContent: 'center' },
  bigQuestCopy: { flex: 1 },
  bigQuestTitle: { color: COLORS.graphite, fontSize: 16, fontWeight: '900' },
  bigQuestDetail: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  questMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  bigQuestState: { color: COLORS.green, fontSize: 10, fontWeight: '800' },
  miniBrandRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  miniBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  miniBrandIcon: { width: 26, height: 26, borderRadius: 13 },
  miniBrandText: { color: COLORS.green, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  versionChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#E3E9D7' },
  versionChipText: { color: COLORS.green, fontSize: 9, fontWeight: '800' },
  bikeCard: { padding: 16, borderRadius: 16, backgroundColor: '#F4F1E9', borderWidth: 1, borderColor: '#D8D4C9', marginTop: 13 },
  bikeFinderCard: { padding: 15, borderRadius: 18, backgroundColor: '#F0F3EA', borderWidth: 1, borderColor: '#D4DBCD', marginBottom: 20 },
  bikeFinderTitle: { color: COLORS.graphite, fontSize: 17, fontWeight: '900' },
  bikeFinderHint: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 12 },
  bikeFinderSearchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bikeFinderSearchBox: { flex: 1, minHeight: 48, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1, borderColor: '#CFD5C8', backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bikeFinderSearchInput: { flex: 1, color: COLORS.graphite, fontSize: 13, paddingVertical: 0 },
  bikeFinderFilterButton: { width: 48, height: 48, borderRadius: 13, borderWidth: 1, borderColor: '#ADC0AD', backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  bikeFinderFilterButtonActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  bikeFinderFilters: { gap: 8, marginTop: 10 },
  bikeFinderFilterRow: { flexDirection: 'row', gap: 8 },
  finderInput: { minHeight: 44, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: '#D4D9CF', backgroundColor: COLORS.white, color: COLORS.graphite, fontSize: 12 },
  finderHalf: { flex: 1, minWidth: 0 },
  bikeFinderLoading: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  bikeFinderLoadingText: { color: COLORS.muted, fontSize: 11 },
  bikeFinderError: { color: '#9A3D25', fontSize: 11, lineHeight: 16, marginTop: 10 },
  bikeFinderEmpty: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 12, textAlign: 'center' },
  bikeFinderResult: { minHeight: 72, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D1D7CB', flexDirection: 'row', alignItems: 'center', gap: 10 },
  bikeFinderResultImage: { width: 64, height: 52, borderRadius: 9, overflow: 'hidden', backgroundColor: '#F7F6F1', alignItems: 'center', justifyContent: 'center' },
  bikeFinderResultCopy: { flex: 1 },
  bikeFinderResultTitle: { color: COLORS.graphite, fontSize: 13, fontWeight: '800' },
  bikeFinderResultMeta: { color: COLORS.muted, fontSize: 9, lineHeight: 13, marginTop: 3, textTransform: 'capitalize' },
  catalogMoreButton: { minHeight: 42, marginTop: 10, borderRadius: 11, borderWidth: 1, borderColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  catalogMoreText: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  manualBikeDivider: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 15 },
  manualBikeLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.line },
  manualBikeText: { color: '#8A8D87', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  bikeVisual: { height: 205, borderRadius: 13, backgroundColor: '#F7F4ED', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 13 },
  bikeImage: { width: '100%', height: '100%' },
  bikeVisualBadge: { position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(251,250,246,0.9)' },
  bikeVisualBadgeText: { color: '#73776F', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  bikeTitle: { color: COLORS.graphite, fontSize: 19, fontWeight: '900', letterSpacing: -0.5, marginTop: 6 },
  bikeModel: { color: COLORS.muted, fontSize: 12, fontWeight: '600', marginTop: 3 },
  bikeEmptyText: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 20 },
  bikeMetaRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#CCD5C5', marginTop: 18, paddingTop: 15 },
  bikeMetaItem: { flex: 1, alignItems: 'center' },
  bikeMetaValue: { color: COLORS.graphite, fontSize: 16, fontWeight: '900', marginTop: 3 },
  bikeMetaLabel: { color: COLORS.muted, fontSize: 8, marginTop: 1 },
  componentsCard: { marginTop: 14, padding: 17, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  componentRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.line },
  componentIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EAF0E4', alignItems: 'center', justifyContent: 'center' },
  componentCopy: { flex: 1 },
  componentLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.45 },
  componentValue: { color: COLORS.graphite, fontSize: 13, fontWeight: '800', marginTop: 2 },
  componentValueMuted: { color: '#9A9D96', fontWeight: '600' },
  lockedCard: { flexDirection: 'row', gap: 12, padding: 17, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, marginTop: 14 },
  lockedCopy: { flex: 1 },
  lockedTitle: { color: COLORS.graphite, fontSize: 13, fontWeight: '800' },
  lockedText: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  upgradeSection: { marginTop: 18 },
  upgradeCard: { flexDirection: 'row', gap: 12, padding: 15, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, marginTop: 9 },
  upgradeStatus: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  upgradeStatusGood: { backgroundColor: COLORS.green },
  upgradeStatusConditional: { backgroundColor: COLORS.orange },
  upgradeStatusBad: { backgroundColor: '#9A3D25' },
  upgradeStatusLocked: { backgroundColor: '#E9EFE3' },
  upgradeStatusUnknown: { backgroundColor: '#F0EEE8' },
  evidenceText: { color: COLORS.green, fontSize: 9, lineHeight: 13, fontWeight: '700', marginTop: 7 },
  profileHero: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 16, marginBottom: 17 },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontSize: 29, fontWeight: '800' },
  profileCopy: { flex: 1 },
  profileName: { color: COLORS.graphite, fontSize: 17, fontWeight: '800' },
  profileLevel: { color: COLORS.green, fontSize: 13, fontWeight: '700', marginTop: 3 },
  profileProgress: { height: 7, borderRadius: 4, backgroundColor: '#E3E3D9', marginTop: 7, overflow: 'hidden' },
  profileProgressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.green },
  profileXp: { color: COLORS.muted, fontSize: 9, marginTop: 3, textAlign: 'right' },
  settingsGroup: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, overflow: 'hidden' },
  settingRow: { minHeight: 61, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  settingIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E9EFE3', alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1 },
  settingTitle: { color: COLORS.graphite, fontSize: 13, fontWeight: '700' },
  settingDetail: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  settingAction: { color: COLORS.green, fontSize: 10, fontWeight: '800', maxWidth: 120 },
  settingEmail: { color: COLORS.muted, fontSize: 10, maxWidth: 145 },
  secondaryButton: { minHeight: 52, marginTop: 14, paddingHorizontal: 16, borderRadius: 13, borderWidth: 1, borderColor: '#9FA49D', backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secondaryButtonLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secondaryButtonText: { color: COLORS.graphite, fontSize: 13, fontWeight: '800' },
  signOutButton: { minHeight: 52, marginTop: 10, borderRadius: 13, borderWidth: 1, borderColor: COLORS.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  signOutButtonText: { color: COLORS.orange, fontSize: 13, fontWeight: '800' },
  resetDanger: { color: '#9A4D3B', fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 24, padding: 8 },
  resetDangerInline: { color: '#9A4D3B', fontSize: 10, fontWeight: '800', paddingVertical: 8 },
  privacyHint: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 13 },
  dangerZone: { marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E2CFC6' },
  dangerTitle: { color: '#7E3928', fontSize: 14, fontWeight: '900' },
  dangerText: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  tabBar: { minHeight: 67, paddingTop: 7, paddingBottom: 7, flexDirection: 'row', backgroundColor: 'rgba(251,250,246,0.99)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D9D8D1' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { color: '#8B8F87', fontSize: 9, fontWeight: '700' },
  tabLabelActive: { color: COLORS.green },
  detailHeader: { minHeight: 55, marginBottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailHeaderTitle: { color: COLORS.graphite, fontSize: 19, fontWeight: '900' },
  detailHeaderSpacer: { width: 72 },
  backRow: { width: 72, flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8 },
  backText: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  inputLabel: { color: COLORS.green, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 4, marginBottom: 7 },
  formHint: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: -6, marginBottom: 8 },
  input: { minHeight: 58, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, color: COLORS.graphite, fontSize: 15, marginBottom: 14 },
  formSection: { marginTop: 5, marginBottom: 15, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.line },
  formSectionTitle: { color: '#81867E', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  historyList: { gap: 10 },
  historyCard: { minHeight: 93, padding: 12, borderRadius: 13, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyBike: { width: 43, alignItems: 'center' },
  historyMetrics: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  historyMetric: { color: COLORS.muted, fontSize: 7, lineHeight: 11, textTransform: 'uppercase' },
  historyMetricValue: { color: COLORS.graphite, fontSize: 11, lineHeight: 18, fontWeight: '800', textTransform: 'none' },
  historySource: { color: COLORS.green, fontSize: 9, fontWeight: '800', marginTop: 5 },
  virtualBikeCard: { backgroundColor: '#EDF2E6', borderColor: '#BAC8AF' },
  virtualBikeVisual: { height: 190, marginTop: 10, marginBottom: 8, borderRadius: 16, backgroundColor: '#DFE8D6', alignItems: 'center', justifyContent: 'center' },
  specializationCard: { marginTop: 14, marginBottom: 2, padding: 15, borderRadius: 15, backgroundColor: '#EEF2E7', borderWidth: 1, borderColor: '#CBD4C2' },
  specializationChoices: { flexDirection: 'row', gap: 7, marginTop: 13 },
  specializationChoice: { flex: 1, minHeight: 58, paddingHorizontal: 7, paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: '#B9C3B1', alignItems: 'center', justifyContent: 'center', gap: 4 },
  specializationChoiceActive: { backgroundColor: '#DFE8D6', borderColor: COLORS.green },
  specializationChoiceText: { color: COLORS.green, fontSize: 9, fontWeight: '800', textAlign: 'center' },
  inboxCard: { padding: 16, borderRadius: 15, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  inboxActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  compactAction: { minHeight: 38, paddingHorizontal: 13, borderRadius: 10, backgroundColor: COLORS.green, justifyContent: 'center' },
  compactActionText: { color: COLORS.white, fontSize: 10, fontWeight: '800' },
  privacyZoneCard: { marginBottom: 22, padding: 4, borderRadius: 15, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  togglePill: { width: 45, height: 26, padding: 3, borderRadius: 13, backgroundColor: '#D5D6D1', justifyContent: 'center' },
  togglePillOn: { backgroundColor: COLORS.green },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.white },
  toggleKnobOn: { alignSelf: 'flex-end' },
  radiusRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 10, paddingBottom: 12 },
  radiusChip: { flex: 1, minHeight: 36, borderRadius: 9, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  radiusChipActive: { backgroundColor: '#E3EAD9', borderColor: COLORS.green },
  radiusChipText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  radiusChipTextActive: { color: COLORS.green, fontWeight: '900' },
  nextQuestStrip: { width: '100%', minHeight: 58, marginBottom: 14, paddingHorizontal: 14, borderRadius: 13, backgroundColor: '#EDF2E6', borderWidth: 1, borderColor: '#C4D0BB', flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeInfluenceCard: { width: '100%', marginBottom: 12, padding: 14, borderRadius: 13, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  routeInfluenceActions: { minHeight: 38, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeInfluenceButton: { minWidth: 70, minHeight: 36, paddingHorizontal: 14, borderRadius: 9, backgroundColor: '#E4EBDD', alignItems: 'center', justifyContent: 'center' },
  routeInfluenceButtonText: { color: COLORS.green, fontSize: 11, fontWeight: '900' },
});
