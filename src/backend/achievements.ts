type DefinitionRow = {
  code: string;
  version: number;
  display_name: string;
  description: string;
  xp_reward: number;
  cosmetic_reward_code: string | null;
};

type ProgressRow = {
  user_id: string;
  achievement_code: string;
  definition_version: number;
  progress_value: number | string;
  target_value: number | string;
};

type UnlockRow = {
  user_id: string;
  achievement_code: string;
  definition_version: number;
  unlocked_at: string;
};

type GrantRow = {
  user_id: string;
  reward_code: string;
  achievement_code: string;
};

type CosmeticRow = {
  code: string;
  display_name: string;
  reward_kind: 'badge' | 'title' | 'profile_theme' | 'bike_cosmetic';
  payload: Record<string, unknown>;
};

export type AchievementServerRows = {
  definitions: DefinitionRow[];
  progress: ProgressRow[];
  unlocks: UnlockRow[];
  grants: GrantRow[];
  cosmetics: CosmeticRow[];
};

export type AchievementSnapshot = {
  items: Array<{
    code: string;
    displayName: string;
    description: string;
    definitionVersion: number;
    progressValue: number;
    targetValue: number;
    xpReward: number;
    unlocked: boolean;
    unlockedAt: string | null;
  }>;
  cosmetics: Array<{
    code: string;
    displayName: string;
    kind: 'Значок' | 'Титул' | 'Профиль' | 'VeloQuest Bike';
  }>;
  selectedTitle: string | null;
};

const EMPTY_SNAPSHOT: AchievementSnapshot = {
  items: [],
  cosmetics: [],
  selectedTitle: null,
};

function cosmeticKind(kind: CosmeticRow['reward_kind']): AchievementSnapshot['cosmetics'][number]['kind'] {
  if (kind === 'bike_cosmetic') return 'VeloQuest Bike';
  if (kind === 'profile_theme') return 'Профиль';
  if (kind === 'title') return 'Титул';
  return 'Значок';
}

export function mapAchievementSnapshot(
  userId: string,
  rows: AchievementServerRows,
): AchievementSnapshot {
  const progress = new Map(
    rows.progress
      .filter((row) => row.user_id === userId)
      .map((row) => [row.achievement_code, row]),
  );
  const unlocks = new Map(
    rows.unlocks
      .filter((row) => row.user_id === userId)
      .map((row) => [row.achievement_code, row]),
  );
  const cosmeticsByCode = new Map(rows.cosmetics.map((row) => [row.code, row]));
  const granted = rows.grants
    .filter((row) => row.user_id === userId)
    .flatMap((grant) => {
      const reward = cosmeticsByCode.get(grant.reward_code);
      return reward ? [{
        code: reward.code,
        displayName: reward.display_name,
        kind: cosmeticKind(reward.reward_kind),
      }] : [];
    });

  const selectedTitle = granted.find((reward) => reward.kind === 'Титул')?.displayName ?? null;
  return {
    items: rows.definitions.map((definition) => {
      const currentProgress = progress.get(definition.code);
      const unlock = unlocks.get(definition.code);
      return {
        code: definition.code,
        displayName: definition.display_name,
        description: definition.description,
        definitionVersion: definition.version,
        progressValue: Number(currentProgress?.progress_value ?? 0),
        targetValue: Number(currentProgress?.target_value ?? 1),
        xpReward: definition.xp_reward,
        unlocked: Boolean(unlock),
        unlockedAt: unlock?.unlocked_at ?? null,
      };
    }),
    cosmetics: granted,
    selectedTitle,
  };
}

export async function loadAchievementSnapshotGuarded(
  userId: string,
  dependencies: {
    currentUserId: () => Promise<string | null>;
    loadRows: () => Promise<AchievementServerRows>;
  },
): Promise<{ kind: 'loaded'; snapshot: AchievementSnapshot } | { kind: 'discarded' }> {
  if (await dependencies.currentUserId() !== userId) return { kind: 'discarded' };
  const rows = await dependencies.loadRows();
  if (await dependencies.currentUserId() !== userId) return { kind: 'discarded' };
  return { kind: 'loaded', snapshot: mapAchievementSnapshot(userId, rows) };
}

export async function loadAchievementSnapshot(userId: string): Promise<AchievementSnapshot | null> {
  const { supabase } = await import('../lib/supabase.ts');
  const result = await loadAchievementSnapshotGuarded(userId, {
    currentUserId: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.user.id ?? null;
    },
    loadRows: async () => {
      const [definitions, progress, unlocks, grants, cosmetics] = await Promise.all([
        supabase
          .from('achievement_definitions')
          .select('code, version, display_name, description, xp_reward, cosmetic_reward_code')
          .eq('active', true)
          .order('code'),
        supabase
          .from('achievement_progress')
          .select('user_id, achievement_code, definition_version, progress_value, target_value')
          .eq('user_id', userId),
        supabase
          .from('achievement_unlocks')
          .select('user_id, achievement_code, definition_version, unlocked_at')
          .eq('user_id', userId),
        supabase
          .from('user_cosmetic_rewards')
          .select('user_id, reward_code, achievement_code')
          .eq('user_id', userId),
        supabase
          .from('cosmetic_rewards')
          .select('code, display_name, reward_kind, payload')
          .eq('active', true),
      ]);
      for (const response of [definitions, progress, unlocks, grants, cosmetics]) {
        if (response.error) throw response.error;
      }
      return {
        definitions: (definitions.data ?? []) as DefinitionRow[],
        progress: (progress.data ?? []) as ProgressRow[],
        unlocks: (unlocks.data ?? []) as UnlockRow[],
        grants: (grants.data ?? []) as GrantRow[],
        cosmetics: (cosmetics.data ?? []) as CosmeticRow[],
      };
    },
  });
  return result.kind === 'loaded' ? result.snapshot : null;
}

export { EMPTY_SNAPSHOT };
