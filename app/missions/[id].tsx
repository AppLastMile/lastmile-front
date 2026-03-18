import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const mission = {
    id: id as string,
    title: 'Entrega de alimentos',
    location: 'Bogotá - Chapinero',
    description: 'Llevar paquetes de alimentos a familias afectadas.',
  };

  const handleAccept = () => {
    router.replace({
      pathname: '/(tabs)/missions',
      params: { acceptedId: mission.id },
    });
  };

  return (
    <AppScreen>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold' }}>
          {mission.title}
        </Text>

        <Text style={{ marginTop: 8, color: 'gray' }}>
          📍 {mission.location}
        </Text>

        <Text style={{ marginTop: 16 }}>
          {mission.description}
        </Text>

        <Pressable
          onPress={handleAccept}
          style={{
            marginTop: 30,
            backgroundColor: '#2563eb',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            Aceptar misión
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}