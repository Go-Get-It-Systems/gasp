import { ChevronRight, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { ProductUpdate } from '@/services/api/schemas/productUpdate.schema';
import { getProductUpdateContent, isAvailableProductUpdate } from '@/services/productUpdates';

interface ProductUpdateCardProps {
  update: ProductUpdate;
  language?: string;
  isUnread: boolean;
  onPress: () => void;
}

export function ProductUpdateCard({ update, language, isUnread, onPress }: ProductUpdateCardProps) {
  const { t } = useTranslation();
  const content = getProductUpdateContent(update, language);
  const date = new Intl.DateTimeFormat(language?.startsWith('pt') ? 'pt-BR' : 'en', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(update.publishedAt));

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('productUpdates.openUpdate', { title: content.title })}
    >
      <View style={styles.iconContainer}>
        <Sparkles size={18} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <View style={styles.metadata}>
          <Text variant="caption" style={styles.status}>{t(`productUpdates.status.${update.status}`)}</Text>
          {isUnread ? <Text variant="caption" style={styles.newLabel}>{t('productUpdates.new')}</Text> : null}
        </View>
        <Text variant="body" weight="600">{content.title}</Text>
        <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>{content.summary}</Text>
        {isAvailableProductUpdate(update.status) ? (
          <Text variant="caption" color={colors.textSecondary}>{date}</Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}20`,
  },
  copy: { flex: 1, gap: 4 },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { color: colors.accentCyan, fontWeight: '700', textTransform: 'uppercase' },
  newLabel: { color: colors.accentPink, fontWeight: '700', textTransform: 'uppercase' },
});
