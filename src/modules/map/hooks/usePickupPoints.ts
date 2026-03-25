import { useEffect, useState } from 'react';
import { getPickupPoints } from '@/services/api/pickupPointsService';
import {
  connectTrackingSocket,
  subscribeCampaign,
  setTrackingSocketHandlers,
} from '@/services/realtime/trackingSocket';

type PickupPoint = {
  id: string;
  campaignId: string;
  latitude: number;
  longitude: number;
  name: string;
  description?: string;
};

export function usePickupPoints(campaignId: string) {
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // carga inicial
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const data = await getPickupPoints(campaignId);
        if (mounted) setPoints(data);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [campaignId]);

  // tiempo real REAL
  useEffect(() => {
    connectTrackingSocket();

    subscribeCampaign(campaignId);

    setTrackingSocketHandlers({
      onPickupPointCreated: (point) => {
        if (point.campaignId !== campaignId) return;

        setPoints((prev) => {
          const exists = prev.find((p) => p.id === point.id);
          if (exists) return prev;
          return [...prev, point];
        });
      },
    });
  }, [campaignId]);

  return {
    points,
    loading,
  };
}