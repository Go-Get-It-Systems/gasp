import { ActivityIndicator, Pressable, View } from 'react-native';
import { UserCheck, UserPlus } from 'lucide-react-native';
import { useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { openBusinessGasps } from '@/services/navigation';
import { colors } from '@/constants/colors';
import type { BusinessWorkspace } from '@/services/api/schemas/business.schema';
import { useBusinessFollowing } from '@/hooks/queries/useBusinessFollowing';
import { businessDiscoverCardStyles as card } from '@/components/discover/businessDiscoverCardStyles';
import { businessSearchStyles as search } from '@/components/discover/businessSearchStyles';
import { businessProfileStyles as profile } from './businessProfileStyles';

export function BusinessFollowButton({ handle, workspace, variant = 'card' }: {
  handle: string; workspace?: BusinessWorkspace; variant?: 'card' | 'search' | 'profile';
}) {
  const { t } = useTranslation();
  const segments = useSegments();
  const follow = useBusinessFollowing(handle, workspace);
  const following = follow.workspace?.isFollowing ?? false;
  if (follow.isOwner) return variant === 'profile' ? null : <Text variant="caption">{t('business.yourBusiness')}</Text>;
  const buttonStyle = variant === 'profile' ? [profile.followBtn, following && profile.followingBtn]
    : variant === 'search' ? [search.addButton, following && search.followingButton]
      : [card.addButton, following && card.followingButton];
  const textStyle = variant === 'profile' ? [profile.followBtnText, following && profile.followingBtnText]
    : variant === 'search' ? (following ? search.followingText : search.addText)
      : (following ? card.followingText : card.addText);
  return <View style={variant === 'profile' ? [profile.followRow, { gap: 6 }]
    : variant === 'card' ? { width: '100%', gap: 6 } : { gap: 6, maxWidth: 180 }}>
    <Pressable style={buttonStyle} disabled={follow.disabled}
      onPress={(event) => { event.stopPropagation(); follow.toggle(variant === 'profile'); }}
      accessibilityRole="button" accessibilityLabel={`${t(following ? 'business.unfollow' : 'business.follow')} @${handle}`}
      accessibilityState={{ disabled: follow.disabled, busy: follow.isPending || follow.isLoading }}>
      {follow.isPending || follow.isLoading ? <ActivityIndicator size="small" color={colors.primaryLight} /> : <>
        {following ? <UserCheck size={variant === 'profile' ? 16 : 14} color={colors.textPrimary} /> : <UserPlus size={variant === 'profile' ? 16 : 14} color="#FFFFFF" />}
        <Text style={textStyle}>{t(following ? 'business.following' : 'business.follow')}</Text>
      </>}
    </Pressable>
    {!!follow.followedName && <View style={{ gap: 6 }} accessibilityLiveRegion="polite">
      <Text variant="caption" weight="600">{t('business.followSuccess', { name: follow.followedName })}</Text>
      <Text variant="caption" color={colors.textSecondary}>{t('business.followNextGasps')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('business.goToGasps')} style={{ minHeight: 44, justifyContent: 'center' }}
        onPress={(event) => { event.stopPropagation(); openBusinessGasps(segments[0] === '(modals)'); }}>
        <Text variant="caption" weight="600" color={colors.primaryLight}>{t('business.goToGasps')}</Text>
      </Pressable>
    </View>}
    {follow.isError && <Text variant="caption" accessibilityRole="alert" style={{ color: colors.error }}>{t('business.error')}</Text>}
  </View>;
}
