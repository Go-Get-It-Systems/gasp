import { StyleSheet, View, Pressable, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { Send, RotateCcw, Download, Trash2 } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ReactionComposite, REACTION_WATERMARK } from '@/components/gasp/ReactionComposite';
import { useTranslation } from 'react-i18next';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACTION_SIZE = 28;
const TOUCH_SIZE = 48;
const VISUAL_GAP = 32;

interface ReactionPreviewProps {
  originalImageUri: string;
  originalMediaType?: 'image' | 'video';
  reactionVideoUri: string;
  senderName: string;
  onSend?: () => void;
  onDiscard?: () => void;
  onRetake?: () => void;
  onSave?: () => void;
  /** True while foreground upload or composite job is in flight after Send tap */
  isSending?: boolean;
}

export function ReactionPreview({
  originalImageUri,
  originalMediaType = 'image',
  reactionVideoUri,
  senderName,
  onSend,
  onDiscard,
  onRetake,
  onSave,
  isSending = false,
}: ReactionPreviewProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Match the watermark's center axis and keep equal visible gaps between
  // the logo, send and discard, independently of their larger touch targets.
  const actionRight = width * (REACTION_WATERMARK.right + REACTION_WATERMARK.width / 2) - TOUCH_SIZE / 2;
  const actionTop = -(height / 2) * REACTION_WATERMARK.bottom + VISUAL_GAP - (TOUCH_SIZE - ACTION_SIZE) / 2;
  const confirmDiscard = () => {
    if (isSending) return;
    Alert.alert(t('reaction.discardTitle'), t('reaction.discardMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('reaction.discard'), style: 'destructive', onPress: onDiscard },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View pointerEvents="none" entering={FadeIn.delay(50).duration(300)} style={[styles.header, { top: insets.top + 12 }]}>
          <Text variant="caption" style={styles.contextText}>{t('reaction.previewContext', { name: senderName })}</Text>
        </Animated.View>

        {/* Media fills the screen; controls overlay it without changing the split. */}
        <Animated.View
          testID="reaction-preview-frame"
          style={styles.compositeWrapper}
        >
          <ReactionComposite
            originalUri={originalImageUri}
            originalMediaType={originalMediaType}
            reactionVideoUri={reactionVideoUri}
            reactionLabel={t('reaction.you')}
            originalLabel={t('reaction.senderGasp', { name: senderName })}
            showDivider
            dividerStyle={styles.previewDivider}
            watermarkMode="subtle"
            reactionFlex={50}
            originalFlex={50}
          />
        </Animated.View>

        <View pointerEvents="box-none" style={[styles.controls, { right: actionRight, marginTop: actionTop }]}>
          {/* Buttons overlay the lower panel. */}
          <Animated.View entering={FadeInDown.delay(300).duration(250)} style={styles.actions}>
            {/* The live gasp flow omits retakes so reactions stay authentic (06/06 decision). */}
            {onRetake && (
              <Pressable
                onPress={onRetake}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={t('reaction.reRecord')}
              >
                <RotateCcw size={ACTION_SIZE} color="#FFFFFF" />
              </Pressable>
            )}
            <Pressable
              onPress={onSend}
              disabled={isSending}
              accessibilityState={{ disabled: isSending }}
              style={[styles.iconButton, isSending && styles.sendButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t('reaction.sendReaction')}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={ACTION_SIZE} color="#FFFFFF" />
              )}
            </Pressable>
            <Pressable
              onPress={confirmDiscard}
              disabled={isSending}
              accessibilityState={{ disabled: isSending }}
              style={[styles.iconButton, isSending && styles.sendButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t('reaction.discard')}
            >
              <Trash2 size={ACTION_SIZE} color="#FFFFFF" />
            </Pressable>
          </Animated.View>

          {onSave && (
            <Animated.View entering={FadeInDown.delay(400).duration(250)} style={styles.secondaryActions}>
              <Pressable onPress={onSave} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('reaction.saveToCameraRoll')}>
                <Download size={ACTION_SIZE} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: { flex: 1 },
  header: { position: 'absolute', left: 20, right: 72, zIndex: 2 },
  controls: { position: 'absolute', top: '50%', zIndex: 2 },
  contextText: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  compositeWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  previewDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    transform: [{ translateY: -0.5 }],
  },
  actions: {
    flexDirection: 'column',
    gap: VISUAL_GAP + ACTION_SIZE - TOUCH_SIZE,
    alignItems: 'center',
  },
  iconButton: {
    width: TOUCH_SIZE,
    height: TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.7,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  sendButtonDisabled: { opacity: 0.82 },
  secondaryActions: { marginTop: VISUAL_GAP + ACTION_SIZE - TOUCH_SIZE, alignItems: 'center' },
});
