-- Cover the remaining foreign keys reported by the Supabase performance advisor.
-- These are additive, idempotent and safe to apply after the full baseline.

create index if not exists quest_specialization_affinity_quest_code_idx
on public.quest_specialization_affinity (quest_code);

create index if not exists ride_inbox_candidate_ride_idx
on public.ride_inbox (candidate_ride_id);

create index if not exists strava_oauth_states_user_idx
on public.strava_oauth_states (user_id);

create index if not exists virtual_loadout_virtual_item_idx
on public.virtual_loadout (virtual_item_id);
