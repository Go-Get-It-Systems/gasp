import { Redirect } from 'expo-router';
import { StudioSession } from '@/components/business/StudioSession';
import { useAuthStore } from '@/stores/authStore';

export default function StudioTab() {
  const user = useAuthStore((state) => state.user);
  if (user?.accountType !== 'business') return <Redirect href="/(tabs)/profile" />;
  return <StudioSession key={user.id} />;
}
