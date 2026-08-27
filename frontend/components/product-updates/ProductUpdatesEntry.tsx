import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { UnreadDot } from '@/components/ui/UnreadDot';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { useProductUpdates } from '@/hooks/useProductUpdates';

interface ProductUpdatesEntryProps {
  userId?: string;
  onPress: () => void;
}

export function ProductUpdatesEntry({ userId, onPress }: ProductUpdatesEntryProps) {
  const { t, i18n } = useTranslation();
  const { unreadCount, refresh } = useProductUpdates(userId, i18n.language);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0
        ? t('productUpdates.entryWithUnread', { count: unreadCount })
        : t('productUpdates.entry')}
      accessibilityHint={t('productUpdates.entryHint')}
    >
      <View style={styles.iconContainer}>
        <Sparkles size={20} color={colors.accentCyan} />
      </View>
      <View style={styles.copy}>
        <Text variant="body" weight="600">{t('productUpdates.entry')}</Text>
        <Text variant="caption" color={colors.textSecondary}>{t('productUpdates.entrySubtitle')}</Text>
      </View>
      {unreadCount > 0 ? <UnreadDot count={unreadCount} size="md" /> : null}
      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: `${colors.accentCyan}18`,
  },
  copy: { flex: 1, gap: 2 },
});
