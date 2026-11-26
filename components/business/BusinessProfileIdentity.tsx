import { View } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { BusinessWorkspace } from '@/services/api/schemas/business.schema';
import { businessProfileStyles as styles } from './businessProfileStyles';
import { CompanyAvatar } from './CompanyAvatar';

export function BusinessProfileIdentity({ workspace }: { workspace: BusinessWorkspace }) {
  const { t, i18n } = useTranslation();
  const ring = 80, avatar = 70, badge = 24;
  return <View style={styles.identityBlock}>
    <View style={[styles.avatarRing, { width: ring, height: ring, borderRadius: ring / 2 }]}>
      <View style={{ width: avatar, height: avatar, borderRadius: avatar / 2, overflow: 'hidden', backgroundColor: colors.surface }}>
        <CompanyAvatar uri={workspace.avatarUrl} name={workspace.displayName} initials={workspace.displayName.slice(0, 2).toUpperCase()}
          size={avatar} fallbackStyle={styles.avatarFallback} textStyle={styles.avatarInitials} />
      </View>
      {workspace.isVerified && <View style={[styles.verifiedBadge, { width: badge, height: badge, borderRadius: badge / 2 }]} accessibilityLabel={t('business.verified')}>
        <BadgeCheck size={13} color="#FFFFFF" fill={colors.primary} />
      </View>}
    </View>
    <View style={styles.identityInfo}>
      <View style={styles.nameRow}><Text style={styles.displayName} numberOfLines={1}>{workspace.displayName}</Text></View>
      <Text style={styles.handle}>@{workspace.handle}</Text>
      {!!workspace.bio && <Text style={styles.bio} numberOfLines={2}>{workspace.bio}</Text>}
      <View style={styles.countsRow}><Text style={styles.countText}>
        <Text style={styles.countValue}>{workspace.followerCount.toLocaleString(i18n.language)}</Text>
        <Text style={styles.countLabel}> {t('business.followers').toLowerCase()}</Text>
      </Text></View>
    </View>
  </View>;
}
