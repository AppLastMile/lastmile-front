import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

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

export function MapScreen() {
  const { currentUser } = useAuthSession();
  const isDonor = currentUser?.role === 'donor';
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
      setError('No fue posible cargar eventos para la vista web. Verifica el backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <SafeAreaView className='flex-1 bg-[#eaf2ff]'>
      <View className='px-4 pb-3 pt-3'>
        <Text className='text-2xl font-extrabold text-[#16325d]'>Mapa de eventos</Text>
        <Text className='mt-1 text-sm text-[#4d648a]'>
          Vista web simplificada. Los marcadores nativos se muestran en Expo Go.
        </Text>

        {!isDonor ? (
          <View className='mt-3 flex-row items-center justify-between'>
            <Text className='text-sm font-semibold text-[#2a456e]'>Ciudades mapeadas: {mappedEvents.length}</Text>
            <Pressable className='rounded-xl bg-[#1f5fe0] px-4 py-2 active:opacity-90' onPress={loadEvents}>
              <Text className='font-semibold text-white'>Recargar</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View className='mt-6 items-center'>
          <ActivityIndicator color='#1f5fe0' size='small' />
        </View>
      ) : null}

      {error ? (
        <View className='mx-4 mt-3 rounded-xl bg-[#ffecef] px-3 py-2'>
          <Text className='text-sm text-[#a1263d]'>{error}</Text>
        </View>
      ) : null}

      <ScrollView className='mt-3 px-4' contentContainerStyle={{ gap: 10, paddingBottom: 110 }}>
        {mappedEvents.map(({ event, city }) => {
          const mapUrl = `https://www.openstreetmap.org/?mlat=${city.region.latitude}&mlon=${city.region.longitude}#map=12/${city.region.latitude}/${city.region.longitude}`;

          return (
            <View className='rounded-2xl border border-[#d3e2ff] bg-white p-4' key={event.id}>
              <Text className='text-base font-extrabold text-[#1b3259]'>{event.name}</Text>
              <Text className='mt-1 text-sm text-[#4d648a]'>
                {city.name} ({city.region.latitude.toFixed(4)}, {city.region.longitude.toFixed(4)})
              </Text>
              <Text className='mt-2 text-sm text-[#4d648a]' numberOfLines={3}>
                {event.description || 'Sin descripcion'}
              </Text>

              <Pressable
                className='mt-3 self-start rounded-xl bg-[#1f5fe0] px-3 py-2'
                onPress={() => Linking.openURL(mapUrl)}
              >
                <Text className='text-xs font-semibold text-white'>Abrir en OpenStreetMap</Text>
              </Pressable>
            </View>
          );
        })}

        {!isLoading && mappedEvents.length === 0 ? (
          <Text className='text-sm text-[#5d7498]'>No hay eventos con coordenadas disponibles.</Text>
        ) : null}
      </ScrollView>

      {isDonor ? <DonorBottomTabs activeTab='inicio' /> : null}
    </SafeAreaView>
  );
}
