import { ArrowLeft, Check } from 'lucide-react-native';
import { useCallback } from 'react';
import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/IconButton';
import { InlineVideo } from '@/components/ui/InlineVideo';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import type { ProductUpdate } from '@/services/api/schemas/productUpdate.schema';
import { getProductUpdateContent, isAvailableProductUpdate } from '@/services/productUpdates';

interface ProductUpdateDetailProps {
  update: ProductUpdate;
  language?: string;
  feedback?: boolean;
  onBack: () => void;
  onAction: () => void;
  onFeedback: (helpful: boolean) => void;
}

export function ProductUpdateDetail({ update, language, feedback, onBack, onAction, onFeedback }: ProductUpdateDetailProps) {
  const { t } = useTranslation();
  const content = getProductUpdateContent(update, language);
  const date = new Intl.DateTimeFormat(language?.startsWith('pt') ? 'pt-BR' : 'en', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(update.publishedAt));
  const hasAction = Boolean(update.actionRoute && content.actionLabel);
  const handleHelpfulFeedback = useCallback(() => onFeedback(true), [onFeedback]);
  const handleNotHelpfulFeedback = useCallback(() => onFeedback(false), [onFeedback]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon={<ArrowLeft size={22} color={colors.textPrimary} />} onPress={onBack} accessibilityLabel={t('common.goBack')} />
        <Text variant="title" weight="bold">{t('productUpdates.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" style={styles.status}>{t(`productUpdates.status.${update.status}`)}</Text>
        <Text variant="title" style={styles.title}>{content.title}</Text>
        <Text variant="body" color={colors.textSecondary} style={styles.summary}>{content.summary}</Text>
        {isAvailableProductUpdate(update.status) ? <Text variant="caption" color={colors.textSecondary}>{date}</Text> : null}
        {update.media ? (
          <View accessibilityRole="image" accessibilityLabel={content.mediaAlt ?? content.title} style={styles.media}>
            {update.media.type === 'image' ? (
              <Image source={{ uri: update.media.uri }} style={styles.mediaImage} contentFit="cover" />
            ) : (
              <InlineVideo uri={update.media.uri} style={styles.mediaImage} paused={false} />
            )}
          </View>
        ) : null}

        <View style={styles.highlights}>
          <Text variant="subtitle" weight="bold">{t('productUpdates.whatChanged')}</Text>
          {content.highlights.map((highlight) => (
            <View key={highlight} style={styles.highlight}>
              <Check size={16} color={colors.accentCyan} />
              <Text variant="body" style={styles.highlightText}>{highlight}</Text>
            </View>
          ))}
        </View>

        {hasAction ? (
          <Pressable style={styles.action} onPress={onAction} accessibilityRole="button" accessibilityLabel={content.actionLabel}>
            <Text variant="body" weight="bold" color="#FFFFFF">{content.actionLabel}</Text>
          </Pressable>
        ) : null}

        <View style={styles.feedback}>
          <Text variant="subtitle" weight="bold">{t('productUpdates.helpfulQuestion')}</Text>
          <View style={styles.feedbackOptions}>
            <Pressable
              style={[styles.feedbackOption, feedback === true && styles.feedbackOptionSelected]}
              onPress={handleHelpfulFeedback}
              accessibilityRole="button"
              accessibilityLabel={t('productUpdates.helpfulYes')}
              accessibilityState={{ selected: feedback === true }}
            >
              <Text variant="body" weight="600" color={feedback === true ? '#FFFFFF' : colors.textPrimary}>{t('productUpdates.helpfulYes')}</Text>
            </Pressable>
            <Pressable
              style={[styles.feedbackOption, feedback === false && styles.feedbackOptionSelected]}
              onPress={handleNotHelpfulFeedback}
              accessibilityRole="button"
              accessibilityLabel={t('productUpdates.helpfulNo')}
              accessibilityState={{ selected: feedback === false }}
            >
              <Text variant="body" weight="600" color={feedback === false ? '#FFFFFF' : colors.textPrimary}>{t('productUpdates.helpfulNo')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  headerSpacer: { width: 44 },
  content: { padding: 24, paddingBottom: 48, gap: 12 },
  status: { color: colors.accentCyan, fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 30, lineHeight: 36, color: colors.textPrimary },
  summary: { fontSize: 18, lineHeight: 26 },
  media: { height: 220, marginTop: 12, overflow: 'hidden', borderRadius: 16, backgroundColor: colors.surface },
  mediaImage: { width: '100%', height: '100%' },
  highlights: { marginTop: 20, gap: 12 },
  highlight: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  highlightText: { flex: 1 },
  action: { minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  feedback: { marginTop: 28, gap: 12 },
  feedbackOptions: { flexDirection: 'row', gap: 12 },
  feedbackOption: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  feedbackOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
