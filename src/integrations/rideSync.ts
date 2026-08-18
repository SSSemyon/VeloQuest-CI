import { Platform } from 'react-native';
import type { CanonicalRide } from '../domain/ride';
import { importLatestAppleRide } from './appleHealth';
import { importFit } from './fit';
import { importGpx } from './gpx';
import { importLatestHealthConnectRide } from './healthConnect';

export type SyncMode = 'platform' | 'gpx' | 'fit' | 'strava';

export async function importRide(mode: SyncMode): Promise<CanonicalRide | null> {
  if (mode === 'strava') throw new Error('Strava синхронизируется через защищённый backend connector.');
  if (mode === 'gpx') return importGpx();
  if (mode === 'fit') return importFit();
  return Platform.OS === 'ios' ? importLatestAppleRide() : importLatestHealthConnectRide();
}
