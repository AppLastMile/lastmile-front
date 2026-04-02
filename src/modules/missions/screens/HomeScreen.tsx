import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import {
  type EventSummary,
  getEvents,
  getMyJoinedEvents,
  joinEvent,
  leaveEvent,
} from '@/services/api/eventsService';
import {
  forgetJoinedEvent,
  rememberJoinedEvent,
  rememberJoinedEvents,
} from '@/services/state/joinedEventsMemory';

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Error desconocido.';
  }

  const rawMessage = error.message?.trim();

  if (!rawMessage) {
    return 'Error desconocido.';
  }

  try {
    const parsed = JSON.parse(rawMessage) as { message?: string | string[] };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(' | ');
    }

    if (typeof parsed.message === 'string') {
      return parsed.message;
    }

    return rawMessage;
  } catch {
    return rawMessage;
  }
}

function getHttpStatusCode(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = /Unexpected API error \((\d+)\)/.exec(error.message);
  return match ? Number(match[1]) : null;
}

function isAlreadySupportingError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const rawMessage = error.message?.toLowerCase() ?? '';

  return (
    rawMessage.includes('ya estás apoyando este evento') ||
    rawMessage.includes('ya apoyas este evento') ||
    rawMessage.includes('already supporting')
  );
}

export function HomeScreen() {
  const { currentUser, logout } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [joinedEventIds, setJoinedEventIds] = useState<number[]>([]);
  const [pendingEventId, setPendingEventId] = useState<number | null>(null);

  const loadEvents = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [eventsResponse, joinedResponse] = await Promise.all([
        getEvents({ page: 1, limit: 10 }),
        getMyJoinedEvents(currentUser.accessToken),
      ]);

      const joinedIds = joinedResponse.map((eventItem) => eventItem.id);
      const joinedEvents = eventsResponse.data.filter((eventItem) => joinedIds.includes(eventItem.id));

      setJoinedEventIds(joinedIds);
      rememberJoinedEvents(joinedEvents);
      setFeedback(null);
      setEvents(eventsResponse.data);
    } catch (error_) {
      const status = getHttpStatusCode(error_);

      if (status === 401) {
        logout();
        setError('Tu sesión expiró. Inicia sesión nuevamente.');
      } else {
        setError('No fue posible cargar eventos. Revisa la conexión con backend.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, logout]);

  const handleToggleSupport = async (eventId: number) => {
    if (!currentUser) {
      return;
    }

    const alreadyJoined = joinedEventIds.includes(eventId);
    setPendingEventId(eventId);
    setFeedback(null);

    try {
      if (alreadyJoined) {
        await leaveEvent(eventId, currentUser.accessToken);
        setJoinedEventIds((prev) => prev.filter((id) => id !== eventId));
        forgetJoinedEvent(eventId);
        setFeedback('Dejaste de apoyar este evento.');
      } else {
        await joinEvent(eventId, currentUser.accessToken);
        setJoinedEventIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]));
        const joinedEvent = events.find((eventItem) => eventItem.id === eventId);

        if (joinedEvent) {
          rememberJoinedEvent(joinedEvent);
        }

        setFeedback('Ahora estás apoyando este evento.');
      }
    } catch (error_) {
      const status = getHttpStatusCode(error_);

      if (!alreadyJoined && (status === 409 || isAlreadySupportingError(error_))) {
        setJoinedEventIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]));
        const joinedEvent = events.find((eventItem) => eventItem.id === eventId);

        if (joinedEvent) {
          rememberJoinedEvent(joinedEvent);
        }

        setFeedback('Ya apoyas este evento.');
      } else if (alreadyJoined && status === 404) {
        setJoinedEventIds((prev) => prev.filter((id) => id !== eventId));
        forgetJoinedEvent(eventId);
        setFeedback('Ya no estabas apoyando este evento.');
      } else if (status === 401) {
        logout();
        setError('Tu sesión expiró. Inicia sesión nuevamente.');
      } else {
        setError(`No fue posible actualizar el apoyo. ${getErrorMessage(error_)}`);
      }
    } finally {
      setPendingEventId(null);
    }
  };

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

        {feedback ? (
          <Text className='mt-3 rounded-xl bg-[#e8f7ec] px-3 py-2 text-sm text-[#166534]'>
            {feedback}
          </Text>
        ) : null}

        {!isLoading && !error ? (
          <View className='mt-4 gap-2'>
            {events.length === 0 ? (
              <Text className='text-sm text-[#5b7190]'>Aun no hay eventos registrados.</Text>
            ) : (
              events.map((eventItem) => {
                const isJoined = joinedEventIds.includes(eventItem.id);
                const isPending = pendingEventId === eventItem.id;
                let buttonLabel = 'Apoyar evento';

                if (isPending) {
                  buttonLabel = 'Procesando...';
                } else if (isJoined) {
                  buttonLabel = 'Dejar de apoyar';
                }

                return (
                  <View
                    className='rounded-xl border border-[#e1ebff] bg-[#f8fbff] px-3 py-3'
                    key={eventItem.id}
                  >
                    <Text className='text-base font-bold text-[#173761]'>{eventItem.name}</Text>
                    <Text className='mt-1 text-sm text-[#486387]'>
                      {eventItem.city} · {eventItem.disasterType}
                    </Text>
                    <Pressable
                      className={`mt-3 rounded-lg px-3 py-2 ${isJoined ? 'bg-[#e8f7ec]' : 'bg-[#1f5fe0]'}`}
                      disabled={isPending}
                      onPress={() => handleToggleSupport(eventItem.id)}
                    >
                      <Text className={`text-center text-sm font-semibold ${isJoined ? 'text-[#166534]' : 'text-white'}`}>
                        {buttonLabel}
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}