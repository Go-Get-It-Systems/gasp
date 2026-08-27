import { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { useGaspStore } from '@/stores/gaspStore';
import { openGaspViewer } from '@/services/navigation';
import { parseTextOverlay, TextOverlayRenderer } from '@/components/gasp/TextOverlayRenderer';
import { getCachedUri } from '@/services/mediaCache';
import type { Message } from '@/services/api/schemas/chat.schema';
import { MediaBadge } from './MediaBadge';
import { chatMediaStyles } from './chatMediaStyles';

interface GaspBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  otherParticipantName?: string;
}

export function GaspBubble({ message, isOwnMessage, otherParticipantName }: GaspBubbleProps) {
  const rawMediaUri = message.mediaUrl || message.content;
  const resolvedMediaUri = rawMediaUri ? (getCachedUri(rawMediaUri) ?? rawMediaUri) : rawMediaUri;

  const textOverlay = parseTextOverlay(message.content);
  const gaspMediaType: 'image' | 'video' =
    message.content === '[VideoGasp]' || textOverlay?.mediaType === 'video' ? 'video' : 'image';

  const isGaspViewed = useGaspStore((s) =>
    !!s.viewedChatGaspIds[message.id] ||
    !!(message.mediaUrl && s.viewedGaspUrls[message.mediaUrl])
  );

  const [isPreloading, setIsPreloading] = useState(false);

  const handleGaspPress = useCallback(async () => {
    if (isOwnMessage || isPreloading) return;
    const state = useGaspStore.getState();
    if (
      state.viewedChatGaspIds[message.id] ||
      (message.mediaUrl && state.viewedGaspUrls[message.mediaUrl])
    ) return;

    setIsPreloading(true);
    await openGaspViewer({
      imageUri: message.mediaUrl || message.content,
      senderName: otherParticipantName ?? '',
      mediaType: gaspMediaType,
      conversationId: message.conversationId,
      messageId: message.id,
      textOverlay: textOverlay ? message.content : undefined,
    });
    setIsPreloading(false);
  }, [message, otherParticipantName, isOwnMessage, isPreloading, gaspMediaType, textOverlay]);

  const gaspAccessibilityLabel = isOwnMessage
    ? 'Your gasp'
    : isGaspViewed
      ? 'Opened gasp'
      : `Gasp from ${otherParticipantName}, tap to view`;

  return (
    <Pressable
      onPress={handleGaspPress}
      accessibilityLabel={gaspAccessibilityLabel}
      style={[
        chatMediaStyles.bubble,
        isOwnMessage ? chatMediaStyles.ownBubble : chatMediaStyles.otherBubble,
        chatMediaStyles.mediaBubble,
      ]}
    >
      <View style={chatMediaStyles.mediaContainer}>
        <Image
          source={resolvedMediaUri}
          style={chatMediaStyles.media}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
          blurRadius={isOwnMessage ? 0 : isGaspViewed ? 40 : 25}
        />

        {/* Text overlay — only visible on own gasps (received gasps are blurred) */}
        {textOverlay && isOwnMessage && <TextOverlayRenderer data={textOverlay} scale={0.5} />}

        {/* Own gasp: image visible + subtle gradient footer */}
        {isOwnMessage && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={styles.gradientFooter}
          />
        )}

        {/* Received gasp: overlay states */}
        {!isOwnMessage && (
          isGaspViewed ? (
            /* Viewed state — compact, dimmed */
            <View style={styles.viewedOverlay}>
              <EyeOff size={20} color="rgba(255,255,255,0.5)" />
              <Text variant="caption" style={styles.viewedLabel}>Opened</Text>
            </View>
          ) : (
            /* Unviewed state — inviting gradient overlay */
            <LinearGradient
              colors={['rgba(124,58,237,0.15)', 'rgba(0,0,0,0.55)', 'rgba(236,72,153,0.15)']}
              locations={[0, 0.5, 1]}
              style={styles.gaspOverlay}
            >
              {isPreloading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text variant="body" style={styles.tapText}>Loading...</Text>
                </>
              ) : (
                <>
                  <View style={styles.eyeCircle}>
                    <Eye size={26} color="#FFFFFF" />
                  </View>
                  <Text variant="body" style={styles.tapText}>Tap to view</Text>
                  <Text variant="caption" style={styles.tapHint}>
                    from {otherParticipantName}
                  </Text>
                </>
              )}
            </LinearGradient>
          )
        )}

        <MediaBadge label="GASP" variant="gasp" />
      </View>
    </Pressable>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Gasp overlay: unviewed ──────────────────────────────────────
  gaspOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  eyeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tapText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  tapHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },

  // ── Gasp overlay: viewed ────────────────────────────────────────
  viewedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  viewedLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Gasp: own — gradient footer ─────────────────────────────────
  gradientFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
});
