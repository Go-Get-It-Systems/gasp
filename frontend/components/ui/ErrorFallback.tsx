import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface ErrorFallbackProps {
  error: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
  /** Compact mode for tab/modal boundaries (no "Go Home" button) */
  compact?: boolean;
}

export function ErrorFallback({ error, onRetry, onGoHome, compact }: ErrorFallbackProps) {
  const { t } = useTranslation();
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <AlertTriangle size={compact ? 32 : 48} color={colors.error} />
      <Text variant="title" style={styles.title}>
        {compact ? t('errors.somethingWentWrong') : `Oops! ${t('errors.somethingWentWrong')}`}
      </Text>
      {!compact && (
        <Text variant="body" style={styles.message}>
          {__DEV__ ? error.message : t('errors.workingOnFix')}
        </Text>
      )}
      <View style={styles.actions}>
        {onRetry && (
          <Pressable onPress={onRetry} style={styles.button} accessibilityLabel={t('common.tryAgain')} accessibilityRole="button">
            <RotateCcw size={18} color="#FFFFFF" />
            <Text variant="body" style={styles.buttonText}>{t('common.tryAgain')}</Text>
          </Pressable>
        )}
        {onGoHome && !compact && (
          <Pressable onPress={onGoHome} style={styles.buttonSecondary} accessibilityLabel={t('common.goHome')} accessibilityRole="button">
            <Home size={18} color={colors.textSecondary} />
            <Text variant="body" style={styles.buttonSecondaryText}>{t('common.goHome')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  containerCompact: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderCurve: 'continuous',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSecondaryText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
});
