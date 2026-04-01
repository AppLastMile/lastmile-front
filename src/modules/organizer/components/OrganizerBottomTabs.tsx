import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OrganizerTab = 'inicio' | 'campanas' | 'subastas' | 'logistica' | 'perfil';

type OrganizerBottomTabsProps = Readonly<{
  activeTab: OrganizerTab;
}>;

type OrganizerTabButtonProps = Readonly<{
  id: OrganizerTab;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome5>['name'];
  route: string;
  isActive: boolean;
  onPress: (route: string) => void;
}>;

function OrganizerTabButton({
  id,
  label,
  icon,
  route,
  isActive,
  onPress,
}: OrganizerTabButtonProps) {
  const scale = useRef(new Animated.Value(isActive ? 1 : 0.94)).current;
  const translateY = useRef(new Animated.Value(isActive ? -1 : 0)).current;
  const dotOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isActive ? 1 : 0.94,
        tension: 220,
        friction: 18,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: isActive ? -1 : 0,
        tension: 220,
        friction: 18,
        useNativeDriver: true,
      }),
      Animated.timing(dotOpacity, {
        toValue: isActive ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dotOpacity, isActive, scale, translateY]);

  return (
    <Pressable
      className='flex-1 items-center justify-center py-2'
      key={id}
      onPress={() => onPress(route)}
    >
      <Animated.View
        style={{
          transform: [{ scale }, { translateY }],
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <View
          className='rounded-full px-3 py-1'
          style={{ backgroundColor: isActive ? 'rgba(10, 132, 255, 0.14)' : 'transparent' }}
        >
          <View className='h-5 w-5 items-center justify-center'>
            <FontAwesome5 color={isActive ? '#0a84ff' : '#8e8e93'} name={icon} size={16} />
          </View>
        </View>
        <Text className={`mt-1 text-xs font-semibold ${isActive ? 'text-[#0a84ff]' : 'text-[#8e8e93]'}`}>
          {label}
        </Text>
        <Animated.View
          className='mt-1 h-1 w-7 rounded-full bg-[#0a84ff]'
          style={{ opacity: dotOpacity }}
        />
      </Animated.View>
    </Pressable>
  );
}

export function OrganizerBottomTabs({ activeTab }: OrganizerBottomTabsProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabs: Array<{
    id: OrganizerTab;
    label: string;
    icon: React.ComponentProps<typeof FontAwesome5>['name'];
    route: string;
  }> = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: 'home',
      route: '/organizer/create-mission',
    },
    {
      id: 'campanas',
      label: 'Campanas',
      icon: 'bullhorn',
      route: '/organizer/campaigns',
    },
    {
      id: 'subastas',
      label: 'Subastas',
      icon: 'gavel',
      route: '/organizer/auctions',
    },
    {
      id: 'logistica',
      label: 'Logistica',
      icon: 'truck',
      route: '/organizer/logistics',
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: 'user',
      route: '/organizer/profile',
    },
  ];

  return (
    <View
      className='absolute left-0 right-0 z-50'
      style={{ bottom: Math.max(insets.bottom - 6, 6) }}
    >
      <View
        className='mx-3 flex-row items-center justify-around rounded-[28px] bg-[#fbfbfd] px-2 py-1'
        style={{
          minHeight: 72,
          shadowColor: '#0b1324',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 12 },
          shadowRadius: 24,
          elevation: 0,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <OrganizerTabButton
              key={tab.id}
              icon={tab.icon}
              id={tab.id}
              isActive={isActive}
              label={tab.label}
              onPress={(route) => router.push(route as never)}
              route={tab.route}
            />
          );
        })}
      </View>
    </View>
  );
}
