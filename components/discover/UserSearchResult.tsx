import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { followBusinessByHandle, getFollowStatusByHandle, unfollowBusinessByHandle } from '@/services/api/business';
import { openProfile } from '@/services/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, Clock, UserCheck, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

export type RequestStatus = 'none' | 'sending' | 'sent' | 'already_friends';

interface UserSearchResultProps {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  accountType?: 'personal' | 'business';
  status: RequestStatus;
  onAdd: (id: string) => Promise<void>;
}

export function UserSearchResult({
  id,
  displayName,
  username,
  avatarUrl,
  accountType = 'personal',
  status,
  onAdd,
}: UserSearchResultProps) {
  const isBusiness = accountType === 'business';
  const [localStatus, setLocalStatus] = useState(status);

  // Fetch real follow status from server for business accounts
  const { data: followData } = useQuery({
    queryKey: ['business-follow-status', username],
    queryFn: () => getFollowStatusByHandle(username),
    enabled: isBusiness,
    staleTime: 30_000,
  });
  const [localFollowing, setLocalFollowing] = useState<boolean | null>(null);
  const isFollowing = localFollowing ?? followData?.isFollowing ?? false;

  const [followProcessing, setFollowProcessing] = useState(false);

  const handleAdd = async () => {
    if (localStatus !== 'none') return;
    setLocalStatus('sending');
    try {
      await onAdd(id);
      setLocalStatus('sent');
    } catch {
      setLocalStatus('none');
    }
  };

  const handleFollow = async () => {
    if (followProcessing) return;
    setFollowProcessing(true);
    try {
      if (isFollowing) {
        await unfollowBusinessByHandle(username);
        setLocalFollowing(false);
      } else {
        await followBusinessByHandle(username);
        setLocalFollowing(true);
      }
    } catch (e) {
      console.error('[UserSearchResult follow]', e);
    } finally {
      setFollowProcessing(false);
    }
  };

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Pressable
      style={styles.container}
      onPress={() => openProfile({ userId: id, displayName, avatarUrl, accountType, username })}
      accessibilityLabel={`View ${displayName}'s profile`}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.info}>
        <Text variant="body" style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text variant="caption" style={styles.username} numberOfLines={1}>
          @{username}
        </Text>
      </View>

      {/* ── Business account: Follow / Following ── */}
      {isBusiness && (
        followProcessing ? (
          <View style={styles.statusButton}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : isFollowing ? (
          <Pressable
            style={[styles.statusButton, styles.followingButton]}
            onPress={handleFollow}
            accessibilityRole="button"
            accessibilityLabel={`Unfollow ${displayName}`}
          >
            <UserCheck size={16} color={colors.textPrimary} />
            <Text variant="caption" style={styles.followingText}>Following</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.addButton}
            onPress={handleFollow}
            accessibilityRole="button"
            accessibilityLabel={`Follow ${displayName}`}
          >
            <UserPlus size={18} color="#FFFFFF" />
            <Text variant="caption" style={styles.addText}>Follow</Text>
          </Pressable>
        )
      )}

      {/* ── Personal account: Add / Sending / Sent / Friends ── */}
      {!isBusiness && (
        <>
          {localStatus === 'none' && (
            <Pressable style={styles.addButton} onPress={handleAdd} accessibilityRole="button" accessibilityLabel={`Add ${displayName}`}>
              <UserPlus size={18} color="#FFFFFF" />
              <Text variant="caption" style={styles.addText}>Add</Text>
            </Pressable>
          )}
          {localStatus === 'sending' && (
            <View style={styles.statusButton}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          {localStatus === 'sent' && (
            <View style={[styles.statusButton, styles.sentButton]}>
              <Clock size={16} color={colors.textSecondary} />
              <Text variant="caption" style={styles.sentText}>Sent</Text>
            </View>
          )}
          {localStatus === 'already_friends' && (
            <View style={[styles.statusButton, styles.friendsButton]}>
              <Check size={16} color={colors.success} />
              <Text variant="caption" style={styles.friendsText}>Friends</Text>
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  username: { fontSize: 13, color: colors.textSecondary },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  addText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  followingButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followingText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  sentButton: { backgroundColor: colors.surface },
  sentText: { fontSize: 13, color: colors.textSecondary },
  friendsButton: { backgroundColor: colors.surface },
  friendsText: { fontSize: 13, color: colors.success },
});
