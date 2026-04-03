import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';
import { DonorBottomTabs } from '@/modules/donor/components/DonorBottomTabs';
import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';

function getRoleLabel(role?: string) {
  if (role === 'organizer') {
    return 'Organizador';
  }

  if (role === 'donor') {
    return 'Donante';
  }

  if (role === 'volunteer') {
    return 'Voluntario';
  }

  return 'Sin sesion';
}

export function ProfileScreen() {
  const router = useRouter();
  const { currentUser, logout } = useAuthSession();
  const isOrganizer = currentUser?.role === 'organizer';
  const isDonor = currentUser?.role === 'donor';
  const hasBottomTabs = isOrganizer || isDonor;

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className='flex-1 bg-[#eaf2ff]'>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: hasBottomTabs ? 120 : 24 }}>
        <View className='rounded-2xl border border-[#d8e7ff] bg-white px-5 py-6'>
          <View className='flex-row items-start justify-between'>
            <View className='flex-1 pr-3'>
              <Text className='text-2xl font-extrabold text-[#15325c]'>Perfil</Text>
              <Text className='mt-2 text-sm text-[#5b7190]'>
                Bienvenido de nuevo, {getRoleLabel(currentUser?.role)}
              </Text>
            </View>
          </View>

          <View className='mt-5 rounded-2xl bg-[#f7faff] px-4 py-4'>
            <Text className='text-xs font-semibold uppercase tracking-wider text-[#6b7a93]'>Correo</Text>
            <Text className='mt-1 text-base font-semibold text-[#1d355b]'>
              {currentUser?.email ?? 'No hay usuario autenticado'}
            </Text>
          </View>

          <View className='mt-3 rounded-2xl bg-[#f7faff] px-4 py-4'>
            <Text className='text-xs font-semibold uppercase tracking-wider text-[#6b7a93]'>Rol activo</Text>
            <Text className='mt-1 text-base font-semibold text-[#1d355b]'>
              {getRoleLabel(currentUser?.role)}
            </Text>
          </View>

          <Pressable
            className='mt-6 rounded-xl bg-[#cf3a4a] px-4 py-3'
            onPress={handleLogout}
          >
            <Text className='text-center text-base font-semibold text-white'>
              Cerrar sesion
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {isOrganizer ? <OrganizerBottomTabs activeTab='perfil' /> : null}
      {isDonor ? <DonorBottomTabs activeTab='perfil' /> : null}
    </SafeAreaView>
  );
}