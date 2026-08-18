import { Platform } from 'react-native';
import {
  ExerciseType,
  initialize,
  readRecords,
  requestExerciseRoute,
  requestPermission,
} from 'react-native-health-connect';
import { createRide, type CanonicalRide, type RidePoint } from '../domain/ride';

export async function importLatestHealthConnectRide(): Promise<CanonicalRide | null> {
  if (Platform.OS !== 'android') throw new Error('Health Connect доступен только на Android.');
  if (!(await initialize())) throw new Error('Health Connect недоступен на этом устройстве.');

  await requestPermission([{ accessType: 'read', recordType: 'ExerciseSession' }]);
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
  const result = await readRecords('ExerciseSession', {
    timeRangeFilter: { operator: 'between', startTime: startTime.toISOString(), endTime: endTime.toISOString() },
    ascendingOrder: false,
    pageSize: 100,
  });

  const sessions = result.records.filter((session) => session.exerciseType === ExerciseType.BIKING);
  for (const session of sessions) {
    let route = session.exerciseRoute?.route ?? [];
    // Health Connect exposes 2 for CONSENT_REQUIRED in ExerciseRouteResultType.
    if (session.exerciseRoute?.type === 2 && session.metadata?.id) {
      route = await requestExerciseRoute(session.metadata.id);
    }
    if (route.length < 2) continue;
    const points: RidePoint[] = route.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      altitude: point.altitude ? (point.altitude.unit === 'kilometers' ? point.altitude.value * 1000 : point.altitude.unit === 'feet' ? point.altitude.value * 0.3048 : point.altitude.value) : undefined,
      timestamp: point.time,
    }));
    return createRide({
      source: 'Health Connect',
      sourceId: session.metadata?.id ?? `${session.startTime}:${session.endTime}`,
      startTime: session.startTime,
      endTime: session.endTime,
      points,
    });
  }
  return null;
}
