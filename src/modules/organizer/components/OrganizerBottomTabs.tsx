import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OrganizerTab = 'inicio' | 'campanas' | 'logistica';

type OrganizerBottomTabsProps = {
  activeTab: OrganizerTab;
};

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
      icon: 'map-marked-alt',
      route: '/organizer/create-mission',
    },
    {
      id: 'campanas',
      label: 'Campanas',
      icon: 'bullhorn',
      route: '/organizer/campaigns',
    },
    {
      id: 'logistica',
      label: 'Logistica',
      icon: 'truck',
      route: '/organizer/logistics',
    },
  ];

  return (
    <View
      className='absolute left-0 right-0 z-50 border-t border-[#d7e5ff] bg-white'
      style={{ bottom: 0, paddingBottom: insets.bottom + 8, paddingTop: 6 }}
    >
      <View className='flex-row items-end justify-around'>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <Pressable
              className='items-center justify-center px-3 pt-1'
              key={tab.id}
              onPress={() => router.push(tab.route as never)}
            >
              <View
                className={`mb-1 h-1.5 w-10 rounded-full ${
                  isActive ? 'bg-[#1f5fe0]' : 'bg-transparent'
                }`}
              />
              <FontAwesome5
                color={isActive ? '#10294f' : '#6c7f9d'}
                name={tab.icon}
                size={16}
              />
              <Text className={`mt-1 text-xs ${isActive ? 'font-bold text-[#10294f]' : 'text-[#6c7f9d]'}`}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
