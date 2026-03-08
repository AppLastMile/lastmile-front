import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';

export function GlobalLogoutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout } = useAuthSession();

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  if (!currentUser || isAuthRoute) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <Pressable
      className='absolute right-5 top-14 z-50 flex-row items-center rounded-full bg-[#cf3a4a] px-4 py-2 shadow'
      onPress={handleLogout}
    >
      <MaterialCommunityIcons color='#fff' name='logout' size={18} />
      <Text className='ml-2 font-semibold text-white'>Salir</Text>
    </Pressable>
  );
}