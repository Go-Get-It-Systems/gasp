import { StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { Send, RotateCcw, Download } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ReactionComposite } from '@/components/gasp/ReactionComposite';
import { useTranslation } from 'react-i18next';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View pointerEvents="none" entering={FadeIn.delay(50).duration(300)} style={[styles.header, { top: insets.top + 12 }]}>
          <Text variant="title" style={styles.title}>{t('reaction.yourReaction')}</Text>
          <Text variant="caption" style={styles.subtitle}>{t('reaction.reactionTo', { name: senderName })}</Text>
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

        <View pointerEvents="box-none" style={[styles.controls, { bottom: insets.bottom + 12 }]}>
          {/* Buttons overlay the lower panel. */}
          <Animated.View entering={FadeInDown.delay(300).duration(250)} style={styles.actions}>
            {/* The live gasp flow omits retakes so reactions stay authentic (06/06 decision). */}
            {onRetake && (
              <Pressable
                onPress={onRetake}
                style={styles.retakeButton}
                accessibilityRole="button"
                accessibilityLabel={t('reaction.reRecord')}
              >
                <RotateCcw size={20} color={colors.textPrimary} />
                <Text variant="body" style={styles.retakeText}>{t('reaction.reRecord')}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onSend}
              disabled={isSending}
              accessibilityState={{ disabled: isSending }}
              style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t('reaction.sendReaction')}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={20} color="#FFFFFF" />
              )}
              <Text variant="body" style={styles.sendText}>{t('reaction.sendReaction')}</Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(250)} style={styles.secondaryActions}>
            {onSave && (
              <Pressable onPress={onSave} style={styles.saveButton} accessibilityRole="button" accessibilityLabel={t('reaction.saveToCameraRoll')}>
                <Download size={18} color={colors.textSecondary} />
                <Text variant="body" style={styles.saveText}>{t('reaction.saveToCameraRoll')}</Text>
              </Pressable>
            )}
            <Pressable onPress={onDiscard} style={styles.discardButton} accessibilityRole="button" accessibilityLabel={t('reaction.discard')}>
              <Text variant="body" style={styles.discardText}>{t('reaction.discard')}</Text>
            </Pressable>
          </Animated.View>
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
  header: { position: 'absolute', left: 20, right: 72, zIndex: 2, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, padding: 10 },
  controls: { position: 'absolute', left: 20, right: 20, zIndex: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, padding: 12 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeText: { color: colors.textPrimary, fontWeight: '600' },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.82,
  },
  sendText: { color: '#FFFFFF', fontWeight: '600' },
  discardButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  discardText: { color: colors.textSecondary, fontWeight: '500' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  saveText: { color: colors.textSecondary, fontWeight: '500' },
  secondaryActions: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
});
