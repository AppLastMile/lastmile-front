import { useEffect } from 'react';
import { Platform } from 'react-native';

import { connectRealtime, emitRealtime } from './realtimeService';
import { startTrackingLocationWatch } from './trackingLocation';

const MAX_ACCEPTABLE_ACCURACY_METERS = 120;

export function useVolunteerLocationBroadcast(
  token: string | undefined,
  userId: number | undefined,
) {
  useEffect(() => {
    if (!token || !userId) {
      return;
    }

    connectRealtime({ token, userId, role: 'volunteer' });

    let cancelled = false;
    let subscription: { remove: () => void } | null = null;

    const start = async () => {
      try {
        const sub = await startTrackingLocationWatch(
          (point) => {
            if (cancelled) return;

            // Skip noisy fixes that commonly place users in wrong zones (IP/WiFi fallback).
            if (
              Platform.OS === 'web' &&
              typeof point.accuracy === 'number' &&
              Number.isFinite(point.accuracy) &&
              point.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS
            ) {
              return;
            }

            if (Platform.OS === 'web') {
              emitRealtime('volunteer.location.update', {
                lat: point.lat,
                lng: point.lng,
                accuracy: point.accuracy,
                recordedAt: point.recordedAt,
              });
              return;
            }

            emitRealtime('volunteer.location.update', { lat: point.lat, lng: point.lng });
          },
          { timeIntervalMs: 5000, distanceIntervalMeters: 15 },
        );

        if (cancelled) {
          sub.remove();
          return;
        }

        subscription = sub;
      } catch {
        // Permiso de ubicación no concedido, se omite silenciosamente
      }
    };

    void start();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [token, userId]);
}
