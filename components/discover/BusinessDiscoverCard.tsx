import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { BusinessFollowButton } from '@/components/business/BusinessFollowButton';
import { CompanyAvatar } from '@/components/business/CompanyAvatar';
import type { BusinessWorkspace } from '@/services/api/schemas/business.schema';
import { openBusinessProfile } from '@/services/navigation';
import { businessDiscoverCardStyles as styles } from './businessDiscoverCardStyles';

/** Original business UserCard layout, populated from the public directory. */
export function BusinessDiscoverCard({ handle, displayName, avatarUrl, workspace, score }: {
  handle: string; displayName: string; avatarUrl: string | null; workspace?: BusinessWorkspace; score?: number;
}) {
  const { t, i18n } = useTranslation();
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <Pressable style={styles.card} onPress={() => openBusinessProfile({ handle })}
    accessibilityRole="button" accessibilityLabel={t('business.openProfile', { name: displayName })}>
    {workspace?.isVerified && <View style={[styles.badgeStrip, { backgroundColor: 'rgba(124,58,237,0.12)' }]}>
      <Text style={styles.badgeText}>{t('business.verified')}</Text>
    </View>}
    <View style={styles.avatarSection}><View style={styles.avatarRing}>
      <CompanyAvatar uri={avatarUrl} name={displayName} initials={initials} size={54}
        imageStyle={styles.avatarImage} fallbackStyle={styles.avatarPlaceholder} textStyle={styles.avatarInitial} />
    </View></View>
    <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
    <Text style={styles.username} numberOfLines={1}>@{handle}</Text>
    {(workspace || score !== undefined) && <View style={styles.scoreRow}>
      <Text style={styles.scoreValue}>{(workspace?.followerCount ?? score)?.toLocaleString(i18n.language)}</Text>
      <Text style={styles.scoreLabel}> {t(workspace ? 'business.followers' : 'business.score').toLowerCase()}</Text>
    </View>}
    <View style={styles.spacer} />
    <BusinessFollowButton handle={handle} workspace={workspace} />
  </Pressable>;
}
