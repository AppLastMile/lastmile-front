import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type TrackingDevicePoint = {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  recordedAt: string;
};

type TrackingWatchOptions = {
  timeIntervalMs?: number;
  distanceIntervalMeters?: number;
};

type TrackingSubscription = {
  remove: () => void;
};

export async function startTrackingLocationWatch(
  onPoint: (point: TrackingDevicePoint) => void,
  options: TrackingWatchOptions = {}
): Promise<TrackingSubscription> {
  const { timeIntervalMs = 3000, distanceIntervalMeters = 10 } = options;

  if (Platform.OS === 'web') {
    if (!navigator?.geolocation) {
      throw new Error('Geolocalizacion no disponible en este navegador.');
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        onPoint({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed:
            typeof position.coords.speed === 'number' && Number.isFinite(position.coords.speed)
              ? position.coords.speed
              : undefined,
          heading:
            typeof position.coords.heading === 'number' && Number.isFinite(position.coords.heading)
              ? position.coords.heading
              : undefined,
          recordedAt: new Date(position.timestamp).toISOString(),
        });
      },
      () => {
        // Ignore noisy browser geolocation errors and keep the watch alive.
      },
      {
        enableHighAccuracy: false,
        maximumAge: timeIntervalMs,
        timeout: timeIntervalMs * 2,
      }
    );

    return {
      remove: () => navigator.geolocation.clearWatch(watchId),
    };
  }

  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Permiso de ubicacion denegado.');
  }

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: timeIntervalMs,
      distanceInterval: distanceIntervalMeters,
    },
    (location: Location.LocationObject) => {
      onPoint({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        speed:
          typeof location.coords.speed === 'number' && Number.isFinite(location.coords.speed)
            ? location.coords.speed
            : undefined,
        heading:
          typeof location.coords.heading === 'number' && Number.isFinite(location.coords.heading)
            ? location.coords.heading
            : undefined,
        recordedAt: new Date(location.timestamp).toISOString(),
      });
    }
  );

  return {
    remove: () => subscription.remove(),
  };
}
