import { Image } from 'expo-image';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OwnerCampaignReaction, PublicCampaignReaction } from '@/services/api/schemas/business.schema';
import { useReactionPin } from '@/hooks/queries/useBusinessMutations';
import { openBusinessReaction } from '@/services/navigation';
import { Text } from '@/components/ui/Text';
import { BusinessButton, BusinessError, businessStyles } from './BusinessUI';

function ReactionPin({ workspaceId, reaction }: { workspaceId: string; reaction: OwnerCampaignReaction }) {
  const { t } = useTranslation();
  const mutation = useReactionPin(workspaceId, reaction.campaignId);
  return <>
    <BusinessButton label={t(reaction.isPinned ? 'business.unfeature' : 'business.feature')}
      disabled={mutation.isPending || !reaction.consentToFeature} onPress={() => mutation.mutate({ id: reaction.id, pinned: !reaction.isPinned })} />
    {!reaction.consentToFeature && <Text style={businessStyles.muted}>{t('business.privateReaction')}</Text>}
    <BusinessError visible={mutation.isError} />
  </>;
}
export function ReactionGallery({ workspaceId, reactions, owner = false }: {
  workspaceId: string; reactions: (PublicCampaignReaction | OwnerCampaignReaction)[]; owner?: boolean;
}) {
  const { t } = useTranslation();
  return <View style={businessStyles.section}>{reactions.map((reaction) => <View key={reaction.id} style={businessStyles.card}>
    {reaction.thumbnailUrl && <Image source={{ uri: reaction.thumbnailUrl }} style={{ height: 140, borderRadius: 12 }} contentFit="cover" accessibilityRole="image" accessibilityLabel={t('business.viewReaction', { name: reaction.actor.displayName })} />}
    <View style={businessStyles.row}><Text>{reaction.actor.displayName}</Text>{reaction.isPinned && <Text>{t('business.selected')}</Text>}</View>
    <BusinessButton label={t('business.viewReaction', { name: reaction.actor.displayName })} onPress={() => openBusinessReaction({ workspaceId, campaignId: reaction.campaignId, reactionId: reaction.id, owner })} />
    {owner && 'consentToFeature' in reaction && <ReactionPin workspaceId={workspaceId} reaction={reaction} />}
  </View>)}</View>;
}
