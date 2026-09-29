import { useCallback, useEffect, useRef, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ProductUpdateDetail } from '@/components/product-updates/ProductUpdateDetail';
import { ProductUpdatesListItem } from '@/components/product-updates/ProductUpdatesListItem';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { useProductUpdates } from '@/hooks/useProductUpdates';
import { trackProductUpdatesEvent } from '@/services/productUpdatesAnalytics';
import type { ProductUpdate } from '@/services/api/schemas/productUpdate.schema';
import { getProductUpdateContent } from '@/services/productUpdates';
import { useAuthStore } from '@/stores/authStore';

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export default function ProductUpdatesScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id);
  const { sections, updates, unreadUpdateIds, unreadCount, feedbackByUpdateId, isReady, markRead, submitFeedback } = useProductUpdates(userId, i18n.language);
  const [selectedUpdate, setSelectedUpdate] = useState<ProductUpdate | null>(null);
  const openedTracked = useRef(false);

  useEffect(() => {
    if (isReady && !openedTracked.current) {
      trackProductUpdatesEvent({ name: 'product_updates_opened', source: 'profile', unread_count: unreadCount });
      openedTracked.current = true;
    }
  }, [isReady, unreadCount]);

  const closeModal = useCallback(() => {
    router.back();
  }, [router]);

  const openUpdate = useCallback((update: ProductUpdate) => {
    markRead(update.id);
    const position = updates.findIndex((item) => item.id === update.id) + 1;
    trackProductUpdatesEvent({ name: 'product_update_viewed', update_id: update.id, status: update.status, position });
    setSelectedUpdate(update);
  }, [markRead, updates]);

  const returnToList = useCallback(() => {
    setSelectedUpdate(null);
  }, []);

  const openSelectedAction = useCallback(() => {
    if (!selectedUpdate?.actionRoute) return;
    const content = getProductUpdateContent(selectedUpdate, i18n.language);
    if (!content.actionLabel) return;
    trackProductUpdatesEvent({ name: 'product_update_cta_tapped', update_id: selectedUpdate.id, cta_label: content.actionLabel });
    router.push(selectedUpdate.actionRoute as Href);
  }, [i18n.language, router, selectedUpdate]);

  const submitSelectedFeedback = useCallback((helpful: boolean) => {
    if (!selectedUpdate) return;
    submitFeedback(selectedUpdate.id, helpful);
    trackProductUpdatesEvent({ name: 'product_update_feedback_submitted', update_id: selectedUpdate.id, helpful });
  }, [selectedUpdate, submitFeedback]);

  const renderItem = useCallback(({ item }: { item: ProductUpdate }) => (
    <ProductUpdatesListItem
      update={item}
      language={i18n.language}
      isUnread={unreadUpdateIds.includes(item.id)}
      onOpen={openUpdate}
    />
  ), [i18n.language, openUpdate, unreadUpdateIds]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <Text variant="caption" style={styles.sectionTitle}>{section.title}</Text>
  ), []);

  if (selectedUpdate) {
    return (
      <ProductUpdateDetail
        update={selectedUpdate}
        language={i18n.language}
        feedback={feedbackByUpdateId[selectedUpdate.id]}
        onBack={returnToList}
        onAction={openSelectedAction}
        onFeedback={submitSelectedFeedback}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerCopy}>
          <Text variant="title" weight="bold">{t('productUpdates.title')}</Text>
          <Text variant="caption" color={colors.textSecondary}>{t('productUpdates.subtitle')}</Text>
        </View>
        <IconButton icon={<X size={22} color={colors.textPrimary} />} onPress={closeModal} accessibilityLabel={t('productUpdates.close')} />
      </View>
      {isReady && sections.length === 0 ? (
        <View style={styles.empty}><Text variant="body" color={colors.textSecondary}>{t('productUpdates.empty')}</Text></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  headerSpacer: { width: 44 },
  headerCopy: { alignItems: 'center', gap: 2 },
  list: { padding: 20, paddingBottom: 44 },
  sectionTitle: { color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  separator: { height: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
