/**
 * Campaign Reaction Full-Screen Viewer
 *
 * Mirrors ReactionPlaybackModal exactly:
 *   - Frame: width 94%, height SCREEN_WIDTH * 1.54, maxHeight 82%
 *   - ReactionComposite inside the frame (45 / 55 flex split)
 *   - External label overlay with matching flex split
 *   - Close button top-right
 *
 * If campaignMediaUri is missing, fetches campaign list by handle and
 * finds the matching campaign by campaignId to get the mediaUrl.
 */
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReactionComposite } from '@/components/gasp/ReactionComposite';
import { Text } from '@/components/ui/Text';
import { getCampaignsByHandle } from '@/services/api/business';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_HEIGHT = SCREEN_WIDTH * 1.54;
const REACTION_FLEX = 45;
const ORIGINAL_FLEX = 55;

export default function CampaignReactionFullScreen() {
  const insets = useSafeAreaInsets();

  const {
    reactionVideoUri,
    campaignMediaUri,
    isVideo,
    reactorName,
    campaignTitle,
    handle,
    campaignId,
  } = useLocalSearchParams<{
    reactionVideoUri: string;
    campaignMediaUri?: string;
    isVideo?: string;
    reactorName?: string;
    campaignTitle?: string;
    handle?: string;
    campaignId?: string;
  }>();

  // If campaignMediaUri is missing but we have handle + campaignId, fetch it
  const needsFetch = !campaignMediaUri && !!handle && !!campaignId;
  const { data: campaigns, isLoading: loadingCampaign } = useQuery({
    queryKey: ['campaigns-by-handle', handle],
    queryFn: () => getCampaignsByHandle(handle!),
    enabled: needsFetch,
    staleTime: 60_000,
  });

  const resolvedMediaUri = campaignMediaUri ||
    campaigns?.find((c) => c.id === campaignId)?.mediaUrl ||
    '';

  const resolvedMediaType: 'image' | 'video' = (() => {
    // Use isVideo param if provided, otherwise infer from resolved URL
    if (isVideo === 'true') return 'video';
    if (isVideo === 'false') return 'image';
    const url = (resolvedMediaUri ?? '').toLowerCase();
    return (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('video'))
      ? 'video'
      : 'image';
  })();

  const hasComposite = !!(reactionVideoUri && resolvedMediaUri);
  const isLoading = needsFetch && loadingCampaign;

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 54, paddingBottom: insets.bottom + 34 }]}>

        {/* Top context strip — reactor info */}
        <View style={styles.topContext}>
          <View style={styles.avatarInitial}>
            <Text style={styles.avatarText}>
              {(reactorName ?? '?').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.topContextText} numberOfLines={1}>
            ⚡ {reactorName ?? 'Reaction'}
          </Text>
        </View>

        {/* Split-screen frame */}
        <View style={[styles.frame, !hasComposite && styles.singleFrame]}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : (
            <>
              {hasComposite && (
                <>
                  <LinearGradient
                    pointerEvents="none"
                    colors={['rgba(0,0,0,0.70)', 'rgba(0,0,0,0)']}
                    style={styles.labelScrim}
                  />
                  <View pointerEvents="none" style={styles.stageLabels}>
                    <View style={styles.reactionLabelSlot}>
                      <Text style={styles.stageLabelText} numberOfLines={1}>
                        {reactorName ?? 'Reaction'}
                      </Text>
                    </View>
                    <View style={styles.campaignLabelSlot}>
                      <Text style={styles.stageLabelText} numberOfLines={1}>
                        {campaignTitle ?? 'Campaign'}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {hasComposite ? (
                <ReactionComposite
                  originalUri={resolvedMediaUri}
                  originalMediaType={resolvedMediaType}
                  reactionVideoUri={reactionVideoUri}
                  showDivider
                  watermarkMode="subtle"
                  reactionFlex={REACTION_FLEX}
                  originalFlex={ORIGINAL_FLEX}
                />
              ) : reactionVideoUri ? (
                // Fallback — reaction only
                <ReactionComposite
                  originalUri=""
                  reactionVideoUri={reactionVideoUri}
                  showDivider={false}
                  watermarkMode="hidden"
                  reactionFlex={100}
                  originalFlex={0}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No reaction video available.</Text>
                </View>
              )}
            </>
          )}
        </View>

        {campaignTitle && (
          <Text style={styles.campaignSubtitle} numberOfLines={1}>
            {campaignTitle}
          </Text>
        )}
      </View>

      {/* Close button */}
      <Pressable
        onPress={() => router.dismiss()}
        style={[styles.closeButton, { top: insets.top + 12 }]}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <X size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topContext: {
    width: '94%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingRight: 58,
  },
  avatarInitial: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  topContextText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  frame: {
    width: '94%',
    height: FRAME_HEIGHT,
    maxHeight: '82%',
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: '#000',
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  singleFrame: {
    width: '82%',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 76,
    zIndex: 4,
  },
  stageLabels: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    zIndex: 5,
    flexDirection: 'row',
  },
  reactionLabelSlot: {
    flex: REACTION_FLEX,
    paddingRight: 10,
  },
  campaignLabelSlot: {
    flex: ORIGINAL_FLEX,
    paddingLeft: 10,
  },
  stageLabelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  campaignSubtitle: {
    width: '94%',
    alignSelf: 'center',
    marginTop: 12,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
