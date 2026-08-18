import { Platform } from 'react-native';
import type { SyncMode } from '../integrations/rideSync';
import { supabase } from '../lib/supabase';

export type SourceKind = 'healthkit' | 'health_connect' | 'gpx_fit' | 'strava';

export type SyncDiagnostic = {
  kind: SourceKind;
  status: 'connected' | 'disconnected' | 'error';
  lastSyncedAt: string | null;
};

export function sourceKindForMode(mode: SyncMode): SourceKind {
  if (mode === 'strava') return 'strava';
  if (mode === 'platform') return Platform.OS === 'ios' ? 'healthkit' : 'health_connect';
  return 'gpx_fit';
}

export async function recordSourceSync(userId: string, mode: SyncMode) {
  const kind = sourceKindForMode(mode);
  const { error } = await supabase.from('source_connections').upsert({
    user_id: userId,
    kind,
    status: 'connected',
    sync_enabled: true,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: 'user_id,kind' });
  if (error) throw error;
  await logClientEvent(userId, 'ride_sync_succeeded', 'info', kind);
}

export async function logClientEvent(
  userId: string,
  eventName: 'cloud_hydration_failed' | 'ride_sync_succeeded' | 'ride_sync_failed' | 'source_disconnected' | 'account_delete_requested'
    | 'specialization_selected' | 'virtual_item_installed' | 'ride_inbox_reviewed' | 'privacy_zone_updated'
    | 'quest_selected' | 'route_influence_reported' | 'client_render_error' | 'bike_cache_write_failed',
  severity: 'info' | 'warning' | 'error',
  sourceKind?: SourceKind,
  details: Record<string, unknown> = {},
) {
  const { error } = await supabase.from('client_events').insert({
    user_id: userId,
    event_name: eventName,
    severity,
    source_kind: sourceKind ?? null,
    details,
  });
  if (error) throw error;
}

export async function loadSyncDiagnostics(userId: string): Promise<SyncDiagnostic[]> {
  const { data, error } = await supabase
    .from('source_connections')
    .select('kind, status, last_synced_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    if (!['healthkit', 'health_connect', 'gpx_fit', 'strava'].includes(row.kind)) return [];
    if (!['connected', 'disconnected', 'error'].includes(row.status)) return [];
    return [{ kind: row.kind as SourceKind, status: row.status as SyncDiagnostic['status'], lastSyncedAt: row.last_synced_at }];
  });
}

export async function disconnectSource(userId: string, kind: SourceKind) {
  const { error } = await supabase.from('source_connections').update({
    status: 'disconnected',
    sync_enabled: false,
    sync_cursor: null,
  }).eq('user_id', userId).eq('kind', kind);
  if (error) throw error;
  await logClientEvent(userId, 'source_disconnected', 'info', kind);
}
