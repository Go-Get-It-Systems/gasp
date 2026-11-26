import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ReactionComposite } from '@/components/gasp/ReactionComposite';
import { InlineVideo } from '@/components/ui/InlineVideo';
import { Text } from '@/components/ui/Text';

const PLAYBACK_REACTION_FLEX = 50;
const PLAYBACK_ORIGINAL_FLEX = 50;

interface ReactionPlaybackModalProps {
  visible: boolean;
  reactionUri?: string;
  originalUri?: string;
  reactionLabel: string;
  originalLabel: string;
  hasCompositeMedia: boolean;
  isVerticalComposite?: boolean;
  onClose: () => void;
}

export function ReactionPlaybackModal({
  visible, reactionUri, originalUri, reactionLabel, originalLabel, hasCompositeMedia, onClose,
  isVerticalComposite = false,
}: ReactionPlaybackModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const topContextLabel = t('reaction.reactedBy', { name: reactionLabel });
  const isOwnReaction = reactionLabel === t('reaction.you');
  const fallbackLabel = isOwnReaction
    ? t('reaction.yourReaction')
    : t('reaction.reactionOnly', { name: reactionLabel });

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View testID="reaction-playback-modal" style={styles.container}>
        <View style={styles.content}>
          <View testID="reaction-playback-top-context" pointerEvents="none" style={[styles.topContext, { top: insets.top + 16 }]}>
            <View style={styles.avatarInitial}>
              <Text variant="caption" style={styles.avatarText}>{getInitial(reactionLabel)}</Text>
            </View>
            <Text variant="body" numberOfLines={1} style={styles.topContextText}>
              {topContextLabel}
            </Text>
          </View>

          <View
            testID="reaction-playback-frame"
            style={styles.frame}
          >
            {hasCompositeMedia && (
              <>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(0,0,0,0.70)', 'rgba(0,0,0,0)']}
                  style={styles.labelScrim}
                />
                <View pointerEvents="none" style={styles.stageLabels}>
                  <View style={[styles.gaspLabelSlot, { paddingTop: insets.top + 64 }]}>
                    <HeaderLabel label={originalLabel} />
                  </View>
                  <View style={styles.reactionLabelSlot}>
                    <HeaderLabel label={reactionLabel} />
                  </View>
                </View>
              </>
            )}

            {hasCompositeMedia && reactionUri && originalUri ? (
              <ReactionComposite
                originalUri={originalUri}
                reactionVideoUri={reactionUri}
                showDivider
                watermarkMode="subtle"
                reactionFlex={PLAYBACK_REACTION_FLEX}
                originalFlex={PLAYBACK_ORIGINAL_FLEX}
              />
            ) : reactionUri ? (
              <>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0)']}
                  style={styles.labelScrim}
                />
                <View pointerEvents="none" style={[styles.singleLabel, { top: insets.top + 64 }]}>
                  <HeaderLabel label={fallbackLabel} />
                </View>
                <InlineVideo
                  uri={reactionUri}
                  style={StyleSheet.absoluteFill}
                  contentFit={isVerticalComposite ? 'cover' : 'contain'}
                  paused={false}
                  muted={false}
                />
              </>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={onClose}
          style={[styles.closeButton, { top: insets.top + 12 }]}
          accessibilityRole="button"
          accessibilityLabel={t('reaction.closeReactionView')}
        >
          <X size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

function HeaderLabel({ label }: { label: string }) {
  return <Text variant="body" numberOfLines={1} style={styles.stageLabelText}>{label}</Text>;
}

function getInitial(label: string) {
  return label.trim().charAt(0).toUpperCase() || '?';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1 },
  topContext: {
    position: 'absolute', left: 16, right: 76, zIndex: 6, flexDirection: 'row', alignItems: 'center',
    gap: 10,
  },
  avatarInitial: {
    width: 30, height: 30, borderRadius: 15, borderCurve: 'continuous',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  avatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  topContextText: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  frame: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden', backgroundColor: '#000',
  },
  labelScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 76, zIndex: 4,
  },
  stageLabels: {
    ...StyleSheet.absoluteFillObject, zIndex: 5,
  },
  singleLabel: {
    position: 'absolute', top: 14, left: 16, right: 16, zIndex: 5,
  },
  reactionLabelSlot: { flex: PLAYBACK_REACTION_FLEX, padding: 16 },
  gaspLabelSlot: { flex: PLAYBACK_ORIGINAL_FLEX, paddingHorizontal: 16 },
  stageLabelText: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  closeButton: {
    position: 'absolute', right: 20, width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.26)',
  },
});
