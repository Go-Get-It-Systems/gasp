import { StyleSheet, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { GradientCircle } from '@/components/ui/GradientCircle';
import { colors } from '@/constants/colors';
import { Pencil, Settings } from 'lucide-react-native';

interface ProfileHeaderProps {
  displayName: string;
  username: string;
  avatarUri: string | null;
  gaspScore: number;
  onSettingsPress?: () => void;
  onEditProfilePress?: () => void;
}

export function ProfileHeader({
  displayName,
  username,
  avatarUri,
  gaspScore,
  onSettingsPress,
  onEditProfilePress,
}: ProfileHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.placeholder} />
        <Text variant="title" style={styles.screenTitle}>
          {'PROFILE'}
        </Text>
        <Pressable
          onPress={onSettingsPress}
          style={styles.settingsButton}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Settings size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.heroSection}>
        <GradientCircle size={100}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text variant="title" style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </GradientCircle>

        <Text variant="title" style={styles.name}>
          {displayName}
        </Text>
        <Text variant="caption" style={styles.username}>
          {`@${username}`}
        </Text>

        <Pressable
          onPress={onEditProfilePress}
          disabled={!onEditProfilePress}
          style={styles.editProfileButton}
          accessibilityRole="button"
          accessibilityLabel={t('profile.edit.open')}
          accessibilityState={{ disabled: !onEditProfilePress }}
        >
          <Pencil size={16} color={colors.primary} />
          <Text variant="caption" weight="600" color={colors.primary}>
            {t('profile.edit.open')}
          </Text>
        </Pressable>

        <View style={styles.scoreContainer}>
          <Text variant="caption" style={styles.scoreLabel}>
            {'GASP SCORE'}
          </Text>
          <Text variant="title" style={styles.scoreValue}>
            {gaspScore.toString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const AVATAR_INNER = 88;

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholder: {
    width: 44,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    gap: 8,
  },
  avatarImage: {
    width: AVATAR_INNER,
    height: AVATAR_INNER,
    borderRadius: AVATAR_INNER / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_INNER,
    height: AVATAR_INNER,
    borderRadius: AVATAR_INNER / 2,
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    marginTop: 8,
    gap: 2,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.accentCyan,
    letterSpacing: -1,
  },
});
