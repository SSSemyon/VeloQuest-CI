import { supabase } from '../lib/supabase';

export type GarageRecommendation = {
  status: 'compatible' | 'conditional' | 'incompatible' | 'locked' | 'unknown';
  outcomeType?: 'no_upgrade';
  title: string;
  detail: string;
  model?: string;
  unlockLevel?: number;
  evidenceUrl?: string;
  evidenceCheckedAt?: string;
  priorityScore?: number;
};

export type GarageBikeMedia = {
  catalogBikeId: string;
  modelYear: number;
  sources: { url: string; sourceLabel: string }[];
};

export type BikeCatalogFilters = {
  query?: string;
  brand?: string;
  category?: string;
  yearFrom?: number;
  yearTo?: number;
  frameMaterial?: string;
  wheelSize?: string;
  drivetrainBrand?: string;
  brakeType?: string;
  limit?: number;
  offset?: number;
};

export type BikeCatalogResult = {
  id: string;
  brand: string;
  model: string;
  modelYear: number;
  trim: string;
  category?: string;
  market: string;
  specs: Record<string, unknown>;
  manufacturerUrl: string;
  imageUrl?: string;
  imageSource?: string;
};

export type CatalogBikeConfiguration = {
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

type BikeCatalogRpcRow = {
  id: string;
  brand: string;
  model: string;
  model_year: number;
  bike_trim: string | null;
  category: string | null;
  market: string;
  specs: Record<string, unknown> | null;
  manufacturer_url: string;
  image_url: string | null;
  image_source: string | null;
};

type BikeForGarage = CatalogBikeConfiguration & { catalogBikeId?: string; brand?: string; model?: string; modelYear?: number };

type BikeForMedia = { catalogBikeId?: string; brand: string; model: string; modelYear?: number };
type RideContext = { rideCount: number; distanceKm: number; elevationGainM: number };

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9а-яё]+/giu, ' ').trim();
}

function clean(value?: string) {
  const result = value?.trim();
  return result ? result : undefined;
}

