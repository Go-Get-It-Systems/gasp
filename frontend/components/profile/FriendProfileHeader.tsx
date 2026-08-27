import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import { GradientCircle } from '@/components/ui/GradientCircle';
import { colors } from '@/constants/colors';

interface FriendProfileHeaderProps {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  gaspScore?: number;
}

export function FriendProfileHeader({ displayName, username, avatarUrl, gaspScore }: FriendProfileHeaderProps) {
  const AVATAR_SIZE = 88;

  return (
    <View style={styles.container}>
      <GradientCircle size={100}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }} contentFit="cover" />
        ) : (
          <View style={[styles.avatarPlaceholder, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
            <Text variant="title" style={styles.avatarInitial}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </GradientCircle>

      <Text variant="title" style={styles.name}>{displayName}</Text>
      <Text variant="caption" style={styles.username}>@{username}</Text>

      {gaspScore !== undefined && gaspScore > 0 && (
        <View style={styles.scoreBadge}>
          <Text variant="caption" style={styles.scoreText}>🔥 GASP Score: {gaspScore}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scoreBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderCurve: 'continuous',
    marginTop: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A855F7',
  },
});
