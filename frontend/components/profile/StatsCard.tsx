import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';

interface StatsCardProps {
  gaspsSent: number;
  gaspsReceived: number;
  friendsCount: number;
}

export function StatsCard({ gaspsSent, gaspsReceived, friendsCount }: StatsCardProps) {
  return (
    <View style={styles.container}>
      <StatItem value={gaspsSent} label="SENT" />
      <View style={styles.divider} />
      <StatItem value={gaspsReceived} label="RECEIVED" />
      <View style={styles.divider} />
      <StatItem value={friendsCount} label="FRIENDS" />
    </View>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text variant="title" style={styles.statValue}>
        {value.toString()}
      </Text>
      <Text variant="caption" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
});
