import { ChevronRight, Play } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { ReactionReturn } from '@/services/api/schemas/gasp.schema';
import { openReactionContinuation } from '@/services/navigation';
import { formatRelativeTime } from '@/utils/format';

interface ReactionReturnItemProps {
  reaction: ReactionReturn;
}

export function ReactionReturnItem({ reaction }: ReactionReturnItemProps) {
  const { t } = useTranslation();
  const [isOpening, setIsOpening] = useState(false);

  const handlePress = async () => {
    if (isOpening) return;
    setIsOpening(true);
    try {
      openReactionContinuation({
        reactionId: reaction.id,
        conversationId: reaction.conversationId,
        messageId: reaction.messageId,
        gaspId: reaction.gaspId,
        reactionVideoUri: reaction.reactionMediaUrl,
        originalImageUri: reaction.originalMediaMetadata.imageUrl,
        senderName: reaction.reactor.displayName,
        originalMediaType: reaction.originalMediaMetadata.mediaType,
      });
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isOpening}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('gasps.pulse.reactionFrom', { name: reaction.reactor.displayName })}
    >
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          <Avatar uri={reaction.reactor.avatarUrl} size={46} initials={reaction.reactor.displayName} />
          <View style={styles.playBadge}><Play size={10} fill="#FFFFFF" color="#FFFFFF" /></View>
        </View>
        <View style={styles.copy}>
          <Text variant="body" weight="700" numberOfLines={1} style={styles.name}>{reaction.reactor.displayName}</Text>
          <Text variant="caption" numberOfLines={1} style={styles.subtitle}>{t('gasps.pulse.reactedToMoment')}</Text>
        </View>
        <View style={styles.trailing}>
          <Text variant="caption" numberOfLines={1} style={styles.time}>{formatRelativeTime(reaction.capturedAt).toLowerCase()}</Text>
          {isOpening ? <ActivityIndicator size="small" color={colors.primaryLight} /> : <ChevronRight size={19} color={colors.textTertiary} />}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginHorizontal: 20,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.78 },
  row: {
    width: '100%',
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  avatarWrap: { position: 'relative', width: 46, height: 46, flexShrink: 0 },
  playBadge: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPink, borderWidth: 2, borderColor: colors.surface },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontSize: 14, color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary },
  trailing: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { maxWidth: 52, fontSize: 10, color: colors.textTertiary },
});
