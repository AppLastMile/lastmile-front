import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  MOCK_USERS,
  type MockUser,
} from '@/modules/auth/constants/mockUsers';
import { useAuthSession } from '@/modules/auth/context/AuthSessionContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RoleCard({
  user,
  onPress,
}: {
  user: MockUser;
  onPress: (user: MockUser) => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      className='mb-3 rounded-2xl border border-[#dce8ff] bg-white/95 p-4'
      entering={FadeInUp.duration(500)}
      layout={Layout.springify()}
      onPress={() => onPress(user)}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 180 });
      }}
      style={animatedStyle}
    >
      <View className='flex-row items-center justify-between'>
        <View className='flex-1'>
          <Text className='text-lg font-semibold text-[#14243f]'>{user.label}</Text>
          <Text className='mt-1 text-sm text-[#567]'>
            {user.email} / {user.password}
          </Text>
        </View>
        <MaterialCommunityIcons color='#2867f0' name='arrow-top-right' size={20} />
      </View>
    </AnimatedPressable>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const { currentUser, login } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(
    () => isSubmitting || !email.trim() || !password.trim(),
    [email, isSubmitting, password]
  );

  const handleMockPrefill = (user: MockUser) => {
    setEmail(user.email);
    setPassword(user.password);
    setError('');
  };

  const handleLogin = async () => {
    const matched = login(email, password);

    if (!matched) {
      setError(
        'Credenciales invalidas. Usa una de las cuentas sugeridas (organizador, donante o voluntario).'
      );
      return;
    }

    setIsSubmitting(true);
    setError('');

    setTimeout(() => {
      router.replace(matched.redirectTo as never);
      setIsSubmitting(false);
    }, 350);
  };

  useEffect(() => {
    if (currentUser) {
      router.replace(currentUser.redirectTo as never);
    }
  }, [currentUser, router]);

  if (currentUser) {
    return null;
  }

  return (
    <SafeAreaView className='flex-1 bg-[#f6f9ff]'>
      <View className='absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#c8dcff]' />
      <View className='absolute -right-24 top-32 h-72 w-72 rounded-full bg-[#ffe3bc]' />
      <View className='absolute bottom-16 left-8 h-40 w-40 rounded-full bg-[#d4ffe6]' />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className='flex-1 px-6 pb-6'
      >
        <Animated.View entering={FadeInDown.duration(550)} className='mt-8'>
          <View className='h-20 w-20 items-center justify-center rounded-3xl bg-[#1f5fe0]'>
            <FontAwesome5 color='#fff' name='hands-helping' size={32} />
          </View>
          <Text className='mt-4 text-4xl font-extrabold tracking-tight text-[#122648]'>
            LastMile
          </Text>
          <Text className='mt-2 text-base leading-6 text-[#4a5f80]'>
            Conecta organizadores, donantes y voluntarios para impactar donde mas se necesita.
          </Text>
        </Animated.View>

        <Animated.View
          className='mt-6 rounded-3xl border border-[#dfe8ff] bg-white/95 p-5'
          entering={FadeInDown.delay(100).duration(550)}
        >
          <Text className='text-sm font-semibold uppercase tracking-wide text-[#4f6487]'>
            Iniciar Sesion
          </Text>

          <Text className='mt-4 mb-2 text-sm font-medium text-[#2d4468]'>Correo</Text>
          <TextInput
            autoCapitalize='none'
            className='rounded-xl border border-[#cad8f6] bg-[#f9fbff] px-4 py-3 text-[15px] text-[#13274a]'
            onChangeText={setEmail}
            placeholder='correo@lastmile.com'
            placeholderTextColor='#88a0c6'
            value={email}
          />

          <Text className='mt-4 mb-2 text-sm font-medium text-[#2d4468]'>Contrasena</Text>
          <TextInput
            className='rounded-xl border border-[#cad8f6] bg-[#f9fbff] px-4 py-3 text-[15px] text-[#13274a]'
            onChangeText={setPassword}
            placeholder='******'
            placeholderTextColor='#88a0c6'
            secureTextEntry
            value={password}
          />

          {error ? (
            <Animated.View entering={FadeInUp.duration(220)} layout={Layout.springify()}>
              <Text className='mt-3 text-sm text-[#c3324d]'>{error}</Text>
            </Animated.View>
          ) : null}

          <Pressable
            className={`mt-5 rounded-2xl px-4 py-4 ${
              isDisabled ? 'bg-[#9eb8e8]' : 'bg-[#1f5fe0]'
            }`}
            disabled={isDisabled}
            onPress={handleLogin}
          >
            <Text className='text-center text-base font-semibold text-white'>
              {isSubmitting ? 'Ingresando...' : 'Entrar'}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View className='mt-5' entering={FadeInDown.delay(180).duration(550)}>
          <Text className='mb-3 text-sm font-semibold uppercase tracking-wide text-[#4f6487]'>
            Accesos Rapidos
          </Text>
          {MOCK_USERS.map((user) => (
            <RoleCard key={user.role} onPress={handleMockPrefill} user={user} />
          ))}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}