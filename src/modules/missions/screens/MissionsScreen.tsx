import { AppScreen } from '@/components/ui/AppScreen';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { useMissionStatus } from '../hooks/useMissionStatus';
import { getEvents, type EventSummary } from '@/services/api/eventsService';

export function MissionsScreen() {
  const router = useRouter();

  const { getStatus, updateMission } = useMissionStatus();

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // cargar eventos (igual que mapa)
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

  // 🔥 separar por estado dinámico
  const available = events.filter(
    (e) => getStatus(String(e.id)) === 'available'
  );

  const taken = events.filter(
    (e) => getStatus(String(e.id)) === 'taken'
  );

  // 👉 entregar misión
  const deliverMission = (id: string) => {
    updateMission(id, 'delivered');
  };

  const renderAvailable = ({ item }: { item: EventSummary }) => (
    <Pressable
      onPress={() => router.push(`/missions/${item.id}`)}
      style={{
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
      <Text style={{ color: 'gray' }}>📍 {item.city}</Text>
    </Pressable>
  );

  const renderTaken = ({ item }: { item: EventSummary }) => (
    <View
      style={{
        backgroundColor: '#e0f2fe',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
      <Text style={{ color: 'gray' }}>📍 {item.city}</Text>

      <Pressable
        onPress={() => deliverMission(String(item.id))}
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

  if (loading) {
    return (
      <AppScreen>
        <ActivityIndicator />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={{ flex: 1, padding: 16 }}>

        {/* DISPONIBLES */}
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
          Misiones disponibles
        </Text>

        <FlatList
          data={available}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAvailable}
        />

        {/* ACEPTADAS */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          Misiones aceptadas
        </Text>

        <FlatList
          data={taken}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTaken}
        />
      </View>
    </AppScreen>
  );
}