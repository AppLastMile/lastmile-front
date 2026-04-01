import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DonorTab = 'inicio' | 'campanas' | 'subastas';

type DonorBottomTabsProps = {
  activeTab: DonorTab;
};

type DonorTabButtonProps = {
  id: DonorTab;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome5>['name'];
  route: string;
  isActive: boolean;
  onPress: (route: string) => void;
};

function DonorTabButton({ id, label, icon, route, isActive, onPress }: DonorTabButtonProps) {
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
    <Pressable className='flex-1 items-center justify-center py-2' key={id} onPress={() => onPress(route)}>
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
        <Animated.View className='mt-1 h-1 w-7 rounded-full bg-[#0a84ff]' style={{ opacity: dotOpacity }} />
      </Animated.View>
    </Pressable>
  );
}

export function DonorBottomTabs({ activeTab }: DonorBottomTabsProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabs: Array<{
    id: DonorTab;
    label: string;
    icon: React.ComponentProps<typeof FontAwesome5>['name'];
    route: string;
  }> = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: 'map-marked-alt',
      route: '/(tabs)/map',
    },
    {
      id: 'campanas',
      label: 'Campañas',
      icon: 'bullhorn',
      route: '/(tabs)/missions',
    },
    {
      id: 'subastas',
      label: 'Subastas',
      icon: 'gavel',
      route: '/auctions',
    },
  ];

  return (
    <View className='absolute left-0 right-0 z-50' style={{ bottom: Math.max(insets.bottom - 6, 6) }}>
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
        {tabs.map((tab) => (
          <DonorTabButton
            key={tab.id}
            icon={tab.icon}
            id={tab.id}
            isActive={tab.id === activeTab}
            label={tab.label}
            onPress={(route) => router.push(route as never)}
            route={tab.route}
          />
        ))}
      </View>
    </View>
  );
}
