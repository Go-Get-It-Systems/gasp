import { Redirect } from 'expo-router';
import { BusinessAccountProfile } from '@/components/business/BusinessAccountProfile';
import { useAuthStore } from '@/stores/authStore';

export default function BusinessProfileTab() {
  const user = useAuthStore((state) => state.user);

  if (user?.accountType !== 'business') {
    return <Redirect href="/(tabs)/profile" />;
  }

  return <BusinessAccountProfile key={user.id} user={user} />;
}