function stringSpec(specs: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

async function loadGarageComponentAliases(componentIds: string[]) {
  if (componentIds.length === 0) return new Map<string, string>();
  const aliasesResult = await supabase
    .from('garage_component_aliases')
    .select('alias_component_id, canonical_component_id')
    .in('alias_component_id', componentIds);
  const aliasRelationMissing = aliasesResult.error
    && (aliasesResult.error.code === '42P01' || aliasesResult.error.code === 'PGRST205');
  if (aliasRelationMissing) return new Map<string, string>();
  if (aliasesResult.error) throw aliasesResult.error;
  const canonicalByAlias = new Map<string, string>();
  for (const alias of aliasesResult.data ?? []) {
    if (alias.alias_component_id && alias.canonical_component_id) canonicalByAlias.set(alias.alias_component_id, alias.canonical_component_id);
  }
  return canonicalByAlias;
}

async function resolveCatalogBike(bike: BikeForMedia) {
  if (bike.catalogBikeId) {
    const exact = await supabase
      .from('bike_catalog_models')
      .select('id, brand, model, trim, model_year')
      .eq('id', bike.catalogBikeId)
      .eq('enabled', true)
      .gte('model_year', 2020)
      .maybeSingle();
    if (exact.error) throw exact.error;
    if (exact.data) return exact.data;
  }
  let query = supabase
    .from('bike_catalog_models')
    .select('id, brand, model, trim, model_year')
    .eq('enabled', true)
    .gte('model_year', 2020)
    .ilike('brand', bike.brand.trim())
    .order('model_year', { ascending: false })
    .limit(50);
  if (bike.modelYear) query = query.eq('model_year', bike.modelYear);

  const result = await query;
  if (result.error) throw result.error;
  const expectedModel = normalize(bike.model);
  return (result.data ?? []).find((item) => {
    const catalogName = [item.model, item.trim].filter(Boolean).join(' ');
    return normalize(catalogName) === expectedModel || normalize(item.model) === expectedModel;
  }) ?? null;
}

export async function searchBikeCatalog(filters: BikeCatalogFilters): Promise<BikeCatalogResult[]> {
  const yearFrom = Math.max(2020, filters.yearFrom ?? 2020);
  const yearTo = Math.max(yearFrom, filters.yearTo ?? new Date().getFullYear() + 2);
  const { data, error } = await supabase.rpc('search_bike_catalog', {
    p_query: clean(filters.query) ?? null,
    p_brand: clean(filters.brand) ?? null,
    p_category: clean(filters.category) ?? null,
    p_year_from: yearFrom,
    p_year_to: yearTo,
    p_frame_material: clean(filters.frameMaterial) ?? null,
    p_wheel_size: clean(filters.wheelSize) ?? null,
    p_drivetrain_brand: clean(filters.drivetrainBrand) ?? null,
    p_brake_type: clean(filters.brakeType) ?? null,
    p_limit: Math.min(50, Math.max(1, filters.limit ?? 20)),
    p_offset: Math.max(0, filters.offset ?? 0),
  });
  if (error) throw error;

  return ((data ?? []) as BikeCatalogRpcRow[]).map((item) => ({
    id: item.id,
    brand: item.brand,
    model: item.model,
    modelYear: item.model_year,
    trim: item.bike_trim ?? '',
    category: item.category ?? undefined,
    market: item.market,
    specs: item.specs && typeof item.specs === 'object' ? item.specs as Record<string, unknown> : {},
    manufacturerUrl: item.manufacturer_url,
    imageUrl: typeof item.image_url === 'string' ? item.image_url : undefined,
    imageSource: typeof item.image_source === 'string' ? item.image_source : undefined,
  }));
}

export async function loadCatalogBikeConfiguration(item: BikeCatalogResult): Promise<CatalogBikeConfiguration> {
  const configuration: CatalogBikeConfiguration = {
    drivetrain: stringSpec(item.specs, 'drivetrain', 'groupset', 'drivetrain_brand'),
    brakes: stringSpec(item.specs, 'brakes', 'brake_type'),
    fork: stringSpec(item.specs, 'fork'),
    rearShock: stringSpec(item.specs, 'rear_shock'),
    cassette: stringSpec(item.specs, 'cassette'),
    crankset: stringSpec(item.specs, 'crankset'),
    bottomBracket: stringSpec(item.specs, 'bottom_bracket'),
    hubs: stringSpec(item.specs, 'hubs', 'hub'),
    wheelset: stringSpec(item.specs, 'wheelset', 'wheels'),
    tires: stringSpec(item.specs, 'tires', 'tyres'),
  };

  const fitmentsResult = await supabase
    .from('bike_catalog_component_fitments')
    .select('component_id')
    .eq('bike_id', item.id)
    .eq('fitment_type', 'factory_installed');
  if (fitmentsResult.error) throw fitmentsResult.error;
  const componentIds = [...new Set((fitmentsResult.data ?? []).map((fitment) => fitment.component_id))];
  if (componentIds.length === 0) return configuration;

  const componentsResult = await supabase
    .from('garage_components')
    .select('id, category, display_name')
    .eq('enabled', true)
    .in('id', componentIds);
  if (componentsResult.error) throw componentsResult.error;
  for (const component of componentsResult.data ?? []) {
    const displayName = component.display_name?.trim();
    if (!displayName) continue;
    if (component.category === 'rear_derailleur' && !configuration.drivetrain) configuration.drivetrain = displayName;
    if (component.category === 'brake_caliper' && !configuration.brakes) configuration.brakes = displayName;
    if (component.category === 'rear_shock' && !configuration.rearShock) configuration.rearShock = displayName;
    if (component.category === 'cassette' && !configuration.cassette) configuration.cassette = displayName;
    if (component.category === 'hub' && !configuration.hubs) configuration.hubs = displayName;
    if (component.category === 'tire' && !configuration.tires) configuration.tires = displayName;
  }
  return configuration;
}

export async function loadGarageBikeMedia(bike: BikeForMedia | null): Promise<GarageBikeMedia | null> {
  if (!bike?.brand.trim() || !bike.model.trim()) return null;

  const model = await resolveCatalogBike(bike);
  if (!model) return null;

  const imagesResult = await supabase
    .from('bike_catalog_images')
    .select('image_url, source_type, source_name, priority')
    .eq('bike_id', model.id)
    .eq('enabled', true)
    .order('priority', { ascending: true })
    .limit(6);
  if (imagesResult.error) throw imagesResult.error;

  return {
    catalogBikeId: model.id,
    modelYear: model.model_year,
    sources: (imagesResult.data ?? [])
      .filter((item) => typeof item.image_url === 'string' && /^https:\/\//i.test(item.image_url))
      .map((item) => ({
        url: item.image_url,
        sourceLabel: item.source_type === 'manufacturer' ? `Фото: ${item.source_name}` : `Фото: ${item.source_name} · магазин`,
      })),
  };
}

export async function loadGarageRecommendations(bike: BikeForGarage | null, rideContext?: RideContext): Promise<GarageRecommendation[]> {
  if (!bike) return [];
  const manualEntries = [
    ['Трансмиссия', bike.drivetrain],
    ['Тормоза', bike.brakes],
    ['Вилка', bike.fork],
    ['Задний амортизатор', bike.rearShock],
    ['Кассета', bike.cassette],
    ['Система', bike.crankset],
    ['Каретка', bike.bottomBracket],
    ['Втулки', bike.hubs],
    ['Колёса', bike.wheelset],
    ['Покрышки', bike.tires],
  ].flatMap(([label, value]) => typeof value === 'string' && value.trim() ? [{ label, value: value.trim() }] : []);
  const catalogBike = bike.brand?.trim() && bike.model?.trim()
    ? await resolveCatalogBike({ catalogBikeId: bike.catalogBikeId, brand: bike.brand, model: bike.model, modelYear: bike.modelYear })
    : null;

  const outcomesResult = catalogBike
    ? await supabase
        .from('garage_recommendation_outcomes')
        .select('scope_key, outcome_type, title, notes, evidence_url, evidence_checked_at')
        .eq('bike_id', catalogBike.id)
        .eq('enabled', true)
        .eq('outcome_type', 'no_upgrade')
    : { data: [], error: null };
  const outcomeRelationMissing = outcomesResult.error
    && (outcomesResult.error.code === '42P01' || outcomesResult.error.code === 'PGRST205');
  if (outcomesResult.error && !outcomeRelationMissing) throw outcomesResult.error;
  const noUpgradeRecommendations: GarageRecommendation[] = (outcomeRelationMissing ? [] : outcomesResult.data ?? []).map((outcome) => ({
    status: 'locked' as const,
    outcomeType: 'no_upgrade' as const,
    title: outcome.title || 'Апгрейд не рекомендуется',
    detail: outcome.notes,
    evidenceUrl: outcome.evidence_url,
    evidenceCheckedAt: outcome.evidence_checked_at,
    priorityScore: 40,
  }));

  const fitmentsResult = catalogBike
    ? await supabase.from('bike_catalog_component_fitments').select('component_id, fitment_type, evidence_url, evidence_checked_at, notes').eq('bike_id', catalogBike.id).in('fitment_type', ['factory_installed', 'manufacturer_approved'])
    : { data: [], error: null };
  if (fitmentsResult.error) throw fitmentsResult.error;

  const fitments = fitmentsResult.data ?? [];
  const fitmentIds = [...new Set(fitments.map((fitment) => fitment.component_id))];
  const componentFields = 'id, brand, model, category, display_name, evidence_url, evidence_checked_at';
  const sourceComponentsResult = fitmentIds.length > 0 || manualEntries.length > 0
    ? await supabase.from('garage_components').select(componentFields).eq('enabled', true).limit(1000)
    : { data: [], error: null };
  if (sourceComponentsResult.error) throw sourceComponentsResult.error;

  const byId = new Map((sourceComponentsResult.data ?? []).map((component) => [component.id, component]));
  const factoryIds = new Set(fitments.filter((fitment) => fitment.fitment_type === 'factory_installed').map((fitment) => fitment.component_id));
  const approvedFitments = fitments.filter((fitment) => fitment.fitment_type === 'manufacturer_approved');
  const sourceIds = new Set(factoryIds);
  const unresolvedManual = [] as typeof manualEntries;
  for (const entry of manualEntries) {
    const expected = normalize(entry.value);
    const source = (sourceComponentsResult.data ?? []).find((component) => {
      const model = normalize(component.model);
      const displayName = normalize(component.display_name);
      return expected === model || expected === displayName || (model.length >= 4 && expected.includes(model));
    });
    if (source) sourceIds.add(source.id);
    else unresolvedManual.push(entry);
  }

  const installedIdentityIds = new Set(factoryIds);
  const canonicalByAlias = await loadGarageComponentAliases([...sourceIds]);
  for (const [aliasId, canonicalId] of canonicalByAlias) {
    if (sourceIds.has(aliasId)) sourceIds.add(canonicalId);
    if (factoryIds.has(aliasId)) installedIdentityIds.add(canonicalId);
  }

  if (sourceIds.size === 0 && approvedFitments.length === 0) {
    const unresolved = unresolvedManual.map((entry) => ({
      status: 'unknown' as const,
      title: `${entry.label}: совместимость неизвестна`,
      detail: `«${entry.value}» не сопоставлен с точным evidence-backed компонентом. VeloQuest не будет угадывать совместимость.`,
    }));
    if (noUpgradeRecommendations.length > 0) return [...noUpgradeRecommendations, ...unresolved];
    if (unresolved.length > 0) return unresolved;
    return [{ status: 'unknown', title: 'Совместимость пока неизвестна', detail: 'Для этого велосипеда ещё нет evidence-backed factory fitment. VeloQuest не будет угадывать совместимость.' }];
  }

  const recommendations: GarageRecommendation[] = approvedFitments.flatMap((fitment) => {
    const target = byId.get(fitment.component_id);
    if (!target) return [];
    return [{
      status: 'compatible' as const,
      title: target.display_name,
      model: target.model,
      detail: fitment.notes || 'Производитель велосипеда прямо подтверждает совместимость этого компонента.',
      evidenceUrl: fitment.evidence_url,
      evidenceCheckedAt: fitment.evidence_checked_at,
    }];
  });
  recommendations.push(...noUpgradeRecommendations);
  recommendations.push(...unresolvedManual.map((entry) => ({
    status: 'unknown' as const,
    title: `${entry.label}: совместимость неизвестна`,
    detail: `«${entry.value}» не сопоставлен с точным evidence-backed компонентом.`,
  })));
  const seenTargets = new Set(approvedFitments.map((fitment) => fitment.component_id));
  const compatibilityResult = sourceIds.size > 0
    ? await supabase.from('garage_compatibility').select('source_component_id, target_component_id, status, rule_summary, evidence_url, evidence_checked_at').in('source_component_id', [...sourceIds]).in('status', ['compatible', 'conditional', 'incompatible']).limit(1000)
    : { data: [], error: null };
  if (compatibilityResult.error) throw compatibilityResult.error;
  const targetIds = [...new Set((compatibilityResult.data ?? []).map((rule) => rule.target_component_id).filter((id) => !seenTargets.has(id) && !installedIdentityIds.has(id)))];
  if (targetIds.length > 0) {
    const targetsResult = await supabase.from('garage_components').select(componentFields).eq('enabled', true).in('id', targetIds);
    if (targetsResult.error) throw targetsResult.error;
    for (const target of targetsResult.data ?? []) byId.set(target.id, target);
  }
  for (const rule of compatibilityResult.data ?? []) {
    if (installedIdentityIds.has(rule.target_component_id) || seenTargets.has(rule.target_component_id)) continue;
    const target = byId.get(rule.target_component_id);
    if (!target) continue;
    seenTargets.add(target.id);
    if (rule.status === 'incompatible') {
      recommendations.push({
        status: 'incompatible',
        title: `${target.display_name} · несовместимо`,
        model: target.model,
        detail: rule.rule_summary,
        evidenceUrl: rule.evidence_url,
        evidenceCheckedAt: rule.evidence_checked_at,
      });
      continue;
    }
    const ridePriority = rideContext && rideContext.rideCount > 0
      ? (target.category === 'brake_caliper' || target.category === 'rotor') && rideContext.elevationGainM >= 1000
        ? 20
        : (target.category === 'tire' || target.category === 'wheelset') && rideContext.distanceKm >= 250
          ? 15
          : 0
      : 0;
    const rideSignal = ridePriority > 0
      ? ` Приоритет +${ridePriority}: ${ridePriority === 20 ? 'заметный набор высоты' : 'накопленный пробег'}.`
      : '';
    recommendations.push({
      status: rule.status === 'conditional' ? 'conditional' : 'compatible',
      title: rule.status === 'conditional' ? `${target.display_name} · с условиями` : target.display_name,
      model: target.model,
      detail: `${rule.rule_summary}${rideSignal}`,
      evidenceUrl: rule.evidence_url,
      evidenceCheckedAt: rule.evidence_checked_at,
      priorityScore: ridePriority,
    });
  }
  if (recommendations.length > 0) {
    recommendations.sort((a, b) => {
      const priority = (item: GarageRecommendation) => item.status === 'incompatible' ? 300 : (item.priorityScore ?? 0) + (item.status === 'conditional' ? 100 : item.status === 'compatible' ? 50 : 0);
      return priority(b) - priority(a);
    });
    return recommendations;
  }
  if (factoryIds.size > 0) {
    return [{ status: 'unknown', title: 'Заводская комплектация подтверждена', detail: `В каталоге подтверждено компонентов: ${factoryIds.size}. Для них пока нет доказанной альтернативы-апгрейда, поэтому VeloQuest ничего не предлагает наугад.` }];
  }
  return [{ status: 'unknown', title: 'Нет подтверждённых апгрейдов', detail: 'Для этой точной модели ещё нет evidence-backed пары. Это нормальный default-deny результат.' }];
}
