import { Platform } from 'react-native';
import {
  WorkoutActivityType,
  queryWorkoutSamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { createRide, type CanonicalRide, type RidePoint } from '../domain/ride';

export async function importLatestAppleRide(): Promise<CanonicalRide | null> {
  if (Platform.OS !== 'ios') throw new Error('Apple Health доступен только на iPhone.');

  await requestAuthorization({
    toRead: ['HKWorkoutTypeIdentifier', 'HKWorkoutRouteTypeIdentifier'],
  });

  const workouts = await queryWorkoutSamples({
    limit: 20,
    ascending: false,
    filter: { workoutActivityType: WorkoutActivityType.cycling },
  });

  for (const workout of workouts) {
    const routes = await workout.getWorkoutRoutes();
    const points: RidePoint[] = routes.flatMap((route) => route.locations.map((location) => ({
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      timestamp: location.date.toISOString(),
    })));
    if (points.length < 2) continue;
    return createRide({
      source: 'Apple Health',
      sourceId: workout.uuid,
      startTime: workout.startDate.toISOString(),
      endTime: workout.endDate.toISOString(),
      points,
    });
  }
  return null;
}
