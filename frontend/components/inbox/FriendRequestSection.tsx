import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from './SectionHeader';
import { FriendRequestCard } from './FriendRequestCard';
import type { FriendRequest } from '@/services/api/schemas/friendRequest.schema';

interface FriendRequestSectionProps {
  requests: FriendRequest[];
  onAccept: (friendshipId: string) => void;
  onReject: (friendshipId: string) => void;
  processingId?: string | null;
}

export function FriendRequestSection({ requests, onAccept, onReject, processingId }: FriendRequestSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <SectionHeader
        icon={<UserPlus size={16} color="#F59E0B" />}
        title={t('gasps.friendRequests')}
        count={requests.length}
        badgeColor="#F59E0B"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {requests.map((request) => (
          <Animated.View
            key={request.friendshipId}
            exiting={FadeOut.duration(300)}
            layout={LinearTransition.duration(300)}
          >
            <FriendRequestCard
              request={request}
              onAccept={onAccept}
              onReject={onReject}
              isProcessing={processingId === request.friendshipId}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
});

