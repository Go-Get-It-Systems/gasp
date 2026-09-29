import { StyleSheet, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import { UnreadDot } from '@/components/ui/UnreadDot';
import { Eye } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import type { FriendAction } from '@/stores/inboxStore';

interface FriendListItemProps {
  id: string;
  name: string;
  avatarUrl: string | null;
  onlineStatus: 'online' | 'offline' | 'away';
  statusText: string;
  statusEmoji: string;
  timestamp: string;
  actionType: FriendAction;
  badgeCount: number;
  thumbnailUrl: string | null;
  unreadCount?: number;
  onPress?: (id: string) => void;
}

export function FriendListItem({
  id,
  name,
  avatarUrl,
  onlineStatus,
  statusText,
  statusEmoji,
  timestamp,
  actionType,
  badgeCount,
  thumbnailUrl,
  unreadCount,
  onPress,
}: FriendListItemProps) {
  const handlePress = () => {
    onPress?.(id);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container} accessibilityLabel={`Chat with `} accessibilityRole="button">
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text variant="body" style={styles.avatarInitial}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {onlineStatus === 'online' ? (
          <View style={styles.onlineDot} />
        ) : null}
        {unreadCount !== undefined && unreadCount > 0 ? (
          <View style={styles.unreadBadge}>
            <UnreadDot count={unreadCount} size="sm" />
          </View>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text variant="body" style={[styles.name, unreadCount !== undefined && unreadCount > 0 ? styles.nameUnread : null]}>
            {name}
          </Text>
          <Text variant="caption" style={styles.timestamp}>
            {timestamp}
          </Text>
        </View>
        <Text variant="caption" style={styles.status} numberOfLines={1}>
          {statusEmoji ? ` ` : ''}
          {statusText}
        </Text>
      </View>

      {/* Action */}
      {actionType === 'thumbnail' && thumbnailUrl ? (
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        </View>
      ) : null}

      {actionType === 'badge' && badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text variant="caption" style={styles.badgeText}>
            {badgeCount.toString()}
          </Text>
        </View>
      ) : null}

      {actionType === 'eye' ? (
        <View style={styles.eyeContainer}>
          <Eye size={20} color={colors.textSecondary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  nameUnread: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  timestamp: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  status: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  thumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eyeContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
});