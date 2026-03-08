import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { type EventSummary, getEvents } from '@/services/api/eventsService';

export function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getEvents({ page: 1, limit: 10 });
      setEvents(response.data);
    } catch {
      setError('No fue posible cargar eventos. Revisa la conexion con backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <AppScreen>
      <View className='rounded-2xl border border-[#d8e7ff] bg-white p-5'>
        <Text className='text-2xl font-extrabold text-[#15325c]'>Inicio</Text>
        <Text className='mt-2 text-sm text-[#526887]'>
          Resumen de eventos activos registrados en el backend.
        </Text>

        <Pressable
          className='mt-4 self-start rounded-xl bg-[#1f5fe0] px-4 py-2 active:opacity-90'
          onPress={loadEvents}
        >
          <Text className='font-semibold text-white'>Actualizar</Text>
        </Pressable>

        {isLoading ? (
          <View className='mt-4 flex-row items-center'>
            <ActivityIndicator color='#1f5fe0' size='small' />
            <Text className='ml-2 text-sm text-[#4d648a]'>Cargando eventos...</Text>
          </View>
        ) : null}

        {error ? (
          <Text className='mt-4 rounded-xl bg-[#ffecef] px-3 py-2 text-sm text-[#a1263d]'>
            {error}
          </Text>
        ) : null}

        {!isLoading && !error ? (
          <View className='mt-4 gap-2'>
            {events.length === 0 ? (
              <Text className='text-sm text-[#5b7190]'>Aun no hay eventos registrados.</Text>
            ) : (
              events.map((eventItem) => (
                <View
                  className='rounded-xl border border-[#e1ebff] bg-[#f8fbff] px-3 py-3'
                  key={eventItem.id}
                >
                  <Text className='text-base font-bold text-[#173761]'>{eventItem.name}</Text>
                  <Text className='mt-1 text-sm text-[#486387]'>
                    {eventItem.city} · {eventItem.disasterType}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}