import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PrivateImage as Image } from '@/components/ui/PrivateImage';
import { Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { PublicCampaign } from '@/services/api/schemas/business.schema';
import { usePublicCampaignReactions } from '@/hooks/queries/useBusiness';
import { openPublicCampaignReaction } from '@/services/navigation';
import { BusinessQuery } from './BusinessUI';
import { businessProfileStyles as profile } from './businessProfileStyles';

/** Original six-cell featured grid, using only the public consented gallery. */
export function BusinessProfileFeatured({ workspaceId, handle, campaigns }: { workspaceId: string; handle: string; campaigns: PublicCampaign[] }) {
  const { t } = useTranslation();
  const query = usePublicCampaignReactions(workspaceId, true);
  const [width, setWidth] = useState(0);
  if (query.data?.length === 0 || (query.isLoading && !query.data)) return null;
  const cellWidth = width > 0 ? (width - 8) / 3 : undefined;
  return <View style={profile.featuredSection}>
    <Text style={profile.featuredTitle}>{t('business.featured')}</Text>
    <BusinessQuery query={query}>{(rows) => <View style={styles.grid} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {Array.from({ length: 6 }, (_, index) => {
        const reaction = rows[index];
        const campaign = campaigns.find((row) => row.id === reaction?.campaignId);
        const thumbnail = reaction?.thumbnailUrl || (campaign?.mediaType === 'image' ? campaign.mediaUrl : null);
        return <Pressable key={reaction?.id ?? `placeholder-${index}`} disabled={!reaction}
          style={[styles.cell, cellWidth ? { width: cellWidth, height: cellWidth * 1.5 } : styles.cellFallback]}
          onPress={() => { if (reaction) openPublicCampaignReaction({ handle, reaction, campaign }); }}
          accessibilityRole="button" accessibilityLabel={reaction ? t('business.viewReaction', { name: reaction.actor.displayName }) : t('business.emptyReactions')}
          accessibilityState={{ disabled: !reaction }}>
          {thumbnail && <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200}
            accessibilityRole="image" accessibilityLabel={t('business.mediaPreview')} />}
          {!!reaction && <View style={styles.playOverlay}><View style={styles.playIconBg}><Play size={12} color="#FFFFFF" fill="#FFFFFF" /></View></View>}
        </Pressable>;
      })}
    </View>}</BusinessQuery>
  </View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { borderRadius: 10, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.surfaceElevated, position: 'relative' },
  cellFallback: { flex: 1, aspectRatio: 0.8 },
  playOverlay: { position: 'absolute', bottom: 8, left: 8 },
  playIconBg: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
});
