import * as WebBrowser from 'expo-web-browser';
import type { CanonicalRide } from '../domain/ride';
import type { RideProcessorResult } from '../backend/rideProcessor';
import { supabase } from '../lib/supabase';

const APP_REDIRECT = 'veloquest://strava-connected';

type StravaSyncPayload = RideProcessorResult & {
  points: CanonicalRide['points'];
  sourceId?: string;
};

function stravaError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('503') || message.includes('non-2xx')) return new Error('Strava ещё не настроена: нужны Client ID/Secret зарегистрированного Strava API application.');
  return new Error(message || fallback);
}

export async function connectStrava() {
  const { data, error } = await supabase.functions.invoke('strava-oauth', { body: { action: 'start' } });
  if (error) throw stravaError(error, 'Не удалось начать подключение Strava.');
  if (typeof data?.authorizationUrl !== 'string') throw new Error('Strava вернула некорректную ссылку авторизации.');
  const result = await WebBrowser.openAuthSessionAsync(data.authorizationUrl, APP_REDIRECT);
  if (result.type !== 'success') return false;
  const status = new URL(result.url).searchParams.get('status');
  if (status !== 'connected') throw new Error(status === 'denied' ? 'Доступ Strava не предоставлен.' : `Strava OAuth завершился со статусом: ${status ?? 'unknown'}.`);
  return true;
}

export async function disconnectStrava() {
  const { data, error } = await supabase.functions.invoke('strava-oauth', { body: { action: 'disconnect' } });
  if (error) throw stravaError(error, 'Не удалось отключить Strava.');
  if (!data?.disconnected) throw new Error('Strava не подтвердила отключение.');
}

export async function syncLatestStravaRide(questCode: string): Promise<{ ride: CanonicalRide; result: RideProcessorResult }> {
  const { data, error } = await supabase.functions.invoke('strava-sync', { body: { questCode, backfill: false } });
  if (error) throw stravaError(error, 'Не удалось синхронизировать Strava.');
  const payload = data as StravaSyncPayload;
  if (!payload?.ride || !Array.isArray(payload.points) || payload.points.length < 2) throw new Error('Strava не вернула поездку с GPS-маршрутом.');
  const ride: CanonicalRide = {
    id: payload.ride.id,
    source: 'Strava',
    sourceId: payload.sourceId ?? payload.ride.id,
    startTime: payload.ride.startTime,
    endTime: payload.ride.endTime,
    points: payload.points,
    distanceKm: payload.ride.distanceKm,
    durationMinutes: payload.ride.durationMinutes,
    elevationGainM: payload.ride.elevationGainM,
  };
  return { ride, result: payload };
}

export async function backfillStravaRides(questCode: string): Promise<number> {
  const { data, error } = await supabase.functions.invoke('strava-sync', { body: { questCode, backfill: true } });
  if (error) throw stravaError(error, 'Не удалось импортировать историю Strava.');
  return typeof data?.processed === 'number' ? data.processed : 0;
}
