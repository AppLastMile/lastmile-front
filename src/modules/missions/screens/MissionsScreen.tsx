import { AppScreen } from '@/components/ui/AppScreen';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { useMissionStatus } from '../hooks/useMissionStatus';
import { getEvents, type EventSummary } from '@/services/api/eventsService';

type ListItem =
  | { type: 'title'; title: string }
  | { type: 'available'; data: EventSummary }
  | { type: 'taken'; data: EventSummary };

export function MissionsScreen() {
  const router = useRouter();
  const { getStatus, updateMission } = useMissionStatus();

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await getEvents({ page: 1, limit: 100 });
        setEvents(response.data);
      } catch (e) {
        console.log('Error cargando missions', e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const available = events.filter(
    (e) => getStatus(String(e.id)) === 'available'
  );

  const taken = events.filter(
    (e) => getStatus(String(e.id)) === 'taken'
  );

  const deliverMission = (id: string) => {
    updateMission(id, 'delivered');
  };

  // 🔥 UNIFICAMOS TODO EN UNA LISTA
  const listData: ListItem[] = [
    { type: 'title', title: 'Misiones disponibles' },
    ...available.map((e) => ({ type: 'available' as const, data: e })),
    { type: 'title', title: 'Misiones aceptadas' },
    ...taken.map((e) => ({ type: 'taken' as const, data: e })),
  ];

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'title') {
      return (
        <Text
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          {item.title}
        </Text>
      );
    }

    if (item.type === 'available') {
      return (
        <Pressable
          onPress={() => router.push(`/missions/${item.data.id}`)}
          style={{
            backgroundColor: '#fff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontWeight: 'bold' }}>{item.data.name}</Text>
          <Text style={{ color: 'gray' }}>📍 {item.data.city}</Text>
        </Pressable>
      );
    }

    if (item.type === 'taken') {
      return (
        <View
          style={{
            backgroundColor: '#e0f2fe',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontWeight: 'bold' }}>{item.data.name}</Text>
          <Text style={{ color: 'gray' }}>📍 {item.data.city}</Text>

          <Pressable
            onPress={() => deliverMission(String(item.data.id))}
            style={{
              marginTop: 10,
              backgroundColor: '#16a34a',
              padding: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff' }}>Confirmar entrega</Text>
          </Pressable>
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <AppScreen>
        <ActivityIndicator />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <FlatList
        data={listData}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </AppScreen>
  );
}