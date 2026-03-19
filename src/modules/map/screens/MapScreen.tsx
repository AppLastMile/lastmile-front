import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
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

  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Mapear eventos → coordenadas
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

  // FILTRO
  const filteredEvents = useMemo(() => {
    return mappedEvents.filter(({ event }) => {
      const status = getStatus(String(event.id));

      if (filter === 'all') return true;
      if (filter === 'available') return status === 'available';
      if (filter === 'taken') return status === 'taken';

      return true;
    });
  }, [mappedEvents, filter]);

  // cargar eventos
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getEvents({ page: 1, limit: 100 });
      setEvents(response.data);
    } catch {
      setError(
        'No fue posible cargar eventos en el mapa. Verifica el backend.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ubicación en tiempo real
  useEffect(() => {
    let isMounted = true;
    let watch: Location.LocationSubscription | null = null;

    async function startLocationTracking() {
      setIsLocating(true);
      setLocationError(null);

      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (isMounted) {
            setLocationError('Permiso de ubicación denegado.');
            setIsLocating(false);
          }
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setMyLocation({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          });
          setIsLocating(false);
        }

        watch = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 3000,
            distanceInterval: 8,
          },
          (position) => {
            if (!isMounted) return;

            setMyLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          }
        );
      } catch {
        if (isMounted) {
          setLocationError(
            'No fue posible obtener tu ubicación.'
          );
          setIsLocating(false);
        }
      }
    }

    startLocationTracking();

    return () => {
      isMounted = false;
      watch?.remove();
    };
  }, []);

  const centerOnMyLocation = () => {
    if (!myLocation || !mapRef) return;

    mapRef.animateToRegion(
      {
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      700
    );
  };

  return (
    <SafeAreaView className='flex-1 bg-[#eaf2ff]'>
      {/* HEADER */}
      {!isDonor && (
        <View className='px-4 pb-3 pt-2'>
          <Text className='text-2xl font-extrabold text-[#16325d]'>
            Mapa de eventos
          </Text>

          {/* 🔥 FILTROS */}
          <View className='flex-row gap-2 mt-3'>
            <Pressable
              onPress={() => setFilter('all')}
              className='px-3 py-2 rounded-xl'
              style={{
                backgroundColor:
                  filter === 'all' ? '#1f5fe0' : '#e5e7eb',
              }}
            >
              <Text
                style={{
                  color: filter === 'all' ? '#fff' : '#000',
                }}
              >
                Todas
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFilter('available')}
              className='px-3 py-2 rounded-xl'
              style={{
                backgroundColor:
                  filter === 'available'
                    ? '#dc2626'
                    : '#e5e7eb',
              }}
            >
              <Text
                style={{
                  color: filter === 'available' ? '#fff' : '#000',
                }}
              >
                Disponibles
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setFilter('taken')}
              className='px-3 py-2 rounded-xl'
              style={{
                backgroundColor:
                  filter === 'taken'
                    ? '#2563eb'
                    : '#e5e7eb',
              }}
            >
              <Text
                style={{
                  color: filter === 'taken' ? '#fff' : '#000',
                }}
              >
                Aceptadas
              </Text>
            </Pressable>
          </View>

          <View className='mt-3 flex-row items-center justify-between'>
            <Text className='text-sm font-semibold text-[#2a456e]'>
              Marcadores: {filteredEvents.length}
            </Text>

            <Pressable
              className='rounded-xl bg-[#1f5fe0] px-4 py-2'
              onPress={loadEvents}
            >
              <Text className='font-semibold text-white'>
                Recargar
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* MAPA */}
      <View
        className={`flex-1 overflow-hidden ${
          isDonor
            ? 'border-0'
            : 'rounded-t-3xl border border-[#d3e2ff]'
        }`}
      >
        <MapView
          initialRegion={COLOMBIA_REGION}
          ref={setMapRef}
          style={{ flex: 1 }}
        >
          <UrlTile urlTemplate='https://tile.openstreetmap.org/{z}/{x}/{y}.png' />

          {/* MARKERS FILTRADOS */}
          {filteredEvents.map(({ event, city }) => {
            const status = getStatus(String(event.id));

            const color =
              status === 'available'
                ? 'red'
                : status === 'taken'
                ? 'blue'
                : 'gray';

            return (
              <Marker
                key={event.id}
                coordinate={{
                  latitude: city.region.latitude,
                  longitude: city.region.longitude,
                }}
                title={event.name}
                description={event.description}
                pinColor={color}
                onPress={() =>
                  router.push(`/missions/${event.id}`)
                }
              />
            );
          })}

          {myLocation && (
            <Marker
              coordinate={myLocation}
              title='Tu ubicación'
              pinColor='#2563eb'
            />
          )}
        </MapView>

        {isLoading && (
          <View className='absolute top-3 left-0 right-0 items-center'>
            <View className='rounded-full bg-white px-4 py-2'>
              <ActivityIndicator color='#1f5fe0' />
            </View>
          </View>
        )}
      </View>

      {isDonor && <DonorBottomTabs activeTab='inicio' />}
    </SafeAreaView>
  );
}