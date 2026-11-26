import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { QueryState } from '@/components/ui/QueryState';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/colors';

export const businessStyles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  section: { gap: 12 },
  muted: { color: colors.textSecondary, lineHeight: 21 },
  input: { color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  media: { width: '100%', height: 250, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface },
});
export function BusinessScreen({ title, children }: { title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, paddingHorizontal: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
    <View style={businessStyles.row}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('business.back')} hitSlop={12}><ChevronLeft color={colors.textPrimary} /></Pressable>
      <Text variant="title" style={{ flex: 1 }}>{title}</Text>
    </View>
    {children}
  </ScrollView>;
}
export function BusinessButton({ label, onPress, disabled, selected }: { label: string; onPress: () => void; disabled?: boolean; selected?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, selected: !!selected }}
    style={{ backgroundColor: selected ? colors.primary : colors.surfaceElevated, padding: 14, borderRadius: 12, opacity: disabled ? 0.45 : 1 }}>
    <Text style={{ fontWeight: '700', textAlign: 'center' }}>{label}</Text>
  </Pressable>;
}
export function BusinessQuery<T>({ query, empty, children }: {
  query: { data: T | undefined; isLoading: boolean; isError: boolean; refetch: () => unknown };
  empty?: string; children: (data: T) => ReactNode;
}) {
  return <QueryState data={query.isError ? undefined : query.data} isLoading={query.isLoading} isError={query.isError} refetch={() => { void query.refetch(); }}
    skeleton={<Skeleton width="100%" height={140} borderRadius={16} />} emptyTitle={empty}>{children}</QueryState>;
}
export function BusinessError({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  return visible ? <Text accessibilityRole="alert" style={{ color: colors.error }}>{t('business.error')}</Text> : null;
}
