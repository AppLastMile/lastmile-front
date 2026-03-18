import { AppScreen } from '@/components/ui/AppScreen';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

interface Mission {
  id: string;
  title: string;
  location: string;
  status: 'available' | 'taken' | 'delivered';
}

export function MissionsScreen() {
  const router = useRouter();
  const { acceptedId } = useLocalSearchParams();

  const [missions, setMissions] = useState<Mission[]>([
    {
      id: '1',
      title: 'Entrega de alimentos',
      location: 'Bogotá - Chapinero',
      status: 'available',
    },
    {
      id: '2',
      title: 'Recolectar donaciones',
      location: 'Bogotá - Suba',
      status: 'available',
    },
  ]);

  useEffect(() => {
    if (acceptedId) {
      setMissions((prev) =>
        prev.map((m) =>
          m.id === acceptedId
            ? { ...m, status: 'taken' }
            : m
        )
      );
    }
  }, [acceptedId]);

  //  entregar misión
  const deliverMission = (id: string) => {
    setMissions((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: 'delivered' } : m
      )
    );
  };

  const available = missions.filter((m) => m.status === 'available');
  const taken = missions.filter((m) => m.status === 'taken');

  const renderAvailable = ({ item }: { item: Mission }) => (
    <Pressable
      onPress={() => router.push(`/missions/${item.id}`)}
      style={{
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
      <Text style={{ color: 'gray' }}> {item.location}</Text>
    </Pressable>
  );

  const renderTaken = ({ item }: { item: Mission }) => (
    <View
      style={{
        backgroundColor: '#e0f2fe',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
      <Text style={{ color: 'gray' }}> {item.location}</Text>

      <Pressable
        onPress={() => deliverMission(item.id)}
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

  return (
    <AppScreen>
      <View style={{ flex: 1, padding: 16 }}>

        {/* DISPONIBLES */}
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
          Misiones disponibles
        </Text>

        <FlatList
          data={available}
          keyExtractor={(item) => item.id}
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
          keyExtractor={(item) => item.id}
          renderItem={renderTaken}
        />
      </View>
    </AppScreen>
  );
}