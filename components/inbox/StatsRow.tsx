import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors } from '@/constants/colors';
import { formatCount } from '@/utils/format';

interface StatsRowProps {
  friendCount: number;
  newGaspCount: number;
  onlineCount: number;
}

export function StatsRow({ friendCount, newGaspCount, onlineCount }: StatsRowProps) {
  return (
    <View style={styles.container}>
      <StatItem value={friendCount} label="FRIENDS" />
      <View style={styles.divider} />
      <StatItem value={newGaspCount} label="NEW GASPS" highlight />
      <View style={styles.divider} />
      <StatItem value={onlineCount} label="ONLINE" />
    </View>
  );
}

function StatItem({
  value,
  label,
  highlight = false,
}: {
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statItem}>
      <Text
        variant="title"
        style={[
          styles.statValue,
          highlight ? styles.statValueHighlight : null,
        ]}
      >
        {formatCount(value)}
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
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statValueHighlight: {
    color: colors.primary,
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
