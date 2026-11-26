import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function BusinessLayout() {
  const isBusiness = useAuthStore((state) => state.user?.accountType === 'business');
  if (!isBusiness) return <Redirect href="/(tabs)/profile" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
