import { useLocalSearchParams } from 'expo-router';
import { BusinessPublicProfileScreen } from '@/components/business/BusinessPublicProfileScreen';
import { useAuthStore } from '@/stores/authStore';

export default function BusinessProfile() {
  const { handle, workspaceHandle, campaignId } = useLocalSearchParams<{ handle?: string; workspaceHandle?: string; campaignId?: string }>();
  const actor = useAuthStore((state) => state.user?.id ?? '');
  return <BusinessPublicProfileScreen key={`${actor}:${handle ?? workspaceHandle ?? ''}`} handle={(handle ?? workspaceHandle ?? '').trim()} campaignId={campaignId} />;
}
