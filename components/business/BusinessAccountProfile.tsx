import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { useBusinessWorkspaces } from '@/hooks/queries/useBusiness';
import { openBusinessStudio } from '@/services/navigation';
import type { User } from '@/services/api/schemas/user.schema';
import { colors } from '@/constants/colors';
import { BusinessProfileContent } from './BusinessProfileContent';
import { BusinessButton, BusinessQuery, businessStyles } from './BusinessUI';

export function BusinessAccountProfile({ user }: { user: User }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const workspaces = useBusinessWorkspaces();
  const [selected, setSelected] = useState('');
  const workspace = workspaces.data?.find((row) => row.id === selected) ?? workspaces.data?.[0];

  return <ScrollView
    style={{ flex: 1, backgroundColor: colors.background }}
    contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100, paddingHorizontal: 20, gap: 20 }}
    contentInsetAdjustmentBehavior="automatic"
    refreshControl={<RefreshControl refreshing={workspaces.isRefetching} onRefresh={() => { void workspaces.refetch(); }} tintColor={colors.primary} />}
  >
    <Text variant="title">{t('business.profile')}</Text>
    {!workspace && !workspaces.isLoading && <View style={businessStyles.card}>
      <Avatar uri={user.avatarUrl} size={72} initials={user.displayName} accessibilityLabel={user.displayName} />
      <Text variant="subtitle">{user.displayName}</Text>
      <Text style={businessStyles.muted}>@{user.username} · {t('business.businessAccount')}</Text>
      {!!user.bio && <Text>{user.bio}</Text>}
      <BusinessButton label={t('settings.account.editProfile')} onPress={() => router.push('/(modals)/edit-profile')} />
    </View>}
    <BusinessQuery query={workspaces} empty={t('business.noLinkedBusiness')}>{(rows) => <View style={businessStyles.section}>
      {rows.length > 1 && <View style={businessStyles.row}>
        {rows.map((row) => <BusinessButton key={row.id} label={row.displayName} selected={row.id === workspace?.id} onPress={() => setSelected(row.id)} />)}
      </View>}
      {workspace && <>
        <BusinessButton label={t('business.studio')} onPress={openBusinessStudio} />
        <BusinessProfileContent key={workspace.id} workspace={workspace} />
      </>}
    </View>}</BusinessQuery>
    {workspaces.data?.length === 0 && !workspaces.isError && <Text style={businessStyles.muted}>{t('business.workspaceHint')}</Text>}
  </ScrollView>;
}
