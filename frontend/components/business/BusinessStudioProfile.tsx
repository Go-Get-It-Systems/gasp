import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { Image } from 'expo-image';
import { BadgeCheck, Megaphone } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

interface BusinessStudioProfileProps {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  isVerified: boolean;
  followerCount?: number;
  followingCount?: number;
  onCreateGasp?: () => void;
}

export function BusinessStudioProfile({
  displayName,
  handle,
  avatarUrl,
  isVerified,
  followerCount,
  followingCount,
  onCreateGasp,
}: BusinessStudioProfileProps) {
  return (
    <View style={styles.container}>
      {/* Avatar + info row */}
      <View style={styles.row}>
        {/* Avatar with purple gradient ring */}
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

        {/* Name + handle + counts */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName}
            </Text>
            {isVerified && (
              <BadgeCheck size={18} color={colors.primary} fill={colors.primary} />
            )}
          </View>

          <Text style={styles.handle}>@{handle}</Text>

          {/* Follower / following counts */}
          {(followerCount !== undefined || followingCount !== undefined) && (
            <View style={styles.countsRow}>
              {followerCount !== undefined && (
                <Text style={styles.countText}>
                  <Text style={styles.countValue}>{formatCount(followerCount)}</Text>
                  <Text style={styles.countLabel}> followers</Text>
                </Text>
              )}
              {followerCount !== undefined && followingCount !== undefined && (
                <Text style={styles.countDot}>·</Text>
              )}
              {followingCount !== undefined && (
                <Text style={styles.countText}>
                  <Text style={styles.countValue}>{formatCount(followingCount)}</Text>
                  <Text style={styles.countLabel}> following</Text>
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* New Campaign button */}
      <Pressable
        style={styles.btn}
        onPress={onCreateGasp}
        accessibilityRole="button"
        accessibilityLabel="New Campaign"
      >
        <Megaphone size={15} color="#FFFFFF" />
        <Text style={styles.btnText}>New Campaign</Text>
      </Pressable>
    </View>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

const RING_SIZE = 80;
const AVATAR_SIZE = 72;
const BADGE_SIZE = 24;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // ── Avatar ──────────────────────────────────────────────────
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarFallback: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  // ── Info ────────────────────────────────────────────────────
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  handle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  countText: {
    fontSize: 12,
  },
  countValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  countDot: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  // ── Button ─────────────────────────────────────────────────
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 42,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
