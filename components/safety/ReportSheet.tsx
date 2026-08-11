import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Flag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Text } from '@/components/ui/Text';
import { useSubmitReport } from '@/hooks/queries/useSafety';
import type { ReportCategory, ReportTargetType } from '@/services/api/schemas/safety.schema';
import { colors } from '@/constants/colors';

interface ReportSheetProps {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const categories: ReportCategory[] = ['harassment', 'hate_speech', 'nudity_or_sexual_content', 'violence_or_threats', 'spam', 'impersonation', 'other'];

export function ReportSheet({ visible, targetType, targetId, onClose, onSubmitted }: ReportSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<ReportCategory>('harassment');
  const [description, setDescription] = useState('');
  const report = useSubmitReport();

  const close = () => {
    if (report.isPending) return;
    setDescription('');
    report.reset();
    onClose();
  };
  const submit = () => {
    report.mutate({ targetType, targetId, category, ...(description.trim() && { description: description.trim() }) }, {
      onSuccess: () => {
        setDescription('');
        report.reset();
        onSubmitted();
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => undefined}>
          <View style={styles.header}><Flag size={21} color={colors.textPrimary} /><Text variant="subtitle" weight="700">{t('safety.report.title')}</Text></View>
          <Text variant="body" style={styles.description}>{t('safety.report.body')}</Text>
          <View style={styles.categories}>
            {categories.map((item) => {
              const selected = category === item;
              return (
                <Pressable key={item} style={[styles.category, selected && styles.categorySelected]} onPress={() => setCategory(item)} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={t(`safety.report.categories.${item}`)}>
                  <Text variant="caption" style={[styles.categoryText, selected && styles.categoryTextSelected]}>{t(`safety.report.categories.${item}`)}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={1000}
            multiline
            placeholder={t('safety.report.notePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            accessibilityLabel={t('safety.report.notePlaceholder')}
          />
          {report.isError ? <Text variant="caption" style={styles.error}>{t('safety.report.error')}</Text> : null}
          <Pressable style={[styles.submit, report.isPending && styles.disabled]} onPress={submit} disabled={report.isPending} accessibilityRole="button" accessibilityLabel={t('safety.report.submit')}>
            {report.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text variant="body" style={styles.submitText}>{t('safety.report.submit')}</Text>}
          </Pressable>
          <Pressable style={styles.cancel} onPress={close} disabled={report.isPending} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
            <Text variant="body" weight="600" style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.64)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderCurve: 'continuous', paddingHorizontal: 20, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  description: { marginTop: 8, lineHeight: 20, color: colors.textSecondary },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  category: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  categorySelected: { borderColor: colors.primary, backgroundColor: 'rgba(124,58,237,0.18)' },
  categoryText: { color: colors.textSecondary },
  categoryTextSelected: { color: colors.textPrimary, fontWeight: '700' },
  input: { minHeight: 82, marginTop: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, color: colors.textPrimary, fontSize: 14, textAlignVertical: 'top' },
  error: { marginTop: 8, color: colors.error },
  submit: { marginTop: 16, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: colors.primary },
  disabled: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontWeight: '700' },
  cancel: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { color: colors.textSecondary },
});
