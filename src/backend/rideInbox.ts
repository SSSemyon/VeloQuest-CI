import { supabase } from '../lib/supabase';

export type RideInboxItem = {
  id: string;
  sourceKind: string;
  candidateRideId: string | null;
  reason: string;
  status: 'needs_review' | 'confirmed_duplicate' | 'dismissed';
  createdAt: string;
};

export async function loadRideInbox(userId: string): Promise<RideInboxItem[]> {
  const { data, error } = await supabase
    .from('ride_inbox')
    .select('id, source_kind, candidate_ride_id, reason, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    if (!['needs_review', 'confirmed_duplicate', 'dismissed'].includes(row.status)) return [];
    return [{
      id: row.id,
      sourceKind: row.source_kind,
      candidateRideId: row.candidate_ride_id,
      reason: row.reason,
      status: row.status as RideInboxItem['status'],
      createdAt: row.created_at,
    }];
  });
}

export async function resolveRideInboxItem(userId: string, id: string, status: 'confirmed_duplicate' | 'dismissed') {
  const { error } = await supabase.from('ride_inbox').update({
    status,
    resolved_at: new Date().toISOString(),
  }).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
