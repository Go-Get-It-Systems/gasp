import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { useAuthStore } from '@/stores/authStore';

export default function TabLayout() {
  const isBusiness = useAuthStore((state) => state.user?.accountType === 'business');
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
        options={{ title: 'Chat', href: isBusiness ? null : undefined }}
      />
      <Tabs.Screen
        name="business"
        options={{ href: null }}
      />
      <Tabs.Protected guard={isBusiness}>
        <Tabs.Screen name="studio" options={{ title: 'Studio' }} />
      </Tabs.Protected>
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile' }}
      />
    </Tabs>
  );
}
