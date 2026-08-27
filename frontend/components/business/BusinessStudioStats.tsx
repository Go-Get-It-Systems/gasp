import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { StyleSheet, View } from 'react-native';

interface StatColumnProps {
  value: string;
  label: string;
}

function StatColumn({ value, label }: StatColumnProps) {
  return (
    <View style={styles.column}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

interface BusinessStudioStatsProps {
  reactions: number;
  opens: number;
  /** Engagement rate 0–100 */
  engagementRate: number;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function BusinessStudioStats({
  reactions,
  opens,
  engagementRate,
}: BusinessStudioStatsProps) {
  return (
    <View style={styles.container}>
      <StatColumn value={formatCount(reactions)} label="Reactions" />
      <View style={styles.divider} />
      <StatColumn value={formatCount(opens)} label="Opens" />
      <View style={styles.divider} />
      <StatColumn value={`${Math.round(engagementRate)}%`} label="Eng." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderCurve: 'continuous',
    marginHorizontal: 16,
    paddingVertical: 16,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
});
