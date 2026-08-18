import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const MIGRATION_OWNER_KEY = 'veloquest.migration.supabase.owner.v1';

export async function deleteVeloQuestAccount(userId: string) {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirm: true } });
  if (error) throw new Error(`Не удалось удалить аккаунт: ${error.message}`);
  if (!data?.deleted) throw new Error('Сервер не подтвердил удаление аккаунта.');
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  const [keys, migrationOwner] = await Promise.all([
    AsyncStorage.getAllKeys(),
    AsyncStorage.getItem(MIGRATION_OWNER_KEY),
  ]);
  const accountSuffix = `:${userId}`;
  const accountKeys = keys.filter((key) => key.endsWith(accountSuffix));
  if (migrationOwner === userId) accountKeys.push(MIGRATION_OWNER_KEY);
  if (accountKeys.length > 0) await AsyncStorage.multiRemove([...new Set(accountKeys)]);
}
