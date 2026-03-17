import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';

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

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <AppScreen>
      <View className='rounded-2xl border border-brand-100 bg-white p-5'>
        <Text className='text-2xl font-bold text-brand-700'>Perfil</Text>
        <Text className='mt-2 text-base text-slate-700'>
          Sesion activa: {getRoleLabel(currentUser?.role)}
        </Text>
        <Text className='mt-1 text-sm text-slate-500'>
          {currentUser?.email ?? 'No hay usuario autenticado'}
        </Text>

        <Pressable
          className='mt-5 rounded-xl bg-[#cf3a4a] px-4 py-3'
          onPress={handleLogout}
        >
          <Text className='text-center text-base font-semibold text-white'>
            Cerrar sesion
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}