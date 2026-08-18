import { supabase } from '../lib/supabase';
import type { Quest } from '../domain/ride';

export type Specialization = 'explorer' | 'climber' | 'stayer';

export type SeasonChapter = {
  number: number;
  title: string;
  minXp: number;
  objective: string;
};

export type VirtualItem = {
  id: string;
  slot: 'frame' | 'wheels' | 'cockpit' | 'badge';
  displayName: string;
  description: string;
  unlockLevel: number;
  rarity: 'standard' | 'rare' | 'epic';
  installed: boolean;
};

export type PrivacySettings = {
  enabled: boolean;
  radiusM: number;
};

export async function loadSeasonChapters(seasonId: string): Promise<SeasonChapter[]> {
  const { data, error } = await supabase
    .from('season_chapters')
    .select('chapter_number, title, min_xp, objective')
    .eq('season_id', seasonId)
    .order('chapter_number');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    number: row.chapter_number,
    title: row.title,
    minXp: row.min_xp,
    objective: row.objective,
  }));
}

export async function loadQuestOrder(specialization: Specialization | null, quests: Quest[]) {
  if (!specialization) return quests;
  const { data, error } = await supabase
    .from('quest_specialization_affinity')
    .select('quest_code, weight')
    .eq('specialization', specialization);
  if (error) throw error;
  const weights = new Map((data ?? []).map((row) => [row.quest_code, row.weight]));
  return [...quests].sort((a, b) => (weights.get(b.serverCode) ?? 0) - (weights.get(a.serverCode) ?? 0));
}

export async function chooseSpecialization(userId: string, specialization: Specialization) {
  const { error } = await supabase
    .from('player_progress')
    .update({ specialization })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function loadVirtualItems(userId: string): Promise<VirtualItem[]> {
  const [itemsResult, loadoutResult] = await Promise.all([
    supabase.from('virtual_items').select('id, slot, display_name, description, unlock_level, rarity').eq('enabled', true).order('unlock_level'),
    supabase.from('virtual_loadout').select('slot, virtual_item_id').eq('user_id', userId),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (loadoutResult.error) throw loadoutResult.error;
  const installedBySlot = new Map((loadoutResult.data ?? []).map((row) => [row.slot, row.virtual_item_id]));
  return (itemsResult.data ?? []).flatMap((row) => {
    if (!['frame', 'wheels', 'cockpit', 'badge'].includes(row.slot) || !['standard', 'rare', 'epic'].includes(row.rarity)) return [];
    return [{
      id: row.id,
      slot: row.slot as VirtualItem['slot'],
      displayName: row.display_name,
      description: row.description,
      unlockLevel: row.unlock_level,
      rarity: row.rarity as VirtualItem['rarity'],
      installed: installedBySlot.get(row.slot) === row.id,
    }];
  });
}

export async function installVirtualItem(userId: string, item: VirtualItem) {
  const { error } = await supabase.from('virtual_loadout').upsert({
    user_id: userId,
    slot: item.slot,
    virtual_item_id: item.id,
  }, { onConflict: 'user_id,slot' });
  if (error) throw error;
}

export async function ensureVeloQuestBike(userId: string) {
  const existing = await supabase.from('bikes').select('id').eq('user_id', userId).eq('mode', 'veloquest').limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;
  const created = await supabase.from('bikes').insert({
    user_id: userId,
    mode: 'veloquest',
    name: 'VeloQuest Bike',
    brand: 'VeloQuest',
    model: 'Explorer Alpha',
    configuration: {},
    catalog_verified: true,
    is_active: false,
  }).select('id').single();
  if (created.error) throw created.error;
  return created.data.id;
}

export async function loadPrivacySettings(userId: string): Promise<PrivacySettings> {
  const { data, error } = await supabase
    .from('profiles')
    .select('privacy_zone_enabled, privacy_zone_radius_m')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return { enabled: data?.privacy_zone_enabled ?? true, radiusM: data?.privacy_zone_radius_m ?? 250 };
}

export async function savePrivacySettings(userId: string, settings: PrivacySettings) {
  const radiusM = Math.max(0, Math.min(2000, Math.round(settings.radiusM)));
  const { error } = await supabase.from('profiles').upsert({
    user_id: userId,
    privacy_zone_enabled: settings.enabled,
    privacy_zone_radius_m: radiusM,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

