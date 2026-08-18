import type { Quest } from '../domain/ride';
import { supabase } from '../lib/supabase';

export type ActiveQuestRun = {
  code: Quest['serverCode'];
  progressValue: number;
  targetValue: number;
  rewardXp: number;
};

export async function activateQuest(code: Quest['serverCode'], confirmAbandon = false): Promise<ActiveQuestRun> {
  const { data, error } = await supabase.rpc('activate_quest_alpha', {
    p_template_code: code,
    p_confirm_abandon: confirmAbandon,
  });
  if (error) throw new Error(error.message.includes('active_quest_has_progress')
    ? 'У активного квеста уже есть прогресс. Подтверди смену, чтобы начать новый.'
    : `Не удалось активировать квест: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.code !== code) throw new Error('Сервер не подтвердил активный квест.');
  return {
    code,
    progressValue: Number(row.progress_value ?? 0),
    targetValue: Number(row.target_value ?? 0),
    rewardXp: Number(row.reward_xp ?? 0),
  };
}
