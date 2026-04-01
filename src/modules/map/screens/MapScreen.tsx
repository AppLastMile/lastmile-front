import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import {
  findColombianCityByName,
  type ColombianCity,
} from '@/modules/missions/constants/colombianCities';
import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import { DonorBottomTabs } from '@/modules/donor/components/DonorBottomTabs';
import { type EventSummary, getEvents } from '@/services/api/eventsService';

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
  const { currentUser } = useAuthSession();
  const isDonor = currentUser?.role === 'donor';
  const [showDonorWelcome, setShowDonorWelcome] = useState(true);
  const donorWelcomeTop = 12;
  const floatingControlsTop = 24;
  const controlsTop = isDonor && showDonorWelcome ? floatingControlsTop + 62 : floatingControlsTop;
  const [mapRef, setMapRef] = useState<MapView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const mappedEvents = useMemo<EventWithCity[]>(
    () =>
      events
        .map((eventItem) => {
          const city = findColombianCityByName(eventItem.city);

          if (!city) {
            return null;
          }

          return { event: eventItem, city };
        })
        .filter((eventItem): eventItem is EventWithCity => eventItem !== null),
    [events]
  );

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getEvents({ page: 1, limit: 100 });
      setEvents(response.data);
    } catch {
      setError('No fue posible cargar eventos en el mapa. Verifica el backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useFocusEffect(
    useCallback(() => {
      if (!isDonor) {
        setShowDonorWelcome(false);
        return;
      }

      setShowDonorWelcome(true);

      const timeoutId = setTimeout(() => {
        setShowDonorWelcome(false);
      }, 3200);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [isDonor])
  );

  useEffect(() => {
    let isMounted = true;
    let watch: Location.LocationSubscription | null = null;

    async function startLocationTracking() {
      setIsLocating(true);
      setLocationError(null);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (isMounted) {
            setLocationError('Permiso de ubicacion denegado.');
            setIsLocating(false);
          }
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setMyLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
          setIsLocating(false);
        }

        watch = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 3000,
            distanceInterval: 8,
          },
          (position) => {
            if (!isMounted) {
              return;
            }

            setMyLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          }
        );
      } catch {
        if (isMounted) {
          setLocationError('No fue posible obtener tu ubicacion.');
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
    if (!myLocation || !mapRef) {
      return;
    }

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
      {!isDonor ? (
        <View className='px-4 pb-3 pt-2'>
          <Text className='text-2xl font-extrabold text-[#16325d]'>Mapa de eventos</Text>
          <Text className='mt-1 text-sm text-[#4d648a]'>
            Eventos activos cargados desde el backend.
          </Text>
          <View className='mt-3 flex-row items-center justify-between'>
            <Text className='text-sm font-semibold text-[#2a456e]'>
              Marcadores: {mappedEvents.length}
            </Text>
            <Pressable
              className='rounded-xl bg-[#1f5fe0] px-4 py-2 active:opacity-90'
              onPress={loadEvents}
            >
              <Text className='font-semibold text-white'>Recargar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        className={`flex-1 overflow-hidden ${
          isDonor ? 'border-0' : 'rounded-t-3xl border border-[#d3e2ff]'
        }`}
      >
        <MapView
          initialRegion={COLOMBIA_REGION}
          ref={setMapRef}
          style={{ flex: 1 }}
        >

          {mappedEvents.map(({ event, city }) => (
            <Marker
              coordinate={{
                latitude: city.region.latitude,
                longitude: city.region.longitude,
              }}
              description={event.description}
              key={event.id}
              title={event.name}
            />
          ))}

          {myLocation ? (
            <Marker
              coordinate={myLocation}
              description='Ubicacion actual del dispositivo'
              key='my-location'
              pinColor='#2563eb'
              title='Tu ubicacion'
            />
          ) : null}
        </MapView>

        {isDonor && showDonorWelcome ? (
          <View
            className='absolute left-4 right-4 rounded-2xl border border-[#d0def8] bg-white px-4 py-3'
            style={{ top: donorWelcomeTop }}
          >
            <View className='flex-row items-center'>
              <View className='h-8 w-8 items-center justify-center rounded-full bg-[#eaf1ff]'>
                <MaterialIcons color='#1f5fe0' name='volunteer-activism' size={18} />
              </View>
              <View className='ml-3 flex-1'>
                <Text className='text-sm font-bold text-[#16325d]'>Bienvenido Donante</Text>
                <Text className='text-xs text-[#5b7190]'>Apoya campanas activas desde el mapa y sigue tus aportes.</Text>
              </View>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View className='absolute left-0 right-0 items-center' style={{ top: isDonor && showDonorWelcome ? 86 : 12 }}>
            <View className='rounded-full bg-white px-4 py-2'>
              <ActivityIndicator color='#1f5fe0' size='small' />
            </View>
          </View>
        ) : null}

        {error ? (
          <View className='absolute left-3 right-3 rounded-xl bg-[#ffecef] px-3 py-2' style={{ top: isDonor && showDonorWelcome ? 86 : 12 }}>
            <Text className='text-sm text-[#a1263d]'>{error}</Text>
          </View>
        ) : null}

        {locationError ? (
          <View className='absolute left-3 right-3 rounded-xl bg-[#fff4e6] px-3 py-2' style={{ top: isDonor && showDonorWelcome ? 132 : 64 }}>
            <Text className='text-sm text-[#9a6400]'>{locationError}</Text>
          </View>
        ) : null}

        <View className='absolute right-4' style={{ top: controlsTop }}>
          <Pressable
            className='flex-row items-center gap-2 rounded-2xl bg-[#1f5fe0] px-4 py-2.5'
            disabled={!myLocation}
            onPress={centerOnMyLocation}
            style={{
              opacity: myLocation ? 1 : 0.65,
              shadowColor: '#0b327f',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.24,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <View className='h-6 w-6 items-center justify-center rounded-full bg-[#e7efff]'>
              <FontAwesome5 color='#1f5fe0' name='crosshairs' size={11} />
            </View>
            <Text className='text-xs font-bold tracking-wide text-white'>Mi ubicacion</Text>
          </Pressable>
        </View>

        {isLocating ? (
          <View className='absolute right-4 rounded-xl bg-white px-3 py-2' style={{ top: controlsTop + 44 }}>
            <Text className='text-xs text-[#4d648a]'>Obteniendo ubicacion...</Text>
          </View>
        ) : null}
      </View>

      {isDonor ? <DonorBottomTabs activeTab='inicio' /> : null}
    </SafeAreaView>
  );
}