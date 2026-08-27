/**
 * Public-facing business profile view.
 * Shown to consumer users when they open a profile whose accountType === 'business'.
 *
 * Rules:
 * - Only business accounts may follow a business profile.
 * - The Follow button is hidden for personal accounts and own profile.
 * - Shows follower count + following count side by side.
 */
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { Image } from 'expo-image';
import { BadgeCheck, UserCheck, UserPlus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

interface BusinessPublicProfileProps {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  isVerified: boolean;
  bio?: string | null;
  followerCount?: number;
  followingCount?: number;
  /** Whether the current viewer is already following this workspace */
  isFollowing: boolean;
  isProcessing?: boolean;
  /** Hide the Follow button — used when viewer is own profile OR a personal account */
  hideFollowButton?: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}

const RING = 96;
const AVATAR = 86;
const BADGE = 28;

export function BusinessPublicProfile({
  displayName,
  handle,
  avatarUrl,
  isVerified,
  bio,
  followerCount,
  followingCount,
  isFollowing,
  isProcessing = false,
  hideFollowButton = false,
  onFollow,
  onUnfollow,
}: BusinessPublicProfileProps) {
  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarRing}>
        <View style={styles.avatarInner}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>
                {displayName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {isVerified && (
          <View style={styles.verifiedBadge} accessibilityLabel="Verified account">
            <BadgeCheck size={16} color="#FFFFFF" fill={colors.primary} />
          </View>
        )}
      </View>

      {/* Name + handle */}
      <View style={styles.nameRow}>
        <Text style={styles.displayName}>{displayName}</Text>
        {isVerified && (
          <BadgeCheck size={18} color={colors.primary} fill={colors.primary} />
        )}
      </View>

      <Text style={styles.handle}>@{handle}</Text>

      {/* Bio */}
      {bio ? (
        <Text style={styles.bio} numberOfLines={3}>{bio}</Text>
      ) : null}

      {/* Follower / Following counts */}
      {(followerCount !== undefined || followingCount !== undefined) && (
        <View style={styles.countsRow}>
          {followerCount !== undefined && (
            <View style={styles.countItem}>
              <Text style={styles.countValue}>{followerCount.toLocaleString('en-US')}</Text>
              <Text style={styles.countLabel}>followers</Text>
            </View>
          )}
          {followerCount !== undefined && followingCount !== undefined && (
            <View style={styles.countDivider} />
          )}
          {followingCount !== undefined && (
            <View style={styles.countItem}>
              <Text style={styles.countValue}>{followingCount.toLocaleString('en-US')}</Text>
              <Text style={styles.countLabel}>following</Text>
            </View>
          )}
        </View>
      )}

      {/* Follow / Unfollow button
          Hidden when: own profile, or viewer is a personal account (only business can follow) */}
      {!hideFollowButton && (
        <Pressable
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={isFollowing ? onUnfollow : onFollow}
          disabled={isProcessing}
          accessibilityRole="button"
          accessibilityLabel={isFollowing ? 'Unfollow' : 'Follow'}
        >
          {isFollowing ? (
            <UserCheck size={16} color={colors.textPrimary} />
          ) : (
            <UserPlus size={16} color="#FFFFFF" />
          )}
          <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
    paddingTop: 8,
  },
  // ── Avatar ──────────────────────────────────────────────────────────
  avatarRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  avatarInner: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  avatarImage: {
    width: AVATAR,
    height: AVATAR,
  },
  avatarFallback: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  // ── Identity text ────────────────────────────────────────────────────────
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  handle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bio: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  // ── Follower / following counts ──────────────────────────────────────────
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 4,
  },
  countItem: {
    alignItems: 'center',
    gap: 2,
  },
  countValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  countLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  countDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  // ── Follow button ────────────────────────────────────────────────────────
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 32,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
  },
  followingBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followingBtnText: {
    color: colors.textPrimary,
  },
});
