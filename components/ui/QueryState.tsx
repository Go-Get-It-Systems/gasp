import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { RefreshCcw, AlertTriangle } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface QueryStateProps<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  skeleton: ReactNode;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyCta?: { label: string; onPress: () => void };
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
}

export function QueryState<T>({
  data,
  isLoading,
  isError,
  refetch,
  skeleton,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  emptyCta,
  children,
  isEmpty = (d) => Array.isArray(d) && d.length === 0,
}: QueryStateProps<T>) {
  const { t } = useTranslation();
  const resolvedEmptyTitle = emptyTitle ?? t('errors.nothingHereYet');
  // Loading — show skeleton
  if (isLoading && !data) {
    return <>{skeleton}</>;
  }

  // Error — show retry
  if (isError && !data) {
    return (
      <View style={styles.centerState}>
        <AlertTriangle size={40} color={colors.error} />
        <Text variant="body" style={styles.errorTitle}>{t('errors.somethingWentWrong')}</Text>
        <Pressable onPress={refetch} style={styles.retryButton} accessibilityLabel={t('common.tryAgain')} accessibilityRole="button">
          <RefreshCcw size={16} color="#FFFFFF" />
          <Text variant="body" style={styles.retryText}>{t('common.tryAgain')}</Text>
        </Pressable>
      </View>
    );
  }

  // Data loaded but empty
  if (data && isEmpty(data)) {
    return (
      <View style={styles.centerState}>
        {emptyIcon}
        <Text variant="body" style={styles.emptyTitle}>{resolvedEmptyTitle}</Text>
        {emptySubtitle && (
          <Text variant="caption" style={styles.emptySubtitle}>{emptySubtitle}</Text>
        )}
        {emptyCta && (
          <Pressable onPress={emptyCta.onPress} style={styles.ctaButton} accessibilityLabel={emptyCta.label} accessibilityRole="button">
            <Text variant="body" style={styles.ctaText}>{emptyCta.label}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // Success — render children
  if (data) {
    return <>{children(data)}</>;
  }

  // Fallback (shouldn't reach here)
  return null;
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderCurve: 'continuous',
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderCurve: 'continuous',
    marginTop: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
