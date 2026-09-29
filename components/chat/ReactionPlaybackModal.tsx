import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ReactionComposite } from '@/components/gasp/ReactionComposite';
import { InlineVideo } from '@/components/ui/InlineVideo';
import { Text } from '@/components/ui/Text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLAYBACK_FRAME_HEIGHT = SCREEN_WIDTH * 1.54;
const PLAYBACK_REACTION_FLEX = 45;
const PLAYBACK_ORIGINAL_FLEX = 55;

interface ReactionPlaybackModalProps {
  visible: boolean;
  reactionUri?: string;
  originalUri?: string;
  reactionLabel: string;
  originalLabel: string;
  hasCompositeMedia: boolean;
  onClose: () => void;
}

export function ReactionPlaybackModal({
  visible, reactionUri, originalUri, reactionLabel, originalLabel, hasCompositeMedia, onClose,
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
        <View style={[styles.content, { paddingTop: insets.top + 54, paddingBottom: insets.bottom + 34 }]}>
          <View testID="reaction-playback-top-context" style={styles.topContext}>
            <View style={styles.avatarInitial}>
              <Text variant="caption" style={styles.avatarText}>{getInitial(reactionLabel)}</Text>
            </View>
            <Text variant="body" numberOfLines={1} style={styles.topContextText}>
              {topContextLabel}
            </Text>
          </View>

          <View
            testID="reaction-playback-frame"
            style={[styles.frame, !hasCompositeMedia && styles.singleFrame]}
          >
            {hasCompositeMedia && (
              <>
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(0,0,0,0.70)', 'rgba(0,0,0,0)']}
                  style={styles.labelScrim}
                />
                <View pointerEvents="none" style={styles.stageLabels}>
                  <View style={styles.reactionLabelSlot}>
                    <HeaderLabel label={reactionLabel} />
                  </View>
                  <View style={styles.gaspLabelSlot}>
                    <HeaderLabel label={originalLabel} />
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
                <View pointerEvents="none" style={styles.singleLabel}>
                  <HeaderLabel label={fallbackLabel} />
                </View>
                <InlineVideo
                  uri={reactionUri}
                  style={StyleSheet.absoluteFill}
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
  content: { flex: 1, justifyContent: 'center' },
  topContext: {
    width: '94%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 16, paddingRight: 58,
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
    width: '94%', height: PLAYBACK_FRAME_HEIGHT, maxHeight: '82%', alignSelf: 'center',
    overflow: 'hidden', backgroundColor: '#000', borderRadius: 22, borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.20)',
  },
  singleFrame: { width: '82%' },
  labelScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 76, zIndex: 4,
  },
  stageLabels: {
    position: 'absolute', top: 14, left: 16, right: 16, zIndex: 5, flexDirection: 'row',
  },
  singleLabel: {
    position: 'absolute', top: 14, left: 16, right: 16, zIndex: 5,
  },
  reactionLabelSlot: { flex: PLAYBACK_REACTION_FLEX, paddingRight: 10 },
  gaspLabelSlot: { flex: PLAYBACK_ORIGINAL_FLEX, paddingLeft: 10 },
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
