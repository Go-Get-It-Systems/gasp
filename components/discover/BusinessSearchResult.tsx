import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { BusinessFollowButton } from '@/components/business/BusinessFollowButton';
import { CompanyAvatar } from '@/components/business/CompanyAvatar';
import { openBusinessProfile } from '@/services/navigation';
import { businessSearchStyles as styles } from './businessSearchStyles';

export function BusinessSearchResult({ displayName, username, avatarUrl }: {
  displayName: string; username: string; avatarUrl: string | null;
}) {
  const { t } = useTranslation();
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <Pressable style={styles.container} onPress={() => openBusinessProfile({ handle: username })}
    accessibilityRole="button" accessibilityLabel={t('business.openProfile', { name: displayName })}>
    <View style={styles.avatar}>
      <CompanyAvatar uri={avatarUrl} name={displayName} initials={initials} size={48} textStyle={styles.avatarText} />
    </View>
    <View style={styles.info}>
      <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
      <Text style={styles.username} numberOfLines={1}>@{username}</Text>
    </View>
    <BusinessFollowButton handle={username} variant="search" />
  </Pressable>;
}
