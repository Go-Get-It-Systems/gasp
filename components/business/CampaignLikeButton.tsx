import { ActivityIndicator, Pressable, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { useCampaignLikes } from '@/hooks/queries/useCampaignLikes';
import { useBusinessActor } from '@/hooks/queries/useBusiness';
import { getSessionGeneration } from '@/services/session';

export function CampaignLikeButton(props: { workspaceId: string; campaignId: string }) {
  const actor = useBusinessActor();
  if (!actor) return null;
  return <CampaignLikeControl key={`${actor}:${getSessionGeneration()}:${props.workspaceId}:${props.campaignId}`} {...props} />;
}

function CampaignLikeControl({ workspaceId, campaignId }: { workspaceId: string; campaignId: string }) {
  const { t } = useTranslation();
  const like = useCampaignLikes(workspaceId, campaignId);
  return <View className="gap-1">
    <View className="flex-row items-center justify-end gap-3" style={{ minHeight: 56 }}>
      {like.hasData && !like.accessDenied && <Text variant="caption" color={colors.textSecondary} accessibilityLiveRegion="polite">
        {t('business.likeCount', { count: like.count })}
      </Text>}
      <Pressable onPress={like.toggle} disabled={like.disabled} className="flex-row items-center gap-2 px-1"
        style={{ minWidth: 48, minHeight: 48, opacity: like.disabled ? 0.6 : 1 }}
        accessibilityRole="button" accessibilityLabel={t(like.liked ? 'business.unlike' : 'business.like')}
        accessibilityState={{ selected: like.liked, disabled: like.disabled, busy: like.isPending || like.isLoading }}>
        {like.isLoading ? <ActivityIndicator size="small" color={colors.textSecondary} />
          : <Heart size={20} strokeWidth={1.6} color={like.liked ? colors.likeSelected : colors.textSecondary} fill={like.liked ? colors.likeSelected : 'none'} />}
        <Text style={{ fontSize: 13 }} color={colors.textSecondary}>{t(like.liked ? 'business.liked' : 'business.like')}</Text>
      </Pressable>
    </View>
    {like.isError && <View className="items-end">
      <Text variant="caption" color={colors.error} accessibilityRole="alert">{t(like.accessDenied ? 'business.unavailable' : 'business.likeError')}</Text>
      <Pressable onPress={like.retry} accessibilityRole="button" accessibilityLabel={t('business.likeRetry')}
        style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text variant="caption" color={colors.textPrimary}>{t('business.likeRetry')}</Text>
      </Pressable>
    </View>}
  </View>;
}
