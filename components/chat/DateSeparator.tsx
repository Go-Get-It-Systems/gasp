import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

function getDateLabel(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const dateMs = toDay(date);
  const todayMs = toDay(today);
  const yesterdayMs = toDay(yesterday);

  if (dateMs === todayMs) return 'Hoje';
  if (dateMs === yesterdayMs) return 'Ontem';

  const diffDays = Math.floor((todayMs - dateMs) / (86400000));

  if (diffDays > 0 && diffDays < 7) {
    const label = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function DateSeparatorInner({ date }: { date: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.pill}>
        <Text variant="caption" style={styles.text}>{getDateLabel(date)}</Text>
      </View>
      <View style={styles.line} />
    </View>
  );
}

export const DateSeparator = memo(DateSeparatorInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
