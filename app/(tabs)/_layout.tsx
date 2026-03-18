import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';

type TabIconProps = {
  focused: boolean;
  color: string;
  name: React.ComponentProps<typeof Ionicons>['name'];
};

function TabIcon({ focused, color, name }: TabIconProps) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const translateY = useRef(new Animated.Value(focused ? -1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1 : 0.9,
        tension: 220,
        friction: 18,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: focused ? -1 : 0,
        tension: 220,
        friction: 18,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scale, translateY]);

  return (
    <Animated.View
      style={{
        transform: [{ scale }, { translateY }],
      }}
    >
      <View
        style={{
          backgroundColor: focused ? 'rgba(10, 132, 255, 0.14)' : 'transparent',
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}
      >
        <Ionicons color={color} name={name} size={20} />
      </View>
    </Animated.View>
  );
}

export default function TabsLayout() {
  // 🔥 Usuario falso para desarrollo
  const fakeUser = { role: 'volunteer' };

  const isDonor = fakeUser.role === 'donor';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0a84ff',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          display: isDonor ? 'none' : 'flex',
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 74,
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 10, android: 8 }),
          borderTopWidth: 0,
          borderRadius: 28,
          backgroundColor: '#fbfbfd',
          elevation: 0,
          shadowColor: '#0b1324',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 12 },
          shadowRadius: 24,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name='home'
        options={{
          href: isDonor ? null : undefined,
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name='home' />
          ),
        }}
      />
      <Tabs.Screen
        name='missions'
        options={{
          title: isDonor ? 'Campañas' : 'Missions',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              focused={focused}
              name={isDonor ? 'megaphone' : 'reader'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='map'
        options={{
          title: isDonor ? 'Inicio' : 'Map',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name='map' />
          ),
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          href: isDonor ? null : undefined,
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name='person' />
          ),
        }}
      />
    </Tabs>
  );
}