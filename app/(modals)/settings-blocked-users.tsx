import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { SettingsDetailLayout } from '@/components/settings/SettingsDetailLayout';
import { useBlockedUsers, useUnblockUser } from '@/hooks/queries/useSafety';
import { colors } from '@/constants/colors';

export default function SettingsBlockedUsersScreen() {
  const { t } = useTranslation();
  const { data: blockedUsers = [], isLoading } = useBlockedUsers();
  const unblock = useUnblockUser();

  const handleUnblock = (userId: string) => {
    unblock.mutate(userId, {
      onError: () => Alert.alert(t('common.error'), t('safety.blockedUsers.unblockError')),
    });
  };

  return (
    <SettingsDetailLayout title={t('safety.blockedUsers.title')} backLabel={t('settings.back')}>
      {isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      {!isLoading && blockedUsers.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="subtitle" weight="700">{t('safety.blockedUsers.emptyTitle')}</Text>
          <Text variant="body" style={styles.emptyBody}>{t('safety.blockedUsers.emptyBody')}</Text>
        </View>
      ) : null}
      {blockedUsers.map((user) => (
        <View key={user.id} style={styles.row}>
          <Avatar uri={user.avatarUrl} size={44} initials={user.displayName} />
          <View style={styles.userInfo}>
            <Text variant="body" weight="700">{user.displayName}</Text>
            <Text variant="caption" style={styles.username}>@{user.username}</Text>
          </View>
          <Pressable
            style={[styles.unblock, unblock.isPending && styles.disabled]}
            onPress={() => handleUnblock(user.id)}
            disabled={unblock.isPending}
            accessibilityRole="button"
            accessibilityLabel={`${t('safety.blockedUsers.unblock')} ${user.displayName}`}
          >
            <Text variant="caption" weight="700" style={styles.unblockText}>{t('safety.blockedUsers.unblock')}</Text>
          </Pressable>
        </View>
      ))}
    </SettingsDetailLayout>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 28 },
  empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 48, gap: 8 },
  emptyBody: { textAlign: 'center', color: colors.textSecondary, lineHeight: 21 },
  row: { minHeight: 70, alignItems: 'center', flexDirection: 'row', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12 },
  userInfo: { flex: 1, gap: 2 },
  username: { color: colors.textSecondary },
  unblock: { borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12, paddingVertical: 8 },
  unblockText: { color: colors.textPrimary },
  disabled: { opacity: 0.5 },
});
