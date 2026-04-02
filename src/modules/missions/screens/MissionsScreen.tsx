import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppScreen } from '@/components/ui/AppScreen';
import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import { type EventSummary, getMyJoinedEvents } from '@/services/api/eventsService';
import { getRememberedJoinedEvents, rememberJoinedEvents } from '@/services/state/joinedEventsMemory';

function getHttpStatusCode(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = /Unexpected API error \((\d+)\)/.exec(error.message);
  return match ? Number(match[1]) : null;
}

export function MissionsScreen() {
  const { currentUser, logout } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<EventSummary[]>([]);

  const loadMyEvents = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getMyJoinedEvents(currentUser.accessToken);
      const remembered = getRememberedJoinedEvents();
      const byId = new Map<number, EventSummary>();

      remembered.forEach((item) => {
        byId.set(item.id, item);
      });

      response.forEach((item) => {
        byId.set(item.id, item);
      });

      const merged = Array.from(byId.values()).sort((a, b) => b.id - a.id);
      setMyEvents(merged);
      rememberJoinedEvents(merged);
    } catch (error_) {
      const status = getHttpStatusCode(error_);

      if (status === 401) {
        logout();
        setError('Tu sesión expiró. Inicia sesión nuevamente.');
      } else {
        const remembered = getRememberedJoinedEvents();

        if (remembered.length > 0) {
          setMyEvents(remembered);
          setError(null);
        } else {
          setError('No fue posible cargar tus eventos asociados.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, logout]);

  useEffect(() => {
    loadMyEvents();
  }, [loadMyEvents]);

  useFocusEffect(
    useCallback(() => {
      loadMyEvents();
    }, [loadMyEvents])
  );

  return (
    <AppScreen>
      <View className='rounded-2xl border border-[#d8e7ff] bg-white p-5'>
        <Text className='text-2xl font-extrabold text-[#15325c]'>Misiones</Text>
        <Text className='mt-2 text-sm text-[#526887]'>
          Eventos y campañas que apoyas actualmente.
        </Text>

        {isLoading ? (
          <View className='mt-4 flex-row items-center'>
            <ActivityIndicator color='#1f5fe0' size='small' />
            <Text className='ml-2 text-sm text-[#4d648a]'>Cargando tus misiones...</Text>
          </View>
        ) : null}

        {error ? (
          <Text className='mt-4 rounded-xl bg-[#ffecef] px-3 py-2 text-sm text-[#a1263d]'>
            {error}
          </Text>
        ) : null}

        {!isLoading && !error ? (
          <View className='mt-4 gap-2'>
            {myEvents.length === 0 ? (
              <Text className='text-sm text-[#5b7190]'>Aún no apoyas eventos.</Text>
            ) : (
              myEvents.map((eventItem) => (
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