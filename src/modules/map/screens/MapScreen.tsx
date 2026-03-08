import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from 'react-native';
import MapView, { Marker, UrlTile, type Region } from 'react-native-maps';

import {
  findColombianCityByName,
  type ColombianCity,
} from '@/modules/missions/constants/colombianCities';
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
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <SafeAreaView className='flex-1 bg-[#eaf2ff]'>
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

      <View className='flex-1 overflow-hidden rounded-t-3xl border border-[#d3e2ff]'>
        <MapView initialRegion={COLOMBIA_REGION} style={{ flex: 1 }}>
          <UrlTile
            maximumZ={19}
            urlTemplate='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            zIndex={-1}
          />

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
        </MapView>

        {isLoading ? (
          <View className='absolute left-0 right-0 top-3 items-center'>
            <View className='rounded-full bg-white px-4 py-2'>
              <ActivityIndicator color='#1f5fe0' size='small' />
            </View>
          </View>
        ) : null}

        {error ? (
          <View className='absolute left-3 right-3 top-3 rounded-xl bg-[#ffecef] px-3 py-2'>
            <Text className='text-sm text-[#a1263d]'>{error}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}