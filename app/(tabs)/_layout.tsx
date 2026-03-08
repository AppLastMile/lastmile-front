import { FontAwesome5 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#177240',
      }}
    >
      <Tabs.Screen
        name='home'
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 color={color} name='home' size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name='missions'
        options={{
          title: 'Missions',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 color={color} name='tasks' size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name='map'
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 color={color} name='map-marked-alt' size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 color={color} name='user' size={size} />
          ),
        }}
      />
    </Tabs>
  );
}