import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { getSocket } from '@/services/realtime/socket';

import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, UrlTile, type Region } from 'react-native-maps';
import { useRouter } from 'expo-router';

import { useMissionStatus } from '@/modules/missions/hooks/useMissionStatus';

import {
  findColombianCityByName,
  type ColombianCity,
} from '@/modules/missions/constants/colombianCities';

import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import { DonorBottomTabs } from '@/modules/donor/components/DonorBottomTabs';

import {
  type EventSummary,
  getEvents,
} from '@/services/api/eventsService';

const COLOMBIA_REGION: Region = {
  latitude: 4.5709,
  longitude: -74.2973,
  latitudeDelta: 13,
  longitudeDelta: 13,
};

type EventWithCity = {
  event: EventSummary;
  city: ColombianCity;
};

export function MapScreen() {
  const router = useRouter();
  const { getStatus } = useMissionStatus();

  const { currentUser } = useAuthSession();
  const isDonor = currentUser?.role === 'donor';

  const [filter, setFilter] = useState<'all' | 'available' | 'taken'>('all');

  const [mapRef, setMapRef] = useState<MapView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [pickupPoints, setPickupPoints] = useState<any[]>([]);

  const [myLocation, setMyLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // 🔥 REALTIME CORREGIDO
  useEffect(() => {
    const socket = getSocket();
    const campaignId = 1;

    // 🔥 DEBUG conexión
    socket.on('connect', () => {
      console.log('🟢 Socket conectado:', socket.id);

      // 👉 suscribirse SOLO cuando conecta
      socket.emit('campaign.subscribe', { campaignId });
    });

    socket.on('disconnect', () => {
      console.log('🔴 Socket desconectado');
    });

    // 🔥 EVENTO REALTIME
    const handleNewPoint = (point: any) => {
      console.log('🔥 Nuevo punto realtime:', point);

      setPickupPoints((prev) => [...prev, point]);
    };

    socket.on('pickup_point.created', handleNewPoint);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('pickup_point.created', handleNewPoint);
    };
  }, []);

  // cargar eventos
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getEvents({ page: 1, limit: 100 });
      setEvents(response.data);
    } catch {
      setError('No fue posible cargar eventos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ubicación
  useEffect(() => {
    let isMounted = true;

    async function startLocationTracking() {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') return;

      const current = await Location.getCurrentPositionAsync({});

      if (isMounted) {
        setMyLocation({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      }
    }

    startLocationTracking();

    return () => {
      isMounted = false;
    };
  }, []);

  // mapear eventos
  const mappedEvents = useMemo<EventWithCity[]>(
    () =>
      events
        .map((eventItem) => {
          const city = findColombianCityByName(eventItem.city);
          if (!city) return null;
          return { event: eventItem, city };
        })
        .filter(
          (eventItem): eventItem is EventWithCity => eventItem !== null
        ),
    [events]
  );

  const filteredEvents = useMemo(() => {
    return mappedEvents;
  }, [mappedEvents]);

  return (
    <SafeAreaView className="flex-1">
      <MapView initialRegion={COLOMBIA_REGION} style={{ flex: 1 }}>
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* EVENTOS */}
        {filteredEvents.map(({ event, city }) => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: city.region.latitude,
              longitude: city.region.longitude,
            }}
            title={event.name}
          />
        ))}

        {/* 🔥 PICKUP POINTS REALTIME */}
        {pickupPoints.map((point, index) => (
          <Marker
            key={`pickup-${index}`}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            title={point.name}
            description={point.description}
            pinColor="green"
          />
        ))}

        {/* UBICACIÓN */}
        {myLocation && (
          <Marker coordinate={myLocation} title="Tu ubicación" />
        )}
      </MapView>

      {isLoading && <ActivityIndicator />}
    </SafeAreaView>
  );
}