import { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { CornerDownRight } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { getCachedUri } from '@/services/mediaCache';
import { colors } from '@/constants/colors';
import type { Message } from '@/services/api/schemas/chat.schema';
import { chatMediaStyles } from './chatMediaStyles';
import { useTranslation } from 'react-i18next';
import { ReactionThumbnail } from './ReactionThumbnail';
import { ReactionPlaybackModal } from './ReactionPlaybackModal';

interface ReactionBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  replyToMessage?: Message | null;
  otherParticipantName?: string;
}

export function ReactionBubble({
  message,
  isOwnMessage,
  replyToMessage,
  otherParticipantName,
}: ReactionBubbleProps) {
  const { t } = useTranslation();
  const rawMediaUri = message.mediaUrl || message.content;
  const resolvedMediaUri = rawMediaUri ? (getCachedUri(rawMediaUri) ?? rawMediaUri) : rawMediaUri;
  const reactionLabel = isOwnMessage ? t('reaction.you') : otherParticipantName ?? t('reaction.reaction');
  const originalLabel = isOwnMessage && otherParticipantName
    ? t('reaction.senderGasp', { name: otherParticipantName })
    : t('reaction.yourGasp');

  // Original gasp URI comes from the replied-to message
  const originalUri = replyToMessage?.mediaUrl ?? replyToMessage?.content ?? '';
  const resolvedOriginalUri = originalUri ? (getCachedUri(originalUri) ?? originalUri) : '';
  const isBackendCompositeMedia = isCompositeMediaUrl(resolvedMediaUri);
  const hasCompositeMedia = !!(resolvedMediaUri && resolvedOriginalUri && !isBackendCompositeMedia);

  const [showComposite, setShowComposite] = useState(false);

  const handleReactionPress = useCallback(() => {
    setShowComposite(true);
  }, []);

  const handleClose = useCallback(() => {
    setShowComposite(false);
  }, []);

  return (
    <>
      {/* ── Reply reference strip ──── */}
      {replyToMessage && (
        <View style={[styles.replyStrip, isOwnMessage ? styles.replyStripOwn : styles.replyStripOther]}>
          <CornerDownRight size={11} color={colors.textTertiary} />
          <Image
            source={replyToMessage.mediaUrl || replyToMessage.content}
            style={styles.replyThumb}
            contentFit="cover"
            blurRadius={12}
          />
          <Text variant="caption" style={styles.replyText} numberOfLines={1}>
            {isOwnMessage && otherParticipantName
              ? t('reaction.senderGasp', { name: otherParticipantName })
              : t('reaction.yourGasp')}
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleReactionPress}
        accessibilityRole="button"
        accessibilityLabel={t('reaction.reactionVideoTap')}
        style={[
          chatMediaStyles.bubble,
          isOwnMessage ? chatMediaStyles.ownBubble : chatMediaStyles.otherBubble,
          chatMediaStyles.mediaBubble,
        ]}
      >
        <ReactionThumbnail
          reactionUri={resolvedMediaUri ?? undefined}
          originalUri={hasCompositeMedia ? resolvedOriginalUri : undefined}
        />
      </Pressable>

      <ReactionPlaybackModal
        visible={showComposite}
        reactionUri={resolvedMediaUri ?? undefined}
        originalUri={resolvedOriginalUri || undefined}
        reactionLabel={reactionLabel}
        originalLabel={originalLabel}
        hasCompositeMedia={hasCompositeMedia}
        onClose={handleClose}
      />
    </>
  );
}

function isCompositeMediaUrl(uri?: string | null) {
  return !!uri && /\/composites\//.test(uri);
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  replyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  replyStripOwn: { justifyContent: 'flex-end' },
  replyStripOther: { justifyContent: 'flex-start' },
  replyThumb: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  replyText: { fontSize: 11, color: colors.textTertiary },
});
