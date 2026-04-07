import { useEffect } from 'react';

import { connectRealtime, emitRealtime } from './realtimeService';
import { startTrackingLocationWatch } from './trackingLocation';

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
