import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { UnreadDot } from '@/components/ui/UnreadDot';
import { colors } from '@/constants/colors';
import type { Conversation } from '@/services/api/schemas/chat.schema';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  formatConversationTime,
  getConversationPreview,
  type ConversationParticipant,
} from './conversationPreview';

interface ConversationListItemProps {
  conversation: Conversation;
  participant: ConversationParticipant;
  isOnline?: boolean;
  onPress: () => void;
}

export function ConversationListItem({
  conversation,
  participant,
  isOnline = false,
  onPress,
}: ConversationListItemProps) {
  const { t } = useTranslation();
  const preview = getConversationPreview(conversation.lastMessage);
  const previewText = preview.kind === 'text' ? preview.text : t(preview.key);
  const unreadCount = conversation.unreadCount;
  const time = formatConversationTime(conversation.lastMessageAt ?? conversation.updatedAt);
  const accessibilityLabel = unreadCount > 0
    ? t('chat.inbox.conversationUnreadAccessibility', {
      name: participant.name,
      preview: previewText,
      count: unreadCount,
    })
    : t('chat.inbox.conversationAccessibility', {
      name: participant.name,
      preview: previewText,
    });

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Avatar
        uri={participant.avatarUrl}
        initials={participant.name}
        size={52}
        showOnlineIndicator={isOnline}
        onlineStatus="online"
        accessibilityLabel={participant.name}
      />

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text
            variant="body"
            numberOfLines={1}
            style={[styles.name, unreadCount > 0 && styles.nameUnread]}
          >
            {participant.name}
          </Text>
          {time ? (
            <Text variant="caption" numberOfLines={1} style={styles.timestamp}>
              {time === 'now' ? t('chat.inbox.now') : time}
            </Text>
          ) : null}
        </View>
        <Text
          variant="caption"
          numberOfLines={1}
          style={[styles.preview, unreadCount > 0 && styles.previewUnread]}
        >
          {previewText}
        </Text>
      </View>

      {unreadCount > 0 ? <UnreadDot count={unreadCount} size="md" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  nameUnread: {
    fontWeight: '800',
  },
  timestamp: {
    flexShrink: 0,
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  preview: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  previewUnread: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
