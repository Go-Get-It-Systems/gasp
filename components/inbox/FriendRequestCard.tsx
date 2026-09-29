import { StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { openFriendProfile } from '@/services/navigation';
import type { FriendRequest } from '@/services/api/schemas/friendRequest.schema';

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (friendshipId: string) => void;
  onReject: (friendshipId: string) => void;
  isProcessing?: boolean;
}

export function FriendRequestCard({ request, onAccept, onReject, isProcessing = false }: FriendRequestCardProps) {
  const { t } = useTranslation();
  const { requester, friendshipId } = request;

  const handleCardPress = () => {
    openFriendProfile({
      userId: requester.id,
      displayName: requester.displayName,
      avatarUrl: requester.avatarUrl,
    });
  };

  return (
    <Pressable
      onPress={handleCardPress}
      style={styles.card}
      accessibilityLabel={t('friendRequest.wantsToBeYourFriend', { name: requester.displayName })}
    >
      {/* Avatar with gradient ring */}
      <View style={styles.avatarRing}>
        <LinearGradient
          colors={['#EC4899', '#7C3AED', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGradient}
        >
          <View style={styles.avatarInner}>
            {requester.avatarUrl ? (
              <Image source={{ uri: requester.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text variant="body" style={styles.avatarInitial}>
                  {requester.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Name & username */}
      <View style={styles.info}>
        <Text variant="body" style={styles.name} numberOfLines={1}>
          {requester.displayName}
        </Text>
        <Text variant="caption" style={styles.username} numberOfLines={1}>
          @{requester.username}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => onAccept(friendshipId)}
          style={styles.acceptButton}
          accessibilityLabel="Accept friend request"
          accessibilityRole="button"
          disabled={isProcessing}
        >
          <LinearGradient
            colors={['#7C3AED', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.acceptGradient}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={13} color="#FFFFFF" strokeWidth={3} />
                <Text variant="caption" style={styles.acceptText}>{t('friendRequest.accept')}</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={() => onReject(friendshipId)}
          style={styles.rejectButton}
          accessibilityLabel="Reject friend request"
          accessibilityRole="button"
          disabled={isProcessing}
        >
          <X size={13} color={colors.textSecondary} strokeWidth={2.5} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    // iOS shadow only — Android elevation causes square shadow behind borderRadius
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2.5,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  info: {
    alignItems: 'center',
    gap: 2,
    width: '100%',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  username: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    width: '100%',
  },
  acceptButton: {
    flex: 1,
    borderRadius: 14,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
  },
  acceptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderCurve: 'continuous',
  },
});
