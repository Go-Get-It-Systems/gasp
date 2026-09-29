import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/components/navigation/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="camera"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ title: 'Discover' }}
      />
      <Tabs.Screen
        name="camera"
        options={{ title: 'Camera' }}
      />
      <Tabs.Screen
        name="inbox"
        options={{ title: 'Gasps' }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat' }}
      />
      <Tabs.Screen
        name="studio"
        options={{ title: 'Studio' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile' }}
      />
    </Tabs>
  );
}
