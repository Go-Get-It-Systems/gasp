import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Flame, MessageCircle, Calendar } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface ActivityCardProps {
  streak: number;
  reactionsReceived: number;
  memberSince: string;
}

function formatMemberSince(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function ActivityCard({ streak, reactionsReceived, memberSince }: ActivityCardProps) {
  return (
    <View style={styles.container}>
      <ActivityRow
        icon={<Flame size={18} color="#F97316" />}
        label="Streak"
        value={streak > 0 ? `${streak} days` : 'Start today!'}
        accent={streak > 0}
      />
      <View style={styles.separator} />
      <ActivityRow
        icon={<MessageCircle size={18} color={colors.accentCyan} />}
        label="Reactions received"
        value={reactionsReceived.toString()}
      />
      <View style={styles.separator} />
      <ActivityRow
        icon={<Calendar size={18} color={colors.primaryLight} />}
        label="Member since"
        value={formatMemberSince(memberSince)}
      />
    </View>
  );
}

function ActivityRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {icon}
        <Text variant="body" style={styles.rowLabel}>
          {label}
        </Text>
      </View>
      <Text
        variant="body"
        style={[styles.rowValue, accent && styles.rowValueAccent]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowValueAccent: {
    color: '#F97316',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
});
