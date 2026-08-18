import type { CanonicalRide } from '../domain/ride';
import { supabase } from '../lib/supabase';

export type RideProcessorResult = {
  duplicate: boolean;
  rideId: string | null;
  newCells: string[];
  xpAwarded: number;
  totalXp: number;
  quest: {
    code: string;
    completed: boolean;
    progressValue?: number;
    targetValue?: number;
    rewardXp?: number;
    rewardEligible?: boolean;
  };
  ride: {
    id: string;
    source: CanonicalRide['source'];
    startTime: string;
    endTime: string;
    distanceKm: number;
    durationMinutes: number;
    elevationGainM: number;
    /** Privacy-masked route returned by the authoritative processor. */
    points: CanonicalRide['points'];
  };
};

function needsPlatformCapability(ride: CanonicalRide) {
  return ride.isHistorical !== true
    && (ride.source === 'Apple Health' || ride.source === 'Health Connect');
}

async function issuePlatformCapability(ride: CanonicalRide) {
  if (!needsPlatformCapability(ride)) return null;
  const { data, error } = await supabase.functions.invoke('platform-ride-authorizer', {
    body: { source: ride.source, sourceId: ride.sourceId },
  });
  if (error) throw new Error(`Не удалось подтвердить свежую поездку ${ride.source}: ${error.message}`);
  const ticket = typeof data?.platformTicket === 'string' ? data.platformTicket.trim() : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(ticket)) {
    throw new Error('Сервер не выдал корректное разрешение для награды за поездку.');
  }
  return ticket;
}

export async function processRideOnServer(ride: CanonicalRide, questCode: string): Promise<RideProcessorResult> {
  const platformTicket = await issuePlatformCapability(ride);
  const { data, error } = await supabase.functions.invoke('ride-processor', {
    body: {
      source: ride.source,
      sourceId: ride.sourceId,
      startTime: ride.startTime,
      endTime: ride.endTime,
      points: ride.points,
      questCode,
      isHistorical: ride.isHistorical === true,
      platformTicket,
    },
  });

  if (error) throw new Error(`Не удалось обработать поездку в VeloQuest Cloud: ${error.message}`);
  if (!data || typeof data !== 'object' || !('duplicate' in data)) throw new Error('Сервер вернул некорректный результат поездки.');
  return data as RideProcessorResult;
}
