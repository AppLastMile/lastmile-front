import { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, SafeAreaView, Text, View } from 'react-native';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import {
  findColombianCityByName,
  type ColombianCity,
} from '@/modules/missions/constants/colombianCities';
import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import { DonorBottomTabs } from '@/modules/donor/components/DonorBottomTabs';
import { type EventSummary, getEvents } from '@/services/api/eventsService';

type EventWithCity = {
  event: EventSummary;
  city: ColombianCity;
};

const COLOMBIA_CENTER: [number, number] = [4.5709, -74.2973];

export function MapScreen() {
  const { currentUser } = useAuthSession();
  const isDonor = currentUser?.role === 'donor';
  const isVolunteer = currentUser?.role === 'volunteer';
  const hasWelcomeBanner = isDonor || isVolunteer;
  const [showDonorWelcome, setShowDonorWelcome] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);

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

  const mapCenter = useMemo<[number, number]>(() => {
    if (myLocation) {
      return myLocation;
    }

    if (mappedEvents.length > 0) {
      return [
        mappedEvents[0].city.region.latitude,
        mappedEvents[0].city.region.longitude,
      ];
    }

    return COLOMBIA_CENTER;
  }, [mappedEvents, myLocation]);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getEvents({ page: 1, limit: 100 });
      setEvents(response.data);
    } catch {
      setError('No fue posible cargar eventos para el mapa web.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshEventsSilently = useCallback(async () => {
    try {
      const response = await getEvents({ page: 1, limit: 100 });
      setEvents(response.data);
    } catch {
      // Keep previous markers when a background refresh fails.
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const refreshId = setInterval(() => {
      void refreshEventsSilently();
    }, 3000);

    return () => {
      clearInterval(refreshId);
    };
  }, [refreshEventsSilently]);

  useEffect(() => {
    if (!hasWelcomeBanner) {
      return;
    }

    setShowDonorWelcome(true);

    const timeoutId = setTimeout(() => {
      setShowDonorWelcome(false);
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasWelcomeBanner]);

  useEffect(() => {
    if (!navigator?.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setMyLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        // Keep map usable without location permission.
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return (
    <SafeAreaView className='flex-1 bg-[#eaf2ff]'>
      <View className='flex-1 overflow-hidden rounded-t-3xl border border-[#d3e2ff]'>
        <MapContainer center={mapCenter} style={{ height: '100%', width: '100%' }} zoom={6}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />

          {mappedEvents.map(({ event, city }) => (
            <CircleMarker
              center={[city.region.latitude, city.region.longitude]}
              key={event.id}
              pathOptions={{ color: '#e03b3b', fillColor: '#ff6b6b', fillOpacity: 0.9 }}
              radius={9}
            >
              <Popup>
                <strong>{event.name}</strong>
                <br />
                {event.description || 'Sin descripcion'}
                <br />
                {event.city}
              </Popup>
            </CircleMarker>
          ))}

          {myLocation ? (
            <CircleMarker
              center={myLocation}
              key='my-location'
              pathOptions={{ color: '#1f5fe0', fillColor: '#2a7fff', fillOpacity: 0.95 }}
              radius={8}
            >
              <Popup>Tu ubicacion actual</Popup>
            </CircleMarker>
          ) : null}
        </MapContainer>

        {hasWelcomeBanner && showDonorWelcome ? (
          <View className='absolute left-3 right-3 top-3 rounded-2xl border border-[#d0def8] bg-white px-4 py-3'>
            <View className='flex-row items-center'>
              <View className='h-8 w-8 items-center justify-center rounded-full bg-[#eaf1ff]'>
                <MaterialIcons color='#1f5fe0' name={isVolunteer ? 'group' : 'volunteer-activism'} size={18} />
              </View>
              <View className='ml-3 flex-1'>
                <Text className='text-sm font-bold text-[#16325d]'>
                  {isVolunteer ? 'Bienvenido Voluntario' : 'Bienvenido Donante'}
                </Text>
                <Text className='text-xs text-[#5b7190]'>
                  {isVolunteer
                    ? 'Consulta los eventos activos en tiempo real para ubicar donde puedes apoyar.'
                    : 'Apoya campanas activas desde el mapa y sigue tus aportes.'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View className='absolute left-0 right-0 items-center' style={{ top: hasWelcomeBanner && showDonorWelcome ? 86 : 12 }}>
            <View className='rounded-full bg-white px-4 py-2'>
              <ActivityIndicator color='#1f5fe0' size='small' />
            </View>
          </View>
        ) : null}

        {error ? (
          <View className='absolute left-3 right-3 rounded-xl bg-[#ffecef] px-3 py-2' style={{ top: hasWelcomeBanner && showDonorWelcome ? 86 : 12 }}>
            <Text className='text-sm text-[#a1263d]'>{error}</Text>
          </View>
        ) : null}
      </View>

      {isDonor ? <DonorBottomTabs activeTab='inicio' /> : null}
    </SafeAreaView>
  );
}
