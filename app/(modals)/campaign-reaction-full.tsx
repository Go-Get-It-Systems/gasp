import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { ReactionPlaybackModal } from '@/components/chat/ReactionPlaybackModal';
import { useBusinessActor } from '@/hooks/queries/useBusiness';
import { getCampaignsByHandle } from '@/services/api/business';
import { queryKeys } from '@/services/queryKeys';

/** Business playback shares the approved full-screen vertical personal viewer. */
export default function CampaignReactionFullScreen() {
  const insets = useSafeAreaInsets();
  const actor = useBusinessActor();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    reactionVideoUri: string; campaignMediaUri?: string; isVideo?: string;
    reactorName?: string; campaignTitle?: string; handle?: string; campaignId?: string;
  }>();
  const needsFetch = !params.campaignMediaUri && !!params.handle && !!params.campaignId;
  const { data: campaigns, isLoading } = useQuery({
    queryKey: queryKeys.business.campaignsByHandle(actor, params.handle ?? ''),
    queryFn: () => getCampaignsByHandle(params.handle!),
    enabled: !!actor && needsFetch,
    staleTime: 60_000,
  });
  const campaign = campaigns?.find((row) => row.id === params.campaignId);
  const originalUri = params.campaignMediaUri || campaign?.mediaUrl;
  const originalMediaType = params.isVideo === 'true' ? 'video'
    : params.isVideo === 'false' ? 'image'
    : campaign?.mediaType ?? (/\.(mp4|mov|webm)(?:[?#]|$)/i.test(originalUri ?? '') ? 'video' : 'image');
  const close = () => router.back();

  if (needsFetch && isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#FFFFFF" />
        <Pressable onPress={close} accessibilityRole="button"
          accessibilityLabel={t('reaction.closeReactionView')}
          style={[styles.close, { top: insets.top + 12 }]}>
          <X size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }
  return (
    <ReactionPlaybackModal visible
      reactionUri={params.reactionVideoUri}
      originalUri={originalUri}
      originalMediaType={originalMediaType}
      reactionLabel={params.reactorName ?? t('reaction.you')}
      originalLabel={params.campaignTitle ?? campaign?.title ?? ''}
      hasCompositeMedia={!!(params.reactionVideoUri && originalUri)}
      onClose={close}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', right: 20, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
