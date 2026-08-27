import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ShieldOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface BlockUserConfirmationProps {
  visible: boolean;
  displayName: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function BlockUserConfirmation({
  visible,
  displayName,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: BlockUserConfirmationProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={isSubmitting ? undefined : onCancel}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => undefined}>
          <View style={styles.iconCircle}><ShieldOff size={24} color={colors.error} /></View>
          <Text variant="subtitle" weight="700" style={styles.title}>
            {t('safety.block.title', { name: displayName })}
          </Text>
          <Text variant="body" style={styles.body}>{t('safety.block.body')}</Text>
          <Text variant="caption" style={styles.hint}>{t('safety.block.hint')}</Text>
          <Pressable
            style={[styles.primaryButton, isSubmitting && styles.disabled]}
            onPress={onConfirm}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={t('safety.block.confirm', { name: displayName })}
          >
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text variant="body" style={styles.primaryText}>{t('safety.block.confirm')}</Text>}
          </Pressable>
          <Pressable
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Text variant="body" weight="600" style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.64)' },
  sheet: {
    alignItems: 'center', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderCurve: 'continuous', paddingHorizontal: 24, paddingTop: 24,
  },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 14, textAlign: 'center', color: colors.textPrimary },
  body: { marginTop: 10, textAlign: 'center', lineHeight: 21, color: colors.textSecondary },
  hint: { marginTop: 10, textAlign: 'center', color: colors.textTertiary, lineHeight: 18 },
  primaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 50, width: '100%', marginTop: 24, borderRadius: 25, backgroundColor: colors.error },
  disabled: { opacity: 0.65 },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  cancelButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, width: '100%', marginTop: 6 },
  cancelText: { color: colors.textSecondary },
});
